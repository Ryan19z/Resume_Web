import fs from "fs/promises";
import path from "path";

const ALLOWED_EXT = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".mp4",
  ".webm",
  ".mov",
  ".pdf",
  ".doc",
  ".docx",
  ".ppt",
  ".pptx",
]);

export function isAllowedUploadExt(ext: string): boolean {
  return ALLOWED_EXT.has(ext.toLowerCase());
}

export function safeBaseName(name: string): string {
  const base = path.basename(name).replace(/\s+/g, "-");
  return base.replace(/[^a-zA-Z0-9._-]/g, "");
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

