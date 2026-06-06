import type { PageBackgroundKind, PageBackgroundSettings } from "@/lib/types";

/** 根据「明显度」计算纸面遮罩不透明度（越大背景图越清晰） */
export function imageOverlayOpacity(strength: number): number {
  const s = Math.min(100, Math.max(5, strength));
  return Math.max(0.28, Math.min(0.82, 0.82 - (s / 100) * 0.54));
}

export function pageBackgroundKindLabel(
  kind: PageBackgroundKind | undefined,
  locale: "zh" | "en" = "zh",
): string {
  if (kind === "image") return locale === "zh" ? "自定义图片" : "Custom image";
  if (kind === "mesh") return locale === "zh" ? "轻柔流光" : "Soft gradient";
  return locale === "zh" ? "纯色纸面" : "Solid paper";
}

export function summarizePageBackground(
  bg: PageBackgroundSettings | undefined,
  locale: "zh" | "en" = "zh",
): string {
  return pageBackgroundKindLabel(bg?.kind ?? "theme", locale);
}
