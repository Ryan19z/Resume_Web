import { sanitizeResumeId } from "@/lib/resume-scope";

/** 正式站点域名（分享链接、EditURL / ViewURL 均使用此外网地址） */
const DEFAULT_PUBLIC_ORIGIN = "https://linkola.cn";

function normalizeOrigin(raw: string | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    return u.origin;
  } catch {
    return null;
  }
}

/** 读取配置的正式站点 origin，默认 linkola.cn */
export function getPublicSiteOrigin(): string {
  return (
    normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL) ??
    normalizeOrigin(process.env.SITE_PUBLIC_URL) ??
    DEFAULT_PUBLIC_ORIGIN
  );
}

export function isLocalDevHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h.endsWith(".localhost");
}

/** URL 是否指向独立客户空间（带 resumeId） */
export function hasScopedResumeInUrl(href: string): boolean {
  try {
    return !!sanitizeResumeId(new URL(href).searchParams.get("resumeId"));
  } catch {
    return false;
  }
}

/**
 * 本地调试时，将 localhost 链接替换为正式域名，保留路径与 query。
 * 仅当 URL 含 resumeId 时才转换——避免裸 linkola.cn 指向站长全局站点（含个人草稿）。
 */
export function toPublicPageUrl(href: string): string {
  if (!href) return href;
  try {
    const u = new URL(href);
    if (!isLocalDevHost(u.hostname)) return href;
    if (!hasScopedResumeInUrl(href)) return href;
    const pub = new URL(getPublicSiteOrigin());
    u.protocol = pub.protocol;
    u.hostname = pub.hostname;
    u.port = pub.port;
    return u.toString();
  } catch {
    return href;
  }
}

/** 按 resume 空间参数拼装 EditURL / ViewURL */
export function buildResumeSpaceUrls(scope: {
  resumeId: string;
  editToken: string;
  viewToken: string;
}): { editUrl: string; viewUrl: string } {
  const origin = getPublicSiteOrigin();
  const editUrl = `${origin}/?resumeId=${encodeURIComponent(scope.resumeId)}&editToken=${encodeURIComponent(scope.editToken)}&viewToken=${encodeURIComponent(scope.viewToken)}`;
  const viewUrl = `${origin}/?resumeId=${encodeURIComponent(scope.resumeId)}&viewToken=${encodeURIComponent(scope.viewToken)}`;
  return { editUrl, viewUrl };
}
