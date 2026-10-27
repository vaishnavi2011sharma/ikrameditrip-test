export type FieldType = "string" | "text" | "int" | "bool" | "url" | "email" | "slug" | "date";

export type FieldSpec = {
  type: FieldType;
  required?: boolean;
  max?: number;
  min?: number;
  oneOf?: readonly string[];
};
export type Spec = Record<string, FieldSpec>;

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Only http(s) URLs or site-relative paths — blocks javascript:/data: URLs. */
export function isSafeUrl(v: string): boolean {
  if (v.startsWith("/") && !v.startsWith("//")) return true;
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export type Result<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };

/**
 * Validate `input` against `spec`. Unknown keys are dropped (mass-assignment
 * protection). With partial=true, absent keys are skipped (PATCH semantics).
 */
export function validate(
  spec: Spec,
  input: unknown,
  opts: { partial?: boolean } = {},
): Result<Record<string, string | number | null>> {
  const errors: Record<string, string> = {};
  const out: Record<string, string | number | null> = {};
  const src = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;

  for (const [key, f] of Object.entries(spec)) {
    const present = Object.prototype.hasOwnProperty.call(src, key);
    if (!present) {
      if (f.required && !opts.partial) errors[key] = "Required";
      continue;
    }
    let raw = src[key];
    const empty = raw === null || raw === undefined || (typeof raw === "string" && raw.trim() === "");
    if (empty) {
      if (f.required) errors[key] = "Required";
      else if (f.type === "bool") out[key] = 0;
      else out[key] = null;
      continue;
    }

    switch (f.type) {
      case "bool": {
        const t = raw === true || raw === 1 || raw === "1" || raw === "true" || raw === "on";
        const fl = raw === false || raw === 0 || raw === "0" || raw === "false" || raw === "off";
        if (!t && !fl) errors[key] = "Must be true or false";
        else out[key] = t ? 1 : 0;
        break;
      }
      case "int": {
        const n = typeof raw === "number" ? raw : Number(String(raw).trim());
        if (!Number.isInteger(n)) errors[key] = "Must be a whole number";
        else if (f.min !== undefined && n < f.min) errors[key] = `Must be at least ${f.min}`;
        else if (f.max !== undefined && n > f.max) errors[key] = `Must be at most ${f.max}`;
        else out[key] = n;
        break;
      }
      default: {
        if (typeof raw !== "string") {
          if (typeof raw === "number") raw = String(raw);
          else {
            errors[key] = "Must be text";
            break;
          }
        }
        const s = (raw as string).trim();
        const max = f.max ?? (f.type === "text" ? 20000 : 300);
        if (s.length > max) errors[key] = `Must be at most ${max} characters`;
        else if (f.type === "email" && !EMAIL.test(s)) errors[key] = "Invalid email address";
        else if (f.type === "url" && !isSafeUrl(s)) errors[key] = "Must be an http(s) URL or a /path";
        else if (f.type === "slug" && !SLUG.test(s)) errors[key] = "Use lowercase letters, numbers and hyphens";
        else if (f.type === "date" && Number.isNaN(Date.parse(s))) errors[key] = "Invalid date";
        else if (f.oneOf && !f.oneOf.includes(s)) errors[key] = `Must be one of: ${f.oneOf.join(", ")}`;
        else if (f.min !== undefined && s.length < f.min) errors[key] = `Must be at least ${f.min} characters`;
        else out[key] = s;
      }
    }
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value: out };
}
