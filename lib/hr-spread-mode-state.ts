export const HR_SPREAD_MODE_STORAGE_KEY = "resume-hr-spread-mode-v1";
export const HR_SPREAD_MODE_CHANGED_EVENT = "hr-spread-mode-changed";

export function readHrSpreadMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(HR_SPREAD_MODE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeHrSpreadMode(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HR_SPREAD_MODE_STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    /* quota */
  }
  window.dispatchEvent(
    new CustomEvent(HR_SPREAD_MODE_CHANGED_EVENT, { detail: { enabled } }),
  );
}
