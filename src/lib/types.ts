/** Serializable view types returned by the public server functions. */
export type Dept = { slug: string; name: string };
export type HospitalRef = { slug: string; name: string; city: string; country: string };

export type DoctorCardData = {
  id: number;
  slug: string;
  name: string;
  designation: string | null;
  city?: string | null;
  summary?: string | null;
  /** full biography; only returned by the doctors listing */
  body?: string | null;
  qualifications?: string | null;
  experience_years?: number | null;
  image_url: string | null;
  image_alt: string | null;
  featured: number;
  hospitals: HospitalRef[];
  departments: Dept[];
};

export type HospitalCardData = {
  id: number;
  slug: string;
  name: string;
  city: string;
  state: string | null;
  country: string;
  summary: string | null;
  image_url: string | null;
  image_alt: string | null;
  logo_url?: string | null;
  is_placeholder_image: number;
  featured: number;
  departments?: Dept[];
};

export type Paged<T> = { rows: T[]; total: number; page: number; pageSize: number };

export type Facets = {
  countries: { value: string; count: number }[];
  cities: { value: string; country: string; count: number }[];
  departments: { value: string; label: string }[];
  treatments: { value: string; label: string }[];
  hospitals: { value: string; label: string; city: string }[];
};

export type DoctorDetail = {
  slug: string; name: string; designation: string | null; qualifications: string | null;
  experience_years: number | null; summary: string | null; body: string | null;
  image_url: string | null; image_alt: string | null; seo_title: string | null; seo_description: string | null;
  hospitals: (HospitalRef & { image_url: string | null; image_alt: string | null; is_primary: number })[];
  departments: Dept[];
  treatments: Dept[];
};

export type PersonRef = { slug: string; name: string; designation: string | null; image_url: string | null; image_alt: string | null };

export type HospitalDetail = {
  slug: string; name: string; city: string; state: string | null; country: string; address: string | null;
  summary: string | null; body: string | null; accreditations: string | null; website: string | null;
  image_url: string | null; image_alt: string | null; is_placeholder_image: number;
  seo_title: string | null; seo_description: string | null;
  departments: Dept[]; doctors: PersonRef[]; treatments: Dept[];
};

export type DepartmentCard = {
  id: number; slug: string; name: string; summary: string | null; icon: string | null;
  image_url: string | null; image_alt: string | null;
  doctor_count: number; hospital_count: number; treatment_count: number;
};

export type DepartmentDetail = {
  slug: string; name: string; summary: string | null; body: string | null;
  image_url: string | null; image_alt: string | null; seo_title: string | null; seo_description: string | null;
  treatments: { slug: string; name: string; summary: string | null }[];
  doctors: PersonRef[];
  hospitals: (HospitalRef & { image_url: string | null; image_alt: string | null })[];
};

export type TreatmentCost = {
  min: number; max: number | null; currency: string; notes: string | null; verifiedOn: string | null; source: string | null;
};

export type TreatmentDetail = {
  slug: string; name: string; summary: string | null; body: string | null;
  image_url: string | null; image_alt: string | null; seo_title: string | null; seo_description: string | null;
  cost: TreatmentCost | null;
  department: Dept | null;
  hospitals: HospitalRef[];
  doctors: PersonRef[];
  /** "department" when no treatment-specific doctors/hospitals are linked yet and the department's are shown instead. */
  relatedVia: "treatment" | "department";
};

export type TreatmentListItem = {
  slug: string; name: string; summary: string | null; department_slug: string | null; department_name: string | null;
};

export type PostCard = {
  slug: string; title: string; excerpt: string | null; cover_image_url: string | null;
  cover_image_alt: string | null; author: string | null; published_at: string | null;
};
export type PostDetail = PostCard & { body: string; seo_title: string | null; seo_description: string | null; related: PostCard[] };

export type TestimonialData = {
  patient_name: string; country: string | null; treatment: string | null; quote: string; image_url: string | null;
};

export type NetworkHospital = { slug: string; name: string; city: string; logo_url: string | null };

export type NavData = {
  departments: { slug: string; name: string; treatments: { slug: string; name: string }[] }[];
  hospitals: { slug: string; name: string; city: string }[];
  cities: { value: string; count: number }[];
};
