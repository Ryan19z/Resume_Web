"use client";

import { ShareResumeControl } from "@/components/ShareResumeControl";
import { useLanguageMode } from "@/context/LanguageModeProvider";

const NAV_CLASS =
  "fixed left-0 right-0 top-0 z-[62] flex items-center justify-center border-b border-line/90 bg-surface/95 px-3 shadow-[0_1px_3px_rgba(0,0,0,0.08)] backdrop-blur-md print:hidden pt-[calc(0.5rem+env(safe-area-inset-top,0px))] pb-2";

/** 占位高度须与导航栏总高约一致（含安全区上边距） */
const SPACER_STYLE = {
  height: "calc(2.875rem + env(safe-area-inset-top, 0px))",
} as const;

/**
 * 长页极简锚点：固定顶栏 + 占位，配合 html.scroll-smooth 平滑滚动。
 */
export function SectionAnchorNav({
  showResume = true,
  showPortfolio = true,
}: {
  showResume?: boolean;
  showPortfolio?: boolean;
}) {
  const { mode } = useLanguageMode();
  const links = (
    mode === "zh"
      ? [
          { href: "#intro", label: "首页", visible: true },
          { href: "#resume", label: "履历", visible: showResume },
          { href: "#portfolio", label: "作品", visible: showPortfolio },
        ]
      : [
          { href: "#intro", label: "Home", visible: true },
          { href: "#resume", label: "Resume", visible: showResume },
          { href: "#portfolio", label: "Work", visible: showPortfolio },
        ]
  ).filter((l) => l.visible);
  return (
    <>
      <nav
        id="tour-anchors"
        aria-label={mode === "zh" ? "页面分区" : "Sections"}
        className={NAV_CLASS}
      >
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-2 px-3 sm:px-6">
          <div className="hidden w-11 shrink-0 sm:block" aria-hidden />
          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-0.5 sm:gap-1">
            {links.map(({ href, label }, i) => (
              <span key={href} className="flex items-center">
                {i > 0 ? (
                  <span
                    className="mx-0.5 text-ink-muted/35 sm:mx-1"
                    aria-hidden
                  >
                    /
                  </span>
                ) : null}
                <a
                  href={href}
                  className="rounded-full px-2.5 py-1.5 text-[12px] font-semibold tracking-[0.02em] text-ink-muted transition-colors hover:bg-[rgb(var(--selection)/0.1)] hover:text-[rgb(var(--selection))] sm:px-3"
                >
                  {label}
                </a>
              </span>
            ))}
          </div>
          <div className="shrink-0">
            <ShareResumeControl />
          </div>
        </div>
      </nav>
      <div className="shrink-0 print:hidden" style={SPACER_STYLE} aria-hidden />
    </>
  );
}
