/**
 * Writes data/templates/doctor-hospital-mapping.csv and hospital-slugs.csv for the client to fill in.
 * Only facts already in the database are written; hospitals / qualifications / experience / summary are left BLANK for the client.
 * Fill `hospitals` with slugs from hospital-slugs.csv, separated by | (first = primary), then upload the file
 * through Admin → Import (use dry-run first). Blank cells are ignored.
 *   npx tsx scripts/export-mapping.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { getDb, closeDb } from "../src/backend/db/client";

const q = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const db = getDb();
mkdirSync("data/templates", { recursive: true });
const docs = db.prepare("SELECT slug, name, designation FROM doctors ORDER BY sort_order, name").all() as Record<string, string>[];
writeFileSync(
  "data/templates/doctor-hospital-mapping.csv",
  ["name,slug,hospitals,qualifications,experience_years,summary"]
    .concat(docs.map((d) => [q(d.name), q(d.slug), "", "", "", ""].join(",")))
    .join("\n") + "\n",
);
const hs = db.prepare("SELECT slug, name, city FROM hospitals ORDER BY name, city").all() as Record<string, string>[];
writeFileSync(
  "data/templates/hospital-slugs.csv",
  ["hospital_slug,hospital_name,city"].concat(hs.map((h) => [q(h.slug), q(h.name), q(h.city)].join(","))).join("\n") + "\n",
);
console.log(`Wrote ${docs.length} doctors and ${hs.length} hospitals to data/templates/`);
closeDb();
