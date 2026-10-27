/**
 * Database migrations (SQLite). Append new migrations; never edit applied ones.
 *
 * Relationships
 *   departments 1─* treatments
 *   doctors *─* hospitals        (doctor_hospitals, one row may be is_primary)
 *   doctors *─* departments      (doctor_departments)
 *   hospitals *─* departments    (hospital_departments)
 *   treatments *─* hospitals     (treatment_hospitals)
 *   treatments *─* doctors       (treatment_doctors)
 *
 * Doctor country / city filters are DERIVED from the hospitals a doctor is
 * linked to, so location data lives in exactly one place (hospitals).
 *
 * Treatment costs are only ever shown publicly when cost_verified = 1.
 */
export const migrations: { id: number; name: string; sql: string }[] = [
  {
    id: 1,
    name: "initial",
    sql: `
CREATE TABLE departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  summary TEXT,
  body TEXT,
  icon TEXT,
  image_url TEXT,
  image_alt TEXT,
  seo_title TEXT,
  seo_description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE treatments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  summary TEXT,
  body TEXT,
  image_url TEXT,
  image_alt TEXT,
  -- Cost: never shown unless cost_verified = 1 (client must supply/approve figures)
  cost_min INTEGER,
  cost_max INTEGER,
  cost_currency TEXT NOT NULL DEFAULT 'USD',
  cost_notes TEXT,
  cost_verified INTEGER NOT NULL DEFAULT 0,
  cost_verified_on TEXT,
  cost_source TEXT,
  seo_title TEXT,
  seo_description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_treatments_department ON treatments(department_id);

CREATE TABLE hospitals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'India',
  state TEXT,
  city TEXT NOT NULL,
  address TEXT,
  summary TEXT,
  body TEXT,
  accreditations TEXT,
  image_url TEXT,
  image_alt TEXT,
  is_placeholder_image INTEGER NOT NULL DEFAULT 1,
  website TEXT,
  seo_title TEXT,
  seo_description TEXT,
  featured INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_hospitals_city ON hospitals(city);

CREATE TABLE doctors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  designation TEXT,            -- free text exactly as supplied by the client
  qualifications TEXT,
  experience_years INTEGER,
  summary TEXT,
  body TEXT,
  image_url TEXT,
  image_alt TEXT,
  seo_title TEXT,
  seo_description TEXT,
  featured INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE doctor_hospitals (
  doctor_id INTEGER NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  hospital_id INTEGER NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  is_primary INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (doctor_id, hospital_id)
);
CREATE INDEX idx_dh_hospital ON doctor_hospitals(hospital_id);

CREATE TABLE doctor_departments (
  doctor_id INTEGER NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  PRIMARY KEY (doctor_id, department_id)
);
CREATE INDEX idx_dd_department ON doctor_departments(department_id);

CREATE TABLE hospital_departments (
  hospital_id INTEGER NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  PRIMARY KEY (hospital_id, department_id)
);
CREATE INDEX idx_hd_department ON hospital_departments(department_id);

CREATE TABLE treatment_hospitals (
  treatment_id INTEGER NOT NULL REFERENCES treatments(id) ON DELETE CASCADE,
  hospital_id INTEGER NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  PRIMARY KEY (treatment_id, hospital_id)
);

CREATE TABLE treatment_doctors (
  treatment_id INTEGER NOT NULL REFERENCES treatments(id) ON DELETE CASCADE,
  doctor_id INTEGER NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  PRIMARY KEY (treatment_id, doctor_id)
);

CREATE TABLE posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT,
  body TEXT NOT NULL DEFAULT '',
  cover_image_url TEXT,
  cover_image_alt TEXT,
  author TEXT,
  seo_title TEXT,
  seo_description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- Real testimonials only; supplied by the client with consent. Nothing is seeded.
CREATE TABLE testimonials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_name TEXT NOT NULL,
  country TEXT,
  treatment TEXT,
  quote TEXT NOT NULL,
  image_url TEXT,
  consent_confirmed INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL DEFAULT 'appointment' CHECK (type IN ('appointment','cost_enquiry','contact')),
  name TEXT NOT NULL,
  age INTEGER,
  email TEXT,                 -- optional: the client's lead form has no email field
  phone TEXT NOT NULL,
  country TEXT,
  city TEXT,
  treatment_interest TEXT,
  message TEXT,
  source_page TEXT,
  doctor_id INTEGER REFERENCES doctors(id) ON DELETE SET NULL,
  hospital_id INTEGER REFERENCES hospitals(id) ON DELETE SET NULL,
  treatment_id INTEGER REFERENCES treatments(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','qualified','closed','spam')),
  assigned_to INTEGER,
  internal_notes TEXT,
  consent INTEGER NOT NULL DEFAULT 0,
  ip_hash TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_leads_status_created ON leads(status, created_at);

-- Patient reports/documents. Files live on disk (UPLOAD_DIR), never in a public folder;
-- they are only downloadable through the authenticated admin API.
CREATE TABLE lead_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  stored_name TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_lead_files_lead ON lead_files(lead_id);

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','editor','sales')),
  active INTEGER NOT NULL DEFAULT 1,
  failed_logins INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- Only a SHA-256 hash of the session token is stored.
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  csrf_token TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_sessions_user ON sessions(user_id);

CREATE TABLE rate_limits (
  key TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);

CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
`,
  },
  {
    id: 2,
    name: "hospital_logo",
    // Genuine hospital logos are supplied by the client; until then the marquee shows names only.
    sql: `ALTER TABLE hospitals ADD COLUMN logo_url TEXT;`,
  },
  {
    id: 3,
    name: "lead_email_status",
    // Real outcome of the e-mail notification for each lead: pending | sent | failed | not_configured.
    sql: `
ALTER TABLE leads ADD COLUMN notify_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE leads ADD COLUMN notify_error TEXT;
ALTER TABLE leads ADD COLUMN notify_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE leads ADD COLUMN notified_at TEXT;
`,
  },
  {
    id: 4,
    name: "doctor_city_card_meta",
    // doctors.city = the client's Excel "location" for doctors whose hospital is not yet confirmed;
    // profile_card_url = client-supplied profile card image (TX Hospitals); app_meta = one-time data-load markers.
    sql: `
ALTER TABLE doctors ADD COLUMN city TEXT;
ALTER TABLE doctors ADD COLUMN profile_card_url TEXT;
CREATE TABLE app_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')));
`,
  },
  {
    id: 5,
    name: "kolkata_hospital_photos",
    // Photos supplied by the client for the two Kolkata hospitals (public/hospitals/<slug>.webp). Data only: fills EMPTY/placeholder images, never overwrites an admin upload.
    sql: `
UPDATE hospitals SET image_url = '/hospitals/fortis-hospital-kolkata.webp', is_placeholder_image = 0, image_alt = COALESCE(NULLIF(image_alt, ''), 'Fortis Hospital, Kolkata')
  WHERE slug = 'fortis-hospital-kolkata' AND (image_url IS NULL OR image_url = '' OR is_placeholder_image = 1);
UPDATE hospitals SET image_url = '/hospitals/phs-fertility-centre-kolkata.webp', is_placeholder_image = 0, image_alt = COALESCE(NULLIF(image_alt, ''), 'PHS Fertility Centre, Kolkata')
  WHERE slug = 'phs-fertility-centre-kolkata' AND (image_url IS NULL OR image_url = '' OR is_placeholder_image = 1);
`,
  },
  {
    id: 6,
    name: "hospital_logos",
    // Genuine logos supplied by the client (public/hospitals/logos/<slug>.webp) for the homepage logo carousel. Fills EMPTY logo_url only.
    sql: `
UPDATE hospitals SET logo_url = '/hospitals/logos/amrita-hospitals.webp' WHERE slug = 'amrita-hospitals' AND (logo_url IS NULL OR logo_url = '');
UPDATE hospitals SET logo_url = '/hospitals/logos/apollo-fertility-centre.webp' WHERE slug = 'apollo-fertility-centre' AND (logo_url IS NULL OR logo_url = '');
UPDATE hospitals SET logo_url = '/hospitals/logos/apollo-gleneagles-hospital.webp' WHERE slug = 'apollo-gleneagles-hospital' AND (logo_url IS NULL OR logo_url = '');
UPDATE hospitals SET logo_url = '/hospitals/logos/apollo-indraprastha-hospitals.webp' WHERE slug = 'apollo-indraprastha-hospitals' AND (logo_url IS NULL OR logo_url = '');
UPDATE hospitals SET logo_url = '/hospitals/logos/apollo-main-hospital-greams-road.webp' WHERE slug = 'apollo-main-hospital-greams-road' AND (logo_url IS NULL OR logo_url = '');
UPDATE hospitals SET logo_url = '/hospitals/logos/apollo-super-speciality-hospitals-cancer-centre.webp' WHERE slug = 'apollo-super-speciality-hospitals-cancer-centre' AND (logo_url IS NULL OR logo_url = '');
UPDATE hospitals SET logo_url = '/hospitals/logos/artemis-hospitals.webp' WHERE slug = 'artemis-hospitals' AND (logo_url IS NULL OR logo_url = '');
UPDATE hospitals SET logo_url = '/hospitals/logos/asian-institute-of-medical-sciences.webp' WHERE slug = 'asian-institute-of-medical-sciences' AND (logo_url IS NULL OR logo_url = '');
UPDATE hospitals SET logo_url = '/hospitals/logos/desun-hospital.webp' WHERE slug = 'desun-hospital' AND (logo_url IS NULL OR logo_url = '');
UPDATE hospitals SET logo_url = '/hospitals/logos/fortis-escorts-heart-institute.webp' WHERE slug = 'fortis-escorts-heart-institute' AND (logo_url IS NULL OR logo_url = '');
UPDATE hospitals SET logo_url = '/hospitals/logos/fortis-escorts-hospital.webp' WHERE slug = 'fortis-escorts-hospital' AND (logo_url IS NULL OR logo_url = '');
UPDATE hospitals SET logo_url = '/hospitals/logos/fortis-hospital-kolkata.webp' WHERE slug = 'fortis-hospital-kolkata' AND (logo_url IS NULL OR logo_url = '');
UPDATE hospitals SET logo_url = '/hospitals/logos/kauvery-hospitals.webp' WHERE slug = 'kauvery-hospitals' AND (logo_url IS NULL OR logo_url = '');
UPDATE hospitals SET logo_url = '/hospitals/logos/manipal-hospitals-bangalore.webp' WHERE slug = 'manipal-hospitals-bangalore' AND (logo_url IS NULL OR logo_url = '');
UPDATE hospitals SET logo_url = '/hospitals/logos/manipal-hospitals-electronic-city.webp' WHERE slug = 'manipal-hospitals-electronic-city' AND (logo_url IS NULL OR logo_url = '');
UPDATE hospitals SET logo_url = '/hospitals/logos/manipal-hospitals-siliguri.webp' WHERE slug = 'manipal-hospitals-siliguri' AND (logo_url IS NULL OR logo_url = '');
UPDATE hospitals SET logo_url = '/hospitals/logos/nova-ivf-fertility.webp' WHERE slug = 'nova-ivf-fertility' AND (logo_url IS NULL OR logo_url = '');
UPDATE hospitals SET logo_url = '/hospitals/logos/p-and-o-international-artificial-limb-centre.webp' WHERE slug = 'p-and-o-international-artificial-limb-centre' AND (logo_url IS NULL OR logo_url = '');
UPDATE hospitals SET logo_url = '/hospitals/logos/phs-fertility-centre-kolkata.webp' WHERE slug = 'phs-fertility-centre-kolkata' AND (logo_url IS NULL OR logo_url = '');
UPDATE hospitals SET logo_url = '/hospitals/logos/sharp-sight-eye-hospitals.webp' WHERE slug = 'sharp-sight-eye-hospitals' AND (logo_url IS NULL OR logo_url = '');
UPDATE hospitals SET logo_url = '/hospitals/logos/tx-hospitals.webp' WHERE slug = 'tx-hospitals' AND (logo_url IS NULL OR logo_url = '');
UPDATE hospitals SET logo_url = '/hospitals/logos/zemya-ivf.webp' WHERE slug = 'zemya-ivf' AND (logo_url IS NULL OR logo_url = '');
`,
  },
  {
    id: 7,
    name: "plain_hyphen_punctuation",
    // Content request: punctuation dashes (em dash, spaced en dash) in public text become a plain hyphen. Slugs, numeric ranges and URLs are untouched.
    sql: `
UPDATE doctors SET designation = REPLACE(REPLACE(REPLACE(designation, ' — ', ' - '), ' – ', ' - '), '—', ' - '), qualifications = REPLACE(REPLACE(REPLACE(qualifications, ' — ', ' - '), ' – ', ' - '), '—', ' - '), summary = REPLACE(REPLACE(REPLACE(summary, ' — ', ' - '), ' – ', ' - '), '—', ' - '), body = REPLACE(REPLACE(REPLACE(body, ' — ', ' - '), ' – ', ' - '), '—', ' - ');
UPDATE hospitals SET name = REPLACE(REPLACE(REPLACE(name, ' — ', ' - '), ' – ', ' - '), '—', ' - '), summary = REPLACE(REPLACE(REPLACE(summary, ' — ', ' - '), ' – ', ' - '), '—', ' - '), body = REPLACE(REPLACE(REPLACE(body, ' — ', ' - '), ' – ', ' - '), '—', ' - '), accreditations = REPLACE(REPLACE(REPLACE(accreditations, ' — ', ' - '), ' – ', ' - '), '—', ' - ');
UPDATE departments SET name = REPLACE(REPLACE(REPLACE(name, ' — ', ' - '), ' – ', ' - '), '—', ' - '), summary = REPLACE(REPLACE(REPLACE(summary, ' — ', ' - '), ' – ', ' - '), '—', ' - '), body = REPLACE(REPLACE(REPLACE(body, ' — ', ' - '), ' – ', ' - '), '—', ' - ');
UPDATE treatments SET name = REPLACE(REPLACE(REPLACE(name, ' — ', ' - '), ' – ', ' - '), '—', ' - '), summary = REPLACE(REPLACE(REPLACE(summary, ' — ', ' - '), ' – ', ' - '), '—', ' - '), body = REPLACE(REPLACE(REPLACE(body, ' — ', ' - '), ' – ', ' - '), '—', ' - ');
UPDATE posts SET title = REPLACE(REPLACE(REPLACE(title, ' — ', ' - '), ' – ', ' - '), '—', ' - '), excerpt = REPLACE(REPLACE(REPLACE(excerpt, ' — ', ' - '), ' – ', ' - '), '—', ' - '), body = REPLACE(REPLACE(REPLACE(body, ' — ', ' - '), ' – ', ' - '), '—', ' - ');
`,
  },
];
