import { clientIpFromHeaders } from "@/lib/server/edit-auth";
import { formatGeoLabel, isLoopbackIp, lookupIpGeo } from "@/lib/server/ip-geo";
import { sanitizeResumeId } from "@/lib/resume-scope";
import { createHash } from "crypto";
import fs from "fs/promises";
import path from "path";

export type ViewLogDevice = "mobile" | "desktop" | "unknown";

export type ViewLogEvent = {
  at: number;
  city?: string;
  region?: string;
  country?: string;
  device: ViewLogDevice;
};

/** 按匿名访客聚合（同一网络多次打开合并展示） */
export type ViewLogVisitorSummary = {
  visitorId: string;
  openCount: number;
  firstAt: number;
  lastAt: number;
  city?: string;
  region?: string;
  country?: string;
  device: ViewLogDevice;
};

type ViewLogEventStored = ViewLogEvent & { fp?: string };

type ViewLogFile = {
  version: 1;
  events: ViewLogEventStored[];
};

const MAX_EVENTS = 500;
/** 同一次页面加载可能请求中英文两次，短窗口去重 */
const DEDUP_MS = 2 * 60 * 1000;

function viewLogPath(resumeId?: string): string {
  const scoped = sanitizeResumeId(resumeId);
  if (scoped) {
    const custom = process.env.RESUME_SPACE_PATH?.trim();
    const base = custom
      ? path.isAbsolute(custom)
        ? custom
        : path.join(process.cwd(), custom)
      : path.join(process.cwd(), "data", "resumes");
    return path.join(base, scoped, "view-log.json");
  }
  const publishPath = process.env.SITE_PUBLISH_PATH?.trim();
  if (publishPath) {
    const publishAbs = path.isAbsolute(publishPath)
      ? publishPath
      : path.join(process.cwd(), publishPath);
    return path.join(path.dirname(publishAbs), "view-log.json");
  }
  return path.join(process.cwd(), "data", "view-log.json");
}

function isBotUserAgent(ua: string): boolean {
  return /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram/i.test(
    ua,
  );
}

function deviceFromUserAgent(ua: string): ViewLogDevice {
  if (/mobile|android|iphone|ipad|ipod/i.test(ua)) return "mobile";
  if (ua.trim()) return "desktop";
  return "unknown";
}

function ipFingerprint(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

async function readLog(filePath: string): Promise<ViewLogFile> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const j = JSON.parse(raw) as Partial<ViewLogFile>;
    if (j.version === 1 && Array.isArray(j.events)) {
      return { version: 1, events: j.events };
    }
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") console.error("[view-log] read", e);
  }
  return { version: 1, events: [] };
}

async function writeLog(filePath: string, file: ViewLogFile): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  const trimmed: ViewLogFile = {
    version: 1,
    events: file.events.slice(-MAX_EVENTS),
  };
  await fs.writeFile(filePath, JSON.stringify(trimmed), "utf8");
}

function stripStoredEvent(e: ViewLogEventStored): ViewLogEvent {
  const { at, city, region, country, device } = e;
  return { at, city, region, country, device };
}

function aggregateVisitors(
  stored: ViewLogEventStored[],
): ViewLogVisitorSummary[] {
  const map = new Map<string, ViewLogVisitorSummary>();
  for (const e of stored) {
    const fp = e.fp ?? "unknown";
    const cur = map.get(fp);
    if (!cur) {
      map.set(fp, {
        visitorId: fp.slice(0, 8),
        openCount: 1,
        firstAt: e.at,
        lastAt: e.at,
        city: e.city,
        region: e.region,
        country: e.country,
        device: e.device,
      });
      continue;
    }
    cur.openCount += 1;
    if (e.at < cur.firstAt) cur.firstAt = e.at;
    if (e.at > cur.lastAt) {
      cur.lastAt = e.at;
      cur.city = e.city ?? cur.city;
      cur.region = e.region ?? cur.region;
      cur.country = e.country ?? cur.country;
      cur.device = e.device;
    }
  }
  return [...map.values()].sort((a, b) => b.lastAt - a.lastAt);
}

export async function readViewLogForOwner(resumeId?: string): Promise<{
  totalOpens: number;
  uniqueVisitors: number;
  visitors: ViewLogVisitorSummary[];
  events: ViewLogEvent[];
}> {
  const file = await readLog(viewLogPath(resumeId));
  const visitors = aggregateVisitors(file.events);
  const events = file.events
    .map(stripStoredEvent)
    .sort((a, b) => b.at - a.at);
  return {
    totalOpens: file.events.length,
    uniqueVisitors: visitors.length,
    visitors,
    events,
  };
}

/** 异步补全地区信息，避免阻塞主请求 */
async function enrichVisitorGeo(
  filePath: string,
  fp: string,
  ip: string,
): Promise<void> {
  try {
    const geo = await lookupIpGeo(ip);
    if (!geo.city && !geo.region && !geo.country) return;
    const file = await readLog(filePath);
    for (let i = file.events.length - 1; i >= 0; i -= 1) {
      const e = file.events[i];
      if (e.fp === fp && e.at && !e.city && !e.region && !e.country) {
        e.city = geo.city;
        e.region = geo.region;
        e.country = geo.country;
        await writeLog(filePath, file);
        return;
      }
    }
  } catch {
    // ignore geo enrichment failures
  }
}

export async function recordVisitorView(
  headers: Headers,
  resumeId?: string,
): Promise<void> {
  const ua = headers.get("user-agent") ?? "";
  if (isBotUserAgent(ua)) return;

  const ip = clientIpFromHeaders(headers);
  if (!ip && process.env.NODE_ENV === "production") return;
  if (isLoopbackIp(ip) && process.env.NODE_ENV === "production") return;

  const filePath = viewLogPath(resumeId);
  const file = await readLog(filePath);
  const now = Date.now();
  const fp = ipFingerprint(ip || "unknown");

  const recent = file.events.filter((e) => now - e.at < DEDUP_MS);
  if (recent.some((e) => e.fp === fp)) return;

  const event: ViewLogEventStored = {
    at: now,
    device: deviceFromUserAgent(ua),
    fp,
  };

  file.events.push(event);
  await writeLog(filePath, file);

  if (ip && !isLoopbackIp(ip)) {
    void enrichVisitorGeo(filePath, fp, ip);
  }
}

export { formatGeoLabel };
