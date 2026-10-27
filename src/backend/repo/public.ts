import type { DB } from "../db/client";

type Rec = Record<string, unknown>;
const all = (db: DB, sql: string, ...p: (string | number)[]) => db.prepare(sql).all(...p) as Rec[];
const one = (db: DB, sql: string, ...p: (string | number)[]) =>
  db.prepare(sql).get(...p) as Rec | undefined;

const like = (q: string) => `%${q.replace(/[\\%_]/g, "\\$&")}%`;

/** Costs are public only when the client has verified them. */
export function publicCost(t: Rec) {
  if (!t.cost_verified || t.cost_min == null) return null;
  return {
    min: t.cost_min as number,
    max: (t.cost_max as number | null) ?? null,
    currency: t.cost_currency as string,
    notes: (t.cost_notes as string | null) ?? null,
    verifiedOn: (t.cost_verified_on as string | null) ?? null,
    source: (t.cost_source as string | null) ?? null,
  };
}

function shapeTreatment(t: Rec) {
  const { cost_min, cost_max, cost_currency, cost_notes, cost_verified, cost_verified_on, cost_source, ...rest } = t;
  void cost_min; void cost_max; void cost_currency; void cost_notes; void cost_verified; void cost_verified_on; void cost_source;
  return { ...rest, cost: publicCost(t) };
}

export type ListOpts = {
  country?: string;
  city?: string;
  department?: string; // department slug
  treatment?: string; // treatment slug (doctors/hospitals linked to it, or to its department)
  hospital?: string; // hospital slug (doctors only)
  q?: string;
  page?: number;
  pageSize?: number;
};

function paging(o: ListOpts, def = 24) {
  const pageSize = Math.min(Math.max(o.pageSize ?? def, 1), 100);
  const page = Math.max(o.page ?? 1, 1);
  return { pageSize, page, offset: (page - 1) * pageSize };
}

// ---------- doctors ----------
export function listDoctors(db: DB, o: ListOpts = {}) {
  const where = ["d.published = 1"];
  const p: (string | number)[] = [];
  if (o.country || o.city) {
    const sub: string[] = ["h.published = 1"];
    if (o.country) { sub.push("h.country = ?"); p.push(o.country); }
    if (o.city) { sub.push("h.city = ?"); p.push(o.city); }
    const viaHospital = `EXISTS (SELECT 1 FROM doctor_hospitals dh JOIN hospitals h ON h.id = dh.hospital_id WHERE dh.doctor_id = d.id AND ${sub.join(" AND ")})`;
    // doctors whose hospital is not confirmed yet are still found by the city the client's Excel lists for them
    if (o.city && !o.country) { where.push(`(${viaHospital} OR d.city = ?)`); p.push(o.city); }
    else where.push(viaHospital);
  }
  if (o.department) {
    where.push(
      "EXISTS (SELECT 1 FROM doctor_departments dd JOIN departments x ON x.id = dd.department_id WHERE dd.doctor_id = d.id AND x.slug = ?)",
    );
    p.push(o.department);
  }
  if (o.hospital) {
    where.push(
      "EXISTS (SELECT 1 FROM doctor_hospitals dh JOIN hospitals h ON h.id = dh.hospital_id WHERE dh.doctor_id = d.id AND h.slug = ? AND h.published = 1)",
    );
    p.push(o.hospital);
  }
  if (o.treatment) {
    where.push(
      `(EXISTS (SELECT 1 FROM treatment_doctors td JOIN treatments t ON t.id = td.treatment_id WHERE td.doctor_id = d.id AND t.slug = ?)
        OR EXISTS (SELECT 1 FROM treatments t JOIN doctor_departments dd ON dd.department_id = t.department_id WHERE t.slug = ? AND dd.doctor_id = d.id))`,
    );
    p.push(o.treatment, o.treatment);
  }
  if (o.q?.trim()) {
    where.push("(d.name LIKE ? ESCAPE '\\' OR d.designation LIKE ? ESCAPE '\\')");
    p.push(like(o.q.trim()), like(o.q.trim()));
  }
  const w = where.join(" AND ");
  const { pageSize, page, offset } = paging(o);
  const total = (one(db, `SELECT COUNT(*) n FROM doctors d WHERE ${w}`, ...p) as { n: number }).n;
  const rows = all(
    db,
    `SELECT d.id, d.slug, d.name, d.designation, d.city, d.summary, d.body, d.qualifications, d.experience_years, d.image_url, d.image_alt, d.featured FROM doctors d
      WHERE ${w} ORDER BY d.featured DESC, d.sort_order, d.name LIMIT ? OFFSET ?`,
    ...p, pageSize, offset,
  );
  for (const r of rows) {
    r.hospitals = all(
      db,
      `SELECT h.slug, h.name, h.city, h.country FROM doctor_hospitals dh JOIN hospitals h ON h.id = dh.hospital_id
        WHERE dh.doctor_id = ? AND h.published = 1 ORDER BY dh.is_primary DESC, h.name`,
      r.id as number,
    );
    r.departments = all(
      db,
      `SELECT x.slug, x.name FROM doctor_departments dd JOIN departments x ON x.id = dd.department_id
        WHERE dd.doctor_id = ? AND x.published = 1 ORDER BY x.name`,
      r.id as number,
    );
  }
  return { rows, total, page, pageSize };
}

