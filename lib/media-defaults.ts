/**
 * 默认演示媒体：山水风景占位图使用 Unsplash 固定裁剪参数，匹配首屏竖版与作品/横幅 16:9。
 * 演示视频仍用菜鸟教程示例（国内可直连）。若外链在你网络下较慢，可把图放到 public/ 并改为以 / 开头的路径。
 */
export const DEMO_SAMPLE_VIDEO_MP4 =
  "https://www.runoob.com/try/demo_source/mov_bbb.mp4";

/** 作品卡片「打开链接」占位：国内常用，可自行改为 Behance / 站酷等 */
export const PORTFOLIO_LINK_PLACEHOLDER = "https://www.gitee.com";

/** 首屏形象区约 3:4，请求 800×1000 居中裁剪 */
const LANDSCAPE_PORTRAIT =
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=1000&fit=crop&q=85";

/** 作品封面 / 履历配图约 16:9，统一 960×540 */
const LANDSCAPE_WIDE = [
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=960&h=540&fit=crop&q=85",
  "https://images.unsplash.com/photo-1511884642898-4c92249e20b6?w=960&h=540&fit=crop&q=85",
  "https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=960&h=540&fit=crop&q=85",
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=960&h=540&fit=crop&q=85",
  "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=960&h=540&fit=crop&q=85",
] as const;

export const PLACEHOLDER_IMAGES = {
  heroPortrait: LANDSCAPE_PORTRAIT,
  wide1: LANDSCAPE_WIDE[0],
  wide2: LANDSCAPE_WIDE[1],
  wide3: LANDSCAPE_WIDE[2],
  wide4: LANDSCAPE_WIDE[3],
  wide5: LANDSCAPE_WIDE[4],
} as const;

/** 整页背景默认图（宽幅）；可在「首屏与形象」里替换、调透明度或清除 */
export const PAGE_BACKGROUND_DEFAULT =
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&h=1000&fit=crop&q=80";

export function placeholderWideByIndex(i: number): string {
  const n = Math.abs(i | 0) % LANDSCAPE_WIDE.length;
  return LANDSCAPE_WIDE[n];
}
