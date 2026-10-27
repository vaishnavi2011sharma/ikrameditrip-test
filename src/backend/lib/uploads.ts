import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync, readFileSync, unlinkSync } from "node:fs";
import { join, resolve } from "node:path";

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_FILES = 5;

export function uploadDir(): string {
  const dir = resolve(process.env.UPLOAD_DIR || "./data/uploads");
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** Identify allowed types from the file's actual bytes, never from its name or declared type. */
export function sniffType(b: Uint8Array): { mime: string; ext: string } | null {
  const starts = (...sig: number[]) => sig.every((v, i) => b[i] === v);
  if (starts(0x25, 0x50, 0x44, 0x46)) return { mime: "application/pdf", ext: "pdf" };
  if (starts(0xff, 0xd8, 0xff)) return { mime: "image/jpeg", ext: "jpg" };
  if (starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return { mime: "image/png", ext: "png" };
  // DOCX is a zip; DOC is an OLE container
  if (starts(0x50, 0x4b, 0x03, 0x04)) return { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ext: "docx" };
  if (starts(0xd0, 0xcf, 0x11, 0xe0)) return { mime: "application/msword", ext: "doc" };
  return null;
}

export type SavedFile = { stored_name: string; original_name: string; mime: string; size: number };

export async function saveUpload(file: File): Promise<{ ok: true; file: SavedFile } | { ok: false; error: string }> {
  if (file.size === 0) return { ok: false, error: "The file is empty" };
  if (file.size > MAX_FILE_BYTES) return { ok: false, error: "Each file must be 10 MB or smaller" };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffType(bytes);
  if (!type) return { ok: false, error: "Only PDF, JPG, PNG or Word files are accepted" };
  const stored_name = `${randomBytes(16).toString("hex")}.${type.ext}`;
  writeFileSync(join(uploadDir(), stored_name), bytes, { mode: 0o600 });
  const original_name = (file.name || "report").replace(/[^\w.\- ()]/g, "_").slice(0, 120);
  return { ok: true, file: { stored_name, original_name, mime: type.mime, size: bytes.length } };
}

export function readUpload(storedName: string): Buffer | null {
  if (!/^[a-f0-9]{32}\.(pdf|jpg|png|docx|doc)$/.test(storedName)) return null; // blocks path traversal
  try {
    return readFileSync(join(uploadDir(), storedName));
  } catch {
    return null;
  }
}

export function deleteUpload(storedName: string): void {
  if (!/^[a-f0-9]{32}\.(pdf|jpg|png|docx|doc)$/.test(storedName)) return;
  try {
    unlinkSync(join(uploadDir(), storedName));
  } catch {
    /* already gone */
  }
}
