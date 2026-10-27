import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { openDb } from "../src/backend/db/client";
import { seed, applySuppliedDoctors, applyHospitalImages, HOSPITAL_IMAGE_SLUGS } from "../src/backend/seed";
import * as pub from "../src/backend/repo/public";
import { suppliedDoctors } from "../src/data/supplied-doctors";
import { doctors as legacy } from "../src/data/doctors";

const db = openDb(":memory:");
const first = seed(db);
const q = <T = Record<string, unknown>>(sql: string, ...a: unknown[]) => db.prepare(sql).all(...(a as never[])) as T[];
const n = (sql: string, ...a: unknown[]) => (q<{ n: number }>(sql, ...a)[0] as { n: number }).n;

describe("supplied doctor profiles", () => {
  test("report: added + already present = supplied total; nothing is duplicated", () => {
    const r = first.supplied;
    assert.equal(r.added + r.alreadyPresent, suppliedDoctors.length);
    assert.equal(r.total, 169);
    assert.equal(n("SELECT COUNT(*) n FROM doctors"), legacy.length + r.added);
    assert.equal(n("SELECT COUNT(*) n FROM (SELECT slug FROM doctors GROUP BY slug HAVING COUNT(*) > 1)"), 0);
    assert.equal(n("SELECT COUNT(*) n FROM (SELECT lower(name) FROM doctors GROUP BY lower(name) HAVING COUNT(*) > 1)"), 0);
  });
  test("supplied names are unique after normalisation", () => {
    const k = suppliedDoctors.map((d) => d.name.toLowerCase().replace(/\b(dr|prof)\b\.?/g, "").replace(/[^a-z0-9]+/g, " ").trim());
    assert.equal(new Set(k).size, k.length);
  });
  test("re-running is idempotent and keeps admin edits", () => {
    const victim = (db.prepare("SELECT slug FROM doctors WHERE featured = 0 AND summary IS NOT NULL LIMIT 1").get() as { slug: string }).slug;
    db.prepare("UPDATE doctors SET summary = 'Admin edit' WHERE slug = ?").run(victim);
    const again = seed(db);
    assert.equal(again.supplied.added, 0);
    assert.equal(again.supplied.updated, 0);
    assert.equal(again.doctors, 0);
    assert.equal((db.prepare("SELECT summary FROM doctors WHERE slug = ?").get(victim) as { summary: string }).summary, "Admin edit");
  });
  test("a doctor in two specialities is ONE record shown under both", () => {
    const dual = suppliedDoctors.filter((d) => d.departments.length > 1);
    assert.ok(dual.length > 0);
    for (const d of dual.slice(0, 10)) {
      const rows = q("SELECT id FROM doctors WHERE slug = ? OR lower(name) = lower(?)", d.slug, d.name);
      assert.equal(rows.length, 1, d.name);
      for (const dep of d.departments) {
        const list = pub.listDoctors(db, { department: dep, pageSize: 200 }).rows;
        assert.ok(list.some((x) => x.name === d.name), `${d.name} under ${dep}`);
      }
    }
  });
  test("every supplied doctor has at least one speciality and every photo/card file exists", () => {
    for (const d of suppliedDoctors) {
      const id = (db.prepare("SELECT id FROM doctors WHERE slug = ? OR lower(name) = lower(?)").get(d.slug, d.name) as { id: number }).id;
      assert.ok(n("SELECT COUNT(*) n FROM doctor_departments WHERE doctor_id = ?", id) > 0, `${d.name} has a speciality`);
      if (d.image) assert.ok(existsSync(`public${d.image}`), d.image);
      if (d.card) assert.ok(existsSync(`public${d.card}`), d.card);
    }
  });
  test("withheld bios (header/biography mismatch) are not published", () => {
    const withheld = suppliedDoctors.filter((d) => d.bioWithheld);
    assert.ok(withheld.length >= 2);
    for (const d of withheld) {
      const row = q<{ body: string | null }>("SELECT body FROM doctors WHERE slug = ? OR lower(name) = lower(?)", d.slug, d.name)[0]!;
      assert.ok(!row.body, d.name);
    }
  });
  test("hospital links come only from the client's explicit labels; the unlabelled stay unlinked", () => {
    const unlabelled = suppliedDoctors.filter((d) => !d.hospital && d.source === "docx");
    assert.ok(unlabelled.length >= 60);
    for (const d of unlabelled.slice(0, 20)) {
      const c = n("SELECT COUNT(*) n FROM doctor_hospitals dh JOIN doctors x ON x.id = dh.doctor_id WHERE lower(x.name) = lower(?)", d.name);
      assert.equal(c, 0, d.name);
    }
  });
  test("homepage 'Know our best doctors': curated, each with photo, speciality and description; View All target exists", () => {
    const home = pub.homeData(db) as any;
    assert.ok(home.featuredDoctors.length >= 20);
    for (const d of home.featuredDoctors) {
      assert.ok(d.image_url.startsWith("/doctors/") && existsSync(`public${d.image_url}`), d.name);
      assert.ok(d.summary && d.summary.length > 20, d.name);
      assert.ok(d.departments.length > 0, d.name);
    }
    assert.ok(new Set(home.featuredDoctors.map((d: any) => d.slug)).size === home.featuredDoctors.length);
  });
  test("city filter also finds doctors whose hospital is unconfirmed", () => {
    const withCity = q<{ city: string; slug: string }>("SELECT city, slug FROM doctors WHERE city IS NOT NULL AND id NOT IN (SELECT doctor_id FROM doctor_hospitals) LIMIT 1")[0]!;
    const res = pub.listDoctors(db, { city: withCity.city, pageSize: 200 }).rows;
    assert.ok(res.some((r) => r.slug === withCity.slug));
  });
  test("TX profile cards are attached and labelled via profile_card_url", () => {
    assert.equal(n("SELECT COUNT(*) n FROM doctors WHERE profile_card_url LIKE '/doctors/cards/%'"), suppliedDoctors.filter((d) => d.card).length);
  });
});

