/**
 * Seed data from what the client already supplied (src/data/site.ts, doctors.ts, service-summaries.ts).
 *
 * - Inserts only records that do not exist yet (matched by slug). Never overwrites or deletes, so it is
 *   safe to re-run after admin edits.
 * - Invents nothing: no costs, bios, testimonials, reviews, logos or doctor→hospital affiliations.
 */
import type { DB } from "./db/client";
import { slugify } from "./lib/validate";
import { createEntity, entities } from "./repo/entities";
import { doctors as doctorData } from "../data/doctors";
import { hospitals as hospitalData, specialties } from "../data/site";
import { SEED_POSTS } from "./seed-posts";
import { serviceSummaries } from "../data/service-summaries";
import { suppliedDoctors } from "../data/supplied-doctors";

/** The 17 hospitals for the homepage "Our Partnered Hospitals" section, in the client's order (home_page.docx). */
const HOME_HOSPITALS: [string, string][] = [
  ["Nova IVF Fertility", "Kolkata"],
  ["Desun Hospital", "Kolkata"],
  ["Manipal Hospitals", "Bangalore"],
  ["Apollo Indraprastha Hospitals", "Delhi"],
  ["Apollo Main Hospital, Greams Road", "Chennai"],
  ["Apollo Super Speciality Hospitals - Cancer Centre", "Chennai"],
  ["Apollo Fertility Centre", "Chennai"],
  ["Fortis Escorts Heart Institute", "Delhi"],
  ["Fortis Escorts Hospital", "Faridabad"],
  ["Zemya IVF", "Delhi"],
  ["Artemis Hospitals", "Gurgaon"],
  ["Asian Institute of Medical Sciences", "Faridabad"],
  ["P & O International Artificial Limb Centre", "Delhi"],
  ["Tx Hospitals", "Hyderabad"],
  ["Kauvery Hospitals", "Bangalore"],
  ["Amrita Hospitals", "Faridabad"],
  ["Sharp Sight Eye Hospitals", "Delhi"],
];

/**
 * Five departments added to reach the agreed 22. Names are derived from the doctor designations the client supplied
 * (Pulmonology, Nephrology, General/Laparoscopic Surgery, Internal Medicine, Paediatric Surgery). PROPOSED - the client
 * should confirm the final names; they can be renamed in the admin panel (slugs stay stable).
 */
const EXTRA_DEPARTMENTS: { name: string; icon: string }[] = [
  { name: "Pulmonology", icon: "Activity" },
  { name: "Nephrology", icon: "Droplet" },
  { name: "General & Laparoscopic Surgery", icon: "Scissors" },
  { name: "Internal Medicine", icon: "Stethoscope" },
  { name: "Paediatrics & Paediatric Surgery", icon: "Baby" },
];
/**
 * Three further departments that appear as speciality columns in the client's doctor Excel sheet but not in the 22
 * (Cosmetic & Plastic Surgery, Dermatology & Cosmetology, Prosthetic & Artificial Body Parts). Names are the Excel's own;
 * the client should confirm them. Renamable in the admin panel.
 */
const EXCEL_DEPARTMENTS: { name: string; icon: string }[] = [
  { name: "Cosmetic & Plastic Surgery", icon: "Scissors" },
  { name: "Dermatology & Cosmetology", icon: "Smile" },
  { name: "Prosthetic & Artificial Body Parts", icon: "Bone" },
];
const EXTRA_DEPT_SLUGS = EXTRA_DEPARTMENTS.map((d) => slugify(d.name));

/**
 * Treatment pages (names already used in the project's existing copy). Only name + department are set: no description,
 * cost or hospital/doctor link is invented - those come from the client and are entered in the admin panel.
 */
const TREATMENTS: { name: string; dept: string }[] = [
  { name: "Coronary Bypass Surgery", dept: "cardio-thoracic-and-vascular-surgery" },
  { name: "Angioplasty", dept: "cardiology" },
  { name: "Heart Valve Replacement", dept: "cardio-thoracic-and-vascular-surgery" },
  { name: "Knee Replacement", dept: "orthopedic-and-joint-replacement" },
  { name: "Hip Replacement", dept: "orthopedic-and-joint-replacement" },
  { name: "Bone Marrow Transplant", dept: "haemato-oncology" },
  { name: "Liver Transplant", dept: "liver-transplant-gi-and-hpb-surgery" },
  { name: "Kidney Transplant", dept: "urology-and-kidney-transplant" },
  { name: "IVF Treatment", dept: "ivf-and-reproductive-medicine" },
  { name: "Cochlear Implant", dept: "ent-and-cochlear-implant" },
];

