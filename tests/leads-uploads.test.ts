import { test, describe, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "ikra-up-"));
process.env.UPLOAD_DIR = dir;

import { openDb, type DB } from "../src/backend/db/client";
import { createUser } from "../src/backend/lib/auth";
import { handleApi } from "../src/backend/api/handler";
import { listLeads } from "../src/backend/repo/leads";
import { readUpload } from "../src/backend/lib/uploads";
import { seed } from "../src/backend/seed";
import * as pub from "../src/backend/repo/public";

after(() => {
  // Bounded retries (5 x 100ms) for transient Windows locks; real errors still throw.
  rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

const PW = "CorrectHorse9Battery";
const origin = "http://localhost:3000";
let db: DB;
beforeEach(() => {
  db = openDb(":memory:");
  for (const f of readdirSync(dir)) rmSync(join(dir, f));
});

const pdf = () => new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a])], "scan report.pdf", { type: "application/pdf" });
const exe = () => new File([new Uint8Array([0x4d, 0x5a, 0x90, 0x00])], "evil.pdf", { type: "application/pdf" });

function leadForm(extra: Record<string, string> = {}, files: File[] = []) {
  const f = new FormData();
  const base = { name: "Amina Yusuf", age: "46", country: "Kenya", city: "Nairobi", phone: "+254 700 000000", treatment_interest: "Cardiology", consent: "true", ...extra };
  for (const [k, v] of Object.entries(base)) f.set(k, v);
  for (const x of files) f.append("reports", x);
  return new Request(origin + "/api/leads", { method: "POST", body: f });
}

async function admin(role: "admin" | "sales" | "editor") {
  await createUser(db, { email: `${role}@t.co`, name: role, password: PW, role });
  const res = (await handleApi(new Request(origin + "/api/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: `${role}@t.co`, password: PW }) }), db))!;
  const { csrf } = (await res.json()) as { csrf: string };
  return { cookie: res.headers.get("set-cookie")!.split(";")[0], csrf };
}

describe("client lead form (name, age, country, city, phone, treatment, reports)", () => {
  test("email is optional; age and city are stored", async () => {
    const res = (await handleApi(leadForm(), db))!;
    assert.equal(res.status, 201);
    const row = listLeads(db).rows[0] as { age: number; city: string; email: string | null };
    assert.deepEqual([row.age, row.city, row.email], [46, "Nairobi", null]);
  });
  test("a PDF report is stored with a random name and listed on the lead", async () => {
    assert.equal((await handleApi(leadForm({}, [pdf()]), db))!.status, 201);
    const files = (listLeads(db).rows[0] as { files: { original_name: string; mime: string }[] }).files;
    assert.equal(files.length, 1);
    assert.equal(files[0].mime, "application/pdf");
    assert.equal(readdirSync(dir).length, 1);
    assert.match(readdirSync(dir)[0], /^[a-f0-9]{32}\.pdf$/);
  });
  test("a file that merely claims to be a PDF is rejected and nothing is kept", async () => {
    const res = (await handleApi(leadForm({}, [pdf(), exe()]), db))!;
    assert.equal(res.status, 400);
    assert.equal(readdirSync(dir).length, 0, "earlier valid file cleaned up");
    assert.equal(listLeads(db).total, 0);
  });
  test("invalid lead deletes its uploads; honeypot stores nothing", async () => {
    assert.equal((await handleApi(leadForm({ phone: "abc" }, [pdf()]), db))!.status, 400);
    assert.equal(readdirSync(dir).length, 0);
    assert.equal((await handleApi(leadForm({ website: "spam" }, [pdf()]), db))!.status, 201);
    assert.equal(readdirSync(dir).length, 0);
    assert.equal(listLeads(db).total, 0);
  });
  test("too many files, oversized files refused", async () => {
    assert.equal((await handleApi(leadForm({}, Array.from({ length: 6 }, pdf)), db))!.status, 400);
    const big = new File([new Uint8Array(10 * 1024 * 1024 + 1).fill(0x25)], "big.pdf");
    assert.equal((await handleApi(leadForm({}, [big]), db))!.status, 400);
  });
  test("rate limit is per phone number", async () => {
    for (let i = 0; i < 5; i++) assert.equal((await handleApi(leadForm(), db))!.status, 201);
    assert.equal((await handleApi(leadForm(), db))!.status, 429);
  });
});

describe("report downloads", () => {
  test("only sales/admin can download; anonymous and editors cannot", async () => {
    await handleApi(leadForm({}, [pdf()]), db);
    const fid = (listLeads(db).rows[0] as { files: { id: number }[] }).files[0].id;
    const url = `${origin}/api/admin/leads/files/${fid}`;
    assert.equal((await handleApi(new Request(url), db))!.status, 401);
    const ed = await admin("editor");
    assert.equal((await handleApi(new Request(url, { headers: { cookie: ed.cookie } }), db))!.status, 403);
    const sales = await admin("sales");
    const ok = (await handleApi(new Request(url, { headers: { cookie: sales.cookie } }), db))!;
    assert.equal(ok.status, 200);
    assert.equal(ok.headers.get("content-type"), "application/pdf");
    assert.match(ok.headers.get("content-disposition")!, /attachment/);
    assert.equal(ok.headers.get("x-content-type-options"), "nosniff");
  });
  test("path traversal names are refused", () => {
    assert.equal(readUpload("../../etc/passwd"), null);
    assert.equal(readUpload("../data/ikra.db"), null);
  });
});

describe("search & navigation", () => {
  beforeEach(() => void seed(db));
  test("search spans doctors, hospitals and treatments with filters", () => {
    db.exec("INSERT INTO treatments (slug, name, department_id) SELECT 'bypass-surgery','Bypass Surgery', id FROM departments WHERE slug='cardiology'");
    const r = pub.searchAll(db, { q: "bypass" });
    // seed now also provides "Coronary Bypass Surgery" (cardio-thoracic) and "Angioplasty" (cardiology)
    const slugs = (x: { treatments: unknown[] }) => (x.treatments as { slug: string }[]).map((t) => t.slug).sort();
    assert.deepEqual(slugs(r), ["bypass-surgery", "coronary-bypass-surgery"]);
    assert.deepEqual(slugs(pub.searchAll(db, { department: "cardiology" })), ["angioplasty", "bypass-surgery"]);
    assert.equal(pub.searchAll(db, { department: "neurology" }).treatments.length, 0);
    assert.ok(pub.searchAll(db, { q: "Manipal" }).hospitals.rows.length >= 2);
    assert.equal(pub.searchAll(db, { q: "apollo", city: "Kolkata" }).hospitals.rows.length, 1);
  });
  test("nav data nests treatments under departments", () => {
    db.exec("INSERT INTO treatments (slug, name, department_id) SELECT 'bypass-surgery','Bypass Surgery', id FROM departments WHERE slug='cardiology'");
    const nav = pub.navData(db);
    const c = nav.departments.find((d) => d.slug === "cardiology")!;
    assert.deepEqual((c.treatments as { slug: string }[]).map((t) => t.slug).sort(), ["angioplasty", "bypass-surgery"]);
    assert.ok(nav.hospitals.length > 0);
  });
  test("search endpoint is public", async () => {
    const res = (await handleApi(new Request(origin + "/api/public/search?q=apollo"), db))!;
    assert.equal(res.status, 200);
    assert.ok(((await res.json()) as { hospitals: { rows: unknown[] } }).hospitals.rows.length > 0);
  });
});
