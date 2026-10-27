import type { DB } from "../db/client";
import { tx } from "../db/tx";
import { slugify } from "../lib/validate";
import { createEntity, updateEntity, entities, type EntityKey } from "./entities";

/** Minimal RFC-4180 CSV parser (quotes, escaped quotes, CRLF, embedded newlines). */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  const s = text.replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"') {
        if (s[i + 1] === '"') { cell += '"'; i++; } else q = false;
      } else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((x) => x !== "")) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x !== "")) rows.push(row);
  if (!rows.length) return [];
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? "").trim()])));
}

export type ImportReport = {
  entity: string;
  dryRun: boolean;
  created: number;
  updated: number;
  failed: { row: number; name?: string; errors: Record<string, string> }[];
};

/**
 * Bulk import rows into an entity. Rows are matched on slug (derived from the
 * name when absent): existing slug → update, otherwise create.
 *
 * Relation columns accept pipe-separated SLUGS, e.g.
 *   hospitals = "apollo-indraprastha-hospitals|fortis-escorts-heart-institute"
 *   departments = "cardiology"
 * Unknown slugs are reported as row errors instead of being silently dropped.
 *
 * With dryRun the whole import is validated and rolled back.
 */
export function importRows(
  db: DB,
  entityKey: EntityKey,
  rows: Record<string, unknown>[],
  opts: { dryRun?: boolean } = {},
): ImportReport {
  const e = entities[entityKey];
  const report: ImportReport = { entity: entityKey, dryRun: !!opts.dryRun, created: 0, updated: 0, failed: [] };

  const idBySlug = (table: string, slug: string): number | null =>
    (db.prepare(`SELECT id FROM ${table} WHERE slug = ?`).get(slug) as { id: number } | undefined)?.id ?? null;

  // payload key → [source column(s), lookup table]
  const relationLookup: Record<string, { cols: string[]; table: string }> = {
    hospital_ids: { cols: ["hospitals", "hospital_ids"], table: "hospitals" },
    department_ids: { cols: ["departments", "department_ids"], table: "departments" },
    doctor_ids: { cols: ["doctors", "doctor_ids"], table: "doctors" },
  };

  class DryRunRollback extends Error {}
  try {
    tx(db, () => {
    rows.forEach((raw, i) => {
      const rowNo = i + 2; // +1 header, +1 for 1-based
      const input: Record<string, unknown> = { ...raw };
      const nameVal = String(raw[e.nameField] ?? raw.name ?? "").trim();
      const errors: Record<string, string> = {};

      if (e.spec.slug && !input.slug && nameVal) input.slug = slugify(nameVal);

      for (const rel of e.relations) {
        const look = relationLookup[rel.key];
        const col = look.cols.find((c) => raw[c] !== undefined && raw[c] !== "");
        delete input[look.cols[0]];
        if (!col) continue;
        const slugs = Array.isArray(raw[col]) ? (raw[col] as string[]) : String(raw[col]).split("|").map((x) => x.trim()).filter(Boolean);
        const ids: number[] = [];
        for (const sl of slugs) {
          const id = idBySlug(look.table, sl);
          if (id == null) errors[look.cols[0]] = `Unknown ${look.table.slice(0, -1)} slug "${sl}"`;
          else ids.push(id);
        }
        input[rel.key] = ids;
      }
      if (entityKey === "treatments" && typeof input.department === "string" && input.department) {
        const id = idBySlug("departments", input.department);
        if (id == null) errors.department = `Unknown department slug "${input.department}"`;
        else input.department_id = id;
        delete input.department;
      }
      if (Object.keys(errors).length) {
        report.failed.push({ row: rowNo, name: nameVal, errors });
        return;
      }

      const existing =
        e.spec.slug && input.slug
          ? (db.prepare(`SELECT id FROM ${e.table} WHERE slug = ?`).get(input.slug as string) as { id: number } | undefined)
          : undefined;
      // create/update run in their own savepoint, so a bad row cannot poison the batch
      const res = existing ? updateEntity(db, e, existing.id, input) : createEntity(db, e, input);
      if (!res.ok) report.failed.push({ row: rowNo, name: nameVal, errors: res.errors });
      else if (existing) report.updated++;
      else report.created++;
    });
    if (opts.dryRun) throw new DryRunRollback();
    });
  } catch (err) {
    if (!(err instanceof DryRunRollback)) throw err;
  }
  return report;
}