const ICONS = [
  "HeartPulse", "Bone", "Brain", "Droplet", "Ribbon", "Activity", "Baby", "Eye", "Stethoscope",
  "Scissors", "HeartPulse", "Ear", "Smile", "Syringe", "Users", "Microscope", "Brain",
];

/** Conservative keyword → department-slug rules. Anything ambiguous stays unmapped. */
const RULES: { test: RegExp; slugs: string[] }[] = [
  { test: /pulmonolog|chest medicine/i, slugs: ["pulmonology"] },
  { test: /nephrolog/i, slugs: ["nephrology"] },
  { test: /general.*(surg|laparoscop)|laparoscop|colorectal/i, slugs: ["general-and-laparoscopic-surgery"] },
  { test: /internal medicine/i, slugs: ["internal-medicine"] },
  { test: /p(a)?ediatric surg/i, slugs: ["paediatrics-and-paediatric-surgery"] },
  { test: /cardio.?thoracic|vascular surg|(adult )?cardiac surgery/i, slugs: ["cardio-thoracic-and-vascular-surgery"] },
  { test: /p(a)?ediatric cardio|p(a)?ediatric cardiac|congenital heart/i, slugs: ["pediatric-cardiac-care"] },
  { test: /(?<!p(a)?ediatric )(?<!interventional p(a)?ediatric )cardiolog|cardiac sciences/i, slugs: ["cardiology"] },
  { test: /orthop/i, slugs: ["orthopedic-and-joint-replacement"] },
  { test: /spine/i, slugs: ["spine-and-scoliosis-surgery"] },
  { test: /neuro ?surg/i, slugs: ["neurosurgery"] },
  { test: /neurolog/i, slugs: ["neurology"] },
  { test: /haemato|hematolog/i, slugs: ["haemato-oncology"] },
  { test: /oncolog/i, slugs: ["oncology"] },
  { test: /urolog|kidney/i, slugs: ["urology-and-kidney-transplant"] },
  { test: /liver transplant|hpb|\bgi\b/i, slugs: ["liver-transplant-gi-and-hpb-surgery"] },
  { test: /gyn(a)?ecolog|obstetric/i, slugs: ["obstetrics-and-gynaecology"] },
  { test: /ophthalm/i, slugs: ["ophthalmology"] },
  { test: /\bent\b|cochlear|otolaryng/i, slugs: ["ent-and-cochlear-implant"] },
  { test: /dentist|dental/i, slugs: ["dentistry"] },
  { test: /\bivf\b|fertility/i, slugs: ["ivf-and-reproductive-medicine"] },
];

const HOSPITAL_NOTE_DEPTS: Record<string, string[] | "all"> = {
  "All specialities": "all",
  Oncology: ["oncology"],
  "IVF & fertility": ["ivf-and-reproductive-medicine"],
  "IVF & reproductive medicine": ["ivf-and-reproductive-medicine"],
  "Cardiac sciences": ["cardiology"],
  Ophthalmology: ["ophthalmology"],
};

