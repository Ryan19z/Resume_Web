import type {
  EducationItem,
  ExperienceItem,
  RepresentativeProject,
  SiteContent,
} from "@/lib/types";

/**
 * 将保存到 localStorage 的绝对地址（如 http://localhost:3000/...）转为同一路径，
 * 以便通过 trycloudflare 等隧道访问时仍从当前域名加载图片。
 */
export function normalizeDevAssetUrl(
  url: string | undefined,
): string | undefined {
  if (url == null) return undefined;
  const t = String(url).trim();
  if (!t) return undefined;
  if (t.startsWith("/") && !t.startsWith("//")) return t;
  try {
    const u = new URL(t);
    if (u.protocol !== "http:" && u.protocol !== "https:") return t;
    const h = u.hostname.toLowerCase();
    if (
      h === "localhost" ||
      h === "127.0.0.1" ||
      h === "[::1]" ||
      h.endsWith(".localhost")
    ) {
      const path = `${u.pathname}${u.search}${u.hash}`;
      return path.startsWith("/") ? path : `/${path}`;
    }
  } catch {
    return t;
  }
  return t;
}

function normalizeRepProject(p: RepresentativeProject): RepresentativeProject {
  const media = p.media;
  if (media.kind === "image" || media.kind === "video") {
    const url = normalizeDevAssetUrl(media.url) ?? media.url;
    return { ...p, media: { ...media, url } };
  }
  return p;
}

function normalizeExperience(e: ExperienceItem): ExperienceItem {
  const rep = e.representativeProjects?.map(normalizeRepProject);
  if (!rep) return e;
  return { ...e, representativeProjects: rep };
}

function normalizeEducation(e: EducationItem): EducationItem {
  const rep = e.representativeProjects?.map(normalizeRepProject);
  if (!rep) return e;
  return { ...e, representativeProjects: rep };
}

export function normalizeSiteContentAssetUrls(site: SiteContent): SiteContent {
  /** 避免异常/残缺快照导致 .map 抛错进而拖垮整页渲染 */
  if (
    !Array.isArray(site.projects) ||
    !Array.isArray(site.experience) ||
    !Array.isArray(site.education)
  ) {
    return site;
  }

  const heroPortraitSrc =
    normalizeDevAssetUrl(site.heroPortraitSrc) ?? site.heroPortraitSrc;
  const pageBackgroundImageSrcRaw = String(
    site.pageBackgroundImageSrc ?? "",
  ).trim();
  const pageBackgroundImageSrc =
    pageBackgroundImageSrcRaw.length > 0
      ? (normalizeDevAssetUrl(pageBackgroundImageSrcRaw) ??
        pageBackgroundImageSrcRaw)
      : undefined;
  const projects = site.projects.map((p) => ({
    ...p,
    coverSrc: normalizeDevAssetUrl(p.coverSrc) ?? p.coverSrc,
    posterSrc: normalizeDevAssetUrl(p.posterSrc) ?? p.posterSrc,
  }));
  const experience = site.experience.map(normalizeExperience);
  const education = site.education.map(normalizeEducation);
  const heroSpotlight = (() => {
    const hs = site.heroSpotlight;
    if (!hs) return hs;
    const media =
      "url" in hs.media
        ? { ...hs.media, url: normalizeDevAssetUrl(hs.media.url) ?? hs.media.url }
        : hs.media;
    const mediaLinks = hs.mediaLinks
      ? {
          image: normalizeDevAssetUrl(hs.mediaLinks.image) ?? hs.mediaLinks.image,
          video: normalizeDevAssetUrl(hs.mediaLinks.video) ?? hs.mediaLinks.video,
          link: normalizeDevAssetUrl(hs.mediaLinks.link) ?? hs.mediaLinks.link,
          document:
            normalizeDevAssetUrl(hs.mediaLinks.document) ?? hs.mediaLinks.document,
        }
      : hs.mediaLinks;
    return { ...hs, media, mediaLinks };
  })();
  return {
    ...site,
    heroPortraitSrc,
    pageBackgroundImageSrc,
    heroSpotlight,
    projects,
    experience,
    education,
  };
}