describe("hospital images", () => {
  test("all 22 supplied images are assigned to the matching hospital and exist on disk", () => {
    assert.equal(HOSPITAL_IMAGE_SLUGS.length, 22);
    for (const slug of HOSPITAL_IMAGE_SLUGS) {
      const h = q<{ image_url: string; is_placeholder_image: number }>("SELECT image_url, is_placeholder_image FROM hospitals WHERE slug = ?", slug)[0];
      assert.ok(h, `hospital ${slug} exists`);
      assert.equal(h!.image_url, `/hospitals/${slug}.webp`);
      assert.equal(h!.is_placeholder_image, 0);
      assert.ok(existsSync(`public/hospitals/${slug}.webp`));
    }
  });
  test("the two Kolkata hospitals now carry their own supplied photos with alt text (no placeholder)", () => {
    const ph = q<{ slug: string }>("SELECT slug FROM hospitals WHERE is_placeholder_image = 1").map((r) => r.slug);
    assert.deepEqual(ph, []);
    for (const slug of ["fortis-hospital-kolkata", "phs-fertility-centre-kolkata"]) {
      const h = q<{ image_url: string; image_alt: string }>("SELECT image_url, image_alt FROM hospitals WHERE slug = ?", slug)[0]!;
      assert.equal(h.image_url, `/hospitals/${slug}.webp`);
      assert.ok(h.image_alt && h.image_alt.includes("Kolkata"));
    }
  });
  test("each hospital image/logo file is the one named for that hospital (no file shared between hospitals)", () => {
    const seen = new Set<string>();
    for (const slug of HOSPITAL_IMAGE_SLUGS) { assert.ok(!seen.has(slug)); seen.add(slug); }
    assert.ok(existsSync("public/hospitals/logos/fortis-hospital-kolkata.webp") && existsSync("public/hospitals/logos/phs-fertility-centre-kolkata.webp"));
  });
  test("admin-uploaded hospital images are never overwritten", () => {
    db.prepare("UPDATE hospitals SET image_url = '/uploads/custom.webp', is_placeholder_image = 0 WHERE slug = 'zemya-ivf'").run();
    applyHospitalImages(db);
    assert.equal((db.prepare("SELECT image_url FROM hospitals WHERE slug = 'zemya-ivf'").get() as { image_url: string }).image_url, "/uploads/custom.webp");
    applySuppliedDoctors(db);
  });
});

describe("Treatment Cost classification", () => {
  test("departments (same list as the Doctors filter) each carry only their own treatments", () => {
    const deps = pub.listDepartments(db) as any[];
    const facet = pub.facets(db).departments.map((d: any) => d.value);
    assert.deepEqual(deps.map((d) => d.slug), facet);
    const treatments = pub.listTreatments(db) as any[];
    assert.ok(treatments.length >= 10);
    for (const t of treatments) assert.ok(deps.some((d) => d.slug === t.department_slug), t.slug);
    assert.ok(treatments.every((t) => !("cost" in t) || t.cost == null));
  });
});

describe("hospital descriptions, hero files, menus", () => {
  test("every hospital has a short description that claims no numbers or awards", () => {
    const rows = q<{ slug: string; summary: string }>("SELECT slug, summary FROM hospitals");
    assert.equal(rows.length, 22);
    for (const r of rows) {
      assert.ok(r.summary && r.summary.length >= 60 && r.summary.length <= 400, r.slug);
      assert.ok(!/\d{2,}|award|ranked|best in|NABH|JCI/i.test(r.summary), `${r.slug}: no invented facts`);
    }
  });
  test("an admin-written hospital summary is kept on re-seed", () => {
    db.prepare("UPDATE hospitals SET summary = ? WHERE slug = 'zemya-ivf'").run("Custom admin text that is long enough to be kept as is, definitely.");
    seed(db);
    assert.match((db.prepare("SELECT summary FROM hospitals WHERE slug = 'zemya-ivf'").get() as { summary: string }).summary, /^Custom admin text/);
  });
  test("every hero slider image file referenced by HeroSlider exists (no broken slides)", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync("src/components/site/HeroSlider.tsx", "utf8");
    const names = [...src.matchAll(/name: "(hero-[a-z]+)"/g)].map((m) => m[1]);
    assert.equal(names.length, 3);
    assert.ok(src.includes("-1600.webp") && !src.includes("w[1]}.webp"));
    for (const n of names) for (const w of [800, 1600]) assert.ok(existsSync(`public/hero/${n}-${w}.webp`), `${n}-${w}`);
  });
  test("header menus: 12 items + View all for Services and Doctors; nav breakpoint avoids clipping Contact", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync("src/components/site/Header.tsx", "utf8");
    assert.match(src, /MENU_LIMIT = 12/);
    assert.equal((src.match(/departments\.slice\(0, MENU_LIMIT\)/g) ?? []).length, 4, "desktop + mobile, departments + doctors");
    assert.ok(src.includes("View all services") && !/Departments/.test(src) && src.includes("View all doctors"));
    assert.ok(!/hidden[^"]*\blg:flex/.test(src), "full nav only from xl");
    assert.equal((src.match(/>Home<\/Link>/g) ?? []).length, 2, "one desktop + one mobile Home link");
  });
});