export function seed(db: DB) {
  const stats = { posts: 0, treatments: 0, departments: 0, hospitals: 0, doctors: 0, unmappedDoctors: [] as string[] };
  const idBySlug = (table: string, slug: string) =>
    (db.prepare(`SELECT id FROM ${table} WHERE slug = ?`).get(slug) as { id: number } | undefined)?.id;

  // departments (the client's current list of specialities)
  specialties.forEach((name, i) => {
    const slug = slugify(name);
    if (idBySlug("departments", slug)) return;
    const carried = serviceSummaries[name];
    const r = createEntity(db, entities.departments, {
      name, slug, icon: carried?.icon ?? ICONS[i], summary: carried?.summary ?? null, sort_order: i + 1,
    });
    if (!r.ok) throw new Error(`department ${name}: ${JSON.stringify(r.errors)}`);
    stats.departments++;
  });
  // the 5 extra departments (sort_order continues after the client's 17)
  EXTRA_DEPARTMENTS.forEach((d, i) => {
    const slug = slugify(d.name);
    if (idBySlug("departments", slug)) return;
    const r = createEntity(db, entities.departments, { name: d.name, slug, icon: d.icon, sort_order: specialties.length + i + 1 });
    if (!r.ok) throw new Error(`department ${d.name}: ${JSON.stringify(r.errors)}`);
    stats.departments++;
  });
  EXCEL_DEPARTMENTS.forEach((d, i) => {
    const slug = slugify(d.name);
    if (idBySlug("departments", slug)) return;
    const r = createEntity(db, entities.departments, { name: d.name, slug, icon: d.icon, sort_order: specialties.length + EXTRA_DEPARTMENTS.length + i + 1 });
    if (!r.ok) throw new Error(`department ${d.name}: ${JSON.stringify(r.errors)}`);
    stats.departments++;
  });
  const allDeptIds = (db.prepare("SELECT id FROM departments").all() as { id: number }[]).map((r) => r.id);

  // hospitals - city is the client's; country India (all listed cities are in India)
  const nameCount = new Map<string, number>();
  hospitalData.forEach((h) => nameCount.set(h.name, (nameCount.get(h.name) ?? 0) + 1));
  hospitalData.forEach((h, i) => {
    const slug = slugify(nameCount.get(h.name)! > 1 ? `${h.name} ${h.city}` : h.name);
    if (idBySlug("hospitals", slug)) return;
    const note = h.note ? HOSPITAL_NOTE_DEPTS[h.note] : undefined;
    const department_ids =
      note === "all" ? allDeptIds : (note ?? []).map((s) => idBySlug("departments", s)).filter((x): x is number => !!x);
    const homePos = HOME_HOSPITALS.findIndex(([n, c]) => n === h.name && c === h.city);
    const r = createEntity(db, entities.hospitals, {
      slug, name: h.name, city: h.city, country: "India", summary: h.note ?? null,
      is_placeholder_image: 1, image_alt: `${h.name}, ${h.city}`,
      sort_order: homePos >= 0 ? homePos + 1 : 100 + i, featured: homePos >= 0 ? 1 : 0, department_ids,
    });
    if (!r.ok) throw new Error(`hospital ${h.name}: ${JSON.stringify(r.errors)}`);
    stats.hospitals++;
  });

  // doctors - name, designation and photo exactly as supplied
  doctorData.forEach((d, i) => {
    const slug = slugify(d.name.replace(/^dr\.?\s*/i, "dr "));
    const existing = idBySlug("doctors", slug);
    if (existing) {
      // Back-fill ONLY links to the 5 newly added departments, so older databases pick them up without
      // re-adding links an admin has deliberately removed from the original 17.
      for (const rule of RULES)
        if (rule.test.test(d.specialty))
          for (const sl of rule.slugs.filter((x) => EXTRA_DEPT_SLUGS.includes(x))) {
            const did = idBySlug("departments", sl);
            if (did) db.prepare("INSERT OR IGNORE INTO doctor_departments (doctor_id, department_id) VALUES (?, ?)").run(existing, did);
          }
      return;
    }
    const slugs = new Set<string>();
    for (const rule of RULES) if (rule.test.test(d.specialty)) rule.slugs.forEach((s) => slugs.add(s));
    const department_ids = [...slugs].map((s) => idBySlug("departments", s)).filter((x): x is number => !!x);
    if (!department_ids.length) stats.unmappedDoctors.push(`${d.name} - ${d.specialty}`);
    const r = createEntity(db, entities.doctors, {
      slug, name: d.name, designation: d.specialty, image_url: d.image, image_alt: `${d.name}, ${d.specialty}`,
      featured: i < 16 ? 1 : 0, sort_order: i + 1, department_ids,
    });
    if (!r.ok) throw new Error(`doctor ${d.name}: ${JSON.stringify(r.errors)}`);
    stats.doctors++;
  });
  // hospitals named in the client's doctor documents but missing from the original list (details/photos still needed)
  for (const h of EXCEL_HOSPITALS) {
    if (idBySlug("hospitals", h.slug)) continue;
    const r = createEntity(db, entities.hospitals, {
      slug: h.slug, name: h.name, city: h.city, country: "India", is_placeholder_image: 1, image_alt: `${h.name}, ${h.city}`,
      sort_order: 200, featured: 0,
    });
    if (!r.ok) throw new Error(`hospital ${h.name}: ${JSON.stringify(r.errors)}`);
    stats.hospitals++;
  }
  applyHospitalImages(db);
  applyHospitalLogos(db);
  applyHospitalDescriptions(db);
  const supplied = applySuppliedDoctors(db);
  stats.doctors += supplied.added;
  // treatment pages
  TREATMENTS.forEach((t, i) => {
    const slug = slugify(t.name);
    if (idBySlug("treatments", slug)) return;
    const r = createEntity(db, entities.treatments, {
      name: t.name, slug, department_id: idBySlug("departments", t.dept), sort_order: i + 1, published: 1,
    });
    if (!r.ok) throw new Error(`treatment ${t.name}: ${JSON.stringify(r.errors)}`);
    stats.treatments++;
  });
  // original articles (idempotent by slug; admin edits are never overwritten)
  SEED_POSTS.forEach((p, i) => {
    if (idBySlug("posts", p.slug)) return;
    // staggered by a minute so the order on the blog page is stable
    const published_at = new Date(Date.now() - i * 60_000).toISOString().slice(0, 19) + "Z";
    const r = createEntity(db, entities.posts, { ...p, author: "Ikra Meditrip Team", status: "published", published_at });
    if (!r.ok) throw new Error(`post ${p.slug}: ${JSON.stringify(r.errors)}`);
    stats.posts++;
  });
  return { ...stats, supplied };
}