export function getDoctor(db: DB, slug: string) {
  const d = one(db, "SELECT * FROM doctors WHERE slug = ? AND published = 1", slug);
  if (!d) return null;
  const id = d.id as number;
  return {
    ...d,
    hospitals: all(
      db,
      `SELECT h.slug, h.name, h.city, h.country, h.image_url, h.image_alt, dh.is_primary FROM doctor_hospitals dh
         JOIN hospitals h ON h.id = dh.hospital_id WHERE dh.doctor_id = ? AND h.published = 1
        ORDER BY dh.is_primary DESC, h.name`, id),
    departments: all(
      db,
      `SELECT x.slug, x.name FROM doctor_departments dd JOIN departments x ON x.id = dd.department_id
        WHERE dd.doctor_id = ? AND x.published = 1 ORDER BY x.name`, id),
    treatments: all(
      db,
      `SELECT t.slug, t.name FROM treatment_doctors td JOIN treatments t ON t.id = td.treatment_id
        WHERE td.doctor_id = ? AND t.published = 1 ORDER BY t.name`, id),
  };
}

// ---------- hospitals ----------
export function listHospitals(db: DB, o: ListOpts = {}) {
  const where = ["h.published = 1"];
  const p: (string | number)[] = [];
  if (o.country) { where.push("h.country = ?"); p.push(o.country); }
  if (o.city) { where.push("h.city = ?"); p.push(o.city); }
  if (o.department) {
    where.push(
      "EXISTS (SELECT 1 FROM hospital_departments hd JOIN departments x ON x.id = hd.department_id WHERE hd.hospital_id = h.id AND x.slug = ?)",
    );
    p.push(o.department);
  }
  if (o.treatment) {
    where.push(
      `(EXISTS (SELECT 1 FROM treatment_hospitals th JOIN treatments t ON t.id = th.treatment_id WHERE th.hospital_id = h.id AND t.slug = ?)
        OR EXISTS (SELECT 1 FROM treatments t JOIN hospital_departments hd ON hd.department_id = t.department_id WHERE t.slug = ? AND hd.hospital_id = h.id))`,
    );
    p.push(o.treatment, o.treatment);
  }
  if (o.q?.trim()) {
    where.push("(h.name LIKE ? ESCAPE '\\' OR h.city LIKE ? ESCAPE '\\')");
    p.push(like(o.q.trim()), like(o.q.trim()));
  }
  const w = where.join(" AND ");
  const { pageSize, page, offset } = paging(o, 30);
  const total = (one(db, `SELECT COUNT(*) n FROM hospitals h WHERE ${w}`, ...p) as { n: number }).n;
  const rows = all(
    db,
    `SELECT h.id, h.slug, h.name, h.city, h.state, h.country, h.summary, h.image_url, h.image_alt, h.logo_url,
            h.is_placeholder_image, h.featured FROM hospitals h
      WHERE ${w} ORDER BY h.featured DESC, h.sort_order, h.name LIMIT ? OFFSET ?`,
    ...p, pageSize, offset,
  );
  for (const r of rows) {
    r.departments = all(
      db,
      `SELECT x.slug, x.name FROM hospital_departments hd JOIN departments x ON x.id = hd.department_id
        WHERE hd.hospital_id = ? AND x.published = 1 ORDER BY x.name`,
      r.id as number,
    );
  }
  return { rows, total, page, pageSize };
}

