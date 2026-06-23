"use client";

import { useLanguageMode } from "@/context/LanguageModeProvider";
import { useSiteContent } from "@/context/SiteContentProvider";

const CHIP_CLASS =
  "max-w-[min(92vw,240px)] rounded-full border border-[rgb(var(--selection)/0.28)] bg-[rgb(var(--selection)/0.08)] px-3 py-1.5 text-[10px] font-medium leading-snug text-[rgb(var(--selection))] shadow-sm backdrop-blur-md sm:text-[11px]";

/** 编辑权限下提示当前语言版本（嵌入右下角工具栏，避免与按钮叠层） */
export function EditorLangChip() {
  const { mode } = useLanguageMode();
  const { canEdit, editPermissionLoaded, previewMode } = useSiteContent();

  if (!editPermissionLoaded || !canEdit || previewMode) return null;

  const label =
    mode === "zh"
      ? "当前：中文版（与英文版独立保存）"
      : "Editing: English (saved separately from Chinese)";

  return (
    <div role="status" className={CHIP_CLASS}>
      {label}
    </div>
  );
}

/** @deprecated 请使用 SiteEditorDock 内嵌的 EditorLangChip */
export function EditorLangIndicator() {
  return null;
}