/** Hospitals that the client's doctor documents name but the original hospital list does not contain. */
const EXCEL_HOSPITALS = [
  { slug: "fortis-hospital-kolkata", name: "Fortis Hospital", city: "Kolkata" },
  { slug: "phs-fertility-centre-kolkata", name: "PHS Fertility Centre", city: "Kolkata" },
];

/** Photos supplied by the client in the hospital images folder (public/hospitals/<slug>.webp), matched by hospital name. */
export const HOSPITAL_IMAGE_SLUGS = [
  "amrita-hospitals", "apollo-fertility-centre", "apollo-gleneagles-hospital", "apollo-indraprastha-hospitals",
  "apollo-main-hospital-greams-road", "apollo-super-speciality-hospitals-cancer-centre", "artemis-hospitals",
  "asian-institute-of-medical-sciences", "desun-hospital", "fortis-escorts-heart-institute", "fortis-escorts-hospital",
  "kauvery-hospitals", "manipal-hospitals-bangalore", "manipal-hospitals-electronic-city", "manipal-hospitals-siliguri",
  "fortis-hospital-kolkata", "phs-fertility-centre-kolkata",
  "nova-ivf-fertility", "p-and-o-international-artificial-limb-centre", "sharp-sight-eye-hospitals", "tx-hospitals", "zemya-ivf",
];

/** Sets the supplied photo only where the hospital has no image or still shows a placeholder (admin-uploaded images win). */
export function applyHospitalImages(db: DB) {
  const upd = db.prepare(
    `UPDATE hospitals SET image_url = ?, is_placeholder_image = 0, image_alt = COALESCE(NULLIF(image_alt, ''), name || ', ' || COALESCE(city, '')) WHERE slug = ? AND (image_url IS NULL OR image_url = '' OR is_placeholder_image = 1)`,
  );
  let n = 0;
  for (const slug of HOSPITAL_IMAGE_SLUGS) n += Number(upd.run(`/hospitals/${slug}.webp`, slug).changes);
  return n;
}

