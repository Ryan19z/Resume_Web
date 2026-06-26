"use client";

import { HrSpreadModeToggle } from "@/components/HrSpreadModeToggle";
import {
  dispatchStartSiteTour,
  forceTeardownDriverTourDom,
  resetSiteTourCompletion,
} from "@/components/SiteTourDriver";
import { useLanguageMode } from "@/context/LanguageModeProvider";
import { useSiteContent } from "@/context/SiteContentProvider";
import { HELP_GUIDE_TEXT } from "@/lib/help-guide-content";
import {
  hasOfferedEditorHelpIntroThisSession,
  hasSeenEditorHelpIntro,
  isEditUrlSession,
  markEditorHelpIntroOfferedThisSession,
  markEditorHelpIntroSeen,
} from "@/lib/editor-help-guide-state";
import { openHrViewGuide } from "@/lib/hr-view-guide-state";
import { getHrViewGuide } from "@/lib/hr-view-guide-content";
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
  const { mode, toggleMode, langSwitchLocked } = useLanguageMode();
  const [helpOpen, setHelpOpen] = useState(false);
  const titleId = useId();

  useBodyScrollLock(helpOpen);

  const closeHelp = (markSeen = true) => {
    if (markSeen) markEditorHelpIntroSeen();
    setHelpOpen(false);
  };

  const beginTourFromHelp = () => {
    markEditorHelpIntroSeen();
    setHelpOpen(false);
    window.setTimeout(() => dispatchStartSiteTour(), 320);
  };

  useEffect(() => {
    if (!editPermissionLoaded || !canEdit || previewMode) return;
    if (!isEditUrlSession()) return;
    if (hasSeenEditorHelpIntro()) return;
    if (hasOfferedEditorHelpIntroThisSession()) return;
    markEditorHelpIntroOfferedThisSession();
    const timer = window.setTimeout(() => setHelpOpen(true), 800);
    return () => window.clearTimeout(timer);
  }, [editPermissionLoaded, canEdit, previewMode]);

  useEffect(() => {
    if (!helpOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeHelp(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [helpOpen]);

  const showLangSwitch =
    !langSwitchLocked || (editPermissionLoaded && canEdit);
  const isHrVisitor = editPermissionLoaded && !canEdit && !previewMode;
  const hrGuide = getHrViewGuide(mode);

  return (
    <>
      <div
        id="tour-top-actions"
        className="pointer-events-auto fixed right-3 top-[calc(2.5rem+env(safe-area-inset-top,0px)+0.35rem)] z-[65] flex flex-col items-end gap-2 print:hidden sm:right-5 sm:top-[calc(3.35rem+env(safe-area-inset-top,0px))] sm:z-[61]"
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
        {editPermissionLoaded ? <HrSpreadModeToggle /> : null}
        {showLangSwitch ? (
          <button
            type="button"
            onClick={toggleMode}
            className="rounded-full border border-line bg-surface/90 px-3 py-1.5 text-[11px] font-semibold text-ink-muted shadow-sm backdrop-blur-md transition-colors hover:border-ink/15 hover:text-ink sm:px-4 sm:text-xs"
          >
            {mode === "zh" ? "EN" : "中文"}
          </button>
        ) : null}
        {isHrVisitor ? (
          <button
            type="button"
            onClick={() => openHrViewGuide()}
            className="rounded-full border border-line bg-surface/90 px-3 py-1.5 text-[11px] font-semibold text-ink-muted shadow-sm backdrop-blur-md transition-colors hover:border-ink/15 hover:text-ink sm:px-4 sm:text-xs"
          >
            {hrGuide.openButtonLabel}
          </button>
        ) : null}
        {editPermissionLoaded && canEdit ? (
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
        ) : null}
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
              onClick={() => closeHelp(true)}
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
                <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                  {mode === "zh"
                    ? "下方 9 步与页面分步引导一致。首次进入编辑链接会自动打开本说明，建议点「开始 9 步引导」跟着高亮走一遍。"
                    : "The 9 steps below match the on-page tour. This dialog opens on first Edit URL visit—tap Start 9-step tour to follow along."}
                </p>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 text-sm leading-relaxed text-ink/90 sm:px-6">
                <pre className="whitespace-pre-wrap font-sans text-[13px]">
                  {HELP_GUIDE_TEXT[mode]}
                </pre>
                <div className="mt-6 flex flex-col gap-2 border-t border-line pt-4">
                  <button
                    type="button"
                    className="rounded-full border border-line bg-paper py-2.5 text-sm font-medium text-ink hover:bg-ink/[0.04]"
                    onClick={() => {
                      resetSiteTourCompletion();
                      closeHelp(false);
                      window.setTimeout(() => dispatchStartSiteTour(), 320);
                    }}
                  >
                    {mode === "zh"
                      ? "重新播放新手引导"
                      : "Replay onboarding tour"}
                  </button>
                </div>
              </div>
              <div className="shrink-0 space-y-2 border-t border-line px-5 py-3 sm:px-6">
                <button
                  type="button"
                  onClick={beginTourFromHelp}
                  className="w-full rounded-full bg-ink py-3 text-sm font-medium text-paper hover:opacity-90"
                >
                  {mode === "zh" ? "开始 9 步引导" : "Start 9-step tour"}
                </button>
                <button
                  type="button"
                  onClick={() => closeHelp(true)}
                  className="w-full rounded-full border border-line bg-paper py-2.5 text-sm font-medium text-ink-muted hover:border-ink/20 hover:text-ink"
                >
                  {mode === "zh" ? "我先自己看看" : "Browse on my own"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
