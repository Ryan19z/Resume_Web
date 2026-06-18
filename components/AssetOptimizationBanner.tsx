"use client";

import { useSiteContent } from "@/context/SiteContentProvider";

/** 内嵌 Base64 图片或发布体积过大时的编辑提示（仅站长可见） */
export function AssetOptimizationBanner() {
  const { assetHint, dismissAssetHint, canEdit, editPermissionLoaded } =
    useSiteContent();

  if (!editPermissionLoaded || !canEdit || !assetHint) return null;

  return (
    <div className="pointer-events-auto fixed left-0 right-0 top-[6.5rem] z-[65] flex justify-center px-4 pt-1 print:hidden sm:top-[4.75rem]">
      <div
        role="status"
        className="flex max-w-xl items-start gap-2 rounded-2xl border border-sky-300/90 bg-sky-50/95 px-4 py-2.5 text-[11px] leading-snug text-sky-950 shadow-sm backdrop-blur-md"
      >
        <p className="min-w-0 flex-1">{assetHint}</p>
        <button
          type="button"
          onClick={dismissAssetHint}
          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold text-sky-900/80 hover:bg-sky-200/80"
          aria-label="关闭提示"
        >
          关闭
        </button>
      </div>
    </div>
  );
}
