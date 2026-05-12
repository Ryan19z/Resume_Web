"use client";

import { PageBackgroundLayer } from "@/components/PageBackgroundLayer";
import type { ReactNode } from "react";

/**
 * 将首页、履历、作品集纵向排布，整站由外层 main 纵向滚动浏览。
 * 背景层叠在本容器底层（absolute + 负 z-index），避免与顶栏/悬浮按钮的 fixed 层级抢点击。
 */
export function VerticalScrollLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative z-[1] flex min-w-0 w-full flex-col bg-transparent pb-28 text-ink print:pb-6">
      <PageBackgroundLayer />
      <div className="relative z-10 flex min-w-0 w-full flex-col">{children}</div>
    </div>
  );
}
