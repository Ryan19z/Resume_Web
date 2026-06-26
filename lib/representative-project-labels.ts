import type { RepresentativeProjectMedia } from "@/lib/types";

export function representativeProjectMediaLabel(
  media: RepresentativeProjectMedia,
  locale: "zh" | "en",
): string {
  const zh: Record<RepresentativeProjectMedia["kind"], string> = {
    image: "图片",
    video: "视频",
    code: "代码",
    link: "链接",
    document: "文档",
  };
  const en: Record<RepresentativeProjectMedia["kind"], string> = {
    image: "image",
    video: "video",
    code: "code",
    link: "link",
    document: "document",
  };
  return locale === "zh" ? zh[media.kind] : en[media.kind];
}

export function representativeProjectHasOpenableMedia(
  media: RepresentativeProjectMedia | undefined,
): boolean {
  if (!media) return false;
  if (media.kind === "code") return Boolean(media.code?.trim());
  if ("url" in media) return Boolean(media.url?.trim());
  return false;
}
