/**
 * Minimal, dependency-free SMTP client (Node net/tls) + lead-notification logic.
 *
 * Honest by design: a lead is ALWAYS saved first. Email is then attempted and the real outcome is stored on the
 * lead (notify_status = sent | failed | not_configured). Nothing is ever reported as sent unless the SMTP server
 * accepted the message (reply 250 after DATA). Credentials only come from environment variables and are never
 * logged, stored or returned by any API.
 *
 * Env: SMTP_HOST, SMTP_PORT (587 default), SMTP_SECURE ("true" = implicit TLS, e.g. port 465), SMTP_USER, SMTP_PASS,
 *      MAIL_FROM (defaults to SMTP_USER when that is an address), LEAD_NOTIFY_TO (default Contactus@ikrameditrip.com),
 *      SMTP_ALLOW_INSECURE ("true" only for local testing: permits plaintext SMTP/AUTH).
 */
import net from "node:net";
import tls from "node:tls";
import { randomUUID } from "node:crypto";
import type { DB } from "../db/client";

export const DEFAULT_NOTIFY_TO = "Contactus@ikrameditrip.com";

export type MailConfig = {
  host: string; port: number; secure: boolean; user: string; pass: string; from: string; to: string[]; allowInsecure: boolean;
};
type Env = Record<string, string | undefined>;
const ADDR = /^[^\s<>@,;"']+@[^\s<>@,;"']+\.[^\s<>@,;"']+$/;

export function mailConfig(env: Env = process.env): { ok: true; config: MailConfig } | { ok: false; missing: string[] } {
  const missing: string[] = [];
  const host = env.SMTP_HOST?.trim();
  const user = env.SMTP_USER?.trim();
  const pass = env.SMTP_PASS;
  if (!host) missing.push("SMTP_HOST");
  if (!user) missing.push("SMTP_USER");
  if (!pass) missing.push("SMTP_PASS");
  const from = (env.MAIL_FROM?.trim() || (user && ADDR.test(user) ? user : "")) as string;
  if (!from || !ADDR.test(from.replace(/^.*<(.+)>$/, "$1"))) missing.push("MAIL_FROM");
  const to = (env.LEAD_NOTIFY_TO?.trim() || DEFAULT_NOTIFY_TO).split(",").map((s) => s.trim()).filter(Boolean);
  if (!to.length || to.some((a) => !ADDR.test(a))) missing.push("LEAD_NOTIFY_TO (invalid address)");
  const port = Number(env.SMTP_PORT || 587);
  if (!Number.isInteger(port) || port < 1 || port > 65535) missing.push("SMTP_PORT (invalid)");
  if (missing.length) return { ok: false, missing };
  return {
    ok: true,
    config: {
      host: host!, port, secure: env.SMTP_SECURE === "true" || port === 465, user: user!, pass: pass!,
      from, to, allowInsecure: env.SMTP_ALLOW_INSECURE === "true",
    },
  };
}

/** Header values must never contain line breaks (header injection). */
const hv = (s: string) => s.replace(/[\r\n]+/g, " ").trim();
const encWord = (s: string) => (/^[\x20-\x7e]*$/.test(s) ? hv(s) : `=?UTF-8?B?${Buffer.from(hv(s), "utf8").toString("base64")}?=`);
const bareAddr = (a: string) => a.replace(/^.*<(.+)>$/, "$1").trim();

export function buildMessage(cfg: MailConfig, m: { subject: string; text: string; replyTo?: string | null }): string {
  const h = [
    `From: ${hv(cfg.from)}`,
    `To: ${cfg.to.map(hv).join(", ")}`,
    ...(m.replyTo && ADDR.test(m.replyTo) ? [`Reply-To: ${hv(m.replyTo)}`] : []),
    `Subject: ${encWord(m.subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${randomUUID()}@${cfg.host.replace(/[^\w.-]/g, "")}>`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: base64",
  ];
  const b64 = Buffer.from(m.text, "utf8").toString("base64").replace(/(.{76})/g, "$1\r\n");
  return h.join("\r\n") + "\r\n\r\n" + b64 + "\r\n";
}

class SmtpError extends Error {}

