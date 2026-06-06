import { PLACEHOLDER_IMAGES } from "@/lib/media-defaults";
import type { PageBackgroundSettings } from "@/lib/types";

export const DEFAULT_PAGE_BACKGROUND_IMAGE = PLACEHOLDER_IMAGES.wide4;

export const defaultPageBackground: PageBackgroundSettings = {
  kind: "theme",
};

export function normalizePageBackground(
  raw: unknown,
  fallback?: PageBackgroundSettings,
): PageBackgroundSettings {
  const fb = fallback ?? defaultPageBackground;
  if (!raw || typeof raw !== "object") return { ...fb };
  const o = raw as Record<string, unknown>;
  const kind =
    o.kind === "image" || o.kind === "mesh" || o.kind === "theme"
      ? o.kind
      : fb.kind;

  if (kind === "theme") {
    return { kind: "theme" };
  }

  if (kind === "mesh") {
    return { kind: "mesh" };
  }

  const imageUrl =
    typeof o.imageUrl === "string" && o.imageUrl.trim()
      ? o.imageUrl.trim()
      : fb.imageUrl ?? DEFAULT_PAGE_BACKGROUND_IMAGE;

  const rawStrength =
    typeof o.imageStrength === "number" && Number.isFinite(o.imageStrength)
      ? o.imageStrength
      : (fb.imageStrength ?? 32);

  const imageStrength = Math.min(100, Math.max(5, Math.round(rawStrength)));

  return { kind: "image", imageUrl, imageStrength };
}
