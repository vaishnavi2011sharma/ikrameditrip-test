import type { DB } from "../db/client";
import { tx } from "../db/tx";
import { slugify, validate, type Spec, type Result } from "../lib/validate";

/** Every editable content type, with whitelisted columns and relation tables. */
type Relation = {
  /** key in payload, e.g. "hospital_ids" */
  key: string;
  table: string;
  ownCol: string;
  otherCol: string;
  /** optional column on the join table flagged for the first id (primary) */
  primaryCol?: string;
};

export type Entity = {
  name: string;
  table: string;
  nameField: "name" | "title" | "patient_name";
  spec: Spec;
  relations: Relation[];
  searchCols: string[];
  orderBy: string;
};

const common = {
  seo_title: { type: "string", max: 70 },
  seo_description: { type: "string", max: 200 },
} as const satisfies Spec;

export const departments: Entity = {
  name: "department",
  table: "departments",
  nameField: "name",
  orderBy: "sort_order, name",
  searchCols: ["name", "summary"],
  relations: [],
  spec: {
    slug: { type: "slug", max: 90 },
    name: { type: "string", required: true, max: 120 },
    summary: { type: "text", max: 600 },
    body: { type: "text" },
    icon: { type: "string", max: 40 },
    image_url: { type: "url" },
    image_alt: { type: "string", max: 200 },
    ...common,
    sort_order: { type: "int", min: 0, max: 9999 },
    published: { type: "bool" },
  },
};

export const treatments: Entity = {
  name: "treatment",
  table: "treatments",
  nameField: "name",
  orderBy: "sort_order, name",
  searchCols: ["name", "summary"],
  relations: [
    { key: "hospital_ids", table: "treatment_hospitals", ownCol: "treatment_id", otherCol: "hospital_id" },
    { key: "doctor_ids", table: "treatment_doctors", ownCol: "treatment_id", otherCol: "doctor_id" },
  ],
  spec: {
    slug: { type: "slug", max: 90 },
    name: { type: "string", required: true, max: 160 },
    department_id: { type: "int", min: 1 },
    summary: { type: "text", max: 600 },
    body: { type: "text" },
    image_url: { type: "url" },
    image_alt: { type: "string", max: 200 },
    cost_min: { type: "int", min: 0, max: 100_000_000 },
    cost_max: { type: "int", min: 0, max: 100_000_000 },
    cost_currency: { type: "string", max: 3 },
    cost_notes: { type: "text", max: 1000 },
    cost_verified: { type: "bool" },
    cost_verified_on: { type: "date" },
    cost_source: { type: "string", max: 300 },
    ...common,
    sort_order: { type: "int", min: 0, max: 9999 },
    published: { type: "bool" },
  },
};

export const hospitals: Entity = {
  name: "hospital",
  table: "hospitals",
  nameField: "name",
  orderBy: "sort_order, name",
  searchCols: ["name", "city", "summary"],
  relations: [
    { key: "department_ids", table: "hospital_departments", ownCol: "hospital_id", otherCol: "department_id" },
    { key: "doctor_ids", table: "doctor_hospitals", ownCol: "hospital_id", otherCol: "doctor_id" },
  ],
  spec: {
    slug: { type: "slug", max: 90 },
    name: { type: "string", required: true, max: 160 },
    country: { type: "string", max: 80 },
    state: { type: "string", max: 80 },
    city: { type: "string", required: true, max: 80 },
    address: { type: "string", max: 300 },
    summary: { type: "text", max: 600 },
    body: { type: "text" },
    accreditations: { type: "string", max: 300 },
    image_url: { type: "url" },
    image_alt: { type: "string", max: 200 },
    logo_url: { type: "url" },
    is_placeholder_image: { type: "bool" },
    website: { type: "url" },
    ...common,
    featured: { type: "bool" },
    sort_order: { type: "int", min: 0, max: 9999 },
    published: { type: "bool" },
  },
};

export const doctors: Entity = {
  name: "doctor",
  table: "doctors",
  nameField: "name",
  orderBy: "sort_order, name",
  searchCols: ["name", "designation"],
  relations: [
    {
      key: "hospital_ids",
      table: "doctor_hospitals",
      ownCol: "doctor_id",
      otherCol: "hospital_id",
      primaryCol: "is_primary",
    },
    { key: "department_ids", table: "doctor_departments", ownCol: "doctor_id", otherCol: "department_id" },
  ],
  spec: {
    slug: { type: "slug", max: 90 },
    name: { type: "string", required: true, max: 120 },
    designation: { type: "string", max: 300 },
    qualifications: { type: "string", max: 300 },
    experience_years: { type: "int", min: 0, max: 80 },
    city: { type: "string", max: 80 },
    profile_card_url: { type: "url" },
    summary: { type: "text", max: 600 },
    body: { type: "text" },
    image_url: { type: "url" },
    image_alt: { type: "string", max: 200 },
    ...common,
    featured: { type: "bool" },
    sort_order: { type: "int", min: 0, max: 9999 },
    published: { type: "bool" },
  },
};

