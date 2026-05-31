"use client";

import {
  dispatchStartSiteTour,
  forceTeardownDriverTourDom,
  resetSiteTourCompletion,
} from "@/components/SiteTourDriver";
import { useLanguageMode } from "@/context/LanguageModeProvider";
import { useSiteContent } from "@/context/SiteContentProvider";
import { HELP_GUIDE_TEXT } from "@/lib/help-guide-content";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useId, useState } from "react";

export function TopUtilityBar() {
  const {
    canEdit,
    editPermissionLoaded,
    previewMode,
    setPreviewMode,
  } = useSiteContent();
  const { mode, toggleMode } = useLanguageMode();
  const [helpOpen, setHelpOpen] = useState(false);
  const titleId = useId();

  useBodyScrollLock(helpOpen);

  useEffect(() => {
    if (!helpOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setHelpOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [helpOpen]);

  return (
    <>
      <div
        id="tour-top-actions"
        className="fixed right-3 z-[61] flex flex-col items-end gap-2 print:hidden sm:right-5"
        style={{
          top: "calc(3.35rem + env(safe-area-inset-top, 0px))",
        }}
      >
        {editPermissionLoaded && canEdit ? (
          <button
            type="button"
            onClick={() => setPreviewMode(!previewMode)}
            className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold shadow-sm backdrop-blur-md transition-colors sm:px-4 sm:text-xs ${
              previewMode
                ? "border-ink/30 bg-ink text-white"
                : "border-line bg-surface/90 text-ink-muted hover:border-ink/15 hover:text-ink"
            }`}
          >
            {previewMode
              ? mode === "zh"
                ? "退出预览"
                : "Exit Preview"
              : mode === "zh"
                ? "预览"
                : "Preview"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={toggleMode}
          className="rounded-full border border-line bg-surface/90 px-3 py-1.5 text-[11px] font-semibold text-ink-muted shadow-sm backdrop-blur-md transition-colors hover:border-ink/15 hover:text-ink sm:px-4 sm:text-xs"
        >
          {mode === "zh" ? "EN" : "中文"}
        </button>
        <button
          type="button"
          onClick={() => {
            forceTeardownDriverTourDom();
            setHelpOpen(true);
          }}
          className="rounded-full border border-line bg-surface/90 px-3 py-1.5 text-[11px] font-semibold text-ink-muted shadow-sm backdrop-blur-md transition-colors hover:border-ink/15 hover:text-ink sm:px-4 sm:text-xs"
        >
          {mode === "zh" ? "使用说明" : "Guide"}
        </button>
      </div>

      <AnimatePresence>
        {helpOpen ? (
          <motion.div
            className="fixed inset-0 z-[84] flex items-end justify-center print:hidden sm:items-center sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              aria-label={mode === "zh" ? "关闭" : "Close"}
              className="absolute inset-0 bg-ink/35 backdrop-blur-[2px]"
              onClick={() => setHelpOpen(false)}
            />
            <motion.div
              role="dialog"
              aria-modal
              aria-labelledby={titleId}
              initial={{ y: 32, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="relative z-[85] flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-line bg-surface shadow-2xl sm:max-h-[82vh] sm:rounded-3xl"
            >
              <div className="shrink-0 border-b border-line px-5 py-4 sm:px-6">
                <h2
                  id={titleId}
                  className="text-lg font-semibold tracking-[-0.02em]"
                >
                  {mode === "zh" ? "使用说明" : "Guide"}
                </h2>
                <p className="mt-1 text-xs text-ink-muted">
                  {mode === "zh"
                    ? "第一次使用可先看新手引导；也可随时点此面板复习。"
                    : "New here? Start with the onboarding tour and revisit this panel anytime."}
                </p>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 text-sm leading-relaxed text-ink/90 sm:px-6">
                <pre className="whitespace-pre-wrap font-sans text-[13px]">
                  {HELP_GUIDE_TEXT}
                </pre>
                <div className="mt-6 flex flex-col gap-2 border-t border-line pt-4">
                  <button
                    type="button"
                    className="rounded-full border border-line bg-paper py-2.5 text-sm font-medium text-ink hover:bg-ink/[0.04]"
                    onClick={() => {
                      resetSiteTourCompletion();
                      setHelpOpen(false);
                      window.setTimeout(() => dispatchStartSiteTour(), 300);
                    }}
                  >
                    {mode === "zh"
                      ? "重新播放新手引导"
                      : "Replay onboarding tour"}
                  </button>
                </div>
              </div>
              <div className="shrink-0 border-t border-line px-5 py-3 sm:px-6">
                <button
                  type="button"
                  onClick={() => setHelpOpen(false)}
                  className="w-full rounded-full bg-ink py-3 text-sm font-medium text-white hover:opacity-90"
                >
                  {mode === "zh" ? "关闭" : "Close"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