/** One SMTP conversation. Resolves only when the server accepts the message. */
export async function sendMail(
  cfg: MailConfig,
  m: { subject: string; text: string; replyTo?: string | null },
  opts: { timeoutMs?: number; tlsOptions?: tls.ConnectionOptions } = {},
): Promise<void> {
  const timeoutMs = opts.timeoutMs ?? 15_000;
  let sock: net.Socket | tls.TLSSocket;
  let buf = "";
  let waiter: ((r: { code: number; text: string }) => void) | null = null;
  let failure: Error | null = null;
  const queue: { code: number; text: string }[] = [];

  const pump = () => {
    // a reply is complete at a line "NNN text" (space after the code)
    for (;;) {
      const lines = buf.split("\r\n");
      if (lines.length < 2) return;
      const end = lines.findIndex((l) => /^\d{3} /.test(l) || /^\d{3}$/.test(l));
      if (end < 0) return;
      const reply = lines.slice(0, end + 1);
      buf = lines.slice(end + 1).join("\r\n");
      const r = { code: Number(reply[end]!.slice(0, 3)), text: reply.map((l) => l.slice(4)).join("\n") };
      if (waiter) { const w = waiter; waiter = null; w(r); } else queue.push(r);
    }
  };
  const attach = (s: net.Socket | tls.TLSSocket) => {
    sock = s;
    s.setEncoding("utf8");
    s.on("data", (d: string) => { buf += d; pump(); });
    s.on("error", (e) => { failure = e; if (waiter) { const w = waiter; waiter = null; w({ code: 0, text: e.message }); } });
    s.on("close", () => { if (!failure) failure = new Error("connection closed by server"); if (waiter) { const w = waiter; waiter = null; w({ code: 0, text: "connection closed" }); } });
  };
  const read = () =>
    new Promise<{ code: number; text: string }>((resolve) => {
      const q = queue.shift();
      if (q) return resolve(q);
      if (failure) return resolve({ code: 0, text: failure.message });
      waiter = resolve;
    });
  const expect = async (codes: number[], what: string) => {
    const r = await read();
    if (!codes.includes(r.code)) throw new SmtpError(`${what}: server replied ${r.code || "no reply"} ${r.text}`.slice(0, 300));
    return r;
  };
  const send = (line: string) => { sock.write(line + "\r\n"); };

  const run = async () => {
    await new Promise<void>((resolve, reject) => {
      const onErr = (e: Error) => reject(new SmtpError(`cannot connect to ${cfg.host}:${cfg.port}: ${e.message}`));
      const s = cfg.secure
        ? tls.connect({ host: cfg.host, port: cfg.port, servername: cfg.host, ...opts.tlsOptions }, () => { s.off("error", onErr); resolve(); })
        : net.connect({ host: cfg.host, port: cfg.port }, () => { s.off("error", onErr); resolve(); });
      s.once("error", onErr);
      attach(s);
    });
    await expect([220], "greeting");
    const ehlo = async () => { send("EHLO ikrameditrip.local"); return (await expect([250], "EHLO")).text; };
    let caps = await ehlo();
    let encrypted = cfg.secure;
    if (!encrypted) {
      if (/^STARTTLS$/im.test(caps)) {
        send("STARTTLS");
        await expect([220], "STARTTLS");
        const plain = sock as net.Socket;
        plain.removeAllListeners("data");
        buf = "";
        const secured = await new Promise<tls.TLSSocket>((resolve, reject) => {
          const t = tls.connect({ socket: plain, servername: cfg.host, ...opts.tlsOptions }, () => resolve(t));
          t.once("error", (e) => reject(new SmtpError(`TLS handshake failed: ${e.message}`)));
        });
        attach(secured);
        encrypted = true;
        caps = await ehlo();
      } else if (!cfg.allowInsecure) {
        throw new SmtpError("server does not offer STARTTLS; refusing to send credentials in plain text");
      }
    }
    if (!encrypted && !cfg.allowInsecure) throw new SmtpError("refusing unencrypted SMTP");
    // authentication
    if (/AUTH[ =].*PLAIN/i.test(caps)) {
      send("AUTH PLAIN " + Buffer.from(`\0${cfg.user}\0${cfg.pass}`, "utf8").toString("base64"));
      await expect([235], "authentication");
    } else if (/AUTH[ =].*LOGIN/i.test(caps)) {
      send("AUTH LOGIN");
      await expect([334], "authentication");
      send(Buffer.from(cfg.user, "utf8").toString("base64"));
      await expect([334], "authentication");
      send(Buffer.from(cfg.pass, "utf8").toString("base64"));
      await expect([235], "authentication");
    } else {
      throw new SmtpError("server offers no supported AUTH method (PLAIN/LOGIN)");
    }
    send(`MAIL FROM:<${bareAddr(cfg.from)}>`);
    await expect([250], "MAIL FROM");
    for (const to of cfg.to) {
      send(`RCPT TO:<${to}>`);
      await expect([250, 251], `RCPT TO ${to}`);
    }
    send("DATA");
    await expect([354], "DATA");
    // dot-stuff lines that start with "."
    sock.write(buildMessage(cfg, m).replace(/(^|\r\n)\./g, "$1..") + ".\r\n");
    await expect([250], "message not accepted");
    send("QUIT");
  };

  let timer: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      run(),
      new Promise<never>((_, rej) => { timer = setTimeout(() => rej(new SmtpError(`timed out after ${timeoutMs} ms`)), timeoutMs); }),
    ]);
  } finally {
    clearTimeout(timer);
    // @ts-expect-error sock is assigned once connected
    try { sock?.destroy(); } catch { /* already closed */ }
  }
}