export const posts: Entity = {
  name: "post",
  table: "posts",
  nameField: "title",
  orderBy: "COALESCE(published_at, created_at) DESC",
  searchCols: ["title", "excerpt"],
  relations: [],
  spec: {
    slug: { type: "slug", max: 90 },
    title: { type: "string", required: true, max: 200 },
    excerpt: { type: "text", max: 400 },
    body: { type: "text" },
    cover_image_url: { type: "url" },
    cover_image_alt: { type: "string", max: 200 },
    author: { type: "string", max: 100 },
    ...common,
    status: { type: "string", oneOf: ["draft", "published"] },
    published_at: { type: "date" },
  },
};

export const testimonials: Entity = {
  name: "testimonial",
  table: "testimonials",
  nameField: "patient_name",
  orderBy: "sort_order, id DESC",
  searchCols: ["patient_name", "quote"],
  relations: [],
  spec: {
    patient_name: { type: "string", required: true, max: 120 },
    country: { type: "string", max: 80 },
    treatment: { type: "string", max: 160 },
    quote: { type: "text", required: true, max: 1500 },
    image_url: { type: "url" },
    consent_confirmed: { type: "bool" },
    published: { type: "bool" },
    sort_order: { type: "int", min: 0, max: 9999 },
  },
};

export const entities = { departments, treatments, hospitals, doctors, posts, testimonials };
export type EntityKey = keyof typeof entities;

const hasSlug = (e: Entity) => "slug" in e.spec;

function uniqueSlug(db: DB, e: Entity, base: string, ignoreId?: number): string {
  let slug = base || e.name;
  for (let n = 2; ; n++) {
    const row = db
      .prepare(`SELECT id FROM ${e.table} WHERE slug = ?`)
      .get(slug) as { id: number } | undefined;
    if (!row || row.id === ignoreId) return slug;
    slug = `${base}-${n}`;
  }
}

function parseIds(v: unknown): number[] | { error: string } {
  if (!Array.isArray(v)) return { error: "Must be a list of ids" };
  const ids: number[] = [];
  for (const x of v) {
    const n = typeof x === "number" ? x : Number(x);
    if (!Number.isInteger(n) || n < 1) return { error: "Ids must be positive whole numbers" };
    if (!ids.includes(n)) ids.push(n);
  }
  return ids;
}

function setRelations(db: DB, e: Entity, id: number, input: Record<string, unknown>) {
  for (const r of e.relations) {
    if (!(r.key in input)) continue;
    const ids = parseIds(input[r.key]) as number[];
    // Diff instead of delete-all, so other columns on the link row (e.g. a doctor's primary hospital) survive.
    const existing = (
      db.prepare(`SELECT ${r.otherCol} AS oid FROM ${r.table} WHERE ${r.ownCol} = ?`).all(id) as { oid: number }[]
    ).map((x) => x.oid);
    for (const oid of existing) {
      if (!ids.includes(oid)) db.prepare(`DELETE FROM ${r.table} WHERE ${r.ownCol} = ? AND ${r.otherCol} = ?`).run(id, oid);
    }
    for (const oid of ids) {
      if (!existing.includes(oid)) db.prepare(`INSERT INTO ${r.table} (${r.ownCol}, ${r.otherCol}) VALUES (?, ?)`).run(id, oid);
    }
    if (r.primaryCol && ids.length) {
      // the first id in the submitted list is the primary one
      db.prepare(`UPDATE ${r.table} SET ${r.primaryCol} = 0 WHERE ${r.ownCol} = ?`).run(id);
      db.prepare(`UPDATE ${r.table} SET ${r.primaryCol} = 1 WHERE ${r.ownCol} = ? AND ${r.otherCol} = ?`).run(id, ids[0]);
    }
  }
}

function checkRelations(e: Entity, input: Record<string, unknown>): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const r of e.relations) {
    if (r.key in input) {
      const p = parseIds(input[r.key]);
      if ("error" in p) errors[r.key] = p.error;
    }
  }
  return errors;
}

function crossFieldErrors(e: Entity, v: Record<string, unknown>): Record<string, string> {
  const errors: Record<string, string> = {};
  if (e.table === "treatments") {
    if (typeof v.cost_min === "number" && typeof v.cost_max === "number" && v.cost_min > v.cost_max)
      errors.cost_max = "Maximum cost must not be below minimum cost";
    if (v.cost_verified === 1 && (v.cost_min == null || v.cost_verified_on == null))
      errors.cost_verified = "A verified cost needs a minimum cost and a verified-on date";
  }
  return errors;
}

export type Row = Record<string, unknown> & { id: number };

