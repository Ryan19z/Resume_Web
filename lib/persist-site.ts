import { defaultSiteContent } from "./default-site-content";
import { isReasonableHttpUrl } from "./is-reasonable-http-url";
import {
  normalizeSiteContentAssetUrls,
} from "./normalize-site-asset-urls";
import { placeholderWideByIndex } from "./media-defaults";
import { defaultPageBackground, normalizePageBackground } from "./page-background";
import type {
  AchievementBlock,
  EducationItem,
  ExperienceItem,
  HeroSpotlight,
  HeroAsideMode,
  HeroPortrait,
  PersistedProfile,
  PersistedSiteBundle,
  PortfolioProject,
  RepresentativeProject,
  HeroContactQrItem,
  RoleFitEntry,
  SiteContent,
} from "./types";
import type { ResumeScope } from "./resume-scope";

export const PERSIST_SAVE_FAILED_MESSAGE =
  "保存到浏览器失败：内容过大或存储已满。请缩小图片、改用图床链接，或清理本站本地数据后重试。";

export const SERVER_PUBLISH_FAILED_MESSAGE =
  "已保存到本机浏览器，但发布到服务器失败，访客可能看不到最新内容。请检查服务器 data 目录写权限、图片体积，或 Nginx 是否拦截了大请求体。";

const STORAGE_KEY_V2 = "resume-site-bundle-v2";
const STORAGE_KEY_V1 = "resume-site-profile-v1";
type SiteLang = "zh" | "en";

function getStorageKeyV2(lang: SiteLang, scope?: ResumeScope): string {
  const base = lang === "en" ? `${STORAGE_KEY_V2}-en` : STORAGE_KEY_V2;
  return scope?.resumeId ? `${base}-${scope.resumeId}` : base;
}

function getStorageKeyV1(lang: SiteLang, scope?: ResumeScope): string {
  const base = lang === "en" ? `${STORAGE_KEY_V1}-en` : STORAGE_KEY_V1;
  return scope?.resumeId ? `${base}-${scope.resumeId}` : base;
}

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

function normalizeRoleFitEntries(
  raw: unknown,
  fallback: RoleFitEntry[],
): RoleFitEntry[] {
  if (!Array.isArray(raw)) {
    return fallback.map((x) => ({ ...x }));
  }
  if (raw.length === 0) {
    return [];
  }
  const out: RoleFitEntry[] = [];
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const fb = fallback[i] ?? fallback[0];
    const title =
      typeof o.title === "string" && o.title.trim().length > 0
        ? o.title.trim()
        : fb?.title ?? "";
    const fit =
      typeof o.fit === "string" && o.fit.trim().length > 0
        ? o.fit.trim()
        : fb?.fit ?? "";
    const proofRaw = typeof o.proof === "string" ? o.proof.trim() : "";
    if (!title && !fit && !proofRaw) continue;
    out.push({
      id:
        typeof o.id === "string" && o.id.trim().length > 0
          ? o.id
          : `${fb?.id ?? "rf"}-${i + 1}`,
      title,
      fit,
      proof: proofRaw || undefined,
    });
  }
  return out.length > 0 ? out.slice(0, 12) : [];
}

