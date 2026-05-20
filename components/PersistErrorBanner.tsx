"use client";

import { useSiteContent } from "@/context/SiteContentProvider";

/** 本地快照写入失败时在顶栏下方提示（如图片过大导致 quota 超限） */
export function PersistErrorBanner() {
  const { persistError, dismissPersistError } = useSiteContent();

  if (!persistError) return null;

  return (
    <div className="pointer-events-auto fixed left-0 right-0 top-[3.65rem] z-[65] flex justify-center px-4 pt-1 print:hidden sm:top-14">
      <div
        role="alert"
        className="flex max-w-xl items-start gap-2 rounded-2xl border border-amber-300/90 bg-amber-50/95 px-4 py-2.5 text-[11px] leading-snug text-amber-950 shadow-sm backdrop-blur-md"
      >
        <p className="min-w-0 flex-1">{persistError}</p>
        <button
          type="button"
          onClick={dismissPersistError}
          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold text-amber-900/80 hover:bg-amber-200/80"
          aria-label="关闭提示"
        >
          关闭
        </button>
      </div>
    </div>
  );
}
