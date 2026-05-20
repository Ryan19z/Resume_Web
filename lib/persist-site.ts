import { defaultSiteContent } from "./default-site-content";
import { isReasonableHttpUrl } from "./is-reasonable-http-url";
import {
  normalizeDevAssetUrl,
  normalizeSiteContentAssetUrls,
} from "./normalize-site-asset-urls";
import { placeholderWideByIndex } from "./media-defaults";
import type {
  AchievementBlock,
  EducationItem,
  ExperienceItem,
  PersistedProfile,
  PersistedSiteBundle,
  PortfolioProject,
  RepresentativeProject,
  SiteContent,
} from "./types";

export const PERSIST_SAVE_FAILED_MESSAGE =
  "保存到浏览器失败：内容过大或存储已满。请缩小图片、改用图床链接，或清理本站本地数据后重试。";

export const SERVER_PUBLISH_FAILED_MESSAGE =
  "已保存到本机浏览器，但发布到服务器失败，访客可能看不到最新内容。请检查服务器 data 目录写权限、图片体积，或 Nginx 是否拦截了大请求体。";

const STORAGE_KEY_V2 = "resume-site-bundle-v2";
const STORAGE_KEY_V1 = "resume-site-profile-v1";

function cloneSite(): SiteContent {
  return structuredClone(defaultSiteContent);
}

function normalizeStringArray(raw: unknown, fallback: string[]): string[] {
  if (!Array.isArray(raw)) return [...fallback];
  const out = raw.map((x) => String(x ?? "").trim()).filter(Boolean);
  return out.length > 0 ? out : [...fallback];
}

function normalizeAchievementBlock(
  raw: unknown,
  fallback: AchievementBlock,
): AchievementBlock {
  if (!raw || typeof raw !== "object") return { ...fallback, bullets: [...fallback.bullets] };
  const b = raw as Record<string, unknown>;
  const bullets = Array.isArray(b.bullets)
    ? b.bullets.map((x) => String(x ?? "").trim()).filter(Boolean)
    : [...fallback.bullets];
  return {
    heading:
      typeof b.heading === "string" && b.heading.trim()
        ? b.heading
        : fallback.heading,
    bullets,
  };
}

function normalizeAchievementBlocks(
  raw: unknown,
  fallback: AchievementBlock[],
): AchievementBlock[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return fallback.map((b) => ({ ...b, bullets: [...b.bullets] }));
  }
  return raw.map((item, i) =>
    normalizeAchievementBlock(
      item,
      fallback[i] ?? fallback[0] ?? { heading: "", bullets: [] },
    ),
  );
}

function normalizeRepProjectsArray(
  raw: unknown,
  fallback: RepresentativeProject[],
): RepresentativeProject[] {
  if (!Array.isArray(raw)) return [...fallback];
  const out: RepresentativeProject[] = [];
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    if (!item || typeof item !== "object") continue;
    const p = item as Record<string, unknown>;
    const fb = fallback[i] ?? fallback[0];
    if (!fb) continue;
    const media = p.media;
    if (!media || typeof media !== "object") continue;
    const m = media as Record<string, unknown>;
    const kind = m.kind;
    let normalizedMedia: RepresentativeProject["media"] | null = null;
    if (kind === "image" && typeof m.url === "string") {
      normalizedMedia = { kind: "image", url: m.url };
    } else if (kind === "video" && typeof m.url === "string") {
      normalizedMedia = { kind: "video", url: m.url };
    } else if (kind === "code" && typeof m.code === "string") {
      normalizedMedia = {
        kind: "code",
        code: m.code,
        language: typeof m.language === "string" ? m.language : undefined,
      };
    }
    if (!normalizedMedia) continue;
    out.push({
      id: String(p.id ?? fb.id),
      title: String(p.title ?? fb.title),
      description:
        typeof p.description === "string" ? p.description : fb.description,
      media: normalizedMedia,
    });
  }
  return out.length > 0 ? out : [...fallback];
}

