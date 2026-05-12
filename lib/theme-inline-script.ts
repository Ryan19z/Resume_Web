import { SITE_THEME_IDS, THEME_STORAGE_KEY } from "@/lib/site-themes";

/** 内联到根 layout 的 `<body>` 最前，在首帧绘制前执行，避免与 :root 层叠问题及主题闪烁 */
export function themeBootstrapInlineScript(): string {
  const ids = [...SITE_THEME_IDS].map((id) => JSON.stringify(id)).join(",");
  const key = JSON.stringify(THEME_STORAGE_KEY);
  return `(()=>{try{var k=${key};var ok=[${ids}];var t=localStorage.getItem(k);if(t&&ok.indexOf(t)!==-1)document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`;
}
