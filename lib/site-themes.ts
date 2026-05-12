/** 与 `globals.css` 中 `[data-theme]` 一一对应 */
export const SITE_THEME_IDS = [
  "paper",
  "ink",
  "warm",
  "editorial",
  "ocean",
] as const;

export type SiteThemeId = (typeof SITE_THEME_IDS)[number];

export const SITE_THEMES: ReadonlyArray<{
  id: SiteThemeId;
  label: string;
  hint: string;
}> = [
  { id: "paper", label: "纸白", hint: "默认 · 干净中性" },
  { id: "ink", label: "墨色", hint: "深色 · 适合夜间阅读" },
  { id: "warm", label: "暖沙", hint: "偏暖 · 亲和柔和" },
  { id: "editorial", label: "编辑", hint: "米灰纸感 · 偏杂志排版" },
  { id: "ocean", label: "海雾", hint: "冷灰蓝 · 偏理性冷静" },
];

export const THEME_STORAGE_KEY = "resume-site-theme-v1";

export function isSiteThemeId(x: string | null | undefined): x is SiteThemeId {
  return Boolean(x && (SITE_THEME_IDS as readonly string[]).includes(x));
}