function migrateExperienceItem(
  raw: unknown,
  fallback: ExperienceItem,
): ExperienceItem {
  if (!raw || typeof raw !== "object") return fallback;
  const e = raw as Record<string, unknown>;
  if (Array.isArray(e.keyResults) && Array.isArray(e.representativeProjects)) {
    return {
      id: String(e.id ?? fallback.id),
      title: String(e.title ?? fallback.title),
      subtitle: String(e.subtitle ?? fallback.subtitle),
      period: String(e.period ?? fallback.period),
      summary:
        typeof e.summary === "string" ? e.summary : fallback.summary,
      keyResults: normalizeStringArray(e.keyResults, fallback.keyResults),
      representativeProjects: normalizeRepProjectsArray(
        e.representativeProjects,
        fallback.representativeProjects,
      ),
    };
  }
  const achievements = e.achievements as AchievementBlock[] | undefined;
  if (achievements?.length) {
    const keyResults =
      achievements[0]?.bullets?.length
        ? achievements[0].bullets.map((x) => String(x ?? "").trim()).filter(Boolean)
        : fallback.keyResults;
    const repLines = achievements[1]?.bullets ?? [];
    const representativeProjects: ExperienceItem["representativeProjects"] =
      repLines.length > 0
        ? repLines.map((text, i) => ({
            id: `mig-${String(e.id)}-${i}`,
            title: text.slice(0, 80),
            description: "",
            media: {
              kind: "image" as const,
              url: placeholderWideByIndex(i),
            },
          }))
        : fallback.representativeProjects;
    return {
      id: String(e.id ?? fallback.id),
      title: String(e.title ?? fallback.title),
      subtitle: String(e.subtitle ?? fallback.subtitle),
      period: String(e.period ?? fallback.period),
      summary:
        typeof e.summary === "string" ? e.summary : fallback.summary,
      keyResults,
      representativeProjects,
    };
  }
  return fallback;
}

function normalizePortfolioProject(
  raw: unknown,
  fallback: PortfolioProject,
): PortfolioProject {
  if (!raw || typeof raw !== "object") return fallback;
  const p = raw as Record<string, unknown>;
  const hrefRaw = typeof p.href === "string" ? p.href.trim() : "";
  const href = isReasonableHttpUrl(hrefRaw) ? hrefRaw : fallback.href;
  const coverRaw = typeof p.coverSrc === "string" ? p.coverSrc.trim() : "";
  const coverSrc = coverRaw || fallback.coverSrc;
  const posterRaw =
    typeof p.posterSrc === "string" ? p.posterSrc.trim() : "";
  const posterSrc = posterRaw.length > 0 ? posterRaw : undefined;
  return {
    id: String(p.id ?? fallback.id),
    title: String(p.title ?? fallback.title).trim() || fallback.title,
    description:
      typeof p.description === "string"
        ? p.description.trim() || undefined
        : fallback.description,
    coverSrc,
    posterSrc,
    href,
  };
}

function normalizeEducationItem(
  raw: unknown,
  fallback: EducationItem,
): EducationItem {
  if (!raw || typeof raw !== "object") return fallback;
  const e = raw as Record<string, unknown>;
  const campusHighlights = normalizeAchievementBlocks(
    e.campusHighlights,
    fallback.campusHighlights,
  );
  const representativeProjects = normalizeRepProjectsArray(
    e.representativeProjects,
    fallback.representativeProjects,
  );
  return {
    id: String(e.id ?? fallback.id),
    title: String(e.title ?? fallback.title),
    subtitle: String(e.subtitle ?? fallback.subtitle),
    period: String(e.period ?? fallback.period),
    summary:
      typeof e.summary === "string" ? e.summary : fallback.summary,
    campusHighlights,
    representativeProjects,
  };
}

