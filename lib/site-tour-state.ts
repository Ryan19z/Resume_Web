const STORAGE_KEY = "resume-site-tour-done-v1";

/** 新手引导正常结束、跳过或无法启动时派发，用于再打开「首屏资料」弹窗 */
export const SITE_TOUR_FINISHED_EVENT = "resume-site-tour-finished";

export function resetSiteTourCompletion(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function markSiteTourCompleted(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, "1");
}

export function hasCompletedSiteTour(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

export function notifySiteTourFinished(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SITE_TOUR_FINISHED_EVENT));
}
