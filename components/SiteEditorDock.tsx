"use client";

import { useSiteContent } from "@/context/SiteContentProvider";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useId, useRef, useState } from "react";

/**
 * 将各页的「编辑」入口收拢到右下角一处，与左下角主题切换对称，
 * 避免每屏角落重复出现悬浮按钮。
 */
export function SiteEditorDock() {
  const {
    canEdit,
    editPermissionLoaded,
    previewMode,
    openSetupModal,
    openResumePageCopyModal,
    openPortfolioPageCopyModal,
  } = useSiteContent();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (!editPermissionLoaded || !canEdit || previewMode) return null;

  return (
    <div
      id="tour-site-editor"
      ref={rootRef}
      className="pointer-events-auto fixed bottom-5 right-5 z-[66] print:hidden sm:bottom-8 sm:right-8"
      style={{
        paddingBottom: "max(0px, env(safe-area-inset-bottom, 0px))",
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-line bg-surface/90 px-3.5 py-2 text-left text-[12px] font-medium text-ink shadow-[0_1px_0_rgb(0_0_0/0.04)] backdrop-blur-md transition-colors hover:border-ink/12 hover:bg-surface"
      >
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink/[0.06] text-[13px] font-semibold text-ink"
          aria-hidden
        >
          ✎
        </span>
        <span className="min-w-0 pr-0.5">
          <span className="block leading-tight">站点编辑</span>
          <span className="block text-[11px] font-normal text-ink-muted">
            首屏 · 页面背景 · 履历与作品文案
          </span>
        </span>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            id={menuId}
            role="menu"
            aria-label="站点编辑"
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
            className="absolute bottom-full right-0 mb-2 w-[min(92vw,240px)] overflow-hidden rounded-2xl border border-line bg-surface/95 py-1 shadow-xl backdrop-blur-md"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                openSetupModal();
              }}
              className="flex w-full flex-col gap-0.5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-ink/[0.04]"
            >
              <span className="font-medium text-ink">首屏与形象</span>
              <span className="text-[11px] leading-snug text-ink-muted">
                姓名、介绍、形象照与首屏辅助文案
              </span>
            </button>
            <div className="mx-3 h-px bg-line/80" />
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                openResumePageCopyModal();
              }}
              className="flex w-full flex-col gap-0.5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-ink/[0.04]"
            >
              <span className="font-medium text-ink">履历页用词</span>
              <span className="text-[11px] leading-snug text-ink-muted">
                页眉、分区标题与详情页用语
              </span>
            </button>
            <div className="mx-3 h-px bg-line/80" />
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                openPortfolioPageCopyModal();
              }}
              className="flex w-full flex-col gap-0.5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-ink/[0.04]"
            >
              <span className="font-medium text-ink">作品页用词</span>
              <span className="text-[11px] leading-snug text-ink-muted">
                标题、说明与卡片上的引导文字
              </span>
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
