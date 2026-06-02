"use client";

import { useSiteContent } from "@/context/SiteContentProvider";
import { useLanguageMode } from "@/context/LanguageModeProvider";

export function SiteFooter() {
  const { site } = useSiteContent();
  const { mode } = useLanguageMode();
  const email = site.contactEmail?.trim();

  if (!email) return null;

  return (
    <footer className="border-t border-line/70 bg-paper px-6 py-8 text-center sm:px-12">
      <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-ink-muted">
        {mode === "zh" ? "联系入口" : "Contact"}
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5 text-sm text-ink">
        <a
          className="micro-card inline-flex items-center gap-2 rounded-full border border-line bg-surface/85 px-4 py-2 font-medium transition-colors"
          href={`mailto:${email}`}
        >
          <span className="text-xs font-semibold uppercase tracking-[0.09em] text-ink-muted">
            Email
          </span>
          {email}
        </a>
        <a
          className="inline-flex items-center rounded-full border border-line bg-surface/72 px-3 py-2 text-xs text-ink-muted transition-colors hover:border-ink/20 hover:text-ink"
          href="#intro"
        >
          {mode === "zh" ? "查看首屏完整联系方式" : "See full contacts on top"}
        </a>
      </div>
    </footer>
  );
}
