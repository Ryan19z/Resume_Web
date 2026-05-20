/** 校验可作为作品外链 / 分享链接的 http(s) URL */
export function isReasonableHttpUrl(link: string): boolean {
  const t = link.trim();
  if (!t) return false;
  try {
    const u = new URL(t);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    if (!u.hostname || u.hostname.length < 1) return false;
    if (t.length > 2048) return false;
    return true;
  } catch {
    return false;
  }
}
