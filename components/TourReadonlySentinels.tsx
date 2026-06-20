"use client";

import { useSiteContent } from "@/context/SiteContentProvider";

/**
 * 只读访客不渲染「站点编辑」悬浮钮时，仍保留与引导一致的 DOM 锚点，
 * 避免首次自动引导被 filter 成步数过少（与「重新播放」不一致）。
 */
export function TourReadonlySentinels() {
  const { editPermissionLoaded, canEdit, previewMode } = useSiteContent();
  if (!editPermissionLoaded || previewMode || canEdit) return null;
  return (
    <div
      id="tour-site-editor"
      aria-hidden
      tabIndex={-1}
      className="pointer-events-none fixed bottom-5 right-5 z-[63] h-14 w-56 opacity-0 print:hidden sm:bottom-8 sm:right-8"
    />
  );
}
