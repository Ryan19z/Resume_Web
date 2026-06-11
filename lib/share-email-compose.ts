type ShareEmailLang = "zh" | "en";

const MAX_SHARE_EMAIL_MESSAGE_CHARS = 2000;

export function defaultShareEmailMessage(
  lang: ShareEmailLang,
  siteName?: string,
): string {
  const name = siteName?.trim();
  if (lang === "en") {
    return name
      ? `Hi,\n\nThank you for viewing ${name}'s online resume. The page link is below.`
      : "Hi,\n\nThank you for viewing my online resume. The page link is below.";
  }
  return name
    ? `您好，\n\n感谢查看${name}的在线简历，页面链接见下方。`
    : "您好，\n\n感谢查看我的在线简历，页面链接见下方。";
}

/** 将用户正文与分享链接拼成邮件纯文本（链接始终附在末尾） */
export function composeShareEmailText(
  message: string | undefined,
  link: string,
  lang: ShareEmailLang = "zh",
  siteName?: string,
): string {
  const trimmed = (message ?? "").trim().slice(0, MAX_SHARE_EMAIL_MESSAGE_CHARS);
  const intro =
    trimmed.length > 0
      ? trimmed
      : defaultShareEmailMessage(lang, siteName);
  return `${intro}\n\n${link}\n`;
}

export function normalizeShareEmailMessageInput(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.replace(/\r\n/g, "\n").slice(0, MAX_SHARE_EMAIL_MESSAGE_CHARS);
}
