/**
 * Server functions used by route loaders. Each runs on the server only; the
 * database modules are imported lazily so they never enter the client bundle.
 */
import { createServerFn } from "@tanstack/react-start";
import type { ListOpts } from "../backend/repo/public";
import type * as T from "./types";

const db = async () => (await import("../backend/db/client")).getDb();
const pub = () => import("../backend/repo/public");

const listInput = (d: ListOpts) => d;
const slugInput = (d: { slug: string }) => ({ slug: String(d.slug).slice(0, 120) });

export const getHome = createServerFn({ method: "GET" }).handler(async () => {
  const home = (await pub()).homeData(await db());
  return home as unknown as {
    departments: T.DepartmentCard[];
    featuredDoctors: T.DoctorCardData[];
    featuredHospitals: T.HospitalCardData[];
    network: T.NetworkHospital[];
    testimonials: T.TestimonialData[];
    posts: T.PostCard[];
  };
});

export const getFacets = createServerFn({ method: "GET" }).handler(
  async () => (await pub()).facets(await db()) as unknown as T.Facets,
);

export const getDoctors = createServerFn({ method: "GET" })
  .inputValidator(listInput)
  .handler(async ({ data }) => (await pub()).listDoctors(await db(), data) as unknown as T.Paged<T.DoctorCardData>);

export const getDoctor = createServerFn({ method: "GET" })
  .inputValidator(slugInput)
  .handler(async ({ data }) => (await pub()).getDoctor(await db(), data.slug) as unknown as T.DoctorDetail | null);

export const getHospitals = createServerFn({ method: "GET" })
  .inputValidator(listInput)
  .handler(async ({ data }) => (await pub()).listHospitals(await db(), data) as unknown as T.Paged<T.HospitalCardData>);

export const getHospital = createServerFn({ method: "GET" })
  .inputValidator(slugInput)
  .handler(async ({ data }) => (await pub()).getHospital(await db(), data.slug) as unknown as T.HospitalDetail | null);

export const getDepartments = createServerFn({ method: "GET" }).handler(
  async () => (await pub()).listDepartments(await db()) as unknown as T.DepartmentCard[],
);

export const getDepartment = createServerFn({ method: "GET" })
  .inputValidator(slugInput)
  .handler(async ({ data }) => (await pub()).getDepartment(await db(), data.slug) as unknown as T.DepartmentDetail | null);

export const getTreatments = createServerFn({ method: "GET" }).handler(
  async () => (await pub()).listTreatments(await db()) as unknown as T.TreatmentListItem[],
);

export const getTreatment = createServerFn({ method: "GET" })
  .inputValidator(slugInput)
  .handler(async ({ data }) => (await pub()).getTreatment(await db(), data.slug) as unknown as T.TreatmentDetail | null);

export const getPosts = createServerFn({ method: "GET" })
  .inputValidator((d: { page?: number }) => ({ page: Number(d?.page) > 0 ? Number(d.page) : 1 }))
  .handler(async ({ data }) => (await pub()).listPosts(await db(), { page: data.page }) as unknown as T.Paged<T.PostCard>);

export const getPost = createServerFn({ method: "GET" })
  .inputValidator(slugInput)
  .handler(async ({ data }) => (await pub()).getPost(await db(), data.slug) as unknown as T.PostDetail | null);

export const getNav = createServerFn({ method: "GET" }).handler(
  async () => (await pub()).navData(await db()) as unknown as T.NavData,
);

export const searchSite = createServerFn({ method: "GET" })
  .inputValidator((d: { q?: string; department?: string; city?: string }) => ({
    q: d.q?.slice(0, 80),
    department: d.department?.slice(0, 100),
    city: d.city?.slice(0, 100),
  }))
  .handler(async ({ data }) =>
    (await pub()).searchAll(await db(), data) as unknown as {
      doctors: T.Paged<T.DoctorCardData>;
      hospitals: T.Paged<T.HospitalCardData>;
      treatments: T.TreatmentListItem[];
    },
  );
