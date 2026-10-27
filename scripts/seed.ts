/**
 * Seed the database from client-supplied data:   npm run db:seed
 * (The site also does this automatically the first time it starts with an empty database.)
 */
import { getDb } from "../src/backend/db/client";
import { seed } from "../src/backend/seed";

const s = seed(getDb());
console.log(`Seeded: ${s.departments} departments, ${s.hospitals} hospitals, ${s.doctors} doctors`);
if (s.unmappedDoctors.length) {
  console.log(`\n${s.unmappedDoctors.length} doctors have no department yet (assign in the admin panel):`);
  s.unmappedDoctors.forEach((x) => console.log("  - " + x));
}
