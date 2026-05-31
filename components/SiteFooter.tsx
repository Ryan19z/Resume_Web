"use client";

import { useSiteContent } from "@/context/SiteContentProvider";
import { useLanguageMode } from "@/context/LanguageModeProvider";

export function SiteFooter() {
  const { site } = useSiteContent();
  const { mode } = useLanguageMode();
  const email = site.contactEmail?.trim();
  const extra = site.contactExtra?.trim();

  if (!email && !extra) return null;

  return (
    <footer className="border-t border-line/70 bg-paper px-6 py-10 text-center sm:px-12">
      <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-ink-muted">
        {mode === "zh" ? "联系方式" : "Contact"}
      </p>
      <div className="mt-4 flex flex-col items-center gap-2 text-sm text-ink">
        {email ? (
          <a
            className="rounded-full border border-line bg-surface/80 px-4 py-2 font-medium transition-colors hover:border-ink/20"
            href={`mailto:${encodeURIComponent(email)}`}
          >
            {email}
          </a>
        ) : null}
        {extra ? (
          <p className="max-w-md text-sm leading-relaxed text-ink-muted">{extra}</p>
        ) : null}
      </div>
    </footer>
  );
}
