export type Field = {
  key: string;
  label: string;
  type?: "text" | "textarea" | "number" | "checkbox" | "select" | "date";
  options?: string[];
  help?: string;
  required?: boolean;
};
export type Relation = { key: string; label: string; entity: string; single?: boolean };
export type EntityConfig = {
  key: string;
  label: string;
  columns: { key: string; label: string }[];
  fields: Field[];
  relations: Relation[];
  perm: "content";
  importColumns?: string;
};

const seo: Field[] = [
  { key: "seo_title", label: "SEO title (max 70)" },
  { key: "seo_description", label: "SEO description (max 200)", type: "textarea" },
];
const pub: Field = { key: "published", label: "Published (visible on the website)", type: "checkbox" };

export const entityConfigs: EntityConfig[] = [
  {
    key: "doctors", label: "Doctors", perm: "content",
    columns: [{ key: "name", label: "Name" }, { key: "designation", label: "Designation" }, { key: "published", label: "Live" }],
    fields: [
      { key: "name", label: "Name", required: true }, { key: "slug", label: "URL slug (auto if empty)" },
      { key: "designation", label: "Designation / specialisation" }, { key: "qualifications", label: "Qualifications" },
      { key: "experience_years", label: "Experience (years)", type: "number" },
      { key: "image_url", label: "Photo URL or /path" }, { key: "image_alt", label: "Photo ALT text" },
      { key: "summary", label: "Short description", type: "textarea" }, { key: "body", label: "Full profile", type: "textarea" },
      ...seo, { key: "featured", label: "Show on homepage slider", type: "checkbox" }, pub,
    ],
    relations: [
      { key: "hospital_ids", label: "Hospitals (first = primary)", entity: "hospitals" },
      { key: "department_ids", label: "Departments", entity: "departments" },
    ],
    importColumns: "name, slug, designation, qualifications, experience_years, image_url, image_alt, summary, hospitals (slugs, |-separated), departments (slugs, |-separated)",
  },
  {
    key: "hospitals", label: "Hospitals", perm: "content",
    columns: [{ key: "name", label: "Name" }, { key: "city", label: "City" }, { key: "published", label: "Live" }],
    fields: [
      { key: "name", label: "Name", required: true }, { key: "slug", label: "URL slug (auto if empty)" },
      { key: "country", label: "Country" }, { key: "state", label: "State" }, { key: "city", label: "City", required: true },
      { key: "address", label: "Address" }, { key: "accreditations", label: "Accreditations (e.g. NABH, JCI)" },
      { key: "website", label: "Website URL" },
      { key: "logo_url", label: "Genuine hospital logo URL or /path (for the logo carousel)" },
      { key: "image_url", label: "Image URL or /path" }, { key: "image_alt", label: "Image ALT text" },
      { key: "is_placeholder_image", label: "Image is only a placeholder", type: "checkbox" },
      { key: "summary", label: "Short description", type: "textarea" }, { key: "body", label: "Full description", type: "textarea" },
      ...seo, { key: "featured", label: "Show on homepage slider", type: "checkbox" }, pub,
    ],
    relations: [
      { key: "department_ids", label: "Available departments", entity: "departments" },
      { key: "doctor_ids", label: "Doctors at this hospital", entity: "doctors" },
    ],
    importColumns: "name, slug, country, state, city, address, accreditations, website, image_url, logo_url, image_alt, summary, departments (slugs, |-separated), doctors (slugs, |-separated)",
  },
  {
    key: "departments", label: "Departments", perm: "content",
    columns: [{ key: "name", label: "Name" }, { key: "sort_order", label: "Order" }, { key: "published", label: "Live" }],
    fields: [
      { key: "name", label: "Name", required: true }, { key: "slug", label: "URL slug (auto if empty)" },
      { key: "icon", label: "Icon name (e.g. HeartPulse, Bone, Brain)" },
      { key: "image_url", label: "Image URL or /path" }, { key: "image_alt", label: "Image ALT text" },
      { key: "summary", label: "Short description", type: "textarea" }, { key: "body", label: "Full description", type: "textarea" },
      ...seo, { key: "sort_order", label: "Menu order", type: "number" }, pub,
    ],
    relations: [],
    importColumns: "name, slug, icon, summary, body, image_url, image_alt, sort_order",
  },
  {
    key: "treatments", label: "Treatments / surgeries", perm: "content",
    columns: [{ key: "name", label: "Name" }, { key: "cost_verified", label: "Cost verified" }, { key: "published", label: "Live" }],
    fields: [
      { key: "name", label: "Name", required: true }, { key: "slug", label: "URL slug (auto if empty)" },
      { key: "image_url", label: "Image URL or /path" }, { key: "image_alt", label: "Image ALT text" },
      { key: "summary", label: "Short description", type: "textarea" },
      { key: "body", label: "Full content (blank line = new paragraph; '## ' starts a heading)", type: "textarea" },
      { key: "cost_min", label: "Cost from", type: "number" }, { key: "cost_max", label: "Cost to", type: "number" },
      { key: "cost_currency", label: "Currency (USD, INR…)" }, { key: "cost_notes", label: "Cost notes (what is included)", type: "textarea" },
      { key: "cost_source", label: "Where this figure came from" }, { key: "cost_verified_on", label: "Verified on", type: "date" },
      { key: "cost_verified", label: "Cost verified — only then is it shown publicly", type: "checkbox" },
      ...seo, { key: "sort_order", label: "Order", type: "number" }, pub,
    ],
    relations: [
      { key: "department_id", label: "Department", entity: "departments", single: true },
      { key: "hospital_ids", label: "Hospitals offering it", entity: "hospitals" },
      { key: "doctor_ids", label: "Doctors", entity: "doctors" },
    ],
    importColumns: "name, slug, department (slug), summary, body, image_url, image_alt, cost_min, cost_max, cost_currency, cost_verified, cost_verified_on, cost_source, hospitals (slugs, |-separated), doctors (slugs, |-separated)",
  },
  {
    key: "posts", label: "Blog posts", perm: "content",
    columns: [{ key: "title", label: "Title" }, { key: "status", label: "Status" }, { key: "published_at", label: "Published" }],
    fields: [
      { key: "title", label: "Title", required: true }, { key: "slug", label: "URL slug (auto if empty)" },
      { key: "status", label: "Status", type: "select", options: ["draft", "published"] },
      { key: "author", label: "Author" }, { key: "cover_image_url", label: "Cover image URL or /path" }, { key: "cover_image_alt", label: "Cover ALT text" },
      { key: "excerpt", label: "Excerpt", type: "textarea" }, { key: "body", label: "Article (blank line = new paragraph; '## ' = heading)", type: "textarea" },
      ...seo,
    ],
    relations: [],
    importColumns: "title, slug, status, author, excerpt, body, cover_image_url, cover_image_alt",
  },
  {
    key: "testimonials", label: "Testimonials", perm: "content",
    columns: [{ key: "patient_name", label: "Patient" }, { key: "consent_confirmed", label: "Consent" }, { key: "published", label: "Live" }],
    fields: [
      { key: "patient_name", label: "Patient name", required: true }, { key: "country", label: "Country" }, { key: "treatment", label: "Treatment" },
      { key: "quote", label: "Testimonial (real, as given by the patient)", type: "textarea", required: true },
      { key: "image_url", label: "Photo URL (only with consent)" },
      { key: "consent_confirmed", label: "Written consent to publish confirmed", type: "checkbox" },
      { key: "published", label: "Published", type: "checkbox" }, { key: "sort_order", label: "Order", type: "number" },
    ],
    relations: [],
  },
];
