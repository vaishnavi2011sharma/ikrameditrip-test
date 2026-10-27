import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { openDb, type DB } from "../src/backend/db/client";
import { validate, slugify, isSafeUrl } from "../src/backend/lib/validate";
import { createUser, login, getSession, hashPassword, verifyPassword, passwordProblem } from "../src/backend/lib/auth";
import { createEntity, updateEntity, entities, getById, deleteEntity } from "../src/backend/repo/entities";
import * as pub from "../src/backend/repo/public";
import { submitLead, leadsToCsv, listLeads } from "../src/backend/repo/leads";
import { importRows, parseCsv } from "../src/backend/repo/import";
import { handleApi } from "../src/backend/api/handler";
import { buildSitemap, buildRobots } from "../src/backend/lib/seo";
import { suppliedDoctors } from "../src/data/supplied-doctors";
import { seed } from "../src/backend/seed";

const PW = "CorrectHorse9Battery";
let db: DB;
beforeEach(() => {
  db = openDb(":memory:");
});

const must = <T>(r: { ok: boolean; value?: T; errors?: unknown }): T => {
  assert.ok(r.ok, JSON.stringify(r.errors));
  return r.value as T;
};

describe("validation", () => {
  test("slugify", () => {
    assert.equal(slugify("Urology & Kidney Transplant"), "urology-and-kidney-transplant");
    assert.equal(slugify("  Dr. Z S Meharwal "), "dr-z-s-meharwal");
  });
  test("unsafe URLs are rejected", () => {
    assert.equal(isSafeUrl("javascript:alert(1)"), false);
    assert.equal(isSafeUrl("data:text/html,x"), false);
    assert.equal(isSafeUrl("//evil.com/x"), false);
    assert.equal(isSafeUrl("https://ok.com/a.png"), true);
    assert.equal(isSafeUrl("/images/a.png"), true);
  });
  test("unknown keys are dropped (mass assignment)", () => {
    const r = validate({ name: { type: "string", required: true } }, { name: "A", role: "admin" });
    assert.ok(r.ok);
    assert.deepEqual(r.value, { name: "A" });
  });
  test("partial skips absent, required enforced otherwise", () => {
    const spec = { name: { type: "string", required: true } } as const;
    assert.ok(validate(spec, {}, { partial: true }).ok);
    assert.ok(!validate(spec, {}).ok);
  });
});

describe("entities & relationships", () => {
  test("slug auto-generated and made unique", () => {
    const a = must(createEntity(db, entities.hospitals, { name: "Apollo", city: "Delhi" }));
    const b = must(createEntity(db, entities.hospitals, { name: "Apollo", city: "Chennai" }));
    assert.equal(a.slug, "apollo");
    assert.equal(b.slug, "apollo-2");
  });
  test("rejects javascript: image URL and bad relation ids", () => {
    const r = createEntity(db, entities.doctors, { name: "Dr A", image_url: "javascript:alert(1)" });
    assert.ok(!r.ok && r.errors.image_url);
    const r2 = createEntity(db, entities.doctors, { name: "Dr B", hospital_ids: [999] });
    assert.ok(!r2.ok && r2.errors._);
    assert.equal((db.prepare("SELECT COUNT(*) n FROM doctors").get() as { n: number }).n, 0, "failed create left no row");
  });
  test("doctor ↔ hospital ↔ department ↔ treatment links round-trip", () => {
    const dep = must(createEntity(db, entities.departments, { name: "Cardiology" }));
    const h = must(createEntity(db, entities.hospitals, { name: "H1", city: "Delhi", department_ids: [dep.id] }));
    const d = must(createEntity(db, entities.doctors, { name: "Dr X", hospital_ids: [h.id], department_ids: [dep.id] }));
    const t = must(createEntity(db, entities.treatments, { name: "Bypass", department_id: dep.id, hospital_ids: [h.id], doctor_ids: [d.id] }));
    assert.deepEqual(getById(db, entities.doctors, d.id)!.hospital_ids, [h.id]);
    const doc = pub.getDoctor(db, "dr-x")!;
    assert.equal((doc.hospitals as { slug: string }[])[0].slug, "h1");
    assert.equal((doc.treatments as { slug: string }[])[0].slug, t.slug);
    const hosp = pub.getHospital(db, "h1")!;
    assert.equal((hosp.doctors as unknown[]).length, 1);
    const tr = pub.getTreatment(db, "bypass")!;
    assert.equal((tr.department as { slug: string }).slug, "cardiology");
    assert.equal((pub.getDepartment(db, "cardiology")!.doctors as unknown[]).length, 1);
  });
  test("first hospital id becomes primary and relations can be replaced", () => {
    const h1 = must(createEntity(db, entities.hospitals, { name: "A", city: "X" }));
    const h2 = must(createEntity(db, entities.hospitals, { name: "B", city: "Y" }));
    const d = must(createEntity(db, entities.doctors, { name: "Dr P", hospital_ids: [h2.id, h1.id] }));
    assert.deepEqual(getById(db, entities.doctors, d.id)!.hospital_ids, [h2.id, h1.id]);
    must(updateEntity(db, entities.doctors, d.id, { hospital_ids: [h1.id] }));
    assert.deepEqual(getById(db, entities.doctors, d.id)!.hospital_ids, [h1.id]);
  });
  test("deleting a hospital keeps doctors, removes links", () => {
    const h = must(createEntity(db, entities.hospitals, { name: "A", city: "X" }));
    const d = must(createEntity(db, entities.doctors, { name: "Dr Q", hospital_ids: [h.id] }));
    assert.ok(deleteEntity(db, entities.hospitals, h.id));
    assert.deepEqual(getById(db, entities.doctors, d.id)!.hospital_ids, []);
  });
});

