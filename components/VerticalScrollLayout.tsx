"use client";

import { PageBackgroundLayer } from "@/components/PageBackgroundLayer";
import { useInteractionMode } from "@/context/InteractionModeProvider";
import type { ReactNode } from "react";

/**
 * 将首页、履历、作品集纵向排布，整站由外层 main 纵向滚动浏览。
 * 背景由 PageBackgroundLayer 以 fixed 铺满视口，滚动各分区时底图保持一致。
 */
export function VerticalScrollLayout({ children }: { children: ReactNode }) {
  const { microInteractionEnabled } = useInteractionMode();
  return (
    <div
      className="relative z-[1] flex min-w-0 w-full flex-col bg-transparent pb-28 text-ink print:pb-6"
      data-micro-interaction={microInteractionEnabled ? "on" : "off"}
    >
      <PageBackgroundLayer />
      <div className="relative z-10 flex min-w-0 w-full flex-col">{children}</div>
    </div>
  );
}