/** Genuine logos supplied by the client (public/hospitals/logos/<slug>.webp) for the homepage logo carousel; fills EMPTY logo_url only. */
export const HOSPITAL_LOGO_SLUGS = ["amrita-hospitals", "apollo-fertility-centre", "apollo-gleneagles-hospital", "apollo-indraprastha-hospitals", "apollo-main-hospital-greams-road", "apollo-super-speciality-hospitals-cancer-centre", "artemis-hospitals", "asian-institute-of-medical-sciences", "desun-hospital", "fortis-escorts-heart-institute", "fortis-escorts-hospital", "fortis-hospital-kolkata", "kauvery-hospitals", "manipal-hospitals-bangalore", "manipal-hospitals-electronic-city", "manipal-hospitals-siliguri", "nova-ivf-fertility", "p-and-o-international-artificial-limb-centre", "phs-fertility-centre-kolkata", "sharp-sight-eye-hospitals", "tx-hospitals", "zemya-ivf"];

export function applyHospitalLogos(db: DB) {
  const upd = db.prepare("UPDATE hospitals SET logo_url = ? WHERE slug = ? AND (logo_url IS NULL OR logo_url = '')");
  let n = 0;
  for (const slug of HOSPITAL_LOGO_SLUGS) n += Number(upd.run(`/hospitals/logos/${slug}.webp`, slug).changes);
  return n;
}

const normName = (n: string) =>
  n.toLowerCase().replace(/\b(dr|prof|mr|mrs|ms)\b\.?/g, " ").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");

export type SuppliedReport = {
  total: number; added: number; alreadyPresent: number; updated: number;
  /** supplied-profile records that still lack a given field after the import */
  missing: { photo: number; description: number; hospital: number; qualification: number; experience: number };
  skipped: boolean;
};

/**
 * Applies the client's supplied doctor profiles (DOCTORS.docx + Excel + TX cards):
 *  - matches existing doctors by normalised name → NO duplicate records; unmatched names are added;
 *  - existing records: only EMPTY fields are filled (plus the supplied local photo replaces a hot-linked one); nothing is removed;
 *  - speciality links and explicit hospital links are added (INSERT OR IGNORE); a doctor listed under two specialities stays ONE record;
 *  - the "featured" set for the homepage is curated once (app_meta key supplied_profiles_v1) so admin changes afterwards stick.
 */