describe("verified costs", () => {
  test("cost hidden until verified, and verification needs data", () => {
    const t = must(createEntity(db, entities.treatments, { name: "Knee Replacement", cost_min: 4000, cost_max: 6000 }));
    assert.equal(pub.getTreatment(db, t.slug as string)!.cost, null);
    assert.ok(!updateEntity(db, entities.treatments, t.id, { cost_verified: true }).ok, "needs verified-on date");
    must(updateEntity(db, entities.treatments, t.id, { cost_verified: true, cost_verified_on: "2026-10-01" }));
    const c = pub.getTreatment(db, t.slug as string)!.cost as { min: number; max: number };
    assert.deepEqual([c.min, c.max], [4000, 6000]);
    const raw = JSON.stringify(pub.listTreatments(db));
    assert.ok(!raw.includes("cost_min"));
  });
  test("min > max rejected", () => {
    assert.ok(!createEntity(db, entities.treatments, { name: "X", cost_min: 10, cost_max: 5 }).ok);
  });
});

describe("filters & visibility", () => {
  beforeEach(() => {
    const cardio = must(createEntity(db, entities.departments, { name: "Cardiology" }));
    const neuro = must(createEntity(db, entities.departments, { name: "Neurology" }));
    const hd = must(createEntity(db, entities.hospitals, { name: "Delhi Hosp", city: "Delhi", department_ids: [cardio.id] }));
    const hk = must(createEntity(db, entities.hospitals, { name: "Kolkata Hosp", city: "Kolkata", department_ids: [neuro.id] }));
    must(createEntity(db, entities.hospitals, { name: "Hidden Hosp", city: "Delhi", published: false }));
    must(createEntity(db, entities.doctors, { name: "Dr Delhi", hospital_ids: [hd.id], department_ids: [cardio.id] }));
    must(createEntity(db, entities.doctors, { name: "Dr Kol", hospital_ids: [hk.id], department_ids: [neuro.id] }));
    must(createEntity(db, entities.doctors, { name: "Dr Hidden", published: false }));
  });
  test("doctors filter by city / country / department / search", () => {
    assert.equal(pub.listDoctors(db).total, 2, "unpublished hidden");
    assert.deepEqual(pub.listDoctors(db, { city: "Kolkata" }).rows.map((r) => r.name), ["Dr Kol"]);
    assert.equal(pub.listDoctors(db, { country: "India" }).total, 2);
    assert.equal(pub.listDoctors(db, { country: "Kenya" }).total, 0);
    assert.deepEqual(pub.listDoctors(db, { department: "cardiology" }).rows.map((r) => r.name), ["Dr Delhi"]);
    assert.equal(pub.listDoctors(db, { q: "kol" }).total, 1);
    assert.equal(pub.listDoctors(db, { q: "%" }).total, 0, "LIKE wildcards are escaped");
  });
  test("hospitals filter and facets only list published values", () => {
    assert.equal(pub.listHospitals(db, { city: "Delhi" }).total, 1);
    assert.equal(pub.listHospitals(db, { department: "neurology" }).total, 1);
    const f = pub.facets(db);
    assert.deepEqual(f.cities.map((c) => c.value), ["Delhi", "Kolkata"]);
    assert.equal(f.cities.find((c) => c.value === "Delhi")!.count, 1);
  });
  test("unpublished detail pages 404", () => {
    assert.equal(pub.getDoctor(db, "dr-hidden"), null);
    assert.equal(pub.getHospital(db, "hidden-hosp"), null);
  });
  test("SQL injection in filter is inert", () => {
    assert.equal(pub.listDoctors(db, { city: "x' OR '1'='1" }).total, 0);
  });
});

