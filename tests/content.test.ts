import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { openDb } from "../src/backend/db/client";
import { seed } from "../src/backend/seed";
import { SEED_POSTS } from "../src/backend/seed-posts";
import * as pub from "../src/backend/repo/public";
import { buildSitemap } from "../src/backend/lib/seo";
import { createUser } from "../src/backend/lib/auth";
import { handleApi } from "../src/backend/api/handler";

const db = openDb(":memory:");
seed(db);
const origin = "http://localhost:3000";

describe("blog posts", () => {
  test("the 3 requested articles exist with the exact titles, are published and have metadata + images", () => {
    assert.deepEqual(SEED_POSTS.map((p) => p.title), [
      "Medical Travel to India: A Step-by-Step Guide",
      "Understanding Treatment Costs in India",
      "Preparing for Surgery in India",
    ]);
    for (const sp of SEED_POSTS) {
      const p = pub.getPost(db, sp.slug) as any;
      assert.ok(p, sp.slug);
      assert.ok(p.seo_title.length > 20 && p.seo_title.length <= 70, `${sp.slug} seo_title length ${p.seo_title.length}`);
      assert.ok(p.seo_description.length >= 80 && p.seo_description.length <= 170, `${sp.slug} seo_description length ${p.seo_description.length}`);
      assert.ok(p.body.split(/\s+/).length > 450, `${sp.slug} has a substantial body`);
      assert.ok(p.cover_image_alt.length > 10);
      assert.ok(existsSync(`public${p.cover_image_url}`), `cover image file ${p.cover_image_url} exists`);
      assert.equal(p.related.length, 2, "links to the other two articles");
      assert.ok(p.related.every((r: any) => r.slug !== sp.slug));
    }
  });
  test("every internal link inside the posts points to a real page", () => {
    const staticPaths = new Set(["/treatment-cost", "/services", "/doctors", "/hospitals", "/contact", "/about", "/blog"]);
    let checked = 0;
    for (const p of SEED_POSTS) {
      for (const m of p.body.matchAll(/\]\((\/[^)\s]*)\)/g)) {
        const href = m[1]!;
        checked++;
        const ok =
          staticPaths.has(href) ||
          (href.startsWith("/blog/") && pub.getPost(db, href.slice(6)) !== null) ||
          (href.startsWith("/services/") && pub.getDepartment(db, href.slice(10)) !== null);
        assert.ok(ok, `${p.slug} links to ${href}`);
      }
      assert.ok(!/<[a-z][^>]*>/i.test(p.body), "no raw HTML in post bodies");
    }
    assert.ok(checked >= 12, `checked ${checked} links`);
  });
  test("each article links to the other two (working internal linking)", () => {
    assert.ok(SEED_POSTS[0]!.body.includes("/blog/understanding-treatment-costs-in-india"));
    assert.ok(SEED_POSTS[1]!.body.includes("/blog/medical-travel-to-india-step-by-step-guide"));
    assert.ok(SEED_POSTS[2]!.body.includes("/blog/medical-travel-to-india-step-by-step-guide"));
    assert.ok(SEED_POSTS[2]!.body.includes("/blog/understanding-treatment-costs-in-india"));
  });
  test("no invented prices, percentages or guarantees in the articles", () => {
    for (const p of SEED_POSTS) {
      assert.ok(!/(\$|₹|USD|INR|Rs\.?)\s?\d/.test(p.body), `${p.slug}: price`);
      assert.ok(!/\d\s?%/.test(p.body), `${p.slug}: percentage`);
      assert.ok(!/guarantee|100% safe|best in india/i.test(p.body), `${p.slug}: claim`);
    }
  });
  test("posts are in the sitemap, and seeding twice does not duplicate or overwrite admin edits", () => {
    const xml = buildSitemap(db, "https://ikrameditrip.com");
    for (const p of SEED_POSTS) assert.ok(xml.includes(`/blog/${p.slug}</loc>`), p.slug);
    db.prepare("UPDATE posts SET title = 'Edited by admin' WHERE slug = ?").run(SEED_POSTS[0]!.slug);
    seed(db);
    assert.equal((db.prepare("SELECT COUNT(*) n FROM posts").get() as { n: number }).n, 3);
    assert.equal((pub.getPost(db, SEED_POSTS[0]!.slug) as any).title, "Edited by admin");
  });
});

