import { parseClientResumeScope } from "@/lib/resume-scope";

const STORAGE_KEY_PREFIX = "hr-view-guide-seen-v1";
const SESSION_AUTO_OFFERED_KEY = "hr-view-guide-auto-offered-v1";

export const HR_VIEW_GUIDE_OPEN_EVENT = "hr-view-guide-open";

function getStorageKey(): string {
  if (typeof window === "undefined") return STORAGE_KEY_PREFIX;
  const { resumeId } = parseClientResumeScope();
  return resumeId ? `${STORAGE_KEY_PREFIX}:${resumeId}` : STORAGE_KEY_PREFIX;
}

export function hasSeenHrViewGuide(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(getStorageKey()) === "1";
  } catch {
    return true;
  }
}

export function markHrViewGuideSeen(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(getStorageKey(), "1");
  } catch {
    /* ignore */
  }
}

export function hasOfferedHrGuideThisSession(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.sessionStorage.getItem(SESSION_AUTO_OFFERED_KEY) === "1";
  } catch {
    return true;
  }
}

export function markHrGuideOfferedThisSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SESSION_AUTO_OFFERED_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function openHrViewGuide(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(HR_VIEW_GUIDE_OPEN_EVENT));
}
