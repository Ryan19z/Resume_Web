"use client";

import { ShareResumeControl } from "@/components/ShareResumeControl";
import { useLanguageMode } from "@/context/LanguageModeProvider";

const NAV_CLASS =
  "fixed left-0 right-0 top-0 z-[62] flex items-center justify-center border-b border-line/70 bg-paper/90 px-3 backdrop-blur-md print:hidden pt-[calc(0.5rem+env(safe-area-inset-top,0px))] pb-2";

/** 占位高度须与导航栏总高约一致（含安全区上边距） */
const SPACER_STYLE = {
  height: "calc(2.875rem + env(safe-area-inset-top, 0px))",
} as const;

/**
 * 长页极简锚点：固定顶栏 + 占位，配合 html.scroll-smooth 平滑滚动。
 */
export function SectionAnchorNav() {
  const { mode } = useLanguageMode();
  const links =
    mode === "zh"
      ? [
          { href: "#intro", label: "首页" },
          { href: "#resume", label: "履历" },
          { href: "#portfolio", label: "作品" },
        ]
      : [
          { href: "#intro", label: "Home" },
          { href: "#resume", label: "Resume" },
          { href: "#portfolio", label: "Work" },
        ];
  return (
    <>
      <nav
        id="tour-anchors"
        aria-label={mode === "zh" ? "页面分区" : "Sections"}
        className={`${NAV_CLASS} relative`}
      >
        <div className="flex max-w-xl flex-wrap items-center justify-center gap-0.5 px-14 sm:gap-1 sm:px-24">
          {links.map(({ href, label }, i) => (
            <span key={href} className="flex items-center">
              {i > 0 ? (
                <span className="mx-0.5 text-ink-muted/35 sm:mx-1" aria-hidden>
                  /
                </span>
              ) : null}
              <a
                href={href}
                className="rounded-full px-2.5 py-1.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-muted transition-colors hover:bg-ink/[0.06] hover:text-ink sm:px-3 sm:tracking-[0.16em]"
              >
                {label}
              </a>
            </span>
          ))}
        </div>
        <div className="absolute right-2 top-1/2 max-w-[38%] -translate-y-1/2 sm:right-4">
          <ShareResumeControl />
        </div>
      </nav>
      <div className="shrink-0 print:hidden" style={SPACER_STYLE} aria-hidden />
    </>
  );
}