describe("blog & testimonials", () => {
  test("drafts are hidden, publishing stamps a date", () => {
    const p = must(createEntity(db, entities.posts, { title: "Hello" }));
    assert.equal(pub.listPosts(db).total, 0);
    must(updateEntity(db, entities.posts, p.id, { status: "published" }));
    assert.equal(pub.listPosts(db).total, 1);
    assert.ok(pub.getPost(db, "hello")!.published_at);
  });
  test("testimonials need both published and consent", () => {
    const t = must(createEntity(db, entities.testimonials, { patient_name: "A", quote: "Good", published: true }));
    assert.equal(pub.listTestimonials(db).length, 0);
    must(updateEntity(db, entities.testimonials, t.id, { consent_confirmed: true }));
    assert.equal(pub.listTestimonials(db).length, 1);
  });
});

describe("leads", () => {
  const ctx = { ip: "1.2.3.4" };
  const good = { name: "Amina Yusuf", email: "Amina@Example.com", phone: "+254 700 000000", country: "Kenya", message: "Need cardiac opinion" };

  test("valid lead is stored and email normalised", () => {
    const r = submitLead(db, good, ctx);
    assert.ok(r.ok && r.id > 0);
    const rows = listLeads(db).rows as { email: string; status: string }[];
    assert.equal(rows[0].email, "amina@example.com");
    assert.equal(rows[0].status, "new");
  });
  test("validation errors", () => {
    const r = submitLead(db, { name: "A", email: "nope", phone: "abc" }, ctx);
    assert.ok(!r.ok && r.status === 400);
    assert.ok(!r.ok && r.errors.name && r.errors.email && r.errors.phone);
  });
  test("honeypot is silently dropped", () => {
    const r = submitLead(db, { ...good, website: "http://spam" }, ctx);
    assert.ok(r.ok && r.id === 0);
    assert.equal(listLeads(db).total, 0);
  });
  test("rate limit per email", () => {
    for (let i = 0; i < 5; i++) assert.ok(submitLead(db, good, { ip: `9.9.9.${i}` }).ok);
    const r = submitLead(db, good, { ip: "9.9.9.99" });
    assert.ok(!r.ok && r.status === 429);
  });
  test("links to doctor/hospital/treatment by slug; unknown slugs ignored", () => {
    const h = must(createEntity(db, entities.hospitals, { name: "H", city: "C" }));
    submitLead(db, { ...good, hospital_slug: "h", doctor_slug: "nope", type: "cost_enquiry" }, ctx);
    const row = listLeads(db).rows[0] as { hospital_id: number; doctor_id: number | null; type: string };
    assert.equal(row.hospital_id, h.id);
    assert.equal(row.doctor_id, null);
    assert.equal(row.type, "cost_enquiry");
  });
  test("CSV export neutralises formula injection", () => {
    submitLead(db, { ...good, name: "=HYPERLINK(\"http://x\")" }, ctx);
    const csv = leadsToCsv(db);
    assert.ok(csv.includes("\"'=HYPERLINK("), csv);
  });
});

describe("auth", () => {
  test("password hashing", async () => {
    const h = await hashPassword(PW);
    assert.ok(await verifyPassword(PW, h));
    assert.ok(!(await verifyPassword("wrong", h)));
    assert.ok(!h.includes(PW));
  });
  test("weak passwords rejected", async () => {
    assert.ok(passwordProblem("short"));
    await assert.rejects(createUser(db, { email: "a@b.co", name: "A", password: "alllowercase1234", role: "admin" }));
  });
  test("login, session, lockout", async () => {
    await createUser(db, { email: "Admin@Ikra.test", name: "A", password: PW, role: "admin" });
    const ok = await login(db, "admin@ikra.test", PW);
    assert.ok(ok.ok);
    assert.equal(ok.ok && getSession(db, ok.token)?.user.role, "admin");
    const raw = db.prepare("SELECT token_hash FROM sessions").get() as { token_hash: string };
    assert.ok(ok.ok && raw.token_hash !== ok.token, "token stored hashed");
    for (let i = 0; i < 4; i++) assert.deepEqual(await login(db, "admin@ikra.test", "bad"), { ok: false, reason: "invalid" });
    assert.deepEqual(await login(db, "admin@ikra.test", "bad"), { ok: false, reason: "locked" });
    assert.deepEqual(await login(db, "admin@ikra.test", PW), { ok: false, reason: "locked" });
  });
  test("expired session is rejected", async () => {
    await createUser(db, { email: "a@b.co", name: "A", password: PW, role: "admin" });
    const r = await login(db, "a@b.co", PW);
    db.exec("UPDATE sessions SET expires_at = '2000-01-01T00:00:00Z'");
    assert.equal(r.ok && getSession(db, r.token), null);
  });
});