export function applySuppliedDoctors(db: DB): SuppliedReport {
  const idOf = (table: string, slug: string) =>
    (db.prepare(`SELECT id FROM ${table} WHERE slug = ?`).get(slug) as { id: number } | undefined)?.id;
  const rows = db.prepare("SELECT id, slug, name FROM doctors").all() as { id: number; slug: string; name: string }[];
  const byName = new Map(rows.map((r) => [normName(r.name), r.id]));
  const rep: SuppliedReport = { total: suppliedDoctors.length, added: 0, alreadyPresent: 0, updated: 0, missing: { photo: 0, description: 0, hospital: 0, qualification: 0, experience: 0 }, skipped: false };
  const linkDept = db.prepare("INSERT OR IGNORE INTO doctor_departments (doctor_id, department_id) VALUES (?, ?)");
  const hasPrimary = db.prepare("SELECT 1 FROM doctor_hospitals WHERE doctor_id = ? AND is_primary = 1");
  const linkHosp = db.prepare("INSERT OR IGNORE INTO doctor_hospitals (doctor_id, hospital_id, is_primary) VALUES (?, ?, ?)");
  const ids: number[] = [];
  for (const d of suppliedDoctors) {
    const summary = d.summary ? d.summary.slice(0, 600) : null;
    const body = d.bioWithheld ? null : d.body;
    let id = byName.get(normName(d.name));
    if (id) {
      rep.alreadyPresent++;
      const cur = db.prepare("SELECT designation, qualifications, summary, body, image_url, city, profile_card_url FROM doctors WHERE id = ?").get(id) as Record<string, string | null>;
      const sets: Record<string, unknown> = {};
      const fill = (col: string, v: string | null) => { if (v && !cur[col]) sets[col] = v; };
      fill("designation", d.designation); fill("qualifications", d.qualification); fill("summary", summary);
      fill("body", body); fill("city", d.city); fill("profile_card_url", d.card);
      if (d.image && (!cur.image_url || /^https?:/i.test(cur.image_url))) { sets.image_url = d.image; sets.image_alt = `${d.name}${d.designation ? `, ${d.designation}` : ""}`; }
      const cols = Object.keys(sets);
      if (cols.length) {
        db.prepare(`UPDATE doctors SET ${cols.map((c) => `${c} = ?`).join(", ")} WHERE id = ?`).run(...(cols.map((c) => sets[c]) as never[]), id);
        rep.updated++;
      }
    } else {
      const r = createEntity(db, entities.doctors, {
        slug: d.slug, name: d.name, designation: d.designation, qualifications: d.qualification, summary, body,
        city: d.city, image_url: d.image, profile_card_url: d.card,
        image_alt: d.image ? `${d.name}${d.designation ? `, ${d.designation}` : ""}` : null, featured: 0, sort_order: 500 + rep.added,
      });
      if (!r.ok) throw new Error(`doctor ${d.name}: ${JSON.stringify(r.errors)}`);
      id = idOf("doctors", d.slug)!;
      byName.set(normName(d.name), id);
      rep.added++;
    }
    // speciality = the Excel columns; the few profiles absent from the Excel fall back to the client's own designation/qualification text
    const deps = d.departments.length
      ? d.departments
      : RULES.filter((r) => r.test.test(`${d.designation ?? ""} ${d.qualification ?? ""}`)).flatMap((r) => r.slugs);
    for (const dep of deps) { const did = idOf("departments", dep); if (did) linkDept.run(id, did); }
    if (d.hospital) {
      const hid = idOf("hospitals", d.hospital);
      if (hid) linkHosp.run(id, hid, hasPrimary.get(id) ? 0 : 1);
    }
    ids.push(id);
  }
  // what is still missing after the import (per supplied profile)
  const chk = db.prepare(
    `SELECT image_url, body, summary, qualifications, experience_years, (SELECT COUNT(*) FROM doctor_hospitals WHERE doctor_id = d.id) hosp, city FROM doctors d WHERE id = ?`,
  );
  for (const id of ids) {
    const c = chk.get(id) as Record<string, unknown>;
    if (!c.image_url) rep.missing.photo++;
    if (!c.body && !c.summary) rep.missing.description++;
    if (!c.hosp) rep.missing.hospital++;
    if (!c.qualifications) rep.missing.qualification++;
    if (c.experience_years == null) rep.missing.experience++;
  }
  // one-time curated homepage selection (round-robin across specialities, supplied photo + description only)
  const done = db.prepare("SELECT 1 FROM app_meta WHERE key = 'supplied_profiles_v1'").get();
  if (done) rep.skipped = true;
  else {
    const eligible = db
      .prepare(
        `SELECT d.id, (SELECT department_id FROM doctor_departments WHERE doctor_id = d.id ORDER BY department_id LIMIT 1) dep
         FROM doctors d WHERE d.image_url LIKE '/doctors/%' AND d.summary IS NOT NULL AND d.published = 1 ORDER BY d.id`,
      )
      .all() as { id: number; dep: number | null }[];
    const groups = new Map<number, number[]>();
    for (const e of eligible) { const k = e.dep ?? 0; (groups.get(k) ?? groups.set(k, []).get(k)!).push(e.id); }
    const pick: number[] = [];
    for (let round = 0; pick.length < 24 && round < 5; round++)
      for (const g of groups.values()) if (g[round] !== undefined && pick.length < 24) pick.push(g[round]!);
    db.prepare("UPDATE doctors SET featured = 0").run();
    pick.forEach((id, i) => db.prepare("UPDATE doctors SET featured = 1, sort_order = ? WHERE id = ?").run(i + 1, id));
    db.prepare("INSERT INTO app_meta (key, value) VALUES ('supplied_profiles_v1', ?)").run(String(pick.length));
  }
  return rep;
}


const COORD = "Ikra Meditrip coordinates appointments, written cost estimates and travel support for patients here.";
/**
 * Short descriptions for every hospital. They state only what the client's own lists show - the hospital's name, city, the
 * focus the client gave (e.g. "All specialities", "Oncology", "IVF") and the specialities of the doctors the client linked to it.
 * No bed counts, accreditations, founding dates or awards are claimed. Editable in the admin panel (Hospitals → Summary).
 */
