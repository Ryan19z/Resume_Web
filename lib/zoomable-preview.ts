export const PREVIEW_ZOOM_MIN = 0.25;
export const PREVIEW_ZOOM_MAX = 3;
export const PREVIEW_ZOOM_STEP = 0.08;

export function clampPreviewZoom(value: number): number {
  return Math.min(PREVIEW_ZOOM_MAX, Math.max(PREVIEW_ZOOM_MIN, value));
}

export function computeFitZoom(
  viewportWidth: number,
  contentWidth: number,
  padding = 12,
): number {
  if (viewportWidth <= 0 || contentWidth <= 0) return 1;
  const available = Math.max(viewportWidth - padding, 1);
  return clampPreviewZoom(Math.min(1, available / contentWidth));
}

export function zoomFromWheel(deltaY: number, currentZoom: number): number {
  const direction = deltaY < 0 ? 1 : -1;
  const step = Math.max(
    PREVIEW_ZOOM_STEP,
    currentZoom * PREVIEW_ZOOM_STEP * 1.5,
  );
  return clampPreviewZoom(currentZoom + direction * step);
}