describe("patient feedback", () => {
  test("no testimonial rows are invented; only published+consented ones can ever be public", () => {
    assert.equal((db.prepare("SELECT COUNT(*) n FROM testimonials").get() as { n: number }).n, 0);
    db.prepare("INSERT INTO testimonials (patient_name, quote, published, consent_confirmed) VALUES ('A','q',1,0), ('B','q',0,1)").run();
    assert.equal(pub.listTestimonials(db).length, 0);
    db.prepare("INSERT INTO testimonials (patient_name, quote, published, consent_confirmed) VALUES ('C','q',1,1)").run();
    assert.equal(pub.listTestimonials(db).length, 1);
    db.prepare("DELETE FROM testimonials").run();
  });
  test("demo cards are labelled and contain no names, ratings or medical claims", async () => {
    const { demoTestimonials } = await import("../src/data/demo-testimonials");
    for (const d of demoTestimonials) assert.match(d.quote, /^Demo text:/);
    const src = readFileSync("src/components/site/Testimonials.tsx", "utf8");
    assert.match(src, />Demo</);
    assert.match(src, /not real patient reviews/);
    assert.ok(!/★|\bstars?\b|rating/i.test(src), "no star ratings");
  });
});

describe("homepage structure (static source checks, not a browser render)", () => {
  const home = readFileSync("src/routes/index.tsx", "utf8");
  const heroPart = home.slice(home.indexOf("<HeroSlider>"), home.indexOf("</HeroSlider>"));
  test("hero keeps tagline, headline and paragraph; the hero search bar is gone and the lead form sits on the left (Oct 24)", () => {
    assert.ok(heroPart.includes("{site.tagline}"));
    assert.ok(heroPart.includes("World-class treatment in India"));
    assert.ok(!heroPart.includes("<HomeSearch"), "hero search/filter bar removed (Doctors/Hospitals pages and FindBar keep their filters)");
    assert.ok(heroPart.indexOf("<AppointmentForm") < heroPart.indexOf("<h1"), "form column comes before the heading column in the source");
    assert.ok(heroPart.includes("lg:order-1") && heroPart.includes("lg:order-2"), "form left / text right on desktop");
    assert.ok(!/xl:text-6xl/.test(heroPart), "heading reduced a little");
    assert.ok(heroPart.includes("<AppointmentForm") && heroPart.includes('type="cost_enquiry"'), "lead form on the banner");
    assert.ok(heroPart.includes("lg:grid-cols"), "two columns on desktop; stacks on phones");
  });
  test("the section-8 enquiry form is still on the page and keeps the #appointment anchor (plus the hero form)", () => {
    assert.ok(/id="appointment"/.test(home));
    assert.equal((home.match(/<AppointmentForm/g) ?? []).length, 2);
  });
  test("homepage sections stay in the agreed order", () => {
    const order = ["<HeroSlider>", "Multispeciality medical services", "Plan your healthcare journey</h2>", "Our partnered hospitals",
      "Our trusted network of top hospitals", "Know our best doctors", "Blogs</h2>", "<Testimonials", "Talk to a patient coordinator", "Frequently asked questions"];
    const idx = order.map((k) => home.indexOf(k));
    assert.ok(idx.every((i) => i >= 0), JSON.stringify(idx));
    assert.deepEqual([...idx].sort((a, b) => a - b), idx);
  });
  test("hospital sections: 3-hospital slider with KNOW MORE cards; network marquee untouched", () => {
    assert.ok(home.includes("home.featuredHospitals.slice(0, HOME_HOSPITAL_COUNT).map"));
    assert.ok(home.includes("<HomeHospitalCard"));
    assert.ok(home.includes("home.network.map"));
  });
});

