import type { DB } from "../db/client";
import { sitemapEntries } from "../repo/public";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

/** Canonical site origin: SITE_URL env (e.g. https://ikrameditrip.com), no trailing slash. */
export function siteOrigin(): string {
  return (process.env.SITE_URL || "https://ikrameditrip.com").replace(/\/+$/, "");
}

export function buildSitemap(db: DB, origin = siteOrigin()): string {
  const urls = sitemapEntries(db)
    .map((e) => {
      const last = e.lastmod ? `<lastmod>${esc(e.lastmod.slice(0, 10))}</lastmod>` : "";
      return `  <url><loc>${esc(origin + e.path)}</loc>${last}</url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function buildRobots(origin = siteOrigin()): string {
  return [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin",
    "Disallow: /api/",
    "",
    `Sitemap: ${origin}/sitemap.xml`,
    "",
  ].join("\n");
}

/** Schema.org JSON-LD helpers (only fields we actually hold). */
export function jsonLdHospital(h: { name: string; city: string; country: string; address?: string | null }, url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Hospital",
    name: h.name,
    url,
    address: { "@type": "PostalAddress", addressLocality: h.city, addressCountry: h.country, ...(h.address ? { streetAddress: h.address } : {}) },
  };
}
export function jsonLdPhysician(d: { name: string; designation?: string | null }, url: string) {
  return { "@context": "https://schema.org", "@type": "Physician", name: d.name, url, ...(d.designation ? { description: d.designation } : {}) };
}
