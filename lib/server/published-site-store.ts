import { mergeInitialSite } from "@/lib/persist-site";
import { sanitizeResumeId } from "@/lib/resume-scope";
import { getResumePublishFilePath } from "@/lib/server/resume-space-store";
import type { PersistedProfile, PersistedSiteBundle, SiteContent } from "@/lib/types";
import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";

const DEFAULT_REL = path.join("data", "published-site.json");
const EN_REL = path.join("data", "published-site.en.json");
type SiteLang = "zh" | "en";
/** 发布快照最大约 5MB（含 Base64 图时仍建议用外链） */
import { MAX_PUBLISH_BYTES } from "@/lib/publish-limits";

type PublishedSiteFileV1 = {
  fileVersion: 1;
  updatedAt: number;
  bundle: PersistedSiteBundle;
};

export type PublishedSiteReadResult =
  | { status: "missing" }
  | { status: "ok"; bundle: PersistedSiteBundle; updatedAt: number }
  | { status: "corrupt"; message: string }
  | { status: "read_failed"; message: string };

export function getPublishFilePath(
  lang: SiteLang = "zh",
  resumeId?: string,
): string {
  const scopedId = sanitizeResumeId(resumeId);
  if (scopedId) {
    const scopedPath = getResumePublishFilePath(scopedId, lang);
    if (scopedPath) return scopedPath;
  }
  const custom = process.env.SITE_PUBLISH_PATH?.trim();
  if (custom) {
    const base = path.isAbsolute(custom) ? custom : path.join(process.cwd(), custom);
    if (lang === "zh") return base;
    const ext = path.extname(base);
    if (!ext) return `${base}.en`;
    return `${base.slice(0, -ext.length)}.en${ext}`;
  }
  return path.join(process.cwd(), lang === "zh" ? DEFAULT_REL : EN_REL);
}

function isSiteContentShape(x: unknown): x is SiteContent {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.name === "string" &&
    typeof o.tagline === "string" &&
    Array.isArray(o.experience) &&
    Array.isArray(o.education) &&
    Array.isArray(o.projects)
  );
}

export function parsePersistedBundlePayload(raw: unknown): PersistedSiteBundle | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.version !== 2 || !o.profile || !o.site || !isSiteContentShape(o.site)) {
    return null;
  }
  const profile = o.profile as Record<string, unknown>;
  const savedAt =
    typeof o.savedAt === "number" && Number.isFinite(o.savedAt)
      ? o.savedAt
      : undefined;
  return {
    version: 2,
    profile: {
      name: String(profile.name ?? ""),
      tagline: String(profile.tagline ?? ""),
      setupDismissed: Boolean(profile.setupDismissed),
    },
    site: o.site as SiteContent,
    savedAt,
  };
}

function parseFilePayload(
  raw: unknown,
  fallbackUpdatedAt: number,
): { bundle: PersistedSiteBundle; updatedAt: number } | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;

  if (o.fileVersion === 1 && o.bundle) {
    const bundle = parsePersistedBundlePayload(o.bundle);
    if (!bundle) return null;
    const updatedAt =
      typeof o.updatedAt === "number" && Number.isFinite(o.updatedAt)
        ? o.updatedAt
        : fallbackUpdatedAt;
    return { bundle, updatedAt };
  }

  const legacy = parsePersistedBundlePayload(raw);
  if (!legacy) return null;
  const updatedAt = legacy.savedAt ?? fallbackUpdatedAt;
  return { bundle: legacy, updatedAt };
}

export async function readPublishedSite(
  lang: SiteLang = "zh",
  resumeId?: string,
): Promise<PublishedSiteReadResult> {
  const filePath = getPublishFilePath(lang, resumeId);
  try {
    const [raw, stat] = await Promise.all([
      fs.readFile(filePath, "utf8"),
      fs.stat(filePath).catch(() => null),
    ]);
    const fallbackUpdatedAt = stat?.mtimeMs ?? 0;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return {
        status: "corrupt",
        message:
          "服务器上的发布文件已损坏（JSON 无效）。访客将看到默认或本机缓存，请用备份恢复 data/published-site.json。",
      };
    }
    const extracted = parseFilePayload(parsed, fallbackUpdatedAt);
    if (!extracted) {
      return {
        status: "corrupt",
        message:
          "服务器上的发布文件格式无效。请站长在白名单网络下重新保存一次，或恢复 data/published-site.json。",
      };
    }
    const mergedSite = mergeInitialSite({
      version: 2,
      profile: extracted.bundle.profile,
      site: extracted.bundle.site,
      savedAt: extracted.updatedAt,
    });
    return {
      status: "ok",
      updatedAt: extracted.updatedAt,
      bundle: {
        version: 2,
        profile: extracted.bundle.profile,
        site: mergedSite,
        savedAt: extracted.updatedAt,
      },
    };
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return { status: "missing" };
    console.error("[published-site-store] read failed:", e);
    return {
      status: "read_failed",
      message: "无法读取服务器发布文件，请检查 data 目录权限或磁盘状态。",
    };
  }
}

/** @deprecated 使用 readPublishedSite */
export async function readPublishedBundle(): Promise<PersistedSiteBundle | null> {
  const r = await readPublishedSite("zh");
  return r.status === "ok" ? r.bundle : null;
}

export async function writePublishedBundle(
  bundle: PersistedSiteBundle,
  lang: SiteLang = "zh",
  resumeId?: string,
): Promise<void> {
  const filePath = getPublishFilePath(lang, resumeId);
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  const updatedAt = bundle.savedAt ?? Date.now();
  const payload: PublishedSiteFileV1 = {
    fileVersion: 1,
    updatedAt,
    bundle: {
      version: 2,
      profile: bundle.profile,
      site: bundle.site,
      savedAt: updatedAt,
    },
  };
  const text = JSON.stringify(payload);
  if (Buffer.byteLength(text, "utf8") > MAX_PUBLISH_BYTES) {
    throw new Error("publish_payload_too_large");
  }
  // 避免高频自动保存在同一毫秒内写入同名临时文件导致 rename ENOENT
  const tmp = `${filePath}.${process.pid}.${Date.now()}.${randomUUID()}.tmp`;
  await fs.writeFile(tmp, text, "utf8");
  try {
    await fs.rename(tmp, filePath);
  } catch (e) {
    const code =
      e && typeof e === "object" && "code" in e
        ? String((e as NodeJS.ErrnoException).code)
        : "";
    if (code === "EPERM" || code === "EACCES" || code === "EBUSY") {
      await fs.copyFile(tmp, filePath);
      await fs.unlink(tmp).catch(() => {});
      return;
    }
    await fs.unlink(tmp).catch(() => {});
    throw e;
  }
}