describe("import", () => {
  test("CSV parsing handles quotes, commas and newlines", () => {
    const rows = parseCsv('name,city,summary\r\n"Apollo, Main",Delhi,"Line1\nLine ""2"""\r\n');
    assert.deepEqual(rows, [{ name: "Apollo, Main", city: "Delhi", summary: 'Line1\nLine "2"' }]);
  });
  test("dry run reports but writes nothing; real run creates then updates", () => {
    const csv = "name,city\nA Hospital,Delhi\nB Hospital,\n";
    const dry = importRows(db, "hospitals", parseCsv(csv), { dryRun: true });
    assert.equal(dry.created, 1);
    assert.equal(dry.failed.length, 1);
    assert.equal(dry.failed[0].row, 3);
    assert.equal((db.prepare("SELECT COUNT(*) n FROM hospitals").get() as { n: number }).n, 0);
    const real = importRows(db, "hospitals", parseCsv(csv));
    assert.equal(real.created, 1);
    const again = importRows(db, "hospitals", parseCsv("name,city,summary\nA Hospital,Delhi,Updated"));
    assert.equal(again.updated, 1);
    assert.equal((pub.getHospital(db, "a-hospital") as unknown as { summary: string }).summary, "Updated");
  });
  test("relations by slug; unknown slug reported", () => {
    importRows(db, "departments", [{ name: "Cardiology" }]);
    importRows(db, "hospitals", [{ name: "H1", city: "Delhi", departments: "cardiology" }]);
    const r = importRows(db, "doctors", [
      { name: "Dr Good", hospitals: "h1", departments: "cardiology" },
      { name: "Dr Bad", hospitals: "nope" },
    ]);
    assert.equal(r.created, 1);
    assert.equal(r.failed.length, 1);
    assert.match(r.failed[0].errors.hospitals, /Unknown hospital slug "nope"/);
    assert.equal(pub.listDoctors(db, { department: "cardiology" }).total, 1);
  });
});

describe("seed from client data", () => {
  test("seeds, is idempotent, links nothing it cannot know", () => {
    const s = seed(db);
    assert.equal(s.departments, 25);
    assert.equal(s.treatments, 10);
    assert.equal(s.hospitals, 22);
    assert.equal(s.doctors, 75 + 97, "75 original + 97 supplied profiles not yet present");
    const again = seed(db);
    assert.deepEqual([again.departments, again.hospitals, again.doctors, again.treatments], [0, 0, 0, 0]);
    // no fabricated content
    assert.equal((db.prepare("SELECT COUNT(*) n FROM testimonials").get() as { n: number }).n, 0);
    assert.equal((db.prepare("SELECT COUNT(*) n FROM treatments WHERE cost_verified = 1").get() as { n: number }).n, 0);
    // hospital links exist ONLY where the client's own documents name the hospital (68 profiles have none)
    const linked = (db.prepare("SELECT COUNT(DISTINCT doctor_id) n FROM doctor_hospitals").get() as { n: number }).n;
    assert.equal(linked, suppliedDoctors.filter((d) => d.hospital).length);
    // two Manipal Bangalore/Siliguri entries get distinct slugs
    const manipal = pub.listHospitals(db, { q: "Manipal" }).rows.map((r) => r.slug);
    assert.equal(new Set(manipal).size, manipal.length);
    assert.ok(pub.facets(db).cities.length >= 6);
  });
});

