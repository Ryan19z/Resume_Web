export type ShareSiteLang = "zh" | "en";

export type ShareLinkOptions = {
  lang: ShareSiteLang;
  lockLang?: boolean;
  /** 公开分享时移除 editToken 等编辑参数 */
  stripEditSecrets?: boolean;
};

export function parseLangFromSearchParams(
  params: URLSearchParams,
): ShareSiteLang | null {
  const raw = params.get("lang");
  return raw === "en" || raw === "zh" ? raw : null;
}

export function isLangSwitchLocked(params: URLSearchParams): boolean {
  return params.get("lockLang") === "1";
}

/** 生成访客分享链接：固定语言，可选锁定语言切换 */
export function buildShareLink(
  href: string,
  options: ShareLinkOptions,
): string {
  if (!href) return "";
  try {
    const u = new URL(href);
    const resumeId = u.searchParams.get("resumeId");
    const viewToken = u.searchParams.get("viewToken");

    const out =
      resumeId && viewToken
        ? (() => {
            const scoped = new URL(u.origin + u.pathname);
            scoped.searchParams.set("resumeId", resumeId);
            scoped.searchParams.set("viewToken", viewToken);
            return scoped;
          })()
        : (() => {
            const plain = new URL(u.origin + u.pathname);
            if (options.stripEditSecrets) {
              plain.searchParams.delete("editToken");
            }
            return plain;
          })();

    out.searchParams.set("lang", options.lang);
    if (options.lockLang) {
      out.searchParams.set("lockLang", "1");
    } else {
      out.searchParams.delete("lockLang");
    }

    if (u.hash) out.hash = u.hash;
    return out.toString();
  } catch {
    return href;
  }
}
