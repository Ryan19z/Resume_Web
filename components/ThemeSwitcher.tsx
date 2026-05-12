"use client";

import { useSiteContent } from "@/context/SiteContentProvider";
import { useTheme } from "@/context/ThemeProvider";
import { SITE_THEMES, type SiteThemeId } from "@/lib/site-themes";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useId, useRef, useState } from "react";

export function ThemeSwitcher() {
  const { theme, setTheme, themeReady } = useTheme();
  const { previewMode } = useSiteContent();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const current = SITE_THEMES.find((t) => t.id === theme) ?? SITE_THEMES[0];

  if (previewMode) return null;

  return (
    <div
      id="tour-theme"
      ref={rootRef}
      className="pointer-events-auto fixed bottom-5 left-5 z-[65] print:hidden sm:bottom-8 sm:left-8"
    >
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listId : undefined}
        disabled={!themeReady}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-line bg-surface/90 px-3.5 py-2 text-left text-[12px] font-medium text-ink shadow-[0_1px_0_rgb(0_0_0/0.04)] backdrop-blur-md transition-colors hover:border-ink/12 hover:bg-surface disabled:opacity-50"
      >
        <span
          className="flex h-5 w-5 shrink-0 rounded-full border border-line/80"
          style={{
            background:
              theme === "ink"
                ? "linear-gradient(135deg,#2a2a32,#0f0f12)"
                : theme === "warm"
                  ? "linear-gradient(135deg,#fff7ed,#fde8d4)"
                  : theme === "editorial"
                    ? "linear-gradient(135deg,#faf8f4,#e8e4dc)"
                    : theme === "ocean"
                      ? "linear-gradient(135deg,#f0f9ff,#dbeafe)"
                      : "linear-gradient(135deg,#fff,#e8e8ed)",
          }}
          aria-hidden
        />
        <span className="min-w-0">
          <span className="block leading-tight text-ink">主题</span>
          <span className="block truncate text-[11px] font-normal text-ink-muted">
            {current.label} · {current.hint}
          </span>
        </span>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            id={listId}
            role="listbox"
            aria-label="选择主题"
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
            className="absolute bottom-full left-0 mb-2 w-[min(92vw,260px)] overflow-hidden rounded-2xl border border-line bg-surface/95 py-1.5 shadow-xl backdrop-blur-md"
          >
            {SITE_THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                role="option"
                aria-selected={t.id === theme}
                onClick={() => {
                  setTheme(t.id as SiteThemeId);
                  setOpen(false);
                }}
                className={`flex w-full flex-col gap-0.5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-ink/[0.04] ${
                  t.id === theme ? "bg-ink/[0.06] font-medium" : ""
                }`}
              >
                <span className="text-ink">{t.label}</span>
                <span className="text-[11px] font-normal leading-snug text-ink-muted">
                  {t.hint}
                </span>
              </button>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
