import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import net from "node:net";
import { openDb } from "../src/backend/db/client";
import { buildMessage, flushNotifications, mailConfig, notifyLead, sendMail, DEFAULT_NOTIFY_TO } from "../src/backend/lib/mailer";
import { submitLead } from "../src/backend/repo/leads";
import { handleApi } from "../src/backend/api/handler";

type Fake = { port: number; received: { from: string; to: string[]; data: string }[]; close: () => Promise<void> };

/** A tiny in-process SMTP server (plaintext + AUTH PLAIN) to observe exactly what the client sends. */
async function fakeSmtp(o: { rejectAuth?: boolean; rejectData?: boolean; starttls?: boolean } = {}): Promise<Fake> {
  const received: Fake["received"] = [];
  const sockets = new Set<net.Socket>();
  const server = net.createServer((s) => {
    sockets.add(s);
    s.on("close", () => sockets.delete(s));
    s.on("error", () => undefined);
    let cur = { from: "", to: [] as string[], data: "" };
    let inData = false;
    let buf = "";
    s.write("220 fake ESMTP\r\n");
    s.on("data", (d) => {
      buf += d.toString("utf8");
      for (;;) {
        if (inData) {
          const end = buf.indexOf("\r\n.\r\n");
          if (end < 0) return;
          cur.data = buf.slice(0, end);
          buf = buf.slice(end + 5);
          inData = false;
          if (o.rejectData) s.write("554 rejected\r\n");
          else { received.push(cur); cur = { from: "", to: [], data: "" }; s.write("250 queued\r\n"); }
          continue;
        }
        const i = buf.indexOf("\r\n");
        if (i < 0) return;
        const line = buf.slice(0, i);
        buf = buf.slice(i + 2);
        if (/^EHLO/i.test(line)) s.write(`250-fake\r\n${o.starttls ? "250-STARTTLS\r\n" : ""}250 AUTH PLAIN LOGIN\r\n`);
        else if (/^AUTH PLAIN/i.test(line)) s.write(o.rejectAuth ? "535 5.7.8 bad credentials\r\n" : "235 ok\r\n");
        else if (/^MAIL FROM:/i.test(line)) { cur.from = line.slice(10); s.write("250 ok\r\n"); }
        else if (/^RCPT TO:/i.test(line)) { cur.to.push(line.slice(8)); s.write("250 ok\r\n"); }
        else if (/^DATA/i.test(line)) { inData = true; s.write("354 go\r\n"); }
        else if (/^QUIT/i.test(line)) { s.end("221 bye\r\n"); }
        else s.write("500 what\r\n");
      }
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  return {
    port: (server.address() as net.AddressInfo).port,
    received,
    close: () => new Promise<void>((r) => { sockets.forEach((x) => x.destroy()); server.close(() => r()); }),
  };
}

const env = (port: number, extra: Record<string, string> = {}) => ({
  SMTP_HOST: "127.0.0.1", SMTP_PORT: String(port), SMTP_USER: "sender@ikrameditrip.com", SMTP_PASS: "s3cret-pass",
  SMTP_ALLOW_INSECURE: "true", ...extra,
});
const decodeBody = (data: string) => Buffer.from(data.split("\r\n\r\n").slice(1).join("").replace(/\s/g, ""), "base64").toString("utf8");
const newLead = (db = openDb(":memory:"), extra: object = {}) => {
  const r = submitLead(db, { type: "cost_enquiry", name: "Test Patient", phone: "+91 98765 43210", country: "Kenya", treatment_interest: "Knee replacement", message: "Line one\n.leading dot line", ...extra }, { ip: "1.1.1.1" });
  assert.ok(r.ok);
  return { db, id: (r as { id: number }).id };
};
const status = (db: ReturnType<typeof openDb>, id: number) => db.prepare("SELECT notify_status s, notify_error e, notify_attempts a, notified_at t FROM leads WHERE id = ?").get(id) as { s: string; e: string | null; a: number; t: string | null };

const servers: Fake[] = [];
after(async () => { for (const s of servers) await s.close(); });

describe("mail configuration", () => {
  test("missing credentials are reported by name, never defaulted", () => {
    const c = mailConfig({});
    assert.equal(c.ok, false);
    assert.deepEqual((c as { missing: string[] }).missing.sort(), ["MAIL_FROM", "SMTP_HOST", "SMTP_PASS", "SMTP_USER"]);
  });
  test("recipient defaults to Contactus@ikrameditrip.com and can be overridden", () => {
    const base = { SMTP_HOST: "h", SMTP_USER: "a@b.com", SMTP_PASS: "p" };
    assert.deepEqual((mailConfig(base) as { config: { to: string[] } }).config.to, [DEFAULT_NOTIFY_TO]);
    assert.equal(DEFAULT_NOTIFY_TO, "Contactus@ikrameditrip.com");
    assert.deepEqual((mailConfig({ ...base, LEAD_NOTIFY_TO: "x@y.com, z@y.com" }) as { config: { to: string[] } }).config.to, ["x@y.com", "z@y.com"]);
    assert.equal(mailConfig({ ...base, LEAD_NOTIFY_TO: "not-an-address" }).ok, false);
  });
  test("port 465 implies implicit TLS", () => {
    assert.equal((mailConfig({ SMTP_HOST: "h", SMTP_USER: "a@b.com", SMTP_PASS: "p", SMTP_PORT: "465" }) as { config: { secure: boolean } }).config.secure, true);
  });
});

describe("lead notification", () => {
  test("not configured → lead saved, status not_configured, nothing pretended", async () => {
    const { db, id } = newLead();
    const r = await notifyLead(db, id, {});
    assert.equal(r.status, "not_configured");
    const s = status(db, id);
    assert.equal(s.s, "not_configured");
    assert.match(s.e ?? "", /SMTP_HOST/);
    assert.equal(s.t, null);
  });

  test("delivers to Contactus@ikrameditrip.com with the lead's details; status sent", async () => {
    const f = await fakeSmtp(); servers.push(f);
    const { db, id } = newLead(undefined, { email: "patient@example.com" });
    const r = await notifyLead(db, id, env(f.port));
    assert.deepEqual(r, { status: "sent" });
    assert.equal(f.received.length, 1);
    const m = f.received[0]!;
    assert.deepEqual(m.to, ["<Contactus@ikrameditrip.com>"]);
    assert.equal(m.from, "<sender@ikrameditrip.com>");
    assert.match(m.data, /^Reply-To: patient@example.com$/m);
    const body = decodeBody(m.data);
    assert.match(body, /Name: Test Patient/);
    assert.match(body, /Phone: \+91 98765 43210/);
    assert.match(body, /Treatment: Knee replacement/);
    assert.match(body, /\n\.leading dot line/, "dot-stuffing round-trips");
    const s = status(db, id);
    assert.equal(s.s, "sent");
    assert.ok(s.t);
    assert.equal(s.a, 1);
  });

  test("wrong credentials → failed with the server's reason; never marked sent; password not leaked", async () => {
    const f = await fakeSmtp({ rejectAuth: true }); servers.push(f);
    const { db, id } = newLead();
    const r = await notifyLead(db, id, env(f.port));
    assert.equal(r.status, "failed");
    assert.match(r.error ?? "", /535/);
    assert.ok(!(r.error ?? "").includes("s3cret-pass"));
    assert.equal(f.received.length, 0);
    assert.equal(status(db, id).s, "failed");
  });

  test("server rejects the message → failed", async () => {
    const f = await fakeSmtp({ rejectData: true }); servers.push(f);
    const { db, id } = newLead();
    assert.equal((await notifyLead(db, id, env(f.port))).status, "failed");
  });

  test("unreachable server → failed (not sent)", async () => {
    const { db, id } = newLead();
    const r = await notifyLead(db, id, env(1)); // nothing listens on port 1
    assert.equal(r.status, "failed");
    assert.equal(status(db, id).s, "failed");
  });

  test("refuses to send credentials without TLS unless explicitly allowed", async () => {
    const f = await fakeSmtp(); servers.push(f);
    const { db, id } = newLead();
    const r = await notifyLead(db, id, env(f.port, { SMTP_ALLOW_INSECURE: "false" }));
    assert.equal(r.status, "failed");
    assert.match(r.error ?? "", /STARTTLS|plain text/i);
    assert.equal(f.received.length, 0);
  });

  test("a retry after fixing the config can succeed and increments attempts", async () => {
    const f = await fakeSmtp(); servers.push(f);
    const { db, id } = newLead();
    assert.equal((await notifyLead(db, id, {})).status, "not_configured");
    assert.equal((await notifyLead(db, id, env(f.port))).status, "sent");
    const s = status(db, id);
    assert.deepEqual([s.s, s.a], ["sent", 2]);
  });

  test("header injection in the name cannot add headers", () => {
    const cfg = (mailConfig({ SMTP_HOST: "h", SMTP_USER: "a@b.com", SMTP_PASS: "p" }) as { config: Parameters<typeof buildMessage>[0] }).config;
    const raw = buildMessage(cfg, { subject: "Hi\r\nBcc: evil@x.com", text: "x", replyTo: "a@b.com" });
    assert.ok(!/^Bcc:/im.test(raw));
  });
});

describe("through the public API", () => {
  test("POST /api/leads saves the lead, returns 201 without claiming email, and records the real outcome", async () => {
    const f = await fakeSmtp(); servers.push(f);
    const keep = { ...process.env };
    Object.assign(process.env, env(f.port));
    try {
      const db = openDb(":memory:");
      const res = (await handleApi(new Request("http://localhost:3000/api/leads", {
        method: "POST", headers: { "content-type": "application/json", origin: "http://localhost:3000" },
        body: JSON.stringify({ name: "Api Patient", phone: "+254700000000", type: "contact" }),
      }), db))!;
      assert.equal(res.status, 201);
      assert.deepEqual(await res.json(), { ok: true });
      await flushNotifications();
      const row = db.prepare("SELECT id, notify_status s FROM leads").get() as { id: number; s: string };
      assert.equal(row.s, "sent");
      assert.equal(f.received.length, 1);
    } finally {
      for (const k of Object.keys(env(0))) delete process.env[k];
      Object.assign(process.env, keep);
    }
  });

  test("with no SMTP settings the visitor still gets 201 and the lead shows not_configured", async () => {
    const keep = { ...process.env };
    for (const k of ["SMTP_HOST", "SMTP_USER", "SMTP_PASS", "MAIL_FROM"]) delete process.env[k];
    try {
      const db = openDb(":memory:");
      const res = (await handleApi(new Request("http://localhost:3000/api/leads", {
        method: "POST", headers: { "content-type": "application/json", origin: "http://localhost:3000" },
        body: JSON.stringify({ name: "No Mail", phone: "+254700000001" }),
      }), db))!;
      assert.equal(res.status, 201);
      await flushNotifications();
      assert.equal((db.prepare("SELECT notify_status s FROM leads").get() as { s: string }).s, "not_configured");
    } finally {
      Object.assign(process.env, keep);
    }
  });
});
