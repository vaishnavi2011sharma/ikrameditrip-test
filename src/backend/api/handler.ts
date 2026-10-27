import type { DB } from "../db/client";
import { getDb, isReadOnlyMode } from "../db/client";
import { site } from "../../data/site";
import { getSession, hashToken, login, logout, permissions, rateLimit, hashIp, type Session } from "../lib/auth";
import {
  createEntity, deleteEntity, entities, getById, listEntities, updateEntity, type EntityKey,
} from "../repo/entities";
import { importRows, parseCsv } from "../repo/import";
import { mailConfig, notifyLead, queueNotify, DEFAULT_NOTIFY_TO } from "../lib/mailer";
import { LEAD_STATUSES, leadsToCsv, listLeads, submitLead, updateLead } from "../repo/leads";
import * as pub from "../repo/public";
import { MAX_FILES, MAX_FILE_BYTES, deleteUpload, readUpload, saveUpload, type SavedFile } from "../lib/uploads";

export const SESSION_COOKIE = "ikra_session";
const MAX_BODY = 2_000_000; // 2 MB (bulk imports)
const MAX_LEAD_BODY = 20_000;

const SECURITY_HEADERS = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
};

function json(data: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...SECURITY_HEADERS, ...extra },
  });
}
const err = (status: number, message: string, errors?: Record<string, string>) =>
  json({ error: message, ...(errors ? { errors } : {}) }, status, { "cache-control": "no-store" });

