import { existsSync } from "node:fs";
import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "ikra-db-"));
process.env.DATABASE_PATH = join(dir, "fresh.db");
after(async () => {
  // Release the shared SQLite handle (and its -wal/-shm files) first: Windows refuses to delete open files.
  (await import("../src/backend/db/client")).closeDb();
  // Bounded retries (5 x 100ms) for transient Windows locks (antivirus/indexer); real errors still throw.
  rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

import { openDb } from "../src/backend/db/client";
import { seed } from "../src/backend/seed";
import { createEntity, entities, updateEntity } from "../src/backend/repo/entities";
import * as pub from "../src/backend/repo/public";

describe("first run", () => {
  test("getDb() fills a brand-new database so the site is never empty", async () => {
    const { getDb } = await import("../src/backend/db/client");
    const db = getDb();
    const n = (t: string) => (db.prepare(`SELECT COUNT(*) n FROM ${t}`).get() as { n: number }).n;
    assert.deepEqual([n("departments"), n("hospitals"), n("doctors")], [25, 22, 172]);
    assert.equal(getDb(), db, "same connection reused; not re-seeded");
    assert.equal(n("hospitals"), 22);
  });
});

describe("homepage data", () => {
  const db = openDb(":memory:");
  seed(db);
  const home = pub.homeData(db) as any;

  test("17 partnered hospitals, in the client's order", () => {
    const names = home.featuredHospitals.map((h: any) => `${h.name}|${h.city}`);
    assert.equal(names.length, 17);
    assert.equal(names[0], "Nova IVF Fertility|Kolkata");
    assert.equal(names[1], "Desun Hospital|Kolkata");
    assert.equal(names[16], "Sharp Sight Eye Hospitals|Delhi");
    assert.ok(!names.some((x: string) => /Siliguri|Electronic/.test(x)));
  });
  test("all 17 specialities, doctors with photos, network list for the carousel", () => {
    assert.equal(home.departments.length, 17);
    assert.ok(home.featuredDoctors.length >= 8 && home.featuredDoctors.every((d: any) => d.image_url));
    assert.equal(home.network.length, 22);
    assert.ok(home.network.every((h: any) => h.logo_url === `/hospitals/logos/${h.slug}.webp` && existsSync(`public/hospitals/logos/${h.slug}.webp`)), "every network hospital carries its own supplied logo file");
  });
  test("every featured hospital page and every doctor page resolves", () => {
    for (const h of home.featuredHospitals) assert.ok(pub.getHospital(db, h.slug), h.slug);
    for (const d of home.featuredDoctors) assert.ok(pub.getDoctor(db, d.slug), d.slug);
  });
  test("hospital logo can be set from the admin and flows to the carousel", () => {
    const h = db.prepare("SELECT id FROM hospitals LIMIT 1").get() as { id: number };
    assert.ok(updateEntity(db, entities.hospitals, h.id, { logo_url: "/logos/x.png" }).ok);
    assert.ok(!updateEntity(db, entities.hospitals, h.id, { logo_url: "javascript:1" }).ok);
    assert.ok((pub.homeData(db) as any).network.some((n: any) => n.logo_url === "/logos/x.png"));
  });
  test("nav data feeds the footer: departments, hospitals and cities", () => {
    const nav = pub.navData(db);
    assert.ok(nav.cities.length >= 6 && nav.hospitals.length > 0 && nav.departments.length === 25);
  });
  test("homepage blog section shows the 3 seeded articles, newest first, and picks up new posts", () => {
    const slugs = () => (pub.homeData(db) as any).posts.map((p: any) => p.slug);
    assert.deepEqual(slugs(), [
      "medical-travel-to-india-step-by-step-guide",
      "understanding-treatment-costs-in-india",
      "preparing-for-surgery-in-india",
    ]);
    createEntity(db, entities.posts, { title: "Real post", status: "published", published_at: "2999-01-01T00:00:00Z" });
    assert.equal(slugs()[0], "real-post");
  });
});

describe("relationship editing keeps link data", () => {
  test("editing a hospital's doctors does not reset a doctor's primary hospital", () => {
    const db = openDb(":memory:");
    const a = createEntity(db, entities.hospitals, { name: "A", city: "X" });
    const b = createEntity(db, entities.hospitals, { name: "B", city: "Y" });
    assert.ok(a.ok && b.ok);
    const d = createEntity(db, entities.doctors, { name: "Dr Z", hospital_ids: [b.value.id, a.value.id] });
    assert.ok(d.ok);
    const primary = () => (db.prepare("SELECT hospital_id h FROM doctor_hospitals WHERE doctor_id = ? AND is_primary = 1").get(d.value.id) as { h: number }).h;
    assert.equal(primary(), b.value.id);
    // from the hospital side: add a second doctor, keep the first
    const d2 = createEntity(db, entities.doctors, { name: "Dr Y" });
    assert.ok(d2.ok);
    assert.ok(updateEntity(db, entities.hospitals, a.value.id, { doctor_ids: [d.value.id, d2.value.id] }).ok);
    assert.equal(primary(), b.value.id, "primary untouched");
    assert.equal(pub.getHospital(db, "a")!.doctors.length, 2);
    // removing from the hospital side removes only that link
    assert.ok(updateEntity(db, entities.hospitals, a.value.id, { doctor_ids: [d2.value.id] }).ok);
    assert.equal(pub.getDoctor(db, "dr-z")!.hospitals.length, 1);
  });
});

describe("closeDb", () => {
  test("releases the shared connection so the file can be deleted and reopened", async () => {
    const { getDb, closeDb } = await import("../src/backend/db/client");
    const first = getDb();
    closeDb();
    closeDb(); // idempotent
    assert.throws(() => first.prepare("SELECT 1").get(), /not open|closed/i);
    const again = getDb();
    assert.notEqual(again, first);
    assert.equal((again.prepare("SELECT COUNT(*) n FROM hospitals").get() as { n: number }).n, 22);
  });
});

describe("22 departments & treatment pages", () => {
  const db = openDb(":memory:");
  seed(db);
  test("homepage keeps the client's 17 cards while the full list has 25", () => {
    assert.equal((pub.homeData(db) as any).departments.length, 17);
    assert.equal(pub.listDepartments(db).length, 25);
  });
  test("new departments get doctors mapped from the client's own designations", () => {
    const c = (slug: string) => pub.listDoctors(db, { department: slug, pageSize: 100 }).total;
    for (const s of ["pulmonology", "nephrology", "general-and-laparoscopic-surgery", "internal-medicine", "paediatrics-and-paediatric-surgery"])
      assert.ok(c(s) > 0, s);
  });
  test("10 treatment pages exist, with no invented cost, and fall back to department doctors/hospitals", () => {
    const list = pub.listTreatments(db) as unknown as { slug: string }[];
    assert.equal(list.length, 10);
    const t = pub.getTreatment(db, "knee-replacement") as any;
    assert.equal(t.cost, null);
    assert.equal(t.body, null);
    assert.equal(t.relatedVia, "department");
    assert.ok(t.doctors.length > 0);
  });
  test("re-seeding an older database back-fills the new department links only", () => {
    const old = openDb(":memory:");
    seed(old);
    old.exec("DELETE FROM doctor_departments WHERE department_id IN (SELECT id FROM departments WHERE slug='pulmonology')");
    const before = pub.listDoctors(old, { department: "pulmonology", pageSize: 100 }).total;
    seed(old);
    assert.equal(before, 0);
    assert.ok(pub.listDoctors(old, { department: "pulmonology", pageSize: 100 }).total > 0);
  });
});

describe("doctor-hospital mapping template", () => {
  test("blank template re-imports without wiping data; filled rows link hospitals", async () => {
    const { importRows, parseCsv } = await import("../src/backend/repo/import");
    const { readFileSync } = await import("node:fs");
    const db = openDb(":memory:");
    seed(db);
    const rows = parseCsv(readFileSync("data/templates/doctor-hospital-mapping.csv", "utf8"));
    assert.equal(rows.length, 75);
    const before = pub.getDoctor(db, "dr-tapti-sen")!;
    const rep = importRows(db, "doctors", rows);
    assert.equal(rep.failed.length, 0, JSON.stringify(rep.failed.slice(0, 2)));
    const after = pub.getDoctor(db, "dr-tapti-sen")!;
    assert.equal(after.designation, before.designation);
    assert.equal(after.departments.length, before.departments.length);
    const hosp = (db.prepare("SELECT slug FROM hospitals LIMIT 1").get() as { slug: string }).slug;
    const filled = rows.map((r, i) => (i === 0 ? { ...r, hospitals: hosp } : r));
    assert.equal(importRows(db, "doctors", filled).failed.length, 0);
    assert.equal(pub.getDoctor(db, String(rows[0]!.slug))!.hospitals.length, 1);
  });
});
