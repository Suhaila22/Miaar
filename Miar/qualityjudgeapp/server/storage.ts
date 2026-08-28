// Local-filesystem storage helpers.
//
// Files are written under ENV.uploadsDir (default: "uploads/" at the project
// root) and served back over HTTP via the static "/uploads" route registered
// in server/_core/index.ts. This keeps the app deployable anywhere with no
// external storage dependency.
//
// Need S3 (or another provider) instead? Swap the implementation of
// `storagePut` below for a call to your provider's SDK — the rest of the app
// only depends on the { key, url } shape returned here.

import { mkdir, writeFile, unlink } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import os from "node:os";
import path from "node:path";
import { ENV } from "./_core/env";

const execFileAsync = promisify(execFile);

export type MalwareScanStatus = "pending" | "clean" | "infected" | "skipped";

let clamscanAvailability: boolean | null = null;

async function isClamscanAvailable(): Promise<boolean> {
  if (clamscanAvailability !== null) return clamscanAvailability;
  try {
    await execFileAsync("clamscan", ["--version"]);
    clamscanAvailability = true;
  } catch {
    clamscanAvailability = false;
  }
  return clamscanAvailability;
}

/**
 * Pluggable malware scan hook for uploaded evidence files.
 *
 * Uses the ClamAV CLI (`clamscan`) when it is installed on the host —
 * standard on most Linux server images and easy to add via the OS
 * package manager (e.g. `apt-get install clamav`). When it is not
 * present, the scan is marked "skipped" rather than silently reported
 * as clean, so downstream reviewers/auditors can see that no scan
 * actually ran.
 */
export async function scanBufferForMalware(data: Buffer | Uint8Array): Promise<MalwareScanStatus> {
  if (!(await isClamscanAvailable())) return "skipped";

  const tmpPath = path.join(os.tmpdir(), `scan-${crypto.randomUUID()}`);
  try {
    await writeFile(tmpPath, Buffer.from(data));
    await execFileAsync("clamscan", ["--no-summary", tmpPath]);
    return "clean";
  } catch (error: any) {
    // clamscan exits with code 1 when it finds an infected file.
    if (error && typeof error.code === "number" && error.code === 1) return "infected";
    return "skipped";
  } finally {
    await unlink(tmpPath).catch(() => {});
  }
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

function absolutePathFor(key: string): string {
  return path.resolve(process.cwd(), ENV.uploadsDir, key);
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  _contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));
  const filePath = absolutePathFor(key);

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, typeof data === "string" ? data : Buffer.from(data));

  return { key, url: `/uploads/${key}` };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `/uploads/${key}` };
}
