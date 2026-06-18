"use client";

import { useLanguageMode } from "@/context/LanguageModeProvider";
import { useSiteContent } from "@/context/SiteContentProvider";

/** 编辑权限下提示当前语言版本与英文版独立保存 */
export function EditorLangIndicator() {
  const { mode } = useLanguageMode();
  const { canEdit, editPermissionLoaded, previewMode } = useSiteContent();

  if (!editPermissionLoaded || !canEdit || previewMode) return null;

  const label =
    mode === "zh"
      ? "当前：中文版（与英文版独立保存）"
      : "Editing: English (saved separately from Chinese)";

  return (
    <div
      role="status"
      className="pointer-events-none fixed bottom-[calc(11.5rem+env(safe-area-inset-bottom,0px))] right-5 z-[65] max-w-[min(92vw,240px)] rounded-full border border-[rgb(var(--selection)/0.28)] bg-[rgb(var(--selection)/0.08)] px-3 py-1.5 text-[10px] font-medium leading-snug text-[rgb(var(--selection))] shadow-sm backdrop-blur-md sm:bottom-[calc(12.5rem+env(safe-area-inset-bottom,0px))] sm:right-8 sm:text-[11px]"
    >
      {label}
    </div>
  );
}
