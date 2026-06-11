import {
  isAllowedUploadExt,
  resolveExtFromNameAndMime,
} from "@/lib/upload-mime";
import fs from "fs/promises";
import path from "path";

export { isAllowedUploadExt } from "@/lib/upload-mime";

export function resolveUploadExtension(
  fileName: string,
  mimeType = "",
): string | null {
  const resolved = resolveExtFromNameAndMime(fileName, mimeType);
  if (resolved) return resolved;

  const fromCleaned = path.extname(safeBaseName(fileName || "")).toLowerCase();
  if (fromCleaned && isAllowedUploadExt(fromCleaned)) {
    return fromCleaned;
  }

  return null;
}

export function safeBaseName(name: string): string {
  const base = path.basename(name).replace(/\s+/g, "-");
  const ext = path.extname(base).toLowerCase();
  let stem = path.basename(base, ext).replace(/[^a-zA-Z0-9._-]/g, "");
  if (!stem) stem = "upload";
  return `${stem}${ext}`;
}

export function resolveUploadBaseDir(): string {
  const custom = process.env.SITE_UPLOAD_PATH?.trim();
  if (custom) {
    return path.isAbsolute(custom) ? custom : path.join(process.cwd(), custom);
  }
  const publishPath = process.env.SITE_PUBLISH_PATH?.trim();
  if (publishPath) {
    const publishAbs = path.isAbsolute(publishPath)
      ? publishPath
      : path.join(process.cwd(), publishPath);
    return path.join(path.dirname(publishAbs), "uploads");
  }
  return path.join(process.cwd(), "data", "uploads");
}

export async function ensureUploadDir(): Promise<string> {
  const dir = resolveUploadBaseDir();
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export function resolveUploadFilePath(fileName: string): string {
  const safe = safeBaseName(fileName);
  return path.join(resolveUploadBaseDir(), safe);
}

function uniquePaths(paths: string[]): string[] {
  return Array.from(new Set(paths.map((p) => path.normalize(p))));
}

export function resolveUploadCandidatePaths(fileName: string): string[] {
  const safe = safeBaseName(fileName);
  const cwd = process.cwd();
  const publishPath = process.env.SITE_PUBLISH_PATH?.trim();
  const publishAbs = publishPath
    ? path.isAbsolute(publishPath)
      ? publishPath
      : path.join(cwd, publishPath)
    : "";
  const deployRoot = publishAbs ? path.dirname(path.dirname(publishAbs)) : path.dirname(cwd);

  const bases = uniquePaths([
    resolveUploadBaseDir(),
    path.join(cwd, "public", "uploads"),
    path.join(cwd, "release", "public", "uploads"),
    path.join(deployRoot, "public", "uploads"),
    path.join(deployRoot, "release", "public", "uploads"),
  ]);
  return bases.map((base) => path.join(base, safe));
}

export async function resolveExistingUploadFilePath(
  fileName: string,
): Promise<string | null> {
  const candidates = resolveUploadCandidatePaths(fileName);
  for (const p of candidates) {
    try {
      const st = await fs.stat(p);
      if (st.isFile()) return p;
    } catch {
      // try next
    }
  }
  return null;
}
