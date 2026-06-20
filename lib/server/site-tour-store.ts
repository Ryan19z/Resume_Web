import { clientIpFromHeaders } from "@/lib/server/edit-auth";
import { isLoopbackIp } from "@/lib/server/ip-geo";
import { sanitizeResumeId } from "@/lib/resume-scope";
import { createHash } from "crypto";
import fs from "fs/promises";
import path from "path";

type SiteTourSeenFile = {
  version: 1;
  /** IP 指纹（sha256 前 16 位），同一网络视为同一访客 */
  seen: string[];
};

const MAX_SEEN = 2000;

function siteTourSeenPath(resumeId?: string): string {
  const scoped = sanitizeResumeId(resumeId);
  if (scoped) {
    const custom = process.env.RESUME_SPACE_PATH?.trim();
    const base = custom
      ? path.isAbsolute(custom)
        ? custom
        : path.join(process.cwd(), custom)
      : path.join(process.cwd(), "data", "resumes");
    return path.join(base, scoped, "site-tour-seen.json");
  }
  const publishPath = process.env.SITE_PUBLISH_PATH?.trim();
  if (publishPath) {
    const publishAbs = path.isAbsolute(publishPath)
      ? publishPath
      : path.join(process.cwd(), publishPath);
    return path.join(path.dirname(publishAbs), "site-tour-seen.json");
  }
  return path.join(process.cwd(), "data", "site-tour-seen.json");
}

function ipFingerprint(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

function visitorFingerprint(headers: Headers): string | null {
  const ip = clientIpFromHeaders(headers);
  if (!ip && process.env.NODE_ENV === "production") return null;
  if (isLoopbackIp(ip) && process.env.NODE_ENV === "production") return null;
  return ipFingerprint(ip || "unknown");
}

async function readSeen(filePath: string): Promise<SiteTourSeenFile> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const j = JSON.parse(raw) as Partial<SiteTourSeenFile>;
    if (j.version === 1 && Array.isArray(j.seen)) {
      return { version: 1, seen: j.seen.filter((x) => typeof x === "string") };
    }
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") console.error("[site-tour] read", e);
  }
  return { version: 1, seen: [] };
}

async function writeSeen(filePath: string, file: SiteTourSeenFile): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    filePath,
    JSON.stringify({
      version: 1,
      seen: file.seen.slice(-MAX_SEEN),
    }),
    "utf8",
  );
}

/** 该 IP 是否已触发过自动新手引导（含刷新后再进入） */
export async function hasIpSeenAutoTour(
  headers: Headers,
  resumeId?: string,
): Promise<boolean> {
  const fp = visitorFingerprint(headers);
  if (!fp) return false;
  const file = await readSeen(siteTourSeenPath(resumeId));
  return file.seen.includes(fp);
}

/** 记录该 IP 已展示过自动新手引导 */
export async function markIpAutoTourSeen(
  headers: Headers,
  resumeId?: string,
): Promise<void> {
  const fp = visitorFingerprint(headers);
  if (!fp) return;
  const filePath = siteTourSeenPath(resumeId);
  const file = await readSeen(filePath);
  if (file.seen.includes(fp)) return;
  file.seen.push(fp);
  await writeSeen(filePath, file);
}
