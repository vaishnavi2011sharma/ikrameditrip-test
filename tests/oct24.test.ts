import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { migrate } from "../src/backend/db/client";
import { seed } from "../src/backend/seed";

const src = (p: string) => readFileSync(p, "utf8");
const cards = src("src/components/site/cards.tsx");
const footer = src("src/components/site/Footer.tsx");
const header = src("src/components/site/Header.tsx");
const root = src("src/routes/__root.tsx");
const doctorsPage = src("src/routes/doctors.tsx");
const doctorPage = src("src/routes/doctors_.$slug.tsx");
const home = src("src/routes/index.tsx");

describe("doctor listing card (source checks)", () => {
  test("photo left, details, red Book Appointment, green WhatsApp, divider, bio with Show more / Show less", () => {
    assert.ok(cards.includes("export function DoctorListCard"));
    assert.ok(cards.includes("Book Appointment") && cards.includes("bg-red-600"));
    assert.ok(cards.includes("WhatsApp Us") && cards.includes("bg-[#25D366]"));
    assert.ok(cards.includes("border-t border-border") && cards.includes("Show more") && cards.includes("Show less"));
    assert.ok(cards.includes("aria-expanded={open}"));
    assert.ok(cards.includes("flex-col") && cards.includes("sm:flex-row"), "stacks on phones");
    assert.ok(doctorsPage.includes("<DoctorListCard"));
  });
  test("no invented verified badge or ratings", () => {
    const card = cards.slice(cards.indexOf("export function DoctorListCard"), cards.indexOf("export function HomeHospitalCard"));
    assert.ok(!/\bverified\b|rating|\bstars?\b/i.test(card.replace(/\/\*\*[\s\S]*?\*\//g, "")));
  });
  test("WhatsApp link uses the configured number only, with the doctor's name in the message", async () => {
    const { doctorWhatsappHref } = await import("../src/components/site/cards.tsx").catch(() => ({ doctorWhatsappHref: null as any }));
    const site = src("src/data/site.ts");
    assert.match(site, /whatsappHref: "https:\/\/wa\.me\/918282068810"/);
    if (doctorWhatsappHref) {
      const u = new URL(doctorWhatsappHref("Dr. Test"));
      assert.equal(u.origin + u.pathname, "https://wa.me/918282068810");
      assert.match(u.searchParams.get("text")!, /Dr\. Test/);
    }
  });
  test("doctor profile page has a green WhatsApp button and the original gradient Book appointment button", () => {
    assert.ok(doctorPage.includes("doctorWhatsappHref(d.name)") && doctorPage.includes("bg-[#25D366]"));
    assert.ok(doctorPage.includes("gradient-brand"));
  });
});

describe("button colours stay original", () => {
  test("no rose/orange/fuchsia gradient anywhere in site code", () => {
    for (const f of ["src/components/site/cards.tsx", "src/routes/index.tsx", "src/routes/doctors.tsx", "src/routes/doctors_.$slug.tsx", "src/components/site/FindBar.tsx"]) {
      assert.ok(!/via-rose|from-orange|to-fuchsia|rose-600/.test(src(f)), f);
    }
    assert.ok(cards.includes("gradient-brand"), "SEE DETAILS / KNOW MORE use the site's own gradient");
  });
});

describe("footer, breadcrumbs, hero, services", () => {
  test("footer icons use official brand colours and only configured URLs", () => {
    for (const c of ["#1877F2", "#0A66C2", "#FF0000", "#D62976"]) assert.ok(footer.includes(c), c);
    assert.ok(footer.includes(".filter((x) => !!x.href)"));
  });
  test("breadcrumbs use a chevron icon, not a slash, and keep Home + current page", () => {
    const bc = cards.slice(cards.indexOf("export function Breadcrumbs"), cards.indexOf("function initials"));
    assert.ok(bc.includes("<ChevronRight") && !bc.includes(">/</span>") && bc.includes(">Home<") && bc.includes('aria-current="page"'));
  });
  test("hero: form first/left, search bar gone, FindBar kept below the banner", () => {
    const hero = home.slice(home.indexOf("<HeroSlider>"), home.indexOf("</HeroSlider>"));
    assert.ok(!hero.includes("HomeSearch") && hero.includes('type="cost_enquiry"'));
    assert.ok(home.includes("<FindBar"));
  });
  test("Departments page removed from nav, redirected, and the Services pages stay", () => {
    assert.ok(!/Departments/.test(header) && header.includes("View all services"));
    assert.ok(!/Departments/.test(footer));
    assert.ok(root.includes("departments?") && root.includes("statusCode: 301"));
    assert.ok(existsSync("src/routes/services.tsx") && existsSync("src/routes/services_.$slug.tsx"));
    assert.ok(!existsSync("src/routes/departments.tsx"));
    assert.ok(!src("src/routes/sitemap[.]xml.ts").includes("/departments"));
  });
  test("redirect pattern maps old department URLs to services", () => {
    const re = /^\/departments?(?:\/([^/]+))?\/?$/;
    assert.equal(re.exec("/departments")![1], undefined);
    assert.equal(re.exec("/department/cardiology/")![1], "cardiology");
    assert.equal(re.exec("/services"), null);
    assert.equal(re.exec("/departments/a/b"), null);
  });
});

describe("hospital logos, images and carousel", () => {
  const db = new DatabaseSync(":memory:");
  migrate(db as any);
  seed(db as any);
  const hospitals = db.prepare("SELECT slug, name, image_url, image_alt, logo_url FROM hospitals").all() as any[];
  test("Fortis Kolkata and PHS Kolkata have their own photo, existing on disk, with alt text", () => {
    for (const slug of ["fortis-hospital-kolkata", "phs-fertility-centre-kolkata"]) {
      const h = hospitals.find((x) => x.slug === slug);
      assert.equal(h.image_url, `/hospitals/${slug}.webp`);
      assert.ok(existsSync(`public${h.image_url}`));
      assert.ok(h.image_alt && h.image_alt.length > 5);
    }
  });
  test("every hospital has a logo file named after its own slug; no two hospitals share a photo", () => {
    for (const h of hospitals) {
      assert.equal(h.logo_url, `/hospitals/logos/${h.slug}.webp`, h.slug);
      assert.ok(existsSync(`public${h.logo_url}`), h.slug);
    }
    const imgs = hospitals.map((h) => h.image_url);
    assert.equal(new Set(imgs).size, imgs.length);
  });
  test("migrations 5-7 apply to an OLD database that was seeded before them, without re-seeding", () => {
    const old = new DatabaseSync(":memory:");
    migrate(old as any);
    seed(old as any);
    old.prepare("UPDATE hospitals SET image_url = NULL, is_placeholder_image = 1, logo_url = NULL, name = 'X – Y' WHERE slug = 'phs-fertility-centre-kolkata'").run();
    old.exec("DELETE FROM _migrations WHERE id >= 5");
    migrate(old as any);
    const r = old.prepare("SELECT image_url, logo_url, name, is_placeholder_image FROM hospitals WHERE slug = 'phs-fertility-centre-kolkata'").get() as any;
    assert.equal(r.image_url, "/hospitals/phs-fertility-centre-kolkata.webp");
    assert.equal(r.logo_url, "/hospitals/logos/phs-fertility-centre-kolkata.webp");
    assert.equal(r.name, "X - Y");
    assert.equal(r.is_placeholder_image, 0);
  });
  test("logo marquee is slow, pauses on hover and focus, and shows real logos", () => {
    const css = src("src/styles.css");
    const secs = Number(/animation: marquee (\d+)s/.exec(css)![1]);
    assert.ok(secs >= 100, `marquee ${secs}s`);
    assert.ok(home.includes("hover:[animation-play-state:paused]") && home.includes("focus-within:[animation-play-state:paused]"));
    assert.ok(home.includes("h.logo_url ?"));
  });
  test("image component falls back to the labelled placeholder on load error", () => {
    assert.ok(cards.includes("onError"));
  });
});

describe("consent + tracking", () => {
  test("nothing loads before consent; tracker depends on consent", () => {
    const t = src("src/components/site/AnalyticsTracker.tsx");
    assert.ok(t.includes('consent !== "granted"') && t.includes("[pathname, consent]"));
    assert.ok(root.includes("<ConsentBanner"));
    const c = src("src/lib/consent.ts");
    assert.ok(c.includes("ikra_consent") && c.includes("try {"));
  });
  test("banner only appears when an analytics ID is configured; footer has Cookie settings", () => {
    const b = src("src/components/site/ConsentBanner.tsx");
    assert.ok(b.includes("!analyticsEnabled()") && b.includes("Accept") && b.includes("Decline"));
    assert.ok(footer.includes("<CookieSettingsButton"));
  });
  test("privacy policy describes the opt-in", () => {
    assert.ok(src("src/routes/privacy-policy.tsx").includes("switched off until you choose Accept"));
  });
});

describe("dash punctuation", () => {
  test("no em dashes or non-numeric en dashes in public-facing source", async () => {
    const { globSync } = await import("node:fs");
    const files = [...globSync("src/components/site/*.tsx"), ...globSync("src/routes/*.tsx"), ...globSync("src/data/*.ts")];
    for (const f of files) {
      const bad = src(f).match(/—|(?<!\d)–|–(?!\d)/g);
      assert.ok(!bad, `${f}: ${bad?.length}`);
    }
  });
});
