# Ikra Meditrip – project handover

## How to run (on a machine that can reach npm)
```sh
npm install                       # first full install – see "Not yet verified"
cp .env.example .env              # fill in values
# the database is created and filled automatically on first start; `npm run db:seed` re-runs it safely
ADMIN_EMAIL=you@example.com ADMIN_NAME="You" ADMIN_PASSWORD='<12+ chars, upper/lower/digit>' npm run db:admin
npm run dev                       # http://localhost:8080 (admin at /admin)
npm test                          # 101 tests
npm run typecheck                 # full tsc with the project's strict tsconfig
npm run lint
npm run build:node                # Node server build (see Hosting)
```
Requires Node 22.5+ (uses the built-in `node:sqlite`).

## Fix log – import-protection errors
Cause: TanStack Start denies client imports from any `**/server/**` path; the RPC functions lived in `src/server/`.
Fix: `src/server/` → `src/backend/` (database, API, auth – server-only, only ever imported lazily inside `createServerFn` handlers and API routes); RPC functions → `src/lib/data-fns.ts`; shared view types → `src/lib/types.ts`. Import protection is untouched. No route imports `@/backend/*` statically.
Windows: `npm run build:node` is now cross-platform (`scripts/build-node.mjs`). Node >= 22.5 required (clear error if older).

