/** 推流 / 对比演示用固定 resume 空间（链接长期有效，可重复 seed 刷新内容） */
export const DEMO_RESUME_ID = "r_demo_classic001";

/** 固定令牌：便于写入仓库并在部署后同步，viewToken 会出现在分享链接中 */
export const DEMO_EDIT_TOKEN = "demo_edit_classic_20260626";
export const DEMO_VIEW_TOKEN = "demo_view_classic_20260626";

export const DEMO_PROD_ORIGIN = "https://linkola.cn";

export function buildDemoViewUrl(origin: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/?resumeId=${encodeURIComponent(DEMO_RESUME_ID)}&viewToken=${encodeURIComponent(DEMO_VIEW_TOKEN)}`;
}

export function buildDemoEditUrl(origin: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/?resumeId=${encodeURIComponent(DEMO_RESUME_ID)}&editToken=${encodeURIComponent(DEMO_EDIT_TOKEN)}&viewToken=${encodeURIComponent(DEMO_VIEW_TOKEN)}`;
}
