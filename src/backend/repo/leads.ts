import type { DB } from "../db/client";
import { rateLimit, hashIp } from "../lib/auth";
import { validate, type Spec } from "../lib/validate";

const publicSpec: Spec = {
  type: { type: "string", oneOf: ["appointment", "cost_enquiry", "contact"] },
  name: { type: "string", required: true, min: 2, max: 100 },
  age: { type: "int", min: 0, max: 120 },
  email: { type: "email", max: 255 },
  phone: { type: "string", required: true, min: 6, max: 20 },
  country: { type: "string", max: 100 },
  city: { type: "string", max: 100 },
  treatment_interest: { type: "string", max: 160 },
  message: { type: "text", max: 1500 },
  source_page: { type: "string", max: 300 },
  consent: { type: "bool" },
};

const PHONE = /^[+()\d][\d\s().-]{4,19}$/;

export type SubmitResult =
  | { ok: true; id: number }
  | { ok: false; status: 400 | 429; errors: Record<string, string> };

/**
 * Public lead submission. Spam defences: honeypot field ("website"), per-IP and
 * per-email rate limits. Honeypot hits return success without storing anything
 * so bots get no signal.
 */
export function submitLead(
  db: DB,
  body: unknown,
  ctx: { ip: string; userAgent?: string },
  files: { stored_name: string; original_name: string; mime: string; size: number }[] = [],
): SubmitResult {
  const src = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  if (typeof src.website === "string" && src.website.trim() !== "") return { ok: true, id: 0 };

  const v = validate(publicSpec, src);
  const errors: Record<string, string> = v.ok ? {} : { ...v.errors };
  if (v.ok && !PHONE.test(String(v.value.phone))) errors.phone = "Enter a valid phone number";
  if (Object.keys(errors).length || !v.ok) return { ok: false, status: 400, errors };

  const ipKey = hashIp(ctx.ip);
  if (!rateLimit(db, `lead:ip:${ipKey}`, 5, 3600) || !rateLimit(db, `lead:ph:${String(v.value.phone).replace(/\D/g, "")}`, 5, 3600)) {
    return { ok: false, status: 429, errors: { _: "Too many requests. Please try again later or call us." } };
  }

  // Optional links to the page the lead came from (ids resolved by slug, never trusted blindly)
  const link = (table: string, slug: unknown): number | null => {
    if (typeof slug !== "string" || !slug) return null;
    const r = db.prepare(`SELECT id FROM ${table} WHERE slug = ?`).get(slug) as { id: number } | undefined;
    return r?.id ?? null;
  };

  const r = db
    .prepare(
      `INSERT INTO leads (type, name, age, email, phone, country, city, treatment_interest, message, source_page,
                          doctor_id, hospital_id, treatment_id, consent, ip_hash, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      (v.value.type as string) ?? "appointment",
      v.value.name as string,
      (v.value.age as number) ?? null,
      v.value.email ? (v.value.email as string).toLowerCase() : null,
      v.value.phone as string,
      (v.value.country as string) ?? null,
      (v.value.city as string) ?? null,
      (v.value.treatment_interest as string) ?? null,
      (v.value.message as string) ?? null,
      (v.value.source_page as string) ?? null,
      link("doctors", src.doctor_slug),
      link("hospitals", src.hospital_slug),
      link("treatments", src.treatment_slug),
      (v.value.consent as number) ?? 0,
      ipKey,
      (ctx.userAgent ?? "").slice(0, 300),
    );
  const id = Number(r.lastInsertRowid);
  for (const f of files.slice(0, 5)) {
    db.prepare("INSERT INTO lead_files (lead_id, stored_name, original_name, mime, size) VALUES (?, ?, ?, ?, ?)").run(
      id, f.stored_name, f.original_name, f.mime, f.size,
    );
  }
  return { ok: true, id };
}

export const LEAD_STATUSES = ["new", "contacted", "qualified", "closed", "spam"] as const;

export function listLeads(
  db: DB,
  o: { status?: string; q?: string; type?: string; page?: number; pageSize?: number } = {},
) {
  const where: string[] = [];
  const p: (string | number)[] = [];
  if (o.status && (LEAD_STATUSES as readonly string[]).includes(o.status)) { where.push("l.status = ?"); p.push(o.status); }
  if (o.type) { where.push("l.type = ?"); p.push(o.type); }
  if (o.q?.trim()) {
    const like = `%${o.q.trim().replace(/[\\%_]/g, "\\$&")}%`;
    where.push("(l.name LIKE ? ESCAPE '\\' OR l.email LIKE ? ESCAPE '\\' OR l.phone LIKE ? ESCAPE '\\')");
    p.push(like, like, like);
  }
  const w = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const pageSize = Math.min(Math.max(o.pageSize ?? 25, 1), 200);
  const page = Math.max(o.page ?? 1, 1);
  const total = (db.prepare(`SELECT COUNT(*) n FROM leads l ${w}`).get(...p) as { n: number }).n;
  const rows = db
    .prepare(
      `SELECT l.*, d.name AS doctor_name, h.name AS hospital_name, t.name AS treatment_name FROM leads l
         LEFT JOIN doctors d ON d.id = l.doctor_id
         LEFT JOIN hospitals h ON h.id = l.hospital_id
         LEFT JOIN treatments t ON t.id = l.treatment_id
         ${w} ORDER BY l.created_at DESC, l.id DESC LIMIT ? OFFSET ?`,
    )
    .all(...p, pageSize, (page - 1) * pageSize) as Record<string, unknown>[];
  for (const r of rows) {
    r.files = db.prepare("SELECT id, original_name, mime, size FROM lead_files WHERE lead_id = ?").all(r.id as number);
  }
  return { rows, total, page, pageSize };
}

export function updateLead(db: DB, id: number, patch: unknown): boolean {
  const spec: Spec = {
    status: { type: "string", oneOf: LEAD_STATUSES },
    internal_notes: { type: "text", max: 3000 },
    assigned_to: { type: "int", min: 1 },
  };
  const v = validate(spec, patch, { partial: true });
  if (!v.ok) return false;
  const cols = Object.keys(v.value);
  if (!cols.length) return false;
  const r = db
    .prepare(
      `UPDATE leads SET ${cols.map((c) => `${c} = ?`).join(", ")}, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`,
    )
    .run(...(cols.map((c) => v.value[c]) as (string | number | null)[]), id);
  return Number(r.changes) > 0;
}

/** CSV export. Cells starting with = + - @ are prefixed to block spreadsheet formula injection. */
export function leadsToCsv(db: DB): string {
  const rows = db
    .prepare(
      `SELECT l.id, l.created_at, l.type, l.status, l.name, l.age, l.email, l.phone, l.country, l.city, l.treatment_interest,
              l.message, l.source_page, h.name AS hospital, d.name AS doctor, t.name AS treatment, l.internal_notes
         FROM leads l LEFT JOIN doctors d ON d.id = l.doctor_id LEFT JOIN hospitals h ON h.id = l.hospital_id
         LEFT JOIN treatments t ON t.id = l.treatment_id ORDER BY l.created_at DESC`,
    )
    .all() as Record<string, unknown>[];
  const cols = ["id", "created_at", "type", "status", "name", "age", "email", "phone", "country", "city", "treatment_interest", "message", "source_page", "hospital", "doctor", "treatment", "internal_notes"];
  const cell = (v: unknown) => {
    let s = v == null ? "" : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\r\n");
}
