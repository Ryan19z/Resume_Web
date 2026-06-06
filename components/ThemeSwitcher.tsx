"use client";

import { useLanguageMode } from "@/context/LanguageModeProvider";
import { useSiteContent } from "@/context/SiteContentProvider";
import { useTheme } from "@/context/ThemeProvider";
import {
  DEFAULT_PAGE_BACKGROUND_IMAGE,
  defaultPageBackground,
} from "@/lib/page-background";
import { summarizePageBackground } from "@/lib/page-background-display";
import { SITE_THEMES, type SiteThemeId } from "@/lib/site-themes";
import type { PageBackgroundKind } from "@/lib/types";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useId, useRef, useState } from "react";

const BACKGROUND_KINDS: PageBackgroundKind[] = ["theme", "image", "mesh"];

export function ThemeSwitcher() {
  const { theme, setTheme, themeReady } = useTheme();
  const { mode } = useLanguageMode();
  const {
    previewMode,
    canEdit,
    editPermissionLoaded,
    site,
    updatePageBackground,
    openPageBackgroundModal,
  } = useSiteContent();
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
  const bg = site.pageBackground ?? defaultPageBackground;
  const showBgControls = editPermissionLoaded && canEdit && !previewMode;

  const i18n = {
    title: mode === "zh" ? "主题" : "Theme",
    bgSection: mode === "zh" ? "页面背景" : "Page background",
    bgTheme:
      mode === "zh" ? "纯色纸面" : "Solid paper",
    bgThemeHint:
      mode === "zh" ? "干净克制，适合求职投递" : "Clean and professional",
    bgImage:
      mode === "zh" ? "自定义图片" : "Custom image",
    bgImageHint:
      mode === "zh" ? "自适应铺满，主图完整居中" : "Adaptive fill with full image centered",
    bgMesh:
      mode === "zh" ? "轻柔流光" : "Soft gradient",
    bgMeshHint:
      mode === "zh" ? "浅色缓慢渐变，无需上传" : "Subtle motion, no upload",
    editImage:
      mode === "zh" ? "上传 / 调整图片…" : "Upload / adjust image…",
  };

  const applyBackgroundKind = (kind: PageBackgroundKind) => {
    if (kind === "theme") {
      updatePageBackground({ kind: "theme" });
      return;
    }
    if (kind === "mesh") {
      updatePageBackground({ kind: "mesh" });
      return;
    }
    const prev = site.pageBackground;
    updatePageBackground({
      kind: "image",
      imageUrl:
        prev?.kind === "image" && prev.imageUrl
          ? prev.imageUrl
          : DEFAULT_PAGE_BACKGROUND_IMAGE,
      imageStrength:
        prev?.kind === "image" && prev.imageStrength != null
          ? prev.imageStrength
          : 32,
    });
  };

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
                  ? "linear-gradient(135deg,#fffaf5,#f5ebe0)"
                  : theme === "editorial"
                    ? "linear-gradient(135deg,#faf8f4,#efece6)"
                    : theme === "ocean"
                      ? "linear-gradient(135deg,#f8fbfd,#e8f2f8)"
                      : "linear-gradient(135deg,#ffffff,#f1f5f9)",
          }}
          aria-hidden
        />
        <span className="min-w-0">
          <span className="block leading-tight text-ink">{i18n.title}</span>
          <span className="block truncate text-[11px] font-normal text-ink-muted">
            {current.label} · {summarizePageBackground(bg, mode)}
          </span>
        </span>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            id={listId}
            role="listbox"
            aria-label={mode === "zh" ? "主题与背景" : "Theme and background"}
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
            className="absolute bottom-full left-0 mb-2 max-h-[min(72vh,520px)] w-[min(92vw,280px)] overflow-y-auto rounded-2xl border border-line bg-surface/95 py-1.5 shadow-xl backdrop-blur-md"
          >
            <div className="px-3 pb-1 pt-1 text-[11px] font-medium text-ink-muted">
              {mode === "zh" ? "配色主题" : "Color theme"}
            </div>
            {SITE_THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                role="option"
                aria-selected={t.id === theme}
                onClick={() => {
                  setTheme(t.id as SiteThemeId);
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

            {showBgControls ? (
              <>
                <div className="mx-3 my-1.5 h-px bg-line/80" />
                <div className="px-3 pb-1 text-[11px] font-medium text-ink-muted">
                  {i18n.bgSection}
                </div>
                {BACKGROUND_KINDS.map((kind) => {
                  const selected = bg.kind === kind;
                  const title =
                    kind === "theme"
                      ? i18n.bgTheme
                      : kind === "image"
                        ? i18n.bgImage
                        : i18n.bgMesh;
                  const hint =
                    kind === "theme"
                      ? i18n.bgThemeHint
                      : kind === "image"
                        ? i18n.bgImageHint
                        : i18n.bgMeshHint;
                  return (
                    <button
                      key={kind}
                      type="button"
                      onClick={() => applyBackgroundKind(kind)}
                      className={`flex w-full flex-col gap-0.5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-ink/[0.04] ${
                        selected ? "bg-ink/[0.06] font-medium" : ""
                      }`}
                    >
                      <span className="text-ink">{title}</span>
                      <span className="text-[11px] font-normal leading-snug text-ink-muted">
                        {hint}
                      </span>
                    </button>
                  );
                })}
                {bg.kind === "image" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      openPageBackgroundModal();
                    }}
                    className="mx-2 mb-1 mt-0.5 w-[calc(100%-1rem)] rounded-xl border border-line bg-paper/80 px-3 py-2 text-left text-[12px] font-medium text-ink transition-colors hover:border-ink/15 hover:bg-paper"
                  >
                    {i18n.editImage}
                  </button>
                ) : null}
              </>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