export function getHospital(db: DB, slug: string) {
  const h = one(db, "SELECT * FROM hospitals WHERE slug = ? AND published = 1", slug);
  if (!h) return null;
  const id = h.id as number;
  return {
    ...h,
    departments: all(
      db,
      `SELECT x.slug, x.name FROM hospital_departments hd JOIN departments x ON x.id = hd.department_id
        WHERE hd.hospital_id = ? AND x.published = 1 ORDER BY x.name`, id),
    doctors: all(
      db,
      `SELECT d.slug, d.name, d.designation, d.image_url, d.image_alt FROM doctor_hospitals dh
         JOIN doctors d ON d.id = dh.doctor_id WHERE dh.hospital_id = ? AND d.published = 1 ORDER BY d.name`, id),
    treatments: all(
      db,
      `SELECT t.slug, t.name FROM treatment_hospitals th JOIN treatments t ON t.id = th.treatment_id
        WHERE th.hospital_id = ? AND t.published = 1 ORDER BY t.name`, id),
  };
}

// ---------- departments & treatments ----------
export function listDepartments(db: DB) {
  return all(
    db,
    `SELECT x.id, x.slug, x.name, x.summary, x.icon, x.image_url, x.image_alt,
            (SELECT COUNT(*) FROM doctor_departments dd JOIN doctors d ON d.id = dd.doctor_id
              WHERE dd.department_id = x.id AND d.published = 1) AS doctor_count,
            (SELECT COUNT(*) FROM hospital_departments hd JOIN hospitals h ON h.id = hd.hospital_id
              WHERE hd.department_id = x.id AND h.published = 1) AS hospital_count,
            (SELECT COUNT(*) FROM treatments t WHERE t.department_id = x.id AND t.published = 1) AS treatment_count
       FROM departments x WHERE x.published = 1 ORDER BY x.sort_order, x.name`,
  );
}

export function getDepartment(db: DB, slug: string) {
  const x = one(db, "SELECT * FROM departments WHERE slug = ? AND published = 1", slug);
  if (!x) return null;
  const id = x.id as number;
  return {
    ...x,
    treatments: all(
      db, "SELECT slug, name, summary FROM treatments WHERE department_id = ? AND published = 1 ORDER BY sort_order, name", id),
    doctors: all(
      db,
      `SELECT d.slug, d.name, d.designation, d.image_url, d.image_alt FROM doctor_departments dd
         JOIN doctors d ON d.id = dd.doctor_id WHERE dd.department_id = ? AND d.published = 1
        ORDER BY d.featured DESC, d.name`, id),
    hospitals: all(
      db,
      `SELECT h.slug, h.name, h.city, h.country, h.image_url, h.image_alt FROM hospital_departments hd
         JOIN hospitals h ON h.id = hd.hospital_id WHERE hd.department_id = ? AND h.published = 1
        ORDER BY h.featured DESC, h.name`, id),
  };
}

export function listTreatments(db: DB) {
  return all(
    db,
    `SELECT t.slug, t.name, t.summary, x.slug AS department_slug, x.name AS department_name
       FROM treatments t LEFT JOIN departments x ON x.id = t.department_id
      WHERE t.published = 1 ORDER BY t.sort_order, t.name`,
  );
}

