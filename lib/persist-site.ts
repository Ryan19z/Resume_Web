import { defaultSiteContent } from "./default-site-content";
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
  RepresentativeProject,
  SiteContent,
} from "./types";
const STORAGE_KEY_V2 = "resume-site-bundle-v2";
const STORAGE_KEY_V1 = "resume-site-profile-v1";

function cloneSite(): SiteContent {
  return structuredClone(defaultSiteContent);
}

function migrateExperienceItem(
  raw: unknown,
  fallback: ExperienceItem,
): ExperienceItem {
  if (!raw || typeof raw !== "object") return fallback;
  const e = raw as Record<string, unknown>;
  if (Array.isArray(e.keyResults) && Array.isArray(e.representativeProjects)) {
    return e as ExperienceItem;
  }
  const achievements = e.achievements as AchievementBlock[] | undefined;
  if (achievements?.length) {
    const keyResults =
      achievements[0]?.bullets?.length ? achievements[0].bullets : fallback.keyResults;
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

function normalizeEducationItem(
  raw: unknown,
  fallback: EducationItem,
): EducationItem {
  if (!raw || typeof raw !== "object") return fallback;
  const e = raw as Record<string, unknown>;
  const campusHighlights = Array.isArray(e.campusHighlights)
    ? (e.campusHighlights as AchievementBlock[])
    : fallback.campusHighlights;
  const representativeProjects = Array.isArray(e.representativeProjects)
    ? (e.representativeProjects as RepresentativeProject[])
    : fallback.representativeProjects;
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

export function loadPersistedBundle(): PersistedSiteBundle | null {
  if (typeof window === "undefined") return null;
  try {
    const raw2 = window.localStorage.getItem(STORAGE_KEY_V2);
    if (raw2) {
      const parsed = JSON.parse(raw2) as Partial<PersistedSiteBundle>;
      if (parsed?.version === 2 && parsed.profile && parsed.site && isSiteContent(parsed.site)) {
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
    }
    const raw1 = window.localStorage.getItem(STORAGE_KEY_V1);
    if (raw1) {
      const p = JSON.parse(raw1) as Partial<PersistedProfile>;
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
    }
  } catch {
    return null;
  }
  return null;
}

export function savePersistedBundle(bundle: PersistedSiteBundle): void {
  if (typeof window === "undefined") return;
  try {
    const stored: PersistedSiteBundle = {
      ...bundle,
      site: {
        ...bundle.site,
        heroPortraitSrc: bundle.site.heroPortraitSrc ?? "",
      },
    };
    window.localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(stored));
  } catch {
    /* quota */
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
        ? s.projects
        : base.projects,
    pageBackgroundImageSrc,
    pageBackgroundImageOpacity,
  };
  return normalizeSiteContentAssetUrls(merged);
  } catch {
    return normalizeSiteContentAssetUrls(cloneSite());
  }
}

export function buildBundleFromState(
  profile: PersistedProfile,
  site: SiteContent,
): PersistedSiteBundle {
  return { version: 2, profile, site };
}