function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (header ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function sessionCookie(token: string, secure: boolean, maxAgeSec: number) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSec}${secure ? "; Secure" : ""}`;
}

async function readJson(req: Request, limit: number): Promise<{ ok: true; value: unknown } | { ok: false; res: Response }> {
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > limit) return { ok: false, res: err(413, "Request too large") };
  const text = await req.text();
  if (text.length > limit) return { ok: false, res: err(413, "Request too large") };
  try {
    return { ok: true, value: text ? JSON.parse(text) : {} };
  } catch {
    return { ok: false, res: err(400, "Invalid JSON") };
  }
}

function clientIp(req: Request): string | null {
  if (process.env.TRUST_PROXY !== "true") return null;
  const xff = req.headers.get("x-forwarded-for");
  return xff ? xff.split(",")[0].trim() : null;
}

function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // non-browser clients / same-site navigations; CSRF header still required
  try {
    return new URL(origin).host === (req.headers.get("x-forwarded-host") ?? new URL(req.url).host);
  } catch {
    return false;
  }
}

const num = (v: string | null) => (v && /^\d+$/.test(v) ? Number(v) : undefined);

/**
 * Handle any /api/* request. Returns null when the path is not an API path so
 * the caller can fall through to the app.
 */
export async function handleApi(req: Request, db: DB = getDb()): Promise<Response | null> {
  const url = new URL(req.url);
  if (!url.pathname.startsWith("/api/")) return null;
  const path = url.pathname.replace(/^\/api\//, "").replace(/\/+$/, "");
  const seg = path.split("/");
  const method = req.method.toUpperCase();
  const q = url.searchParams;

  if (path === "health" && method === "GET") return json({ ok: true, mode: isReadOnlyMode() ? "read-only" : "read-write" });
  // Serverless hosts cannot keep a database file: refuse writes loudly rather than losing them.
  if (isReadOnlyMode() && !["GET", "HEAD", "OPTIONS"].includes(method))
    return err(503, `Enquiries are temporarily unavailable online. Please call ${site.phone} or email ${site.email}.`);

  try {
    // ---------------- public lead capture ----------------
    if (path === "leads" && method === "POST") {
      if (!sameOrigin(req)) return err(403, "Forbidden");
      const ip = clientIp(req);
      if (ip && !rateLimit(db, `lead:ip:${hashIp(ip)}`, 10, 3600)) return err(429, "Too many requests. Please try again later.");

      let fields: Record<string, unknown> = {};
      const saved: SavedFile[] = [];
      const ctype = req.headers.get("content-type") ?? "";
      if (ctype.startsWith("multipart/form-data")) {
        if (Number(req.headers.get("content-length") ?? 0) > MAX_FILES * MAX_FILE_BYTES + 100_000) return err(413, "Request too large");
        let form: FormData;
        try {
          form = await req.formData();
        } catch {
          return err(400, "Invalid form data");
        }
        const uploads: File[] = [];
        for (const [k, v] of form.entries()) {
          if (typeof v === "string") fields[k] = v;
          else if (k === "reports" && v.size > 0) uploads.push(v);
        }
        if (uploads.length > MAX_FILES) return err(400, "Please attach at most 5 files", { reports: "Too many files" });
        for (const f of uploads) {
          const r = await saveUpload(f);
          if (!r.ok) {
            saved.forEach((x) => deleteUpload(x.stored_name));
            return err(400, r.error, { reports: r.error });
          }
          saved.push(r.file);
        }
      } else {
        const body = await readJson(req, MAX_LEAD_BODY);
        if (!body.ok) return body.res;
        fields = (body.value ?? {}) as Record<string, unknown>;
      }
      const r = submitLead(db, fields, { ip: ip ?? "unknown", userAgent: req.headers.get("user-agent") ?? "" }, saved);
      if (!r.ok || r.id === 0) saved.forEach((x) => deleteUpload(x.stored_name)); // invalid or honeypot: keep nothing
      if (!r.ok) return err(r.status, r.status === 429 ? r.errors._ : "Please check the highlighted fields", r.errors);
      queueNotify(db, r.id); // saved first; e-mail outcome is recorded on the lead, never assumed
      return json({ ok: true }, 201, { "cache-control": "no-store" });
    }

    // ---------------- public read API ----------------
    if (seg[0] === "public" && method === "GET") {
      const cache = { "cache-control": "public, max-age=60, stale-while-revalidate=300" };
      const list = {
        country: q.get("country") || undefined,
        city: q.get("city") || undefined,
        department: q.get("department") || undefined,
        treatment: q.get("treatment") || undefined,
        hospital: q.get("hospital") || undefined,
        q: q.get("q") || undefined,
        page: num(q.get("page")),
        pageSize: num(q.get("pageSize")),
      };
      const one = (v: unknown) => (v ? json(v, 200, cache) : err(404, "Not found"));
      switch (seg[1]) {
        case "nav": return json(pub.navData(db), 200, cache);
        case "search": return json(pub.searchAll(db, { q: q.get("q") || undefined, department: list.department, city: list.city, country: list.country }), 200, cache);
        case "home": return json(pub.homeData(db), 200, cache);
        case "facets": return json(pub.facets(db), 200, cache);
        case "departments": return seg[2] ? one(pub.getDepartment(db, seg[2])) : json(pub.listDepartments(db), 200, cache);
        case "treatments": return seg[2] ? one(pub.getTreatment(db, seg[2])) : json(pub.listTreatments(db), 200, cache);
        case "doctors": return seg[2] ? one(pub.getDoctor(db, seg[2])) : json(pub.listDoctors(db, list), 200, cache);
        case "hospitals": return seg[2] ? one(pub.getHospital(db, seg[2])) : json(pub.listHospitals(db, list), 200, cache);
        case "posts": return seg[2] ? one(pub.getPost(db, seg[2])) : json(pub.listPosts(db, list), 200, cache);
        case "testimonials": return json(pub.listTestimonials(db), 200, cache);
      }
      return err(404, "Not found");
    }

    // ---------------- admin ----------------
    if (seg[0] !== "admin") return err(404, "Not found");
    const secure = url.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";
    const token = parseCookies(req.headers.get("cookie"))[SESSION_COOKIE];

    if (seg[1] === "login" && method === "POST") {
      if (!sameOrigin(req)) return err(403, "Forbidden");
      const body = await readJson(req, 4_000);
      if (!body.ok) return body.res;
      const { email, password } = (body.value ?? {}) as { email?: unknown; password?: unknown };
      if (typeof email !== "string" || typeof password !== "string" || !email || !password || password.length > 200)
        return err(400, "Email and password are required");
      const ip = clientIp(req);
      const limiter = rateLimit(db, `login:em:${email.toLowerCase()}`, 10, 900) && (!ip || rateLimit(db, `login:ip:${hashIp(ip)}`, 30, 900));
      if (!limiter) return err(429, "Too many attempts. Try again later.");
      const r = await login(db, email, password);
      if (!r.ok) return err(r.reason === "locked" ? 423 : 401, r.reason === "locked" ? "Account temporarily locked. Try again later." : "Invalid email or password");
      return json({ user: r.session.user, csrf: r.session.csrf }, 200, {
        "cache-control": "no-store",
        "set-cookie": sessionCookie(r.token, secure, 7 * 86400),
      });
    }

    const session: Session | null = getSession(db, token);
    if (!session) return err(401, "Not signed in");

    if (seg[1] === "me" && method === "GET") return json({ user: session.user, csrf: session.csrf }, 200, { "cache-control": "no-store" });

    // everything below changes state or exposes private data → CSRF + origin on non-GET
    const mutating = method !== "GET" && method !== "HEAD";
    if (mutating) {
      if (!sameOrigin(req)) return err(403, "Forbidden");
      const sent = req.headers.get("x-csrf-token");
      if (!sent || sent !== session.csrf) return err(403, "Invalid CSRF token");
    }

    if (seg[1] === "logout" && method === "POST") {
      logout(db, token);
      return json({ ok: true }, 200, { "set-cookie": sessionCookie("", secure, 0), "cache-control": "no-store" });
    }

    const can = (perm: keyof typeof permissions) => permissions[perm].includes(session.user.role);
    const audit = (action: string, entity: string, id: string | number) =>
      db.prepare("INSERT INTO audit_log (user_id, action, entity, entity_id) VALUES (?, ?, ?, ?)").run(session.user.id, action, entity, String(id));
    const noStore = { "cache-control": "no-store" };

    // never exposes secrets: only whether e-mail is set up, what is missing and where it goes
    const mailStatus = () => {
      const c = mailConfig();
      return c.ok ? { configured: true, to: c.config.to, missing: [] as string[] } : { configured: false, to: [process.env.LEAD_NOTIFY_TO || DEFAULT_NOTIFY_TO], missing: c.missing };
    };

    // ---- leads ----
    if (seg[1] === "leads") {
      if (!can("leads")) return err(403, "You do not have access to leads");
      if (seg[2] === "export.csv" && method === "GET") {
        audit("export", "leads", "all");
        return new Response(leadsToCsv(db), {
          headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="leads.csv"', ...noStore, ...SECURITY_HEADERS },
        });
      }
      if (!seg[2] && method === "GET") {
        return json({ ...listLeads(db, { status: q.get("status") || undefined, type: q.get("type") || undefined, q: q.get("q") || undefined, page: num(q.get("page")), pageSize: num(q.get("pageSize")) }), statuses: LEAD_STATUSES, mail: mailStatus() }, 200, noStore);
      }
      if (seg[2] === "files" && seg[3] && method === "GET") {
        const fid = num(seg[3]);
        const f = fid ? (db.prepare("SELECT * FROM lead_files WHERE id = ?").get(fid) as { stored_name: string; original_name: string; mime: string } | undefined) : undefined;
        const buf = f ? readUpload(f.stored_name) : null;
        if (!f || !buf) return err(404, "Not found");
        audit("download", "lead_files", fid!);
        return new Response(new Uint8Array(buf), {
          headers: {
            "content-type": f.mime,
            "content-disposition": `attachment; filename="${f.original_name.replace(/"/g, "")}"`,
            "x-content-type-options": "nosniff",
            "content-security-policy": "default-src 'none'",
            ...noStore,
          },
        });
      }
      const id = num(seg[2] ?? null);
      if (id && seg[3] === "notify" && method === "POST") {
        const exists = db.prepare("SELECT 1 FROM leads WHERE id = ?").get(id);
        if (!exists) return err(404, "Not found");
        const r = await notifyLead(db, id);
        audit("notify", "leads", id);
        return json(r, 200, noStore);
      }
      if (id && method === "PATCH") {
        const body = await readJson(req, MAX_LEAD_BODY);
        if (!body.ok) return body.res;
        if (!updateLead(db, id, body.value)) return err(400, "Nothing to update or invalid values");
        audit("update", "leads", id);
        return json({ ok: true }, 200, noStore);
      }
      return err(404, "Not found");
    }

    // ---- content entities ----
    const key = seg[1] as EntityKey;
    if (key in entities) {
      if (!can("content")) return err(403, "You do not have access to content");
      const ent = entities[key];

      if (seg[2] === "import" && method === "POST") {
        const body = await readJson(req, MAX_BODY);
        if (!body.ok) return body.res;
        const { format, data } = (body.value ?? {}) as { format?: string; data?: unknown };
        let rows: Record<string, unknown>[];
        try {
          if (format === "csv" && typeof data === "string") rows = parseCsv(data);
          else if (format === "json" && Array.isArray(data)) rows = data as Record<string, unknown>[];
          else return err(400, 'Provide {"format":"csv","data":"<text>"} or {"format":"json","data":[...]}');
        } catch {
          return err(400, "Could not parse the file");
        }
        if (rows.length > 2000) return err(400, "Import at most 2000 rows at a time");
        const dryRun = q.get("dryRun") === "1";
        const report = importRows(db, key, rows, { dryRun });
        if (!dryRun) audit("import", key, `${report.created}c/${report.updated}u`);
        return json(report, 200, noStore);
      }

      if (!seg[2]) {
        if (method === "GET") return json(listEntities(db, ent, { q: q.get("q") || undefined, page: num(q.get("page")), pageSize: num(q.get("pageSize")) }), 200, noStore);
        if (method === "POST") {
          const body = await readJson(req, MAX_BODY / 4);
          if (!body.ok) return body.res;
          const r = createEntity(db, ent, body.value);
          if (!r.ok) return err(400, "Validation failed", r.errors);
          audit("create", key, r.value.id);
          return json(r.value, 201, noStore);
        }
      } else {
        const id = num(seg[2]);
        if (!id) return err(404, "Not found");
        if (method === "GET") {
          const row = getById(db, ent, id);
          return row ? json(row, 200, noStore) : err(404, "Not found");
        }
        if (method === "PATCH") {
          const body = await readJson(req, MAX_BODY / 4);
          if (!body.ok) return body.res;
          const r = updateEntity(db, ent, id, body.value);
          if (!r.ok) return err(r.errors._ === "Not found" ? 404 : 400, r.errors._ === "Not found" ? "Not found" : "Validation failed", r.errors);
          audit("update", key, id);
          return json(r.value, 200, noStore);
        }
        if (method === "DELETE") {
          if (!deleteEntity(db, ent, id)) return err(404, "Not found");
          audit("delete", key, id);
          return json({ ok: true }, 200, noStore);
        }
      }
    }
    return err(404, "Not found");
  } catch (e) {
    console.error("API error", e);
    return err(500, "Something went wrong");
  }
}

export { hashToken };
