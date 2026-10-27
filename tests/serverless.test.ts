import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, existsSync, readdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(".");
const tsxEsm = pathToFileURL(createRequire(join(root, "package.json")).resolve("tsx/esm")).href;
const run = (env: Record<string, string>, code: string, cwd: string) => {
  const script = join(cwd, "probe.mts");
  writeFileSync(script, code);
  const clean = { ...process.env } as Record<string, string | undefined>;
  for (const k of ["VERCEL", "AWS_LAMBDA_FUNCTION_NAME", "NETLIFY", "DATABASE_PATH"]) delete clean[k];
  return spawnSync(process.execPath, ["--import", tsxEsm, script], { cwd, env: { ...clean, NODE_NO_WARNINGS: "1", ...env }, encoding: "utf8", timeout: 60_000 });
};
const probe = `
import { getDb, isReadOnlyMode, resolveDbPath } from ${JSON.stringify(join(root, "src/backend/db/client.ts"))};
import { handleApi } from ${JSON.stringify(join(root, "src/backend/api/handler.ts"))};
import * as pub from ${JSON.stringify(join(root, "src/backend/repo/public.ts"))};
const db = getDb();
const home: any = pub.homeData(db);
const post = await handleApi(new Request("http://localhost/api/leads", { method: "POST", headers: { origin: "http://localhost" }, body: "{}" }), db);
const health = await (await handleApi(new Request("http://localhost/api/health"), db))!.json();
console.log(JSON.stringify({ ro: isReadOnlyMode(), path: resolveDbPath(), docs: home.featuredDoctors.length, hosp: home.featuredHospitals.length, post: post!.status, health }));
process.exit(0);
`;

describe("serverless (Vercel) database handling", () => {
  test("VERCEL=1 with the usual DATABASE_PATH=./data/ikra.db: no ./data folder is created in the project, homepage data loads, writes get a clear 503", () => {
    const cwd = mkdtempSync(join(tmpdir(), "vercel-cwd-"));
    const r = run({ VERCEL: "1", DATABASE_PATH: "./data/ikra.db" }, probe, cwd);
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout.trim().split("\n").pop()!);
    assert.equal(out.ro, true);
    assert.ok(out.path.startsWith(tmpdir()), out.path);
    assert.ok(out.docs >= 20 && out.hosp >= 17, "homepage is populated from the bundled client data, not empty");
    assert.equal(out.post, 503);
    assert.deepEqual(out.health, { ok: true, mode: "read-only" });
    assert.ok(!existsSync(join(cwd, "data")), "never touches the project folder");
    assert.match(r.stderr, /READ-ONLY/);
  });
  test("normal (non-serverless) run still creates ./data and is read-write", () => {
    const cwd = mkdtempSync(join(tmpdir(), "node-cwd-"));
    const r = run({ DATABASE_PATH: "./data/ikra.db" }, probe, cwd);
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout.trim().split("\n").pop()!);
    assert.equal(out.ro, false);
    assert.notEqual(out.post, 503);
    assert.deepEqual(out.health, { ok: true, mode: "read-write" });
    assert.ok(readdirSync(join(cwd, "data")).includes("ikra.db"));
  });
  test("an unwritable DATABASE_PATH on a normal host fails with an explicit message (never a silent empty DB)", () => {
    const cwd = mkdtempSync(join(tmpdir(), "bad-cwd-"));
    writeFileSync(join(cwd, "blocker"), "x"); // a FILE where a folder is needed → mkdir fails (ENOTDIR)
    const r = run({ DATABASE_PATH: join(cwd, "blocker", "sub", "ikra.db") }, probe, cwd);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /Cannot create the database folder/);
  });
});