function normalizeHeroContactQrs(
  raw: unknown,
  fallback: HeroContactQrItem[],
): HeroContactQrItem[] {
  if (!Array.isArray(raw)) return fallback.map((x) => ({ ...x }));
  const out: HeroContactQrItem[] = [];
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const src = typeof o.src === "string" ? o.src.trim() : "";
    const caption = typeof o.caption === "string" ? o.caption.trim() : "";
    if (!src && !caption) continue;
    out.push({
      id:
        typeof o.id === "string" && o.id.trim().length > 0
          ? o.id.trim()
          : `qr-${i + 1}`,
      src,
      caption: caption || undefined,
    });
  }
  return out.slice(0, 8);
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
    } else if (kind === "link" && typeof m.url === "string") {
      normalizedMedia = { kind: "link", url: m.url };
    } else if (kind === "document" && typeof m.url === "string") {
      normalizedMedia = {
        kind: "document",
        url: m.url,
        fileName: typeof m.fileName === "string" ? m.fileName : undefined,
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

function normalizeHeroSpotlight(
  raw: unknown,
  fallback: HeroSpotlight,
): HeroSpotlight {
  if (!raw || typeof raw !== "object") return fallback;
  const o = raw as Record<string, unknown>;
  const title =
    typeof o.title === "string" && o.title.trim().length > 0
      ? o.title.trim()
      : fallback.title;
  const summary =
    typeof o.summary === "string" && o.summary.trim().length > 0
      ? o.summary.trim()
      : fallback.summary;
  const mediaRaw = o.media;
  const linksRaw = o.mediaLinks;
  const linksObj =
    linksRaw && typeof linksRaw === "object"
      ? (linksRaw as Record<string, unknown>)
      : null;
  const normalizeLink = (v: unknown): string | undefined =>
    typeof v === "string" ? v.trim() : undefined;
  const normalizeGallery = (v: unknown): string[] | undefined => {
    if (!Array.isArray(v)) return undefined;
    const urls = v
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
    return urls.length > 0 ? urls : undefined;
  };
  const mediaLinks: HeroSpotlight["mediaLinks"] =
    linksObj
      ? {
          image: normalizeLink(linksObj.image),
          gallery: normalizeGallery(linksObj.gallery),
          video: normalizeLink(linksObj.video),
          link: normalizeLink(linksObj.link),
          document: normalizeLink(linksObj.document),
        }
      : undefined;
  const documentName =
    typeof o.documentName === "string" && o.documentName.trim().length > 0
      ? o.documentName.trim()
      : undefined;

  if (!mediaRaw || typeof mediaRaw !== "object") {
    return {
      title,
      summary,
      media: { kind: "image", url: "" },
      mediaLinks,
      documentName,
    };
  }
  const m = mediaRaw as Record<string, unknown>;
  const kind = m.kind;
  if (kind === "image" || kind === "video" || kind === "link") {
    const url = typeof m.url === "string" ? m.url.trim() : "";
    if (url.length > 0) {
      return { title, summary, media: { kind, url }, mediaLinks, documentName };
    }
  }
  if (kind === "gallery") {
    const urlsRaw = m.urls;
    const urls = Array.isArray(urlsRaw)
      ? urlsRaw
          .map((item) => (typeof item === "string" ? item.trim() : ""))
          .filter(Boolean)
      : [];
    if (urls.length > 0) {
      return {
        title,
        summary,
        media: { kind: "gallery", urls },
        mediaLinks,
        documentName,
      };
    }
  }
  if (kind === "document") {
    const url = typeof m.url === "string" ? m.url.trim() : "";
    if (url.length > 0) {
      const fileName =
        typeof m.fileName === "string" && m.fileName.trim().length > 0
          ? m.fileName.trim()
          : documentName;
      return {
        title,
        summary,
        media: {
          kind: "document",
          url,
          fileName,
        },
        mediaLinks,
        documentName: fileName,
      };
    }
  }
  if (kind === "code") {
    const code = typeof m.code === "string" ? m.code : "";
    if (code.trim().length > 0) {
      return {
        title,
        summary,
        media: {
          kind: "code",
          code,
          language: typeof m.language === "string" ? m.language : undefined,
        },
        mediaLinks,
        documentName,
      };
    }
  }
  return {
    title,
    summary,
    media: { kind: "image", url: "" },
    mediaLinks,
    documentName,
  };
}

function normalizeHeroAsideMode(raw: unknown, fallback: HeroAsideMode): HeroAsideMode {
  return raw === "portrait" || raw === "hidden" ? raw : fallback;
}

function normalizeHeroPortrait(raw: unknown, fallback: HeroPortrait): HeroPortrait {
  if (!raw || typeof raw !== "object") return fallback;
  const o = raw as Record<string, unknown>;
  const url = typeof o.url === "string" ? o.url.trim() : fallback.url;
  const captionRaw = o.caption;
  const caption =
    typeof captionRaw === "string" ? captionRaw.trim() || undefined : fallback.caption;
  return { url, caption };
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

function loadV2Bundle(lang: SiteLang, scope?: ResumeScope): PersistedSiteBundle | null {
  const raw2 = window.localStorage.getItem(getStorageKeyV2(lang, scope));
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

function loadV1Bundle(lang: SiteLang, scope?: ResumeScope): PersistedSiteBundle | null {
  const raw1 = window.localStorage.getItem(getStorageKeyV1(lang, scope));
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
    savePersistedBundle(bundle, lang, scope);
    window.localStorage.removeItem(getStorageKeyV1(lang, scope));
    return bundle;
  }
  return null;
}

export function loadPersistedBundle(
  lang: SiteLang = "zh",
  scope?: ResumeScope,
): PersistedSiteBundle | null {
  if (typeof window === "undefined") return null;
  try {
    const v2 = loadV2Bundle(lang, scope);
    if (v2) return v2;
    return loadV1Bundle(lang, scope);
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
    site: { ...bundle.site },
  };
}

export function savePersistedBundle(
  bundle: PersistedSiteBundle,
  lang: SiteLang = "zh",
  scope?: ResumeScope,
): boolean {
  if (typeof window === "undefined") return true;
  try {
    const stored = stampBundleForSave(bundle);
    window.localStorage.setItem(getStorageKeyV2(lang, scope), JSON.stringify(stored));
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
  const heroSpotlight = normalizeHeroSpotlight(
    (s as SiteContent).heroSpotlight,
    base.heroSpotlight,
  );

  const rawLines = (s as SiteContent).heroPreviewLines;
  const heroPreviewLines: string[] = Array.isArray(rawLines)
    ? rawLines
        .map((line) => String(line ?? "").trim())
        .filter(Boolean)
        .slice(0, 10)
    : [...base.heroPreviewLines];
  const normalizedHeroPreviewLines = heroPreviewLines;

  const rawSkills = (s as SiteContent).transferableSkills;
  const transferableSkills = Array.isArray(rawSkills)
    ? rawSkills.map((x) => String(x ?? "").trim()).filter(Boolean).slice(0, 12)
    : Array.isArray(base.transferableSkills)
      ? [...base.transferableSkills]
      : [];
  const roleFitEntries = normalizeRoleFitEntries(
    (s as SiteContent).roleFitEntries,
    base.roleFitEntries ?? [],
  );

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

  const contactPhoneRaw = (s as SiteContent).contactPhone;
  const contactPhone =
    typeof contactPhoneRaw === "string"
      ? contactPhoneRaw.trim() || undefined
      : base.contactPhone;

  const contactExtraRaw = (s as SiteContent).contactExtra;
  const contactExtra =
    typeof contactExtraRaw === "string"
      ? contactExtraRaw.trim() || undefined
      : base.contactExtra;

  const heroContactQrsRaw = (s as SiteContent).heroContactQrs;
  const heroContactQrsFromLegacy =
    typeof (s as SiteContent).heroContactQrSrc === "string" ||
    typeof (s as SiteContent).heroContactQrCaption === "string"
      ? [
          {
            id: "qr-legacy-1",
            src: String((s as SiteContent).heroContactQrSrc ?? "").trim(),
            caption: String((s as SiteContent).heroContactQrCaption ?? "").trim() || undefined,
          },
        ]
      : [];
  const heroContactQrsNormalized = normalizeHeroContactQrs(
    heroContactQrsRaw,
    Array.isArray(base.heroContactQrs) ? base.heroContactQrs : [],
  );
  const heroContactQrs =
    heroContactQrsNormalized.length > 0
      ? heroContactQrsNormalized
      : normalizeHeroContactQrs(heroContactQrsFromLegacy, []);

  const heroContactQrSrcRaw = (s as SiteContent).heroContactQrSrc;
  const heroContactQrSrc =
    typeof heroContactQrSrcRaw === "string"
      ? heroContactQrSrcRaw.trim() || undefined
      : base.heroContactQrSrc;

  const heroContactQrCaptionRaw = (s as SiteContent).heroContactQrCaption;
  const heroContactQrCaption =
    typeof heroContactQrCaptionRaw === "string"
      ? heroContactQrCaptionRaw.trim() || undefined
      : base.heroContactQrCaption;

  const pageBackground = normalizePageBackground(
    (s as SiteContent).pageBackground,
    base.pageBackground ?? defaultPageBackground,
  );

  const heroAsideMode = normalizeHeroAsideMode(
    (s as SiteContent).heroAsideMode,
    base.heroAsideMode ?? "showcase",
  );
  const heroPortrait = normalizeHeroPortrait(
    (s as SiteContent).heroPortrait,
    base.heroPortrait ?? { url: "", caption: "" },
  );

  const merged: SiteContent = {
    ...base,
    ...s,
    heroCopy,
    heroSpotlight,
    heroAsideMode,
    heroPortrait,
    pageBackground,
    resumeCopy,
    portfolioCopy,
    targetRole,
    heroPreviewLines: normalizedHeroPreviewLines,
    transferableSkills,
    roleFitEntries,
    contactEmail,
    contactPhone,
    contactExtra,
    heroContactQrs,
    heroContactQrSrc,
    heroContactQrCaption,
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
    projectExperience:
      Array.isArray(s.projectExperience)
        ? s.projectExperience.map((item, i) =>
            migrateExperienceItem(
              item,
              base.projectExperience[i] ??
                defaultSiteContent.experience[0],
            ),
          )
        : base.projectExperience ?? defaultSiteContent.projectExperience,
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

/** 新客户独立链接的空白模板（示例邮箱/电话，勿用站长个人信息） */
export function buildNewCustomerDefaultBundle(
  savedAt = Date.now(),
): PersistedSiteBundle {
  const profile: PersistedProfile = {
    name: defaultSiteContent.name,
    tagline: defaultSiteContent.tagline,
    setupDismissed: false,
  };
  const site = mergeInitialSite({
    version: 2,
    profile,
    site: cloneSite(),
    savedAt,
  });
  return {
    version: 2,
    profile,
    site,
    savedAt,
  };
}
