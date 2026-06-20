import { parseClientResumeScope } from "@/lib/resume-scope";

const STORAGE_KEY_PREFIX = "resume-site-tour-done-v2";
const SESSION_AUTO_OFFERED_KEY = "resume-site-tour-auto-offered-v1";

/** 新手引导正常结束、跳过或无法启动时派发，用于再打开「首屏资料」弹窗 */
export const SITE_TOUR_FINISHED_EVENT = "resume-site-tour-finished";

function getTourStorageKey(): string {
  if (typeof window === "undefined") return STORAGE_KEY_PREFIX;
  const { resumeId } = parseClientResumeScope();
  return resumeId ? `${STORAGE_KEY_PREFIX}:${resumeId}` : STORAGE_KEY_PREFIX;
}

export function resetSiteTourCompletion(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(getTourStorageKey());
}

export function markSiteTourCompleted(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getTourStorageKey(), "1");
}

export function hasCompletedSiteTour(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(getTourStorageKey()) === "1";
}

/** 本会话是否已触发过自动引导（防止 StrictMode / 重复 effect 连播） */
export function hasOfferedAutoTourThisSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(SESSION_AUTO_OFFERED_KEY) === "1";
  } catch {
    return false;
  }
}

export function markAutoTourOfferedThisSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SESSION_AUTO_OFFERED_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function notifySiteTourFinished(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SITE_TOUR_FINISHED_EVENT));
}
