let csrf = "";
export const setCsrf = (t: string) => {
  csrf = t;
};

export type ApiResult<T = any> = { ok: boolean; status: number; data: T };

export async function api<T = any>(method: string, path: string, body?: unknown): Promise<ApiResult<T>> {
  const res = await fetch(`/api/admin/${path}`, {
    method,
    credentials: "same-origin",
    headers: { ...(body !== undefined ? { "content-type": "application/json" } : {}), ...(method !== "GET" ? { "x-csrf-token": csrf } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, status: res.status, data };
}

/** Load every row of an entity (for relation pickers), 100 per request. */
export async function fetchAll(entity: string): Promise<{ id: number; label: string }[]> {
  const out: { id: number; label: string }[] = [];
  for (let page = 1; page < 20; page++) {
    const r = await api<{ rows: any[]; total: number }>("GET", `${entity}?page=${page}&pageSize=100`);
    if (!r.ok) break;
    out.push(...r.data.rows.map((x) => ({ id: x.id, label: x.name ?? x.title ?? String(x.id) })));
    if (out.length >= r.data.total) break;
  }
  return out;
}