export function getTreatment(db: DB, slug: string) {
  const t = one(db, "SELECT * FROM treatments WHERE slug = ? AND published = 1", slug);
  if (!t) return null;
  const id = t.id as number;
  const deptId = (t.department_id as number | null) ?? null;
  const department = deptId
    ? one(db, "SELECT slug, name FROM departments WHERE id = ? AND published = 1", deptId) ?? null
    : null;
  let hospitals = all(
    db,
    `SELECT h.slug, h.name, h.city, h.country FROM treatment_hospitals th JOIN hospitals h ON h.id = th.hospital_id
      WHERE th.treatment_id = ? AND h.published = 1 ORDER BY h.name`, id);
  let doctors = all(
    db,
    `SELECT d.slug, d.name, d.designation, d.image_url, d.image_alt FROM treatment_doctors td
       JOIN doctors d ON d.id = td.doctor_id WHERE td.treatment_id = ? AND d.published = 1 ORDER BY d.name`, id);
  // No treatment-specific links entered yet: fall back to the treatment's department so the page is never empty.
  // `relatedVia` tells the page to word this as "department" rather than claim they perform this treatment.
  let relatedVia: "treatment" | "department" = "treatment";
  if (deptId && !hospitals.length && !doctors.length) {
    relatedVia = "department";
    hospitals = all(
      db,
      `SELECT h.slug, h.name, h.city, h.country FROM hospital_departments hd JOIN hospitals h ON h.id = hd.hospital_id
        WHERE hd.department_id = ? AND h.published = 1 ORDER BY h.name LIMIT 12`, deptId);
    doctors = all(
      db,
      `SELECT d.slug, d.name, d.designation, d.image_url, d.image_alt FROM doctor_departments dd
         JOIN doctors d ON d.id = dd.doctor_id WHERE dd.department_id = ? AND d.published = 1
         ORDER BY (d.image_url IS NULL), d.sort_order LIMIT 8`, deptId);
  }
  return { ...shapeTreatment(t), department, hospitals, doctors, relatedVia };
}

/** Facet values for the filter dropdowns (only values that have published records). */
export function facets(db: DB) {
  return {
    countries: all(db, "SELECT country AS value, COUNT(*) AS count FROM hospitals WHERE published = 1 GROUP BY country ORDER BY country"),
    cities: all(db, "SELECT city AS value, country, COUNT(*) AS count FROM hospitals WHERE published = 1 GROUP BY country, city ORDER BY city"),
    departments: all(
      db,
      "SELECT slug AS value, name AS label FROM departments WHERE published = 1 ORDER BY sort_order, name",
    ),
    treatments: all(db, "SELECT slug AS value, name AS label FROM treatments WHERE published = 1 ORDER BY sort_order, name"),
    hospitals: all(db, "SELECT slug AS value, name AS label, city FROM hospitals WHERE published = 1 ORDER BY featured DESC, sort_order, name"),
  };
}

// ---------- blog / testimonials / home ----------
export function listPosts(db: DB, o: { page?: number; pageSize?: number } = {}) {
  const { pageSize, page, offset } = paging(o, 9);
  const total = (one(db, "SELECT COUNT(*) n FROM posts WHERE status = 'published'") as { n: number }).n;
  const rows = all(
    db,
    `SELECT slug, title, excerpt, cover_image_url, cover_image_alt, author, published_at FROM posts
      WHERE status = 'published' ORDER BY published_at DESC LIMIT ? OFFSET ?`,
    pageSize, offset,
  );
  return { rows, total, page, pageSize };
}

export function getPost(db: DB, slug: string) {
  const p = one(db, "SELECT * FROM posts WHERE slug = ? AND status = 'published'", slug);
  if (!p) return null;
  // other published articles, for the "Keep reading" links under each post
  const related = all(
    db,
    `SELECT slug, title, excerpt, cover_image_url, cover_image_alt, author, published_at FROM posts
      WHERE status = 'published' AND slug <> ? ORDER BY published_at DESC LIMIT 3`,
    slug,
  );
  return { ...p, related } as Rec & { related: Rec[] };
}

/** Only testimonials marked published AND with consent confirmed are ever returned. */
export function listTestimonials(db: DB) {
  return all(
    db,
    `SELECT patient_name, country, treatment, quote, image_url FROM testimonials
      WHERE published = 1 AND consent_confirmed = 1 ORDER BY sort_order, id DESC`,
  );
}

export function homeData(db: DB) {
  return {
    // The homepage shows the client's original 17 speciality cards; "View All" lists every department.
    departments: listDepartments(db).slice(0, 17),
    featuredDoctors: listDoctors(db, { pageSize: 100 }).rows.filter((d) => d.featured && d.image_url).slice(0, 24),
    featuredHospitals: all(
      db,
      `SELECT h.id, h.slug, h.name, h.city, h.state, h.country, h.summary, h.image_url, h.image_alt, h.logo_url,
              h.is_placeholder_image, h.featured FROM hospitals h
        WHERE h.published = 1 AND h.featured = 1 ORDER BY h.sort_order, h.name LIMIT 24`,
    ),
    network: all(
      db,
      "SELECT slug, name, city, logo_url FROM hospitals WHERE published = 1 ORDER BY featured DESC, sort_order, name",
    ),
    testimonials: listTestimonials(db),
    posts: listPosts(db, { pageSize: 3 }).rows,
  };
}