describe("slider images, logo and footer", () => {
  const slider = readFileSync("src/components/site/HeroSlider.tsx", "utf8");
  test("every slider image file exists at both sizes and is a valid image", () => {
    for (const n of ["hero-surgery", "hero-consultation", "hero-doctors"]) {
      assert.ok(slider.includes(`"${n}"`), n);
      for (const f of [`public/hero/${n}-800.webp`, `public/media/blog/${n}.webp`]) {
        assert.ok(existsSync(f), f);
        assert.equal(readFileSync(f).subarray(8, 12).toString(), "WEBP", `${f} is WebP`);
      }
      const big = readdirSync("public/hero").filter((f) => f.startsWith(n) && !f.includes("800"));
      assert.equal(big.length, 1, `${n} large size`);
    }
  });
  test("slider is accessible and respects reduced motion", () => {
    assert.ok(slider.includes("prefers-reduced-motion"));
    assert.ok(slider.includes('aria-roledescription="carousel"'));
    assert.ok(slider.includes("Show slide"));
    assert.ok(slider.includes("onMouseEnter"));
  });
  test("official logo is used in header and footer; no leftover Lovable-only asset URL", () => {
    assert.ok(statSync("public/brand/ikra-logo-256.webp").size > 2000);
    assert.ok(readFileSync("src/components/site/Header.tsx", "utf8").includes("/brand/ikra-logo-badge.webp"));
    assert.ok(readFileSync("src/components/site/Footer.tsx", "utf8").includes("/brand/ikra-logo-badge.webp"));
    assert.ok(statSync("public/brand/ikra-logo-badge.webp").size > 2000);
    for (const f of ["Header", "Footer"]) assert.ok(!readFileSync(`src/components/site/${f}.tsx`, "utf8").includes("asset.json"));
  });
  test("footer white space: no global body bottom padding and no top margin gap", () => {
    assert.ok(!/padding-bottom:\s*5\.5rem/.test(readFileSync("src/styles.css", "utf8")));
    assert.ok(!/<footer[^>]*\bmt-/.test(readFileSync("src/components/site/Footer.tsx", "utf8")));
  });
});

describe("admin: email status", () => {
  test("lead list reports mail configuration (no secrets) and the retry endpoint works for sales role", async () => {
    await createUser(db, { email: "s@t.co", name: "s", password: "CorrectHorse9Battery", role: "sales" });
    const login = (await handleApi(new Request(origin + "/api/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "s@t.co", password: "CorrectHorse9Battery" }) }), db))!;
    const { csrf } = (await login.json()) as { csrf: string };
    const cookie = login.headers.get("set-cookie")!.split(";")[0]!;
    const keep = { ...process.env };
    for (const k of ["SMTP_HOST", "SMTP_USER", "SMTP_PASS", "MAIL_FROM"]) delete process.env[k];
    process.env.SMTP_PASS = ""; 
    try {
      db.prepare("INSERT INTO leads (type, name, phone) VALUES ('contact','Lead One','+911234567890')").run();
      const list = (await (await handleApi(new Request(origin + "/api/admin/leads", { headers: { cookie } }), db))!.json()) as any;
      assert.equal(list.mail.configured, false);
      assert.deepEqual(list.mail.to, ["Contactus@ikrameditrip.com"]);
      assert.ok(list.mail.missing.includes("SMTP_HOST"));
      assert.equal(list.rows[0].notify_status, "pending");
      assert.ok(!JSON.stringify(list.mail).includes("SMTP_PASS=") );
      const id = list.rows[0].id;
      const noCsrf = (await handleApi(new Request(origin + `/api/admin/leads/${id}/notify`, { method: "POST", headers: { cookie, origin } }), db))!;
      assert.equal(noCsrf.status, 403, "CSRF required");
      const r = (await handleApi(new Request(origin + `/api/admin/leads/${id}/notify`, { method: "POST", headers: { cookie, origin, "x-csrf-token": csrf } }), db))!;
      assert.equal(r.status, 200);
      assert.equal(((await r.json()) as any).status, "not_configured");
      assert.equal((db.prepare("SELECT notify_status s FROM leads WHERE id = ?").get(id) as { s: string }).s, "not_configured");
    } finally {
      Object.assign(process.env, keep);
    }
  });
});