function isSiteContent(x: unknown): x is SiteContent {
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

function loadV2Bundle(): PersistedSiteBundle | null {
  const raw2 = window.localStorage.getItem(STORAGE_KEY_V2);
  if (!raw2) return null;
  let parsed: Partial<PersistedSiteBundle>;
  try {
    parsed = JSON.parse(raw2) as Partial<PersistedSiteBundle>;
  } catch (e) {
    console.warn(
      "[persist-site] resume-site-bundle-v2 JSON 无效，将尝试 v1 迁移或回退默认内容",
      e,
    );
    return null;
  }
  if (
    parsed?.version === 2 &&
    parsed.profile &&
    parsed.site &&
    isSiteContent(parsed.site)
  ) {
    return {
      version: 2,
      profile: {
        name: String(parsed.profile.name),
        tagline: String(parsed.profile.tagline),
        setupDismissed: Boolean(parsed.profile.setupDismissed),
      },
      site: parsed.site as SiteContent,
    };
  }
  return null;
}

function loadV1Bundle(): PersistedSiteBundle | null {
  const raw1 = window.localStorage.getItem(STORAGE_KEY_V1);
  if (!raw1) return null;
  let p: Partial<PersistedProfile>;
  try {
    p = JSON.parse(raw1) as Partial<PersistedProfile>;
  } catch (e) {
    console.warn("[persist-site] resume-site-profile-v1 JSON 无效", e);
    return null;
  }
  if (typeof p.name === "string" && typeof p.tagline === "string") {
    const profile: PersistedProfile = {
      name: p.name,
      tagline: p.tagline,
      setupDismissed: Boolean(p.setupDismissed),
    };
    const site = cloneSite();
    site.name = profile.name.trim() || site.name;
    site.tagline = profile.tagline.trim() || site.tagline;
    const bundle: PersistedSiteBundle = { version: 2, profile, site };
    savePersistedBundle(bundle);
    window.localStorage.removeItem(STORAGE_KEY_V1);
    return bundle;
  }
  return null;
}

export function loadPersistedBundle(): PersistedSiteBundle | null {
  if (typeof window === "undefined") return null;
  try {
    const v2 = loadV2Bundle();
    if (v2) return v2;
    return loadV1Bundle();
  } catch (e) {
    console.warn("[persist-site] 读取本地快照失败", e);
    return null;
  }
}

/** 写入本机前打上时间戳（用于与服务器发布版比对） */
export function stampBundleForSave(
  bundle: PersistedSiteBundle,
): PersistedSiteBundle {
  return {
    ...bundle,
    savedAt: Date.now(),
    site: {
      ...bundle.site,
      heroPortraitSrc: bundle.site.heroPortraitSrc ?? "",
    },
  };
}

export function savePersistedBundle(bundle: PersistedSiteBundle): boolean {
  if (typeof window === "undefined") return true;
  try {
    const stored = stampBundleForSave(bundle);
    window.localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(stored));
    return true;
  } catch (e) {
    console.warn("[persist-site] 写入 localStorage 失败", e);
    return false;
  }
}

