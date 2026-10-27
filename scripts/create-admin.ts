/**
 * Create an admin/editor/sales user. Credentials come from the environment so
 * nothing is stored in the repo or shell history of a shared machine.
 *
 *   ADMIN_EMAIL=you@example.com ADMIN_NAME="Your Name" ADMIN_PASSWORD='...' \
 *   ADMIN_ROLE=admin npx tsx scripts/create-admin.ts
 */
import { getDb } from "../src/backend/db/client";
import { createUser, type Role } from "../src/backend/lib/auth";

const email = process.env.ADMIN_EMAIL;
const name = process.env.ADMIN_NAME ?? "Admin";
const password = process.env.ADMIN_PASSWORD;
const role = (process.env.ADMIN_ROLE ?? "admin") as Role;

if (!email || !password) {
  console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD (and optionally ADMIN_NAME, ADMIN_ROLE=admin|editor|sales).");
  process.exit(1);
}
if (!["admin", "editor", "sales"].includes(role)) {
  console.error("ADMIN_ROLE must be admin, editor or sales.");
  process.exit(1);
}
try {
  const id = await createUser(getDb(), { email, name, password, role });
  console.log(`Created ${role} user #${id} (${email.toLowerCase()})`);
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}
