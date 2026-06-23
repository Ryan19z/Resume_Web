"use client";

import { useLanguageMode } from "@/context/LanguageModeProvider";
import { useSiteContent } from "@/context/SiteContentProvider";
import { getHrViewGuide } from "@/lib/hr-view-guide-content";
import {
  HR_VIEW_GUIDE_OPEN_EVENT,
  hasOfferedHrGuideThisSession,
  hasSeenHrViewGuide,
  markHrGuideOfferedThisSession,
  markHrViewGuideSeen,
} from "@/lib/hr-view-guide-state";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useId, useState } from "react";

/**
 * ViewURL / HR 只读端：首次自动弹出查看说明，也可从右上角「查看说明」再次打开。
 */
export function HrViewGuide() {
  const { mode } = useLanguageMode();
  const { canEdit, editPermissionLoaded, previewMode } = useSiteContent();
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const guide = getHrViewGuide(mode);

  const isHrVisitor = editPermissionLoaded && !canEdit && !previewMode;

  useBodyScrollLock(open && isHrVisitor);

  useEffect(() => {
    if (!isHrVisitor) return;

    const onOpen = () => setOpen(true);
    window.addEventListener(HR_VIEW_GUIDE_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(HR_VIEW_GUIDE_OPEN_EVENT, onOpen);
  }, [isHrVisitor]);

  useEffect(() => {
    if (!isHrVisitor) return;
    if (hasSeenHrViewGuide() || hasOfferedHrGuideThisSession()) return;
    markHrGuideOfferedThisSession();
    const timer = window.setTimeout(() => setOpen(true), 700);
    return () => window.clearTimeout(timer);
  }, [isHrVisitor]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeGuide();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const closeGuide = (markSeen = false) => {
    if (markSeen) markHrViewGuideSeen();
    setOpen(false);
  };

  if (!isHrVisitor) return null;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[84] flex items-end justify-center print:hidden sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label={guide.closeLabel}
            className="absolute inset-0 bg-ink/35 backdrop-blur-[2px]"
            onClick={() => closeGuide(true)}
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
                className="text-lg font-semibold tracking-[-0.02em] text-ink"
              >
                {guide.title}
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
                {guide.subtitle}
              </p>
            </div>
            <ol className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
              {guide.steps.map((step) => (
                <li key={step.title} className="text-sm leading-relaxed">
                  <p className="font-semibold text-ink">{step.title}</p>
                  <p className="mt-1 text-ink-muted">{step.body}</p>
                </li>
              ))}
            </ol>
            <div className="shrink-0 border-t border-line px-5 py-3 sm:px-6">
              <p className="mb-3 text-[11px] leading-relaxed text-ink-muted">
                {guide.footerNote}
              </p>
              <button
                type="button"
                onClick={() => closeGuide(true)}
                className="w-full rounded-full bg-ink py-3 text-sm font-medium text-paper hover:opacity-90"
              >
                {guide.gotItLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