export function mergeInitialSite(bundle: PersistedSiteBundle | null): SiteContent {
  if (!bundle) return normalizeSiteContentAssetUrls(cloneSite());
  try {
  const base = cloneSite();
  const s = bundle.site;
  const heroPortraitSrc =
    "heroPortraitSrc" in s
      ? s.heroPortraitSrc && String(s.heroPortraitSrc).trim().length > 0
        ? String(s.heroPortraitSrc).trim()
        : undefined
      : base.heroPortraitSrc;
  const heroCopy =
    s.heroCopy && typeof s.heroCopy === "object"
      ? { ...base.heroCopy, ...(s.heroCopy as SiteContent["heroCopy"]) }
      : base.heroCopy;
  const resumeCopy =
    s.resumeCopy && typeof s.resumeCopy === "object"
      ? { ...base.resumeCopy, ...(s.resumeCopy as SiteContent["resumeCopy"]) }
      : base.resumeCopy;
  const portfolioCopy =
    s.portfolioCopy && typeof s.portfolioCopy === "object"
      ? {
          ...base.portfolioCopy,
          ...(s.portfolioCopy as SiteContent["portfolioCopy"]),
        }
      : base.portfolioCopy;

  const rawLines = (s as SiteContent).heroPreviewLines;
  let heroPreviewLines: string[] = Array.isArray(rawLines)
    ? rawLines
        .slice(0, 3)
        .map((line) => String(line ?? "").trim())
    : [...base.heroPreviewLines];
  while (heroPreviewLines.length < 3) heroPreviewLines.push("");
  const heroPreviewLines3 = heroPreviewLines.slice(0, 3);

  const targetRole =
    typeof (s as SiteContent).targetRole === "string" &&
    (s as SiteContent).targetRole.trim().length > 0
      ? (s as SiteContent).targetRole.trim()
      : base.targetRole;

  const contactEmailRaw = (s as SiteContent).contactEmail;
  const contactEmail =
    typeof contactEmailRaw === "string"
      ? contactEmailRaw.trim() || undefined
      : base.contactEmail;

  const contactExtraRaw = (s as SiteContent).contactExtra;
  const contactExtra =
    typeof contactExtraRaw === "string"
      ? contactExtraRaw.trim() || undefined
      : base.contactExtra;

  const rawBgSrc = (s as SiteContent).pageBackgroundImageSrc;
  let pageBackgroundImageSrc: SiteContent["pageBackgroundImageSrc"];
  if (!("pageBackgroundImageSrc" in s)) {
    pageBackgroundImageSrc = base.pageBackgroundImageSrc;
  } else if (typeof rawBgSrc === "string" && rawBgSrc.trim().length > 0) {
    const trimmed = rawBgSrc.trim();
    pageBackgroundImageSrc =
      normalizeDevAssetUrl(trimmed) ?? trimmed;
  } else {
    pageBackgroundImageSrc = undefined;
  }

  const rawBgOp = (s as SiteContent).pageBackgroundImageOpacity;
  const pageBackgroundImageOpacity =
    typeof rawBgOp === "number" && Number.isFinite(rawBgOp)
      ? Math.min(1, Math.max(0, rawBgOp))
      : base.pageBackgroundImageOpacity;

  const merged: SiteContent = {
    ...base,
    ...s,
    heroPortraitSrc,
    heroCopy,
    resumeCopy,
    portfolioCopy,
    targetRole,
    heroPreviewLines: heroPreviewLines3,
    contactEmail,
    contactExtra,
    name: s.name?.trim() || base.name,
    tagline: s.tagline?.trim() || base.tagline,
    experience:
      Array.isArray(s.experience) && s.experience.length > 0
        ? s.experience.map((item, i) =>
            migrateExperienceItem(
              item,
              base.experience[i] ??
                base.experience[0] ??
                defaultSiteContent.experience[0],
            ),
          )
        : base.experience,
    education:
      Array.isArray(s.education) && s.education.length > 0
        ? s.education.map((item, i) =>
            normalizeEducationItem(
              item,
              base.education[i] ??
                base.education[0] ??
                defaultSiteContent.education[0],
            ),
          )
        : base.education,
    projects:
      Array.isArray(s.projects) && s.projects.length > 0
        ? s.projects.map((item, i) =>
            normalizePortfolioProject(
              item,
              base.projects[i] ??
                base.projects[0] ??
                defaultSiteContent.projects[0],
            ),
          )
        : base.projects,
    pageBackgroundImageSrc,
    pageBackgroundImageOpacity,
  };
  return normalizeSiteContentAssetUrls(merged);
  } catch (e) {
    console.warn("[persist-site] 合并本地快照失败，已回退默认内容", e);
    return normalizeSiteContentAssetUrls(cloneSite());
  }
}

export function buildBundleFromState(
  profile: PersistedProfile,
  site: SiteContent,
): PersistedSiteBundle {
  return { version: 2, profile, site };
}
