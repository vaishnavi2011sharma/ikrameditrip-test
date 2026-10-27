import { Fragment, useCallback, useEffect, useState } from "react";
import { api, fetchAll, setCsrf } from "./api";
import { entityConfigs, type EntityConfig, type Field } from "./config";

type User = { id: number; email: string; name: string; role: "admin" | "editor" | "sales" };

const inputCls = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";
const btn = "inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium disabled:opacity-50";
const primary = `${btn} gradient-brand text-primary-foreground`;
const ghost = `${btn} border border-border bg-background hover:bg-accent`;

export function AdminApp() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [tab, setTab] = useState<string>("leads");

  useEffect(() => {
    api<{ user: User; csrf: string }>("GET", "me").then((r) => {
      if (r.ok) {
        setCsrf(r.data.csrf);
        setUser(r.data.user);
        setTab(r.data.user.role === "editor" ? "doctors" : "leads");
      } else setUser(null);
    });
  }, []);

  if (user === undefined) return <p className="p-10 text-sm text-muted-foreground">Loading…</p>;
  if (!user) return <Login onDone={(u) => { setUser(u); setTab(u.role === "editor" ? "doctors" : "leads"); }} />;

  const canLeads = user.role === "admin" || user.role === "sales";
  const canContent = user.role === "admin" || user.role === "editor";
  const cfg = entityConfigs.find((c) => c.key === tab);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-foreground">Ikra Meditrip admin</h1>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {user.name} · {user.role}
          <button className={ghost} onClick={async () => { await api("POST", "logout"); setUser(null); }}>Sign out</button>
        </div>
      </header>
      <nav className="mt-6 flex flex-wrap gap-2" aria-label="Admin sections">
        {canLeads ? <TabBtn id="leads" tab={tab} set={setTab}>Leads</TabBtn> : null}
        {canContent ? entityConfigs.map((c) => <TabBtn key={c.key} id={c.key} tab={tab} set={setTab}>{c.label}</TabBtn>) : null}
      </nav>
      <main className="mt-6">
        {tab === "leads" && canLeads ? <Leads /> : null}
        {cfg && canContent ? <EntityManager key={cfg.key} cfg={cfg} /> : null}
      </main>
    </div>
  );
}

function TabBtn({ id, tab, set, children }: { id: string; tab: string; set: (t: string) => void; children: React.ReactNode }) {
  return (
    <button onClick={() => set(id)} aria-current={tab === id} className={`rounded-full px-4 py-2 text-sm font-medium ${tab === id ? "gradient-brand text-primary-foreground" : "border border-border hover:bg-accent"}`}>
      {children}
    </button>
  );
}

function Login({ onDone }: { onDone: (u: User) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="mx-auto mt-24 max-w-sm rounded-2xl border border-border bg-card p-8 shadow-card">
      <h1 className="text-xl font-semibold">Admin sign in</h1>
      <form className="mt-6 space-y-4" onSubmit={async (e) => {
        e.preventDefault(); setBusy(true); setErr("");
        const r = await api<{ user: User; csrf: string; error?: string }>("POST", "login", { email, password });
        setBusy(false);
        if (r.ok) { setCsrf(r.data.csrf); onDone(r.data.user); } else setErr(r.data.error ?? "Could not sign in");
      }}>
        <label className="block text-sm">Email<input className={inputCls} type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label className="block text-sm">Password<input className={inputCls} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        {err ? <p role="alert" className="text-sm text-destructive">{err}</p> : null}
        <button className={`${primary} w-full`} disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </div>
  );
}