export const HOSPITAL_DESCRIPTIONS: Record<string, string> = {
  "apollo-main-hospital-greams-road": `Apollo Main Hospital, Greams Road is a multi-speciality partner hospital in Chennai covering a wide range of adult specialities. ${COORD}`,
  "apollo-super-speciality-hospitals-cancer-centre": `The Apollo Super Speciality Hospitals Cancer Centre in Chennai is our partner for oncology and cancer care. ${COORD}`,
  "apollo-fertility-centre": `Apollo Fertility Centre in Chennai is our partner for IVF, fertility treatment and reproductive medicine. ${COORD}`,
  "apollo-indraprastha-hospitals": `Apollo Indraprastha Hospitals in New Delhi is a multi-speciality partner hospital, with specialists in oncology, neurosurgery, ENT, liver and GI care and more. ${COORD}`,
  "apollo-gleneagles-hospital": `Apollo Gleneagles Hospital in Kolkata is a multi-speciality partner hospital serving patients from eastern India and abroad. ${COORD}`,
  "fortis-escorts-heart-institute": `Fortis Escorts Heart Institute in New Delhi is our partner for cardiac sciences, with cardiologists alongside urology, orthopaedic, liver and neurology specialists. ${COORD}`,
  "fortis-escorts-hospital": `Fortis Escorts Hospital in Faridabad is a multi-speciality partner hospital in the Delhi NCR region. ${COORD}`,
  "artemis-hospitals": `Artemis Hospitals in Gurgaon is a multi-speciality partner hospital, with specialists in spine surgery, oncology and orthopaedics among others. ${COORD}`,
  "asian-institute-of-medical-sciences": `Asian Institute of Medical Sciences in Faridabad is a multi-speciality partner hospital, including oncology and orthopaedic care. ${COORD}`,
  "amrita-hospitals": `Amrita Hospitals in Faridabad is a multi-speciality partner hospital in the Delhi NCR region. ${COORD}`,
  "zemya-ivf": `Zemya IVF in Delhi is a fertility centre focused on IVF and reproductive medicine. ${COORD}`,
  "sharp-sight-eye-hospitals": `Sharp Sight Eye Hospitals in Delhi is our partner for ophthalmology and eye care. ${COORD}`,
  "p-and-o-international-artificial-limb-centre": `P & O International Artificial Limb Centre in Delhi is our partner for prosthetics, orthotics and artificial limbs. ${COORD}`,
  "desun-hospital": `DESUN Hospital in Kolkata is a multi-speciality partner hospital, with specialists in oncology, cardiology, gynaecology, liver/GI care and urology. ${COORD}`,
  "nova-ivf-fertility": `Nova IVF Fertility in Kolkata is our partner for IVF, fertility treatment and reproductive medicine. ${COORD}`,
  "tx-hospitals": `TX Hospitals in Hyderabad is a multi-speciality partner hospital, with specialists in cardiology, liver and GI care, pulmonology, ENT and oncology. ${COORD}`,
  "manipal-hospitals-bangalore": `Manipal Hospitals in Bangalore is a multi-speciality partner hospital for patients seeking advanced treatment in South India. ${COORD}`,
  "manipal-hospitals-electronic-city": `Manipal Hospitals, Electronic City is a multi-speciality partner hospital in Bangalore. ${COORD}`,
  "manipal-hospitals-siliguri": `Manipal Hospitals in Siliguri is a multi-speciality partner hospital, with specialists in urology, general surgery, neurology and orthopaedics among others. ${COORD}`,
  "kauvery-hospitals": `Kauvery Hospitals in Bangalore is a multi-speciality partner hospital, with specialists in spine surgery and neurology among others. ${COORD}`,
  "fortis-hospital-kolkata": `Fortis Hospital in Kolkata is a partner hospital where our listed doctors practise cardiology, gynaecology, orthopaedics and general surgery. ${COORD}`,
  "phs-fertility-centre-kolkata": `PHS Fertility Centre in Kolkata is a fertility centre for IVF and reproductive medicine. ${COORD}`,
};

/** Fills the summary only where it is empty or still the old one-word focus tag, so admin-written text is kept. */
export function applyHospitalDescriptions(db: DB) {
  const upd = db.prepare(
    `UPDATE hospitals SET summary = ? WHERE slug = ? AND (summary IS NULL OR summary = '' OR length(summary) < 40)`,
  );
  let n = 0;
  for (const [slug, text] of Object.entries(HOSPITAL_DESCRIPTIONS)) n += Number(upd.run(text, slug).changes);
  return n;
}