export function getById(db: DB, e: Entity, id: number): Row | null {
  const row = db.prepare(`SELECT * FROM ${e.table} WHERE id = ?`).get(id) as Row | undefined;
  if (!row) return null;
  const out: Row = { ...row };
  for (const r of e.relations) {
    out[r.key] = (
      db
        .prepare(
          `SELECT ${r.otherCol} AS oid FROM ${r.table} WHERE ${r.ownCol} = ?` +
            (r.primaryCol ? ` ORDER BY ${r.primaryCol} DESC, ${r.otherCol}` : ` ORDER BY ${r.otherCol}`),
        )
        .all(id) as { oid: number }[]
    ).map((x) => x.oid);
  }
  return out;
}

export function createEntity(db: DB, e: Entity, input: unknown): Result<Row> {
  const src = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const v = validate(e.spec, src);
  const errors: Record<string, string> = {
    ...(v.ok ? {} : v.errors),
    ...checkRelations(e, src),
    ...(v.ok ? crossFieldErrors(e, v.value) : {}),
  };
  if (!v.ok || Object.keys(errors).length) return { ok: false, errors };

  const value = { ...v.value };
  if (e.table === "posts") {
    value.status ??= "draft";
    if (value.status === "published") value.published_at ??= new Date().toISOString();
  }
  if (hasSlug(e)) {
    const base = (value.slug as string) || slugify(String(value[e.nameField]));
    value.slug = uniqueSlug(db, e, base);
  }
  try {
    const row = tx(db, () => {
      const cols = Object.keys(value);
      const r = db
        .prepare(`INSERT INTO ${e.table} (${cols.join(",")}) VALUES (${cols.map(() => "?").join(",")})`)
        .run(...(cols.map((c) => value[c]) as (string | number | null)[]));
      const id = Number(r.lastInsertRowid);
      setRelations(db, e, id, src);
      return getById(db, e, id)!;
    });
    return { ok: true, value: row };
  } catch (err) {
    return { ok: false, errors: { _: dbMessage(err) } };
  }
}

export function updateEntity(db: DB, e: Entity, id: number, input: unknown): Result<Row> {
  const existing = getById(db, e, id);
  if (!existing) return { ok: false, errors: { _: "Not found" } };
  const src = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const v = validate(e.spec, src, { partial: true });
  const errors: Record<string, string> = {
    ...(v.ok ? {} : v.errors),
    ...checkRelations(e, src),
  };
  if (!v.ok || Object.keys(errors).length) return { ok: false, errors };

  const value = { ...v.value };
  const merged = { ...existing, ...value };
  const cross = crossFieldErrors(e, merged);
  if (Object.keys(cross).length) return { ok: false, errors: cross };

  if (hasSlug(e) && "slug" in value) {
    value.slug = uniqueSlug(db, e, (value.slug as string) || slugify(String(merged[e.nameField])), id);
  }
  if (e.table === "posts" && value.status === "published" && !existing.published_at && !value.published_at) {
    value.published_at = new Date().toISOString();
  }
  try {
    const row = tx(db, () => {
      const cols = Object.keys(value);
      if (cols.length) {
        const touch = e.table !== "testimonials" ? ", updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')" : "";
        db.prepare(`UPDATE ${e.table} SET ${cols.map((c) => `${c} = ?`).join(", ")}${touch} WHERE id = ?`).run(
          ...(cols.map((c) => value[c]) as (string | number | null)[]),
          id,
        );
      }
      setRelations(db, e, id, src);
      return getById(db, e, id)!;
    });
    return { ok: true, value: row };
  } catch (err) {
    return { ok: false, errors: { _: dbMessage(err) } };
  }
}

export function deleteEntity(db: DB, e: Entity, id: number): boolean {
  return Number(db.prepare(`DELETE FROM ${e.table} WHERE id = ?`).run(id).changes) > 0;
}

export function listEntities(
  db: DB,
  e: Entity,
  opts: { q?: string; page?: number; pageSize?: number } = {},
): { rows: Row[]; total: number; page: number; pageSize: number } {
  const pageSize = Math.min(Math.max(opts.pageSize ?? 25, 1), 100);
  const page = Math.max(opts.page ?? 1, 1);
  const where: string[] = [];
  const params: string[] = [];
  const q = opts.q?.trim();
  if (q) {
    where.push("(" + e.searchCols.map((c) => `${c} LIKE ? ESCAPE '\\'`).join(" OR ") + ")");
    const like = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
    e.searchCols.forEach(() => params.push(like));
  }
  const w = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const total = (db.prepare(`SELECT COUNT(*) AS n FROM ${e.table} ${w}`).get(...params) as { n: number }).n;
  const rows = db
    .prepare(`SELECT * FROM ${e.table} ${w} ORDER BY ${e.orderBy} LIMIT ? OFFSET ?`)
    .all(...params, pageSize, (page - 1) * pageSize) as Row[];
  return { rows, total, page, pageSize };
}

function dbMessage(err: unknown): string {
  const m = err instanceof Error ? err.message : String(err);
  if (/FOREIGN KEY/i.test(m)) return "A linked record does not exist";
  if (/UNIQUE/i.test(m)) return "A record with this value already exists";
  if (/CHECK/i.test(m)) return "A value is not allowed";
  return "Could not save the record";
}