/* ------------------------------ leads ------------------------------ */
function Leads() {
  const [data, setData] = useState<{ rows: any[]; total: number; page: number; pageSize: number; statuses: string[]; mail?: { configured: boolean; to: string[]; missing: string[] } } | null>(null);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<number | null>(null);

  const load = useCallback(async () => {
    const r = await api("GET", `leads?page=${page}&status=${status}&q=${encodeURIComponent(q)}`);
    if (r.ok) setData(r.data);
  }, [page, status, q]);
  useEffect(() => { load(); }, [load]);

  const patch = async (id: number, body: object) => { await api("PATCH", `leads/${id}`, body); load(); };
  const [mailMsg, setMailMsg] = useState("");
  const resend = async (id: number) => {
    setMailMsg("Sending…");
    const r = await api("POST", `leads/${id}/notify`, {});
    setMailMsg(r.ok ? (r.data.status === "sent" ? "Email sent." : `Email ${String(r.data.status).replace("_", " ")}: ${r.data.error ?? ""}`) : "Request failed");
    load();
  };
  const mailBadge = (s: string) =>
    ({ sent: "bg-emerald-100 text-emerald-800", failed: "bg-red-100 text-red-800", not_configured: "bg-amber-100 text-amber-800", pending: "bg-slate-100 text-slate-700" } as Record<string, string>)[s] ?? "bg-slate-100";

  return (
    <section>
      {data?.mail ? (
        data.mail.configured ? (
          <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900" role="status">
            Email alerts are configured and go to <strong>{data.mail.to.join(", ")}</strong>. Each lead below shows whether its email was really delivered.
          </p>
        ) : (
          <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900" role="alert">
            Email alerts are <strong>not configured</strong> (missing: {data.mail.missing.join(", ")}). Enquiries are still saved here, but no email is sent to {data.mail.to.join(", ")} until the server's SMTP environment variables are set.
          </p>
        )
      ) : null}
      {mailMsg ? <p className="mb-2 text-sm" role="status">{mailMsg}</p> : null}
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">Status
          <select className={`${inputCls} mt-1`} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All</option>
            {(data?.statuses ?? ["new", "contacted", "qualified", "closed", "spam"]).map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label className="text-sm">Search<input className={`${inputCls} mt-1`} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Name or phone" /></label>
        <a className={ghost} href="/api/admin/leads/export.csv">Export CSV</a>
        <span className="text-sm text-muted-foreground">{data?.total ?? 0} leads</span>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-accent/50 text-xs uppercase text-muted-foreground">
            <tr>{["Received", "Patient", "Country / city", "Treatment", "Type", "Status", "Email"].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr>
          </thead>
          <tbody>
            {data?.rows.map((l) => (
              <Fragment key={l.id}>
                <tr className="cursor-pointer border-t border-border hover:bg-accent/30" onClick={() => setOpen(open === l.id ? null : l.id)}>
                  <td className="px-3 py-2 whitespace-nowrap">{String(l.created_at).slice(0, 16).replace("T", " ")}</td>
                  <td className="px-3 py-2 font-medium">{l.name}{l.age ? `, ${l.age}` : ""}<div className="text-xs text-muted-foreground">{l.phone}</div></td>
                  <td className="px-3 py-2">{[l.country, l.city].filter(Boolean).join(" / ")}</td>
                  <td className="px-3 py-2">{l.treatment_interest}{l.files?.length ? ` 📎${l.files.length}` : ""}</td>
                  <td className="px-3 py-2">{l.type}</td>
                  <td className="px-3 py-2">{l.status}</td>
                  <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs ${mailBadge(l.notify_status)}`}>{String(l.notify_status).replace("_", " ")}</span></td>
                </tr>
                {open === l.id ? (
                  <tr className="bg-accent/20">
                    <td colSpan={7} className="space-y-3 px-4 py-4">
                      {l.message ? <p className="whitespace-pre-line text-sm">{l.message}</p> : null}
                      <p className="text-xs text-muted-foreground">
                        {[l.email && `Email: ${l.email}`, l.source_page && `From: ${l.source_page}`, l.hospital_name && `Hospital: ${l.hospital_name}`, l.doctor_name && `Doctor: ${l.doctor_name}`, l.treatment_name && `Treatment: ${l.treatment_name}`].filter(Boolean).join(" · ")}
                      </p>
                      {l.files?.length ? (
                        <ul className="text-sm">
                          {l.files.map((f: any) => <li key={f.id}><a className="text-primary hover:underline" href={`/api/admin/leads/files/${f.id}`}>{f.original_name}</a> <span className="text-xs text-muted-foreground">({Math.ceil(f.size / 1024)} KB)</span></li>)}
                        </ul>
                      ) : null}
                      <p className="text-xs text-muted-foreground">
                        Email notification: <strong>{String(l.notify_status).replace("_", " ")}</strong>
                        {l.notified_at ? ` at ${String(l.notified_at).slice(0, 16).replace("T", " ")} UTC` : ""}
                        {l.notify_error ? ` — ${l.notify_error}` : ""}
                        {l.notify_status !== "sent" ? <button type="button" className="ml-3 text-primary hover:underline" onClick={() => resend(l.id)}>Try sending again</button> : null}
                      </p>
                      <div className="flex flex-wrap items-start gap-3">
                        <label className="text-sm">Status
                          <select className={`${inputCls} mt-1`} value={l.status} onChange={(e) => patch(l.id, { status: e.target.value })}>
                            {data!.statuses.map((s) => <option key={s}>{s}</option>)}
                          </select>
                        </label>
                        <NoteBox initial={l.internal_notes ?? ""} onSave={(v) => patch(l.id, { internal_notes: v })} />
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <Pager page={page} total={data?.total ?? 0} size={data?.pageSize ?? 25} set={setPage} />
    </section>
  );
}

function NoteBox({ initial, onSave }: { initial: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(initial);
  return (
    <div className="min-w-64 flex-1">
      <label className="text-sm">Internal notes<textarea className="mt-1 w-full rounded-md border border-input bg-background p-2 text-sm" rows={3} value={v} onChange={(e) => setV(e.target.value)} /></label>
      <button className={`${ghost} mt-1`} onClick={() => onSave(v)}>Save notes</button>
    </div>
  );
}

function Pager({ page, total, size, set }: { page: number; total: number; size: number; set: (n: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / size));
  if (pages <= 1) return null;
  return (
    <div className="mt-4 flex items-center gap-3 text-sm">
      <button className={ghost} disabled={page <= 1} onClick={() => set(page - 1)}>Previous</button>
      Page {page} of {pages}
      <button className={ghost} disabled={page >= pages} onClick={() => set(page + 1)}>Next</button>
    </div>
  );
}

/* --------------------------- content CRUD --------------------------- */
function EntityManager({ cfg }: { cfg: EntityConfig }) {
  const [data, setData] = useState<{ rows: any[]; total: number; pageSize: number } | null>(null);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<any | "new" | null>(null);
  const [importing, setImporting] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const r = await api("GET", `${cfg.key}?page=${page}&q=${encodeURIComponent(q)}`);
    if (r.ok) setData(r.data);
  }, [cfg.key, page, q]);
  useEffect(() => { load(); }, [load]);

  if (editing) return <EntityForm cfg={cfg} initial={editing === "new" ? null : editing} onDone={(m) => { setEditing(null); if (m) setMsg(m); load(); }} />;
  if (importing) return <ImportPanel cfg={cfg} onDone={() => { setImporting(false); load(); }} />;

  return (
    <section>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">Search<input className={`${inputCls} mt-1`} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} /></label>
        <button className={primary} onClick={() => setEditing("new")}>Add new</button>
        <button className={ghost} onClick={() => setImporting(true)}>Bulk import (CSV/JSON)</button>
        <span className="text-sm text-muted-foreground">{data?.total ?? 0} records</span>
      </div>
      {msg ? <p role="status" className="mt-3 text-sm text-secondary-foreground">{msg}</p> : null}
      <div className="mt-4 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-accent/50 text-xs uppercase text-muted-foreground">
            <tr>{cfg.columns.map((c) => <th key={c.key} className="px-3 py-2">{c.label}</th>)}<th className="px-3 py-2" /></tr>
          </thead>
          <tbody>
            {data?.rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                {cfg.columns.map((c) => <td key={c.key} className="px-3 py-2">{typeof r[c.key] === "number" && ["published", "cost_verified", "consent_confirmed"].includes(c.key) ? (r[c.key] ? "Yes" : "No") : String(r[c.key] ?? "")}</td>)}
                <td className="whitespace-nowrap px-3 py-2 text-right">
                  <button className="mr-3 text-primary hover:underline" onClick={async () => { const x = await api("GET", `${cfg.key}/${r.id}`); if (x.ok) setEditing(x.data); }}>Edit</button>
                  <button className="text-destructive hover:underline" onClick={async () => { if (confirm(`Delete "${r.name ?? r.title ?? r.patient_name}"? This cannot be undone.`)) { await api("DELETE", `${cfg.key}/${r.id}`); load(); } }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager page={page} total={data?.total ?? 0} size={data?.pageSize ?? 25} set={setPage} />
    </section>
  );
}

function EntityForm({ cfg, initial, onDone }: { cfg: EntityConfig; initial: any | null; onDone: (msg?: string) => void }) {
  const [v, setV] = useState<Record<string, any>>(() => ({ published: 1, ...(initial ?? {}) }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [opts, setOpts] = useState<Record<string, { id: number; label: string }[]>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    cfg.relations.forEach((r) => fetchAll(r.entity).then((o) => setOpts((p) => ({ ...p, [r.entity]: o }))));
  }, [cfg]);

  const set = (k: string, val: any) => setV((p) => ({ ...p, [k]: val }));

  async function save() {
    setBusy(true); setErrors({});
    const body: Record<string, any> = {};
    for (const f of cfg.fields) if (f.key in v) body[f.key] = f.type === "checkbox" ? (v[f.key] ? 1 : 0) : (v[f.key] ?? "");
    for (const r of cfg.relations) if (r.key in v) body[r.key] = v[r.key] ?? (r.single ? "" : []);
    const res = initial ? await api("PATCH", `${cfg.key}/${initial.id}`, body) : await api("POST", cfg.key, body);
    setBusy(false);
    if (res.ok) onDone("Saved.");
    else setErrors(res.data.errors ?? { _: res.data.error ?? "Could not save" });
  }

  return (
    <section className="max-w-3xl">
      <h2 className="text-xl font-semibold">{initial ? "Edit" : "Add"} — {cfg.label}</h2>
      {errors._ ? <p role="alert" className="mt-3 text-sm text-destructive">{errors._}</p> : null}
      <div className="mt-4 space-y-4">
        {cfg.fields.map((f) => <FieldInput key={f.key} f={f} value={v[f.key]} error={errors[f.key]} onChange={(x) => set(f.key, x)} />)}
        {cfg.relations.map((r) =>
          r.single ? (
            <label key={r.key} className="block text-sm font-medium">{r.label}
              <select className={`${inputCls} mt-1`} value={v[r.key] ?? ""} onChange={(e) => set(r.key, e.target.value)}>
                <option value="">— none —</option>
                {(opts[r.entity] ?? []).map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
              {errors[r.key] ? <span className="text-xs text-destructive">{errors[r.key]}</span> : null}
            </label>
          ) : (
            <MultiPick key={r.key} label={r.label} options={opts[r.entity] ?? []} value={v[r.key] ?? []} error={errors[r.key]} onChange={(x) => set(r.key, x)} />
          ),
        )}
      </div>
      <div className="mt-6 flex gap-3">
        <button className={primary} disabled={busy} onClick={save}>{busy ? "Saving…" : "Save"}</button>
        <button className={ghost} onClick={() => onDone()}>Cancel</button>
      </div>
    </section>
  );
}

function FieldInput({ f, value, error, onChange }: { f: Field; value: any; error?: string; onChange: (v: any) => void }) {
  const label = <span className="text-sm font-medium">{f.label}{f.required ? " *" : ""}</span>;
  const err = error ? <span className="block text-xs text-destructive">{error}</span> : null;
  if (f.type === "checkbox")
    return <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked ? 1 : 0)} />{f.label}{err}</label>;
  if (f.type === "textarea")
    return <label className="block">{label}<textarea className="mt-1 w-full rounded-md border border-input bg-background p-2 text-sm" rows={f.key === "body" ? 10 : 3} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />{err}</label>;
  if (f.type === "select")
    return <label className="block">{label}<select className={`${inputCls} mt-1`} value={value ?? f.options?.[0]} onChange={(e) => onChange(e.target.value)}>{f.options?.map((o) => <option key={o}>{o}</option>)}</select>{err}</label>;
  return <label className="block">{label}<input className={`${inputCls} mt-1`} type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />{err}</label>;
}

function MultiPick({ label, options, value, error, onChange }: { label: string; options: { id: number; label: string }[]; value: number[]; error?: string; onChange: (v: number[]) => void }) {
  const [filter, setFilter] = useState("");
  const shown = options.filter((o) => o.label.toLowerCase().includes(filter.toLowerCase()));
  return (
    <fieldset>
      <legend className="text-sm font-medium">{label} <span className="text-muted-foreground">({value.length} selected)</span></legend>
      <input className={`${inputCls} mt-1`} placeholder="Filter list…" value={filter} onChange={(e) => setFilter(e.target.value)} />
      <div className="mt-2 max-h-48 overflow-y-auto rounded-md border border-border p-2">
        {shown.map((o) => (
          <label key={o.id} className="flex items-center gap-2 py-0.5 text-sm">
            <input type="checkbox" checked={value.includes(o.id)} onChange={(e) => onChange(e.target.checked ? [...value, o.id] : value.filter((x) => x !== o.id))} />
            {o.label}
          </label>
        ))}
      </div>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </fieldset>
  );
}

/* ----------------------------- bulk import ----------------------------- */
function ImportPanel({ cfg, onDone }: { cfg: EntityConfig; onDone: () => void }) {
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [text, setText] = useState("");
  const [report, setReport] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  async function run(dry: boolean) {
    setBusy(true);
    let data: unknown = text;
    if (format === "json") { try { data = JSON.parse(text); } catch { setReport({ error: "That is not valid JSON" }); setBusy(false); return; } }
    const r = await api("POST", `${cfg.key}/import${dry ? "?dryRun=1" : ""}`, { format, data });
    setBusy(false);
    setReport(r.ok ? { ...r.data, dry } : { error: r.data.error ?? "Import failed" });
  }

  return (
    <section className="max-w-4xl">
      <h2 className="text-xl font-semibold">Bulk import — {cfg.label}</h2>
      {cfg.importColumns ? <p className="mt-2 text-sm text-muted-foreground">Columns: {cfg.importColumns}. Existing records with the same slug are updated; others are created. Relations use slugs separated by “|”.</p> : null}
      <div className="mt-4 flex gap-4 text-sm">
        {(["csv", "json"] as const).map((f) => <label key={f}><input type="radio" checked={format === f} onChange={() => setFormat(f)} /> {f.toUpperCase()}</label>)}
        <input type="file" accept=".csv,.json,text/csv,application/json" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { setText(await f.text()); setFormat(f.name.endsWith(".json") ? "json" : "csv"); } }} />
      </div>
      <textarea className="mt-3 h-56 w-full rounded-md border border-input bg-background p-2 font-mono text-xs" value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste CSV (with a header row) or a JSON array here, or choose a file" />
      <div className="mt-3 flex gap-3">
        <button className={ghost} disabled={busy || !text} onClick={() => run(true)}>Check only (dry run)</button>
        <button className={primary} disabled={busy || !text} onClick={() => run(false)}>Import</button>
        <button className={ghost} onClick={onDone}>Close</button>
      </div>
      {report ? (
        <div className="mt-4 rounded-xl border border-border p-4 text-sm" role="status">
          {report.error ? <p className="text-destructive">{report.error}</p> : (
            <>
              <p className="font-medium">{report.dry ? "Dry run — nothing saved. " : "Imported. "}{report.created} to create, {report.updated} to update, {report.failed.length} with errors.</p>
              <ul className="mt-2 space-y-1 text-destructive">
                {report.failed.map((f: any) => <li key={f.row}>Row {f.row}{f.name ? ` (${f.name})` : ""}: {Object.entries(f.errors).map(([k, m]) => `${k}: ${m}`).join("; ")}</li>)}
              </ul>
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}