## Verified (automated – `npm test`, strict `tsc` on server code)
- Database schema + migrations; relationships doctor↔hospital↔department↔treatment.
- Public read API with country / city / department filters, search across doctors+hospitals+treatments, menu data.
- Lead capture exactly per client form (name, age, country, city, phone, treatment, report upload): validation, honeypot, rate limiting, file-type sniffing (PDF/JPG/PNG/Word, 10 MB, 5 files), private storage, authenticated download, CSV export (formula-injection safe).
- Admin API: login (scrypt, lockout), sessions, CSRF, roles (admin / editor=content / sales=leads), full CRUD on all content, bulk CSV/JSON import with dry-run and per-row errors, audit log.
- Treatment costs are never returned publicly unless marked verified (with date); testimonials only if consented + published.
- sitemap.xml / robots.txt generation.
- Seed: 22 departments (client's 17 + 5 PROPOSED: Pulmonology, Nephrology, General & Laparoscopic Surgery, Internal Medicine, Paediatrics & Paediatric Surgery – client to confirm names), 20 hospitals, 75 doctors, 10 treatment pages (names only; no body/cost). Existing databases pick up the new departments, treatments and doctor links by running `npm run db:seed` (safe to repeat; only back-fills links to the 5 new departments).
- Homepage shows the client's original 17 speciality cards; "View All" lists all 22.
- Treatment pages with no linked doctors/hospitals show the department's, labelled as such.
- Doctor↔hospital: `npm run db:mapping` writes `data/templates/doctor-hospital-mapping.csv` (75 doctors, hospitals column blank) + `hospital-slugs.csv`. Client fills `hospitals` (slugs separated by `|`, first = primary), then Admin → Import (dry-run first). Re-import tested.
- Windows EPERM on test cleanup: cause was the never-closed shared SQLite connection (+ -wal/-shm files). Added `closeDb()`; tests close it before deleting temp folders, with bounded `rmSync` retries (5×100 ms).

Also verified: first start auto-fills an empty database (22 departments, 20 hospitals, 75 doctors, 10 treatments); homepage data (17 partnered hospitals in the client order, doctors with photos, logo carousel list, footer links data); hospital↔doctor editing keeps a doctor's primary hospital.

## Written but NOT yet compiled or run (npm registry was blocked in my environment)
All React/TanStack code: public pages (home banner+filters, about, departments, treatment pages, doctors and hospitals lists + profiles, treatment-cost, blog, search), multi-level menu, floating WhatsApp/call/cost CTA, lead form, admin UI, JSON-LD, canonical tags. Syntax-checked only. Expect a short round of fixes on first `npm run dev`/`build`, mainly TanStack Start API details (`createServerFn().inputValidator`, `server.handlers`, `ssr:false`, `doctors_.$slug` route naming).

## Hosting – decision needed
The project was generated for Lovable/Cloudflare. The database and file uploads need a **Node.js host with a writable disk** (`build:node` sets `NITRO_PRESET=node-server`). Plain PHP/WordPress shared hosting cannot run this. If the host is MySQL-only, the data layer (`src/backend/repo`) must be ported.

## Content placeholders (not invented)
Costs, bios, testimonials, blog posts, doctor→hospital links, doctor experience, hospital photos/descriptions: empty until supplied. Hospital cards show the bundled stock image labelled "Representative image". Department descriptions are the earlier generic copy and need clinical sign-off.


## Update – hero slider, logo, e-mail, feedback, blogs, footer
- **Hero**: right-hand form removed; left content, search and filters unchanged. Background is a cross-fading slider (`src/components/site/HeroSlider.tsx`) of the 3 client photos in `public/hero/` (800 px + large WebP). Pauses on hover/focus, honours "reduce motion", dots + arrows, readability overlay. The cost form remains in the "Talk to a patient coordinator" section (`#appointment`) and on /treatment-cost and the floating button.
- **Logo**: client logo in `public/brand/` used in header and footer (the old Lovable-only `/__l5e/...` URL no longer used).
- **Footer**: white strip came from a global 5.5 rem `body` bottom padding plus a 96 px footer top margin; both removed (clearance for the floating buttons is now inside the footer's own background).
- **Enquiry e-mail** (`src/backend/lib/mailer.ts`, no new dependency): every lead is saved first; the e-mail to `LEAD_NOTIFY_TO` (default Contactus@ikrameditrip.com) is then attempted over TLS (STARTTLS on 587 or implicit TLS on 465; certificates verified; refuses plain-text credentials). The real outcome is stored per lead (`sent / failed / not_configured`) and shown in Admin → Leads, with "Try sending again". Without `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` the admin shows "not configured"; nothing is faked. Medical reports are NOT attached to e-mails (privacy) – download them in the admin. Set the variables in `.env` (see `.env.example`). Existing databases get the new columns automatically.
- **Patient feedback**: premium carousel (`Testimonials.tsx`). Shows genuine testimonials only when published AND consent-confirmed in the admin; until then 3 cards labelled **Demo** with no names/ratings/claims (`src/data/demo-testimonials.ts`).
- **Blogs**: 3 original articles seeded (`src/backend/seed-posts.ts`), editable in Admin → Posts. Detail pages have SEO title/description, canonical, BlogPosting JSON-LD, "Keep reading" links and internal links to departments/hospitals/doctors/cost form. Content has no prices, statistics or guarantees – **have your medical/editorial team review before publishing**. Cover images are the client hero photos.
- Run `npm run db:seed` on an existing database to add the posts (idempotent; never overwrites admin edits).

## Supplied doctor profiles, hospital images & 25 departments (latest update)

**What was loaded** (idempotent `seed()` → `applySuppliedDoctors`, `applyHospitalImages`; admin edits are never overwritten):
- Source: DOCTORS.docx (155 profiles, photos, bios), doctor_list_excel.xlsx (152 names → speciality columns + city), 14 TX Hospitals profile cards. Generated data: `src/data/supplied-doctors.ts`; photos in `public/doctors/`, cards in `public/doctors/cards/`.
- 169 supplied profiles: **72 already existed** (matched by normalised name; only empty fields filled, hot-linked photos replaced by the supplied local photo), **97 added**. Library total 172 doctors, no duplicate names/slugs. A doctor under two specialities is one record linked to both departments.
- 25 departments = the 22 earlier + Cosmetic & Plastic Surgery, Dermatology & Cosmetology, Prosthetic & Artificial Body Parts (names taken from the Excel columns — **client to confirm**). Homepage still shows the original 17 cards.
- 20 hospital photos from the supplied folder are assigned by name (`public/hospitals/<slug>.webp`). Two hospitals named in the doctor files but absent from the list were added with a labelled placeholder: Fortis Hospital Kolkata, PHS Fertility Centre Kolkata.
- Homepage "Know our best doctors" = 24 curated profiles (photo, speciality, description); set once (`app_meta` key `supplied_profiles_v1`), change via admin "featured".

**Still needs the client:** hospital for 68 doctors (none linked — never guessed); correct bios for Dr Himanshu Pratap and Dr Meera Luthra (bios in the docx belong to other people → withheld); photo for Dr Mohsin Khan; experience years (not supplied for anyone); 8 profiles without qualification, 16 without description; Manipal image↔city (Bangalore/Electronic City/Siliguri) confirmation; Appaji Krishnan K "Apollo Hospital, Chennai" is ambiguous (unlinked); 3 near-identical photos (Soumya Kanti Bag, Rajarshi Mitra, Sourav Dutta); photos/details for the 2 new hospitals; 3 legacy doctors in neither source (Navin Chobdar, Bhaskar S, Jagadeesh C).
Migration 4 adds `doctors.city`, `doctors.profile_card_url`, `app_meta`.

## Header / hero / hospital descriptions fix
- Hero: two slides pointed at non-existent `-1060.webp` files (broken images); now use the existing `-1600.webp` files.
- Header: full menu from `xl` (≥1280px) so "Contact" is no longer cut off; below that the hamburger menu is used. Departments and Doctors menus show 12 items + "View all" (`MENU_LIMIT` in Header.tsx), also on mobile. Duplicate mobile "Home" link removed.
- Hospitals: every hospital has a short description (hospitals.summary, set by `npm run db:seed` — run it once on an existing database; admin-written text is never overwritten). Cards show the description instead of the old one-word tag.
- Patient feedback: unchanged and ready — add entries in Admin → Testimonials (tick Published + Consent); the labelled demo cards disappear automatically once one real entry is published.
- Header (final): the design is the original one (tagline, 'Know your cost' button, same gaps/fonts). Only the container is wider (max-w-7xl) and the full menu starts at 1280px (hamburger below), because at the old 1152px container width Contact was pushed under the button. Rendered in headless Chromium at 1280–1600px (also with +0.35px letter-spacing to mimic the wider Plus Jakarta font): no overlap (>=65px spare), no horizontal overflow, Departments flyout and Doctors/Hospitals panels inside the viewport.

## Deploying — Vercel vs a persistent host (important)
**Root cause of `ENOENT: mkdir './data'` on Vercel:** `openDb()` created `./data` (relative to the working folder) and kept the SQLite file there. On Vercel the project folder (`/var/task`) is read-only and each serverless instance has its own throw-away disk, so the folder can't be created and a SQLite file can never hold leads, users or admin edits there. (Uploads in `UPLOAD_DIR` have the same limit.)

**What the code does now (`src/backend/db/client.ts`, `api/handler.ts`):**
- Local dev / any Node host with a disk: unchanged (`DATABASE_PATH`, default `./data/ikra.db`, now resolved to an absolute path; a failing mkdir gives an explicit error message instead of an obscure one).
- Vercel / AWS Lambda / Netlify (detected via `VERCEL`, `AWS_LAMBDA_FUNCTION_NAME`, `NETLIFY`): the site runs **read-only** from a database rebuilt in the OS temp folder from the bundled client data (hospitals, doctors, treatments, blog). The project folder is never touched. Every write (`POST/PATCH/DELETE /api/*`: enquiry form, admin login/edits, uploads) is refused with a clear 503 ("call/e-mail us") — nothing is silently lost. `GET /api/health` reports `read-only` or `read-write`.
- This is a stop-gap that brings the public site back; **enquiries and the admin panel will not work on Vercel until a persistent database is in place.**

**Two ways to get a persistent database (choose one):**
1. **Recommended, no code change:** host on a Node server with a disk (Railway/Render/Fly volume, or a VPS). Build with `npm run build:node`, set `DATABASE_PATH` and `UPLOAD_DIR` to the mounted volume (e.g. `/data/ikra.db`), `IP_HASH_SALT`, SMTP vars. Back up the volume.
2. **Stay on Vercel:** the data layer must move to a hosted database — e.g. Turso (libSQL, same SQLite SQL; env `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`) or Neon/Vercel Postgres (`DATABASE_URL`) — and uploads to Vercel Blob (`BLOB_READ_WRITE_TOKEN`). The repository code is synchronous (`node:sqlite`), so this is an async rewrite of `src/backend/repo/*`, `api/handler.ts`, auth and tests — a separate piece of work, not a one-line fix.

## Oct 23 update: tracking, hero form, homepage sections
- **Tracking (GA4 + Meta Pixel):** set `VITE_GA_MEASUREMENT_ID` (G-…) and `VITE_META_PIXEL_ID` (digits) in Vercel → Settings → Environment Variables (Production), then **redeploy** (Vite bakes them in at build time). Without them nothing loads. `src/lib/analytics.ts` + `<AnalyticsTracker/>` (root layout): one `page_view`/`PageView` per path change (initial load + client-side navigation; filter/paging query changes don't count), automatic page views switched off to avoid duplicates. Conversion = GA4 `generate_lead` + Meta `Lead`, sent only after `/api/leads` succeeded; no personal data is sent. No cookie-consent banner exists — add one if your audience requires it (GDPR/UK).
- **Hero:** cost-enquiry form back on the banner (stacks under the text on phones); slider interval 10 s with a 1.8 s cross-fade; logo replaced by the corrected badge (`public/brand/ikra-logo-badge.webp`, 172 px — send a larger original of this version for sharper print/retina use).
- **Filters:** new "Find the right doctor/hospital" bar on the homepage (Country · City · Speciality · Treatment · Hospital); Treatment + Hospital filters added to /doctors, Treatment to /hospitals (backend: `treatment`/`hospital` params, additive).
- **Homepage:** 8 services (`src/data/home-services.ts`), 3 partner hospitals in a slider (KNOW MORE → profile; `HOME_HOSPITAL_COUNT`), doctor cards without descriptions and with a "See details & book" button. The 25-department list, hospital directory and doctor directory are unchanged.
- Carousel arrows (`ui/carousel.tsx`) moved inside the padding: they were off-screen on screens narrower than ~1250 px and made phones scroll sideways.

## Oct 24 update (14-point brief, part 2)

**Doctors page**: new `DoctorListCard` (cards.tsx) - photo left; name, speciality chips, location, experience, designation, "Works at <hospital>" centre; red *Book Appointment* (-> doctor page `#enquire` form) and green *WhatsApp Us* on the right; divider; biography clamped with a working *Show more / Show less*. Stacks on phones. No verified badge or ratings are shown because the database holds none. The WhatsApp link is `site.whatsappHref` in `src/data/site.ts` (the client's "Phone / WhatsApp" number, +91 8282068810) with a pre-filled message naming the doctor; the doctor profile page has the same green button. To change the number edit `site.whatsappHref` / `site.phoneHref`.

**Buttons**: the rose/orange/fuchsia gradient was removed. SEE DETAILS and KNOW MORE use the site's own `gradient-brand`. Only Book Appointment (red, per your reference) and WhatsApp (green) differ.

**Footer** social icons use official colours (Facebook #1877F2, Instagram gradient, LinkedIn #0A66C2, YouTube #FF0000), linked to `site.socials.*`. A platform with an empty URL is hidden, not invented.

**Breadcrumbs** use a chevron instead of "/". Routes are unchanged.

**Hospital images / logos**: your RAR was unpacked. `public/hospitals/fortis-hospital-kolkata.webp` and `phs-fertility-centre-kolkata.webp` (from "Hospital image/") fix the two Kolkata pages; `public/hospitals/logos/<slug>.webp` holds the 20 supplied logos (3 Manipal hospitals share the Manipal Hospitals wordmark). `Manipal Hospitals, Electronic City.png` is a MAHE (university) graphic, not a hospital logo, and `Manipal Hospitals.jpg` is a duplicate - both were deliberately NOT used. Migrations 5-7 (`src/backend/db/schema.ts`) apply these automatically on the next start of an existing database (empty/placeholder fields only; admin uploads are never overwritten); `npm run db:seed` does the same on a fresh database.

**Logo carousel** ("Our trusted network of top hospitals"): 150 s per loop (was 32 s), pauses on hover and keyboard focus, real logos. The 3-hospital "Our partnered hospitals" cards with KNOW MORE are unchanged.

**Hero**: search bar removed from the hero only (the FindBar under the banner and the Doctors/Hospitals filters remain); the lead form is on the left, heading smaller, on a light panel so it stays readable over the photo. Mobile: heading first, then the form.

**Departments removed**: there was no separate /departments route - the nav item "Departments" led to `/services`. It is now labelled "Services" everywhere (header, mobile menu, footer, about). `/departments` and `/departments/<slug>` redirect 301 to `/services` and `/services/<slug>` (root `beforeLoad`). Doctor speciality filters and all service detail pages are untouched. If you want the Services list page itself removed too, say so.

**Dashes**: em/en dashes used as punctuation in public text were replaced by " - " in source files, and migration 7 does the same for stored text (doctors, hospitals, services, treatments, blog). Numeric ranges (1-5, 24-48) keep their en dash.

**Consent**: GA4 / Meta Pixel now load only after the visitor presses *Accept* in a cookie banner (`ConsentBanner.tsx`, `lib/consent.ts`; choice kept in localStorage `ikra_consent`; footer "Cookie settings" reopens it). The banner appears only when at least one tracking ID is configured. Privacy policy section 6 was extended. This is a technical opt-in, not a legal opinion; have counsel confirm the wording for the countries you advertise in.

**Still needed from you**: `VITE_GA_MEASUREMENT_ID`, `VITE_META_PIXEL_ID` in Vercel + a new deployment; `npm run build` and lint locally (not runnable in the build sandbox); the TanStack alignment patch and a persistent database host (unchanged from before).
