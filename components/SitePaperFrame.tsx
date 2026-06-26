"use client";

import type { ReactNode } from "react";

/** 各分区统一的水平内边距（与纸框内缘对齐） */
export const SITE_PAPER_SECTION_X = "px-6 sm:px-10 md:px-12";

/**
 * 整站「白纸」容器：首页 / 履历 / 作品 / 页脚纵向排在同一张纸内，左右对齐。
 * 视口两侧留出空隙，露出页面背景，形成桌面上的纸张效果。
 */
export function SitePaperFrame({ children }: { children: ReactNode }) {
  return (
    <div className="site-paper-desk mx-auto w-full max-w-[min(100%,1260px)] px-3 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] pt-[4.167rem] sm:px-4 sm:pb-10 sm:pt-[5.833rem] md:pt-[7.5rem] print:max-w-none print:px-0 print:pb-0 print:pt-0">
      <div className="site-paper-sheet overflow-hidden rounded-2xl border border-line/75 bg-surface shadow-[0_1px_0_rgba(15,23,42,0.04),0_2px_6px_rgba(15,23,42,0.04),0_12px_32px_-8px_rgba(15,23,42,0.1),0_28px_56px_-24px_rgba(15,23,42,0.14)] print:rounded-none print:border-0 print:shadow-none">
        {children}
      </div>
    </div>
  );
}