/** Every public URL path with its last-modified date, for sitemap.xml. */
export function sitemapEntries(db: DB): { path: string; lastmod: string | null }[] {
  const out: { path: string; lastmod: string | null }[] = [];
  for (const p of ["/", "/about", "/services", "/doctors", "/hospitals", "/treatment-cost", "/blog", "/contact", "/privacy-policy"])
    out.push({ path: p, lastmod: null });
  const add = (prefix: string, sql: string) => {
    for (const r of all(db, sql)) out.push({ path: `${prefix}/${r.slug}`, lastmod: (r.lastmod as string) ?? null });
  };
  add("/services", "SELECT slug, updated_at AS lastmod FROM departments WHERE published = 1");
  add("/treatments", "SELECT slug, updated_at AS lastmod FROM treatments WHERE published = 1");
  add("/doctors", "SELECT slug, updated_at AS lastmod FROM doctors WHERE published = 1");
  add("/hospitals", "SELECT slug, updated_at AS lastmod FROM hospitals WHERE published = 1");
  add("/blog", "SELECT slug, updated_at AS lastmod FROM posts WHERE status = 'published'");
  return out;
}

/**
 * Homepage / site search: one box + department + location filters across
 * doctors, hospitals and treatments. "location" matches hospital city/country
 * (doctors and treatments match through their linked hospitals).
 */
export function searchAll(db: DB, o: { q?: string; department?: string; city?: string; country?: string }) {
  const q = o.q?.trim();
  const lim = 12;
  const doctors = listDoctors(db, { q, department: o.department, city: o.city, country: o.country, pageSize: lim });
  const hospitals = listHospitals(db, { q, department: o.department, city: o.city, country: o.country, pageSize: lim });

  const where = ["t.published = 1"];
  const p: (string | number)[] = [];
  if (q) { where.push("(t.name LIKE ? ESCAPE '\\' OR t.summary LIKE ? ESCAPE '\\')"); p.push(like(q), like(q)); }
  if (o.department) { where.push("x.slug = ?"); p.push(o.department); }
  if (o.city || o.country) {
    const sub = ["h.published = 1"];
    if (o.city) { sub.push("h.city = ?"); p.push(o.city); }
    if (o.country) { sub.push("h.country = ?"); p.push(o.country); }
    where.push(`EXISTS (SELECT 1 FROM treatment_hospitals th JOIN hospitals h ON h.id = th.hospital_id WHERE th.treatment_id = t.id AND ${sub.join(" AND ")})`);
  }
  const treatments = all(
    db,
    `SELECT t.slug, t.name, t.summary, x.slug AS department_slug, x.name AS department_name
       FROM treatments t LEFT JOIN departments x ON x.id = t.department_id
      WHERE ${where.join(" AND ")} ORDER BY t.sort_order, t.name LIMIT ${lim}`,
    ...p,
  );
  return { doctors, hospitals, treatments };
}

/** Data for the multi-level menu: departments → treatments, plus hospitals and doctor links. */
export function navData(db: DB) {
  const departments = all(db, "SELECT id, slug, name FROM departments WHERE published = 1 ORDER BY sort_order, name");
  for (const d of departments) {
    d.treatments = all(
      db,
      "SELECT slug, name FROM treatments WHERE department_id = ? AND published = 1 ORDER BY sort_order, name LIMIT 8",
      d.id as number,
    );
    delete d.id;
  }
  const hospitals = all(
    db,
    "SELECT slug, name, city FROM hospitals WHERE published = 1 ORDER BY featured DESC, sort_order, name LIMIT 12",
  );
  const cities = all(
    db,
    "SELECT city AS value, COUNT(*) AS count FROM hospitals WHERE published = 1 GROUP BY city ORDER BY count DESC, city",
  );
  return { departments, hospitals, cities };
}
