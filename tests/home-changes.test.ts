import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { openDb } from "../src/backend/db/client";
import { seed } from "../src/backend/seed";
import * as pub from "../src/backend/repo/public";
import { HOME_SERVICES, HOME_HOSPITAL_COUNT } from "../src/data/home-services";

const db = openDb(":memory:");
seed(db);
const read = (f: string) => readFileSync(f, "utf8");

describe("homepage services (8)", () => {
  test("exactly the 8 requested services, in order, each linking to an existing department", () => {
    assert.deepEqual(HOME_SERVICES.map((s) => s.label), [
      "Cardiology", "Oncology", "Orthopedic & Joint Replacement", "Neurology & Neurosurgery",
      "Spine & Scoliosis Surgery", "IVF & Fertility Treatment", "Liver Transplant, GI & HPB Surgery", "ENT & Cochlear Implant",
    ]);
    const home = pub.homeData(db) as any;
    for (const s of HOME_SERVICES) {
      assert.ok(pub.getDepartment(db, s.slug), `department page ${s.slug}`);
      assert.ok(home.departments.some((d: any) => d.slug === s.slug), `${s.slug} is in the homepage data (icon)`);
    }
    const src = read("src/routes/index.tsx");
    assert.ok(src.includes("HOME_SERVICES.map") && !src.includes("home.departments.map"));
    assert.equal(pub.listDepartments(db).length, 25, "full directory unchanged");
  });
});

describe("homepage hospitals (3, slider, KNOW MORE)", () => {
  const home = pub.homeData(db) as any;
  test("three hospitals with real images, each with a profile page", () => {
    assert.equal(HOME_HOSPITAL_COUNT, 3);
    const three = home.featuredHospitals.slice(0, 3);
    assert.equal(three.length, 3);
    for (const h of three) {
      assert.ok(pub.getHospital(db, h.slug), h.slug);
      assert.equal(h.is_placeholder_image, 0);
      assert.ok(existsSync(`public${h.image_url}`));
    }
    assert.ok(pub.listHospitals(db, { pageSize: 100 }).total >= 22, "directory unchanged");
  });
  test("card has KNOW MORE link to the profile and no description; slider uses the carousel", () => {
    const cards = read("src/components/site/cards.tsx");
    const card = cards.slice(cards.indexOf("export function HomeHospitalCard"), cards.indexOf("export function HospitalCard"));
    assert.ok(card.includes("Know more") && card.includes('to="/hospitals/$slug"'));
    assert.ok(!card.includes("h.summary"), "no description on the homepage card");
    const idx = read("src/routes/index.tsx");
    assert.ok(idx.includes("<Carousel") && idx.includes("CarouselPrevious aria-label=\"Previous hospitals\""));
  });
});

describe("homepage doctors", () => {
  test("cards show no long description but have a details/book button to the doctor page", () => {
    const idx = read("src/routes/index.tsx");
    assert.ok(idx.includes("<DoctorCard d={d} showAction />") && !idx.includes("showSummary"));
    const cards = read("src/components/site/cards.tsx");
    const card = cards.slice(cards.indexOf("export function DoctorCard"), cards.indexOf("export function HomeHospitalCard"));
    assert.ok(card.includes("See details &amp; book") && card.includes('to="/doctors/$slug"'));
    const home = pub.homeData(db) as any;
    for (const d of home.featuredDoctors.slice(0, 5)) assert.ok(pub.getDoctor(db, d.slug), d.slug);
  });
});

describe("new filters (treatment, hospital)", () => {
  test("doctors can be filtered by hospital and by treatment (department-based fallback) without duplicates", () => {
    const withH = pub.listDoctors(db, { hospital: "desun-hospital", pageSize: 100 });
    assert.ok(withH.total > 0);
    for (const r of withH.rows) assert.ok((r.hospitals as any[]).some((h) => h.slug === "desun-hospital"));
    const t = pub.listDoctors(db, { treatment: "angioplasty", pageSize: 100 });
    assert.ok(t.total > 0);
    for (const r of t.rows) assert.ok((r.departments as any[]).some((d) => d.slug === "cardiology"));
    assert.equal(new Set(t.rows.map((r) => r.slug)).size, t.rows.length);
    assert.equal(pub.listDoctors(db, { treatment: "no-such" }).total, 0);
  });
  test("hospitals can be filtered by treatment; facets list treatments and hospitals", () => {
    const r = pub.listHospitals(db, { treatment: "ivf-treatment", pageSize: 100 });
    assert.ok(r.total > 0 && r.total < pub.listHospitals(db, { pageSize: 100 }).total);
    const f = pub.facets(db) as any;
    assert.ok(f.treatments.length >= 10 && f.hospitals.length >= 22);
  });
  test("filters exist on home (FindBar), doctors and hospitals pages", () => {
    assert.ok(read("src/routes/index.tsx").includes("<FindBar"));
    assert.ok(read("src/routes/doctors.tsx").includes('label="Treatment"') && read("src/routes/doctors.tsx").includes('label="Hospital"'));
    assert.ok(read("src/routes/hospitals.tsx").includes('label="Treatment"'));
  });
});

describe("hero", () => {
  test("slower, smoother slider", () => {
    const s = read("src/components/site/HeroSlider.tsx");
    const ms = Number(/INTERVAL_MS = (\d+)/.exec(s)![1]);
    assert.ok(ms >= 9000, `interval ${ms}`);
    assert.ok(s.includes("duration-[1800ms]"));
  });
  test("logo: corrected badge asset is a square image used in header and footer", () => {
    assert.ok(existsSync("public/brand/ikra-logo-badge.webp"));
    assert.ok(!read("src/components/site/Header.tsx").includes("ikra-logo-256"));
  });
});

describe("analytics (GA4 + Meta Pixel)", () => {
  test("IDs only from env vars; placeholders documented; nothing hard-coded", () => {
    const a = read("src/lib/analytics.ts");
    assert.ok(a.includes("VITE_GA_MEASUREMENT_ID") && a.includes("VITE_META_PIXEL_ID"));
    assert.ok(!/G-[A-Z0-9]{8,}/.test(a.replace("G-XXXXXXXXXX", "")), "no GA id literal");
    const env = read(".env.example");
    assert.ok(/^VITE_GA_MEASUREMENT_ID=$/m.test(env) && /^VITE_META_PIXEL_ID=$/m.test(env));
  });
  test("tracker mounted once in the root layout; lead conversion fires only after a successful response", () => {
    assert.equal((read("src/routes/__root.tsx").match(/<AnalyticsTracker \/>/g) ?? []).length, 1);
    const f = read("src/components/site/AppointmentForm.tsx");
    const ok = f.indexOf("if (!res.ok)");
    const track = f.indexOf("trackLead(");
    assert.ok(ok > 0 && track > ok, "trackLead after the !res.ok early return");
    assert.equal((f.match(/trackLead\(/g) ?? []).length, 1);
  });
  test("without IDs nothing is loaded (module is inert)", async () => {
    const a = await import("../src/lib/analytics");
    assert.equal(a.analyticsEnabled(), false);
    a.initAnalytics();
    a.trackPageView("/");
    a.trackLead("appointment", "/");
  });
});
