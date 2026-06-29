import {
  appendResumeScopeToPath,
  type ResumeScope,
} from "@/lib/resume-scope";
import type {
  EducationItem,
  ExperienceItem,
  RepresentativeProject,
  SiteContent,
} from "@/lib/types";

const UPLOAD_ASSET_PATH = "/api/upload-asset/file/";

export function isManagedUploadAssetUrl(url: string | undefined): boolean {
  if (!url) return false;
  const t = url.trim();
  if (!t) return false;
  if (t.startsWith(UPLOAD_ASSET_PATH)) return true;
  try {
    const u = new URL(t, "http://local");
    return u.pathname.startsWith(UPLOAD_ASSET_PATH);
  } catch {
    return false;
  }
}

export function appendScopeToUploadAssetUrl(
  url: string | undefined,
  scope: ResumeScope,
): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!trimmed || !scope.resumeId || !isManagedUploadAssetUrl(trimmed)) {
    return trimmed || undefined;
  }
  const pathOnly = trimmed.split("?")[0] ?? trimmed;
  return appendResumeScopeToPath(pathOnly, scope, {
    includeEditToken: true,
    includeViewToken: true,
  });
}

export function stripScopeFromUploadAssetUrl(
  url: string | undefined,
): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!trimmed || !isManagedUploadAssetUrl(trimmed)) {
    return trimmed || undefined;
  }
  const pathOnly = trimmed.split("?")[0] ?? trimmed;
  return pathOnly || undefined;
}

function scopeRepProject(
  project: RepresentativeProject,
  scope: ResumeScope,
): RepresentativeProject {
  const media = project.media;
  if (
    media.kind === "image" ||
    media.kind === "video" ||
    media.kind === "link" ||
    media.kind === "document"
  ) {
    return {
      ...project,
      media: {
        ...media,
        url: appendScopeToUploadAssetUrl(media.url, scope) ?? media.url,
      },
    };
  }
  return project;
}

function scopeExperience(
  item: ExperienceItem,
  scope: ResumeScope,
): ExperienceItem {
  const rep = item.representativeProjects?.map((p) => scopeRepProject(p, scope));
  if (!rep) return item;
  return { ...item, representativeProjects: rep };
}

export function applyResumeScopeToSiteAssets(
  site: SiteContent,
  scope: ResumeScope,
): SiteContent {
  if (!scope.resumeId) return site;

  const heroContactQrSrc = appendScopeToUploadAssetUrl(
    site.heroContactQrSrc,
    scope,
  );
  const heroContactQrs = Array.isArray(site.heroContactQrs)
    ? site.heroContactQrs.map((item, i) => ({
        id: item.id || `qr-${i + 1}`,
        src: appendScopeToUploadAssetUrl(item.src, scope) ?? item.src,
        caption: item.caption,
      }))
    : site.heroContactQrs;
  const projects = Array.isArray(site.projects)
    ? site.projects.map((p) => ({
        ...p,
        coverSrc: appendScopeToUploadAssetUrl(p.coverSrc, scope) ?? p.coverSrc,
        posterSrc: appendScopeToUploadAssetUrl(p.posterSrc, scope) ?? p.posterSrc,
      }))
    : site.projects;
  const experience = Array.isArray(site.experience)
    ? site.experience.map((e) => scopeExperience(e, scope))
    : site.experience;
  const projectExperience = Array.isArray(site.projectExperience)
    ? site.projectExperience.map((e) => scopeExperience(e, scope))
    : site.projectExperience;
  const education = Array.isArray(site.education)
    ? site.education.map((e) => scopeEducation(e, scope))
    : site.education;
  const heroSpotlight = (() => {
    const hs = site.heroSpotlight;
    if (!hs) return hs;
    const media =
      hs.media.kind === "gallery"
        ? {
            ...hs.media,
            urls: hs.media.urls.map(
              (u) => appendScopeToUploadAssetUrl(u, scope) ?? u,
            ),
          }
        : "url" in hs.media
          ? {
              ...hs.media,
              url: appendScopeToUploadAssetUrl(hs.media.url, scope) ?? hs.media.url,
            }
          : hs.media;
    const mediaLinks = hs.mediaLinks
      ? {
          image:
            appendScopeToUploadAssetUrl(hs.mediaLinks.image, scope) ??
            hs.mediaLinks.image,
          gallery: hs.mediaLinks.gallery?.map(
            (u) => appendScopeToUploadAssetUrl(u, scope) ?? u,
          ),
          video:
            appendScopeToUploadAssetUrl(hs.mediaLinks.video, scope) ??
            hs.mediaLinks.video,
          link: hs.mediaLinks.link,
          document:
            appendScopeToUploadAssetUrl(hs.mediaLinks.document, scope) ??
            hs.mediaLinks.document,
        }
      : hs.mediaLinks;
    return { ...hs, media, mediaLinks };
  })();
  const pageBackground = site.pageBackground
    ? {
        ...site.pageBackground,
        ...(site.pageBackground.kind === "image" && site.pageBackground.imageUrl
          ? {
              imageUrl:
                appendScopeToUploadAssetUrl(
                  site.pageBackground.imageUrl,
                  scope,
                ) ?? site.pageBackground.imageUrl,
            }
          : {}),
      }
    : site.pageBackground;
  const heroPortrait = site.heroPortrait
    ? {
        ...site.heroPortrait,
        url:
          appendScopeToUploadAssetUrl(site.heroPortrait.url, scope) ??
          site.heroPortrait.url,
      }
    : site.heroPortrait;

  return {
    ...site,
    heroContactQrs,
    heroContactQrSrc,
    heroSpotlight,
    pageBackground,
    heroPortrait,
    projects,
    experience,
    projectExperience,
    education,
  };
}

