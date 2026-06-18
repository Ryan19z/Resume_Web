"use client";

import { useSiteContent } from "@/context/SiteContentProvider";
import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useEffect, useId, useRef, useState } from "react";

const ViewLogModal = dynamic(
  () =>
    import("@/components/ViewLogModal").then((m) => ({
      default: m.ViewLogModal,
    })),
  { ssr: false },
);

const QUICK_ACTION_CLASS =
  "flex max-w-[min(92vw,240px)] items-center gap-2 rounded-full border border-line bg-surface/90 px-3 py-2 text-left text-[12px] font-medium text-ink shadow-[0_1px_0_rgb(0_0_0/0.04)] backdrop-blur-md transition-colors hover:border-ink/12 hover:bg-surface";

/**
 * 右下角编辑入口：常用功能（导入、访问记录）独立展示，文案编辑收进「站点编辑」菜单。
 */
export function SiteEditorDock() {
  const {
    canEdit,
    editPermissionLoaded,
    previewMode,
    openSetupModal,
    openResumePageCopyModal,
    openPortfolioPageCopyModal,
    openResumeImportModal,
  } = useSiteContent();
  const [open, setOpen] = useState(false);
  const [viewLogOpen, setViewLogOpen] = useState(false);
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
    <>
      <div
        id="tour-site-editor"
        ref={rootRef}
        className="pointer-events-auto fixed bottom-5 right-5 z-[66] flex flex-col items-end gap-2 print:hidden sm:bottom-8 sm:right-8"
        style={{
          paddingBottom: "max(0px, env(safe-area-inset-bottom, 0px))",
        }}
      >
        <button
          id="tour-resume-import"
          type="button"
          onClick={() => openResumeImportModal()}
          className={QUICK_ACTION_CLASS}
          title="上传 PDF/Word，自动识别并填入各区块"
        >
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink/[0.06] text-[12px] text-ink"
            aria-hidden
          >
            ↑
          </span>
          <span className="min-w-0 pr-0.5">
            <span className="block leading-tight">智能导入简历</span>
            <span className="block text-[11px] font-normal text-ink-muted">
              PDF / Word 自动填入
            </span>
          </span>
        </button>

        <button
          id="tour-view-log"
          type="button"
          onClick={() => setViewLogOpen(true)}
          className={QUICK_ACTION_CLASS}
          title="查看只读链接何时被打开、来自哪里"
        >
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink/[0.06] text-[12px] text-ink"
            aria-hidden
          >
            ◷
          </span>
          <span className="min-w-0 pr-0.5">
            <span className="block leading-tight">链接访问记录</span>
            <span className="block text-[11px] font-normal text-ink-muted">
              打开时间与大致地区
            </span>
          </span>
        </button>

        <div className="relative">
          <button
            type="button"
            aria-expanded={open}
            aria-haspopup="menu"
            aria-controls={open ? menuId : undefined}
            onClick={() => setOpen((v) => !v)}
            className="flex max-w-[min(92vw,240px)] items-center gap-2 rounded-full border border-line bg-surface/90 px-3.5 py-2 text-left text-[12px] font-medium text-ink shadow-[0_1px_0_rgb(0_0_0/0.04)] backdrop-blur-md transition-colors hover:border-ink/12 hover:bg-surface"
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
                首屏 · 履历与作品文案
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
      </div>

      <ViewLogModal open={viewLogOpen} onClose={() => setViewLogOpen(false)} />
    </>
  );
}