describe("seo", () => {
  test("sitemap lists every published page and no unpublished ones", () => {
    seed(db);
    createEntity(db, entities.doctors, { name: "Dr Secret", published: false });
    const xml = buildSitemap(db, "https://example.com");
    assert.ok(xml.includes("<loc>https://example.com/doctors/dr-tapti-sen</loc>"));
    assert.ok(!xml.includes("dr-secret"));
    assert.ok(xml.includes("<loc>https://example.com/services/cardiology</loc>"));
    assert.ok((xml.match(/<url>/g) ?? []).length >= 9 + 17 + 20 + 75);
  });
  test("robots blocks admin and api, points to sitemap", () => {
    const r = buildRobots("https://example.com");
    assert.match(r, /Disallow: \/admin/);
    assert.match(r, /Sitemap: https:\/\/example.com\/sitemap.xml/);
  });
});

describe("HTTP API", () => {
  const origin = "http://localhost:3000";
  const req = (path: string, init: RequestInit & { cookie?: string; csrf?: string } = {}) => {
    const headers = new Headers(init.headers);
    if (init.cookie) headers.set("cookie", init.cookie);
    if (init.csrf) headers.set("x-csrf-token", init.csrf);
    if (init.body) headers.set("content-type", "application/json");
    return new Request(origin + path, { ...init, headers });
  };
  const signIn = async (role: "admin" | "editor" | "sales", email = `${role}@t.co`) => {
    await createUser(db, { email, name: role, password: PW, role });
    const res = (await handleApi(req("/api/admin/login", { method: "POST", body: JSON.stringify({ email, password: PW }) }), db))!;
    assert.equal(res.status, 200);
    const cookie = res.headers.get("set-cookie")!;
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Strict/);
    const { csrf } = (await res.json()) as { csrf: string };
    return { cookie: cookie.split(";")[0], csrf };
  };

  test("non-API paths fall through", async () => {
    assert.equal(await handleApi(new Request(origin + "/doctors"), db), null);
  });
  test("public lead POST stores a lead", async () => {
    const res = (await handleApi(req("/api/leads", { method: "POST", body: JSON.stringify({ name: "Test Person", email: "t@e.com", phone: "+91 98765 43210" }) }), db))!;
    assert.equal(res.status, 201);
    assert.equal(listLeads(db).total, 1);
  });
  test("lead POST validation → 400 with field errors", async () => {
    const res = (await handleApi(req("/api/leads", { method: "POST", body: JSON.stringify({ name: "x" }) }), db))!;
    assert.equal(res.status, 400);
    assert.ok(((await res.json()) as { errors: object }).errors);
  });
  test("cross-origin lead POST refused", async () => {
    const res = (await handleApi(req("/api/leads", { method: "POST", headers: { origin: "https://evil.com" }, body: "{}" }), db))!;
    assert.equal(res.status, 403);
  });
  test("oversized body refused", async () => {
    const res = (await handleApi(req("/api/leads", { method: "POST", body: JSON.stringify({ message: "x".repeat(30_000) }) }), db))!;
    assert.equal(res.status, 413);
  });
  test("admin endpoints require sign-in", async () => {
    for (const p of ["/api/admin/doctors", "/api/admin/leads", "/api/admin/me"]) {
      assert.equal((await handleApi(req(p), db))!.status, 401, p);
    }
  });
  test("bad credentials → 401 without revealing which part was wrong", async () => {
    await createUser(db, { email: "a@t.co", name: "A", password: PW, role: "admin" });
    const r1 = (await handleApi(req("/api/admin/login", { method: "POST", body: JSON.stringify({ email: "a@t.co", password: "nope" }) }), db))!;
    const r2 = (await handleApi(req("/api/admin/login", { method: "POST", body: JSON.stringify({ email: "x@t.co", password: "nope" }) }), db))!;
    assert.equal(r1.status, 401);
    assert.deepEqual(await r1.json(), await r2.json());
  });
  test("CSRF token required for admin writes", async () => {
    const s = await signIn("admin");
    const noCsrf = (await handleApi(req("/api/admin/doctors", { method: "POST", cookie: s.cookie, body: JSON.stringify({ name: "Dr N" }) }), db))!;
    assert.equal(noCsrf.status, 403);
    const wrong = (await handleApi(req("/api/admin/doctors", { method: "POST", cookie: s.cookie, csrf: "x", body: JSON.stringify({ name: "Dr N" }) }), db))!;
    assert.equal(wrong.status, 403);
    const ok = (await handleApi(req("/api/admin/doctors", { method: "POST", cookie: s.cookie, csrf: s.csrf, body: JSON.stringify({ name: "Dr N" }) }), db))!;
    assert.equal(ok.status, 201);
  });
  test("admin CRUD cycle", async () => {
    const s = await signIn("admin");
    const h = { cookie: s.cookie, csrf: s.csrf };
    const created = (await handleApi(req("/api/admin/hospitals", { method: "POST", ...h, body: JSON.stringify({ name: "New Hosp", city: "Pune" }) }), db))!;
    const { id } = (await created.json()) as { id: number };
    const upd = (await handleApi(req(`/api/admin/hospitals/${id}`, { method: "PATCH", ...h, body: JSON.stringify({ city: "Mumbai" }) }), db))!;
    assert.equal(((await upd.json()) as { city: string }).city, "Mumbai");
    const bad = (await handleApi(req(`/api/admin/hospitals/${id}`, { method: "PATCH", ...h, body: JSON.stringify({ image_url: "javascript:x" }) }), db))!;
    assert.equal(bad.status, 400);
    const pubRes = (await handleApi(req("/api/public/hospitals/new-hosp"), db))!;
    assert.equal(pubRes.status, 200);
    const del = (await handleApi(req(`/api/admin/hospitals/${id}`, { method: "DELETE", ...h }), db))!;
    assert.equal(del.status, 200);
    assert.equal((await handleApi(req("/api/public/hospitals/new-hosp"), db))!.status, 404);
    assert.ok((db.prepare("SELECT COUNT(*) n FROM audit_log").get() as { n: number }).n >= 3);
  });
  test("role separation: sales sees leads not content; editor the reverse", async () => {
    const sales = await signIn("sales");
    const editor = await signIn("editor");
    assert.equal((await handleApi(req("/api/admin/leads", { cookie: sales.cookie }), db))!.status, 200);
    assert.equal((await handleApi(req("/api/admin/doctors", { cookie: sales.cookie }), db))!.status, 403);
    assert.equal((await handleApi(req("/api/admin/doctors", { cookie: editor.cookie }), db))!.status, 200);
    assert.equal((await handleApi(req("/api/admin/leads", { cookie: editor.cookie }), db))!.status, 403);
    assert.equal((await handleApi(req("/api/admin/leads/export.csv", { cookie: editor.cookie }), db))!.status, 403);
  });
  test("sales can triage leads", async () => {
    submitLead(db, { name: "Pat Lee", email: "p@l.com", phone: "123456789" }, { ip: "1.1.1.1" });
    const s = await signIn("sales");
    const res = (await handleApi(req("/api/admin/leads/1", { method: "PATCH", cookie: s.cookie, csrf: s.csrf, body: JSON.stringify({ status: "contacted", internal_notes: "Called" }) }), db))!;
    assert.equal(res.status, 200);
    assert.equal((listLeads(db).rows[0] as { status: string }).status, "contacted");
    const csv = (await handleApi(req("/api/admin/leads/export.csv", { cookie: s.cookie }), db))!;
    assert.match(csv.headers.get("content-type")!, /text\/csv/);
  });
  test("bulk import over HTTP (dry run then real)", async () => {
    const s = await signIn("admin");
    const h = { cookie: s.cookie, csrf: s.csrf };
    const body = JSON.stringify({ format: "csv", data: "name,city\nZ Hosp,Delhi\n" });
    const dry = (await handleApi(req("/api/admin/hospitals/import?dryRun=1", { method: "POST", ...h, body }), db))!;
    assert.equal(((await dry.json()) as { created: number }).created, 1);
    assert.equal(listLeads(db).total, 0);
    assert.equal((db.prepare("SELECT COUNT(*) n FROM hospitals").get() as { n: number }).n, 0);
    await handleApi(req("/api/admin/hospitals/import", { method: "POST", ...h, body }), db);
    assert.equal((db.prepare("SELECT COUNT(*) n FROM hospitals").get() as { n: number }).n, 1);
  });
  test("logout invalidates the session", async () => {
    const s = await signIn("admin");
    await handleApi(req("/api/admin/logout", { method: "POST", cookie: s.cookie, csrf: s.csrf }), db);
    assert.equal((await handleApi(req("/api/admin/me", { cookie: s.cookie }), db))!.status, 401);
  });
  test("public home/facets endpoints respond", async () => {
    seed(db);
    const home = (await (await handleApi(req("/api/public/home"), db))!.json()) as { departments: unknown[]; featuredDoctors: unknown[] };
    assert.equal(home.departments.length, 17);
    assert.ok(home.featuredDoctors.length > 0);
    assert.equal((await handleApi(req("/api/public/facets"), db))!.status, 200);
  });
});
