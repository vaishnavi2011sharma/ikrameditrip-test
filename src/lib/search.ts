/** Helpers for validating URL search params on list pages. */
export const str = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, 100) : undefined;

export const posInt = (v: unknown): number | undefined => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isInteger(n) && n > 1 ? n : undefined; // page 1 is the default
};

export type ListSearch = { country?: string; city?: string; department?: string; treatment?: string; hospital?: string; q?: string; page?: number };

export const validateListSearch = (s: Record<string, unknown>): ListSearch => ({
  country: str(s.country),
  city: str(s.city),
  department: str(s.department),
  treatment: str(s.treatment),
  hospital: str(s.hospital),
  q: str(s.q),
  page: posInt(s.page),
});

export const canonical = (path: string, origin = "https://ikrameditrip.com") => `${origin}${path}`;

export const jsonLdScript = (data: unknown) => ({
  type: "application/ld+json",
  children: JSON.stringify(data).replace(/</g, "\\u003c"),
});
