"use client";

import { useSiteContent } from "@/context/SiteContentProvider";
import type { PortfolioCopy } from "@/lib/types";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useId, useState } from "react";

function field<K extends keyof PortfolioCopy>(
  key: K,
  label: string,
  value: PortfolioCopy[K],
  onChange: (v: string) => void,
  multiline?: boolean,
) {
  return (
    <label key={key} className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {multiline ? (
        <textarea
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="resize-y rounded-xl border border-line bg-paper px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-ink/20"
        />
      ) : (
        <input
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
          className="rounded-xl border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-ink/20"
        />
      )}
    </label>
  );
}

export function PortfolioPageCopyModal() {
  const {
    site,
    updatePortfolioCopy,
    portfolioPageCopyModalOpen,
    closePortfolioPageCopyModal,
    canEdit,
    editPermissionLoaded,
  } = useSiteContent();
  const [draft, setDraft] = useState<PortfolioCopy>(site.portfolioCopy);
  const titleId = useId();

  useEffect(() => {
    if (portfolioPageCopyModalOpen) setDraft(site.portfolioCopy);
  }, [portfolioPageCopyModalOpen, site.portfolioCopy]);

  useEffect(() => {
    if (editPermissionLoaded && !canEdit) closePortfolioPageCopyModal();
  }, [canEdit, editPermissionLoaded, closePortfolioPageCopyModal]);

  useEffect(() => {
    if (!portfolioPageCopyModalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePortfolioPageCopyModal();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [portfolioPageCopyModalOpen, closePortfolioPageCopyModal]);

  if (!canEdit) return null;

  const patch = (key: keyof PortfolioCopy, v: string) => {
    setDraft((d) => ({ ...d, [key]: v }));
  };

  const save = () => {
    updatePortfolioCopy(draft);
    closePortfolioPageCopyModal();
  };

  return (
    <AnimatePresence>
      {portfolioPageCopyModalOpen ? (
        <motion.div
          className="fixed inset-0 z-[82] flex items-end justify-center print:hidden sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="关闭"
            className="absolute inset-0 bg-ink/35 backdrop-blur-[2px]"
            onClick={closePortfolioPageCopyModal}
          />
          <motion.div
            role="dialog"
            aria-modal
            aria-labelledby={titleId}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            className="relative z-[83] flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-line bg-surface shadow-2xl sm:max-h-[88vh] sm:rounded-3xl"
          >
            <div className="shrink-0 border-b border-line px-6 py-4">
              <h2
                id={titleId}
                className="text-lg font-semibold tracking-[-0.02em]"
              >
                编辑作品页文案
              </h2>
              <p className="mt-1 text-xs text-ink-muted">
                含页眉、主标题、说明与卡片上的引导用语；保存后写入本机浏览器。
              </p>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
              {field(
                "pageEyebrow",
                "页眉小标题（如 Work）",
                draft.pageEyebrow,
                (v) => patch("pageEyebrow", v),
              )}
              {field(
                "pageTitle",
                "主标题（如 作品集）",
                draft.pageTitle,
                (v) => patch("pageTitle", v),
              )}
              {field(
                "pageIntro",
                "页眉说明段落",
                draft.pageIntro,
                (v) => patch("pageIntro", v),
                true,
              )}
              {field(
                "openLinkLabel",
                "封面右下角按钮文字",
                draft.openLinkLabel,
                (v) => patch("openLinkLabel", v),
              )}
              {field(
                "posterThumbTitle",
                "卡片底部 · 主行标题",
                draft.posterThumbTitle,
                (v) => patch("posterThumbTitle", v),
              )}
              {field(
                "posterThumbCaption",
                "卡片底部 · 辅助说明",
                draft.posterThumbCaption,
                (v) => patch("posterThumbCaption", v),
                true,
              )}
            </div>
            <div className="flex shrink-0 gap-2 border-t border-line bg-surface px-6 py-4">
              <button
                type="button"
                onClick={closePortfolioPageCopyModal}
                className="flex-1 rounded-full border border-line py-3 text-sm font-medium text-ink-muted hover:bg-ink/[0.04]"
              >
                取消
              </button>
              <button
                type="button"
                onClick={save}
                className="flex-1 rounded-full bg-ink py-3 text-sm font-medium text-white hover:opacity-90"
              >
                保存
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
