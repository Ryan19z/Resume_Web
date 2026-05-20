"use client";

import { useSiteContent } from "@/context/SiteContentProvider";

/** 服务器发布文件读取失败或损坏时提示（访客与站长均可见） */
export function SiteLoadWarningBanner() {
  const { siteLoadWarning, dismissSiteLoadWarning } = useSiteContent();

  if (!siteLoadWarning) return null;

  return (
    <div className="pointer-events-auto fixed left-0 right-0 top-[3.65rem] z-[64] flex justify-center px-4 pt-1 print:hidden sm:top-14">
      <div
        role="alert"
        className="flex max-w-xl items-start gap-2 rounded-2xl border border-red-300/90 bg-red-50/95 px-4 py-2.5 text-[11px] leading-snug text-red-950 shadow-sm backdrop-blur-md"
      >
        <p className="min-w-0 flex-1">{siteLoadWarning}</p>
        <button
          type="button"
          onClick={dismissSiteLoadWarning}
          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold text-red-900/80 hover:bg-red-200/80"
          aria-label="关闭提示"
        >
          关闭
        </button>
      </div>
    </div>
  );
}