function stripEducation(item: EducationItem): EducationItem {
  const rep = item.representativeProjects?.map((p) => scopeRepProjectStrip(p));
  if (!rep) return item;
  return { ...item, representativeProjects: rep };
}

function scopeRepProjectStrip(
  project: RepresentativeProject,
): RepresentativeProject {
  const media = project.media;
  if (
    media.kind === "image" ||
    media.kind === "video" ||
    media.kind === "link" ||
    media.kind === "document"
  ) {
    return {
      ...project,
      media: {
        ...media,
        url: stripScopeFromUploadAssetUrl(media.url) ?? media.url,
      },
    };
  }
  return project;
}

function scopeExperienceStrip(item: ExperienceItem): ExperienceItem {
  const rep = item.representativeProjects?.map((p) => scopeRepProjectStrip(p));
  if (!rep) return item;
  return { ...item, representativeProjects: rep };
}

function scopeEducation(item: EducationItem, scope: ResumeScope): EducationItem {
  const rep = item.representativeProjects?.map((p) => scopeRepProject(p, scope));
  if (!rep) return item;
  return { ...item, representativeProjects: rep };
}

export function stripResumeScopeFromSiteAssets(site: SiteContent): SiteContent {
  const heroContactQrSrc = stripScopeFromUploadAssetUrl(site.heroContactQrSrc);
  const heroContactQrs = Array.isArray(site.heroContactQrs)
    ? site.heroContactQrs.map((item, i) => ({
        id: item.id || `qr-${i + 1}`,
        src: stripScopeFromUploadAssetUrl(item.src) ?? item.src,
        caption: item.caption,
      }))
    : site.heroContactQrs;
  const projects = Array.isArray(site.projects)
    ? site.projects.map((p) => ({
        ...p,
        coverSrc: stripScopeFromUploadAssetUrl(p.coverSrc) ?? p.coverSrc,
        posterSrc: stripScopeFromUploadAssetUrl(p.posterSrc) ?? p.posterSrc,
      }))
    : site.projects;
  const experience = Array.isArray(site.experience)
    ? site.experience.map((e) => scopeExperienceStrip(e))
    : site.experience;
  const projectExperience = Array.isArray(site.projectExperience)
    ? site.projectExperience.map((e) => scopeExperienceStrip(e))
    : site.projectExperience;
  const education = Array.isArray(site.education)
    ? site.education.map((e) => stripEducation(e))
    : site.education;
  const heroSpotlight = (() => {
    const hs = site.heroSpotlight;
    if (!hs) return hs;
    const media =
      hs.media.kind === "gallery"
        ? {
            ...hs.media,
            urls: hs.media.urls.map(
              (u) => stripScopeFromUploadAssetUrl(u) ?? u,
            ),
          }
        : "url" in hs.media
          ? {
              ...hs.media,
              url: stripScopeFromUploadAssetUrl(hs.media.url) ?? hs.media.url,
            }
          : hs.media;
    const mediaLinks = hs.mediaLinks
      ? {
          image:
            stripScopeFromUploadAssetUrl(hs.mediaLinks.image) ??
            hs.mediaLinks.image,
          gallery: hs.mediaLinks.gallery?.map(
            (u) => stripScopeFromUploadAssetUrl(u) ?? u,
          ),
          video:
            stripScopeFromUploadAssetUrl(hs.mediaLinks.video) ??
            hs.mediaLinks.video,
          link: hs.mediaLinks.link,
          document:
            stripScopeFromUploadAssetUrl(hs.mediaLinks.document) ??
            hs.mediaLinks.document,
        }
      : hs.mediaLinks;
    return { ...hs, media, mediaLinks };
  })();
  const pageBackground = site.pageBackground
    ? {
        ...site.pageBackground,
        ...(site.pageBackground.kind === "image" && site.pageBackground.imageUrl
          ? {
              imageUrl:
                stripScopeFromUploadAssetUrl(site.pageBackground.imageUrl) ??
                site.pageBackground.imageUrl,
            }
          : {}),
      }
    : site.pageBackground;
  const heroPortrait = site.heroPortrait
    ? {
        ...site.heroPortrait,
        url:
          stripScopeFromUploadAssetUrl(site.heroPortrait.url) ??
          site.heroPortrait.url,
      }
    : site.heroPortrait;

  return {
    ...site,
    heroContactQrs,
    heroContactQrSrc,
    heroSpotlight,
    pageBackground,
    heroPortrait,
    projects,
    experience,
    projectExperience,
    education,
  };
}
