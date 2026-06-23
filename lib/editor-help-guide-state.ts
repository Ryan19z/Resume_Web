import { parseClientResumeScope } from "@/lib/resume-scope";

const STORAGE_KEY_PREFIX = "editor-help-intro-seen-v1";
const SESSION_OFFERED_KEY = "editor-help-intro-offered-v1";

function getStorageKey(): string {
  if (typeof window === "undefined") return STORAGE_KEY_PREFIX;
  const { resumeId } = parseClientResumeScope();
  return resumeId ? `${STORAGE_KEY_PREFIX}:${resumeId}` : STORAGE_KEY_PREFIX;
}

/** 是否已看过首次「使用说明」弹窗（按 resumeId） */
export function hasSeenEditorHelpIntro(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(getStorageKey()) === "1";
  } catch {
    return true;
  }
}

export function markEditorHelpIntroSeen(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(getStorageKey(), "1");
  } catch {
    /* ignore */
  }
}

export function hasOfferedEditorHelpIntroThisSession(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.sessionStorage.getItem(SESSION_OFFERED_KEY) === "1";
  } catch {
    return true;
  }
}

export function markEditorHelpIntroOfferedThisSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SESSION_OFFERED_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function isEditUrlSession(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(parseClientResumeScope().editToken);
}