// ---------------------------------------------------------------- lead notifications

type LeadRow = Record<string, string | number | null>;

export function leadEmail(lead: LeadRow, files: number, siteUrl: string) {
  const line = (k: string, v: unknown) => (v == null || v === "" ? null : `${k}: ${String(v)}`);
  const text = [
    "A new enquiry was received on ikrameditrip.com.",
    "",
    line("Type", lead.type),
    line("Name", lead.name),
    line("Age", lead.age),
    line("Phone", lead.phone),
    line("Email", lead.email),
    line("Country", lead.country),
    line("City", lead.city),
    line("Treatment", lead.treatment_interest),
    line("Doctor", lead.doctor_name),
    line("Hospital", lead.hospital_name),
    line("Page", lead.source_page),
    line("Received (UTC)", lead.created_at),
    files ? `Medical reports: ${files} file(s) uploaded. Download them from the admin panel (they are not attached to this email).` : null,
    "",
    lead.message ? `Message:\n${lead.message}` : null,
    "",
    `Manage this lead: ${siteUrl.replace(/\/$/, "")}/admin`,
  ].filter((x) => x !== null).join("\n");
  const subject = `New enquiry: ${String(lead.name).slice(0, 60)}${lead.treatment_interest ? ` - ${String(lead.treatment_interest).slice(0, 60)}` : ""}`;
  return { subject, text };
}

export type NotifyResult = { status: "sent" | "failed" | "not_configured"; error?: string };

/** Sends the notification for one stored lead and records the REAL outcome on the lead. */
export async function notifyLead(
  db: DB,
  leadId: number,
  env: Env = process.env,
  opts: Parameters<typeof sendMail>[2] = {},
): Promise<NotifyResult> {
  const lead = db
    .prepare(
      `SELECT l.*, d.name AS doctor_name, h.name AS hospital_name FROM leads l
         LEFT JOIN doctors d ON d.id = l.doctor_id LEFT JOIN hospitals h ON h.id = l.hospital_id WHERE l.id = ?`,
    )
    .get(leadId) as LeadRow | undefined;
  if (!lead) return { status: "failed", error: "lead not found" };
  const record = (status: string, error: string | null) =>
    db
      .prepare(
        `UPDATE leads SET notify_status = ?, notify_error = ?, notify_attempts = notify_attempts + 1,
           notified_at = CASE WHEN ? = 'sent' THEN strftime('%Y-%m-%dT%H:%M:%fZ','now') ELSE notified_at END WHERE id = ?`,
      )
      .run(status, error, status, leadId);

  const cfg = mailConfig(env);
  if (!cfg.ok) {
    const error = `Email not configured - missing: ${cfg.missing.join(", ")}`;
    record("not_configured", error);
    return { status: "not_configured", error };
  }
  const files = (db.prepare("SELECT COUNT(*) n FROM lead_files WHERE lead_id = ?").get(leadId) as { n: number }).n;
  const msg = leadEmail(lead, files, env.SITE_URL || "https://ikrameditrip.com");
  try {
    await sendMail(cfg.config, { ...msg, replyTo: (lead.email as string | null) ?? null }, opts);
    record("sent", null);
    return { status: "sent" };
  } catch (e) {
    const error = (e instanceof Error ? e.message : String(e)).replace(cfg.config.pass, "***").slice(0, 300);
    record("failed", error);
    return { status: "failed", error };
  }
}

const inflight = new Set<Promise<unknown>>();
/** Fire-and-forget from the request handler (the visitor never waits on SMTP). Errors are recorded on the lead. */
export function queueNotify(db: DB, leadId: number): void {
  const p = notifyLead(db, leadId).catch(() => undefined).finally(() => inflight.delete(p));
  inflight.add(p);
}
/** Wait for queued notifications (tests, graceful shutdown). */
export async function flushNotifications(): Promise<void> {
  while (inflight.size) await Promise.allSettled([...inflight]);
}
