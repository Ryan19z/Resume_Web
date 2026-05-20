"use client";

import { useSiteContent } from "@/context/SiteContentProvider";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import type { ResumeCopy } from "@/lib/types";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useId, useState } from "react";

function field<K extends keyof ResumeCopy>(
  key: K,
  label: string,
  value: ResumeCopy[K],
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

export function ResumePageCopyModal() {
  const {
    site,
    updateResumeCopy,
    resumePageCopyModalOpen,
    closeResumePageCopyModal,
    canEdit,
    editPermissionLoaded,
  } = useSiteContent();
  const [draft, setDraft] = useState<ResumeCopy>(site.resumeCopy);
  const titleId = useId();

  useEffect(() => {
    if (resumePageCopyModalOpen) setDraft(site.resumeCopy);
  }, [resumePageCopyModalOpen, site.resumeCopy]);

  useEffect(() => {
    if (editPermissionLoaded && !canEdit) closeResumePageCopyModal();
  }, [canEdit, editPermissionLoaded, closeResumePageCopyModal]);

  useBodyScrollLock(resumePageCopyModalOpen);

  useEffect(() => {
    if (!resumePageCopyModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeResumePageCopyModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [resumePageCopyModalOpen, closeResumePageCopyModal]);

  if (!canEdit) return null;

  const patch = (key: keyof ResumeCopy, v: string) => {
    setDraft((d) => ({ ...d, [key]: v }));
  };

  const save = () => {
    updateResumeCopy(draft);
    closeResumePageCopyModal();
  };

  return (
    <AnimatePresence>
      {resumePageCopyModalOpen ? (
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
            onClick={closeResumePageCopyModal}
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
                编辑履历页文案
              </h2>
              <p className="mt-1 text-xs text-ink-muted">
                含页眉、分区标题、卡片引导与详情页顶栏用语；保存后写入本机浏览器。
              </p>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
              {field(
                "pageEyebrow",
                "页眉小标题（如 Résumé）",
                draft.pageEyebrow,
                (v) => patch("pageEyebrow", v),
              )}
              {field("pageTitle", "主标题（如 履历）", draft.pageTitle, (v) =>
                patch("pageTitle", v),
              )}
              {field(
                "pageIntro",
                "页眉说明段落",
                draft.pageIntro,
                (v) => patch("pageIntro", v),
                true,
              )}
              {field(
                "experienceSectionEyebrow",
                "工作经历 · 分区标题",
                draft.experienceSectionEyebrow,
                (v) => patch("experienceSectionEyebrow", v),
              )}
              {field(
                "educationSectionEyebrow",
                "教育背景 · 分区标题",
                draft.educationSectionEyebrow,
                (v) => patch("educationSectionEyebrow", v),
              )}
              {field(
                "experienceCardCta",
                "经历卡片底部引导",
                draft.experienceCardCta,
                (v) => patch("experienceCardCta", v),
              )}
              {field(
                "educationCardCta",
                "教育卡片底部引导",
                draft.educationCardCta,
                (v) => patch("educationCardCta", v),
              )}
              {field(
                "detailWorkEyebrow",
                "工作经历详情 · 顶栏标签",
                draft.detailWorkEyebrow,
                (v) => patch("detailWorkEyebrow", v),
              )}
              {field(
                "detailCampusEyebrow",
                "校园成果详情 · 顶栏标签",
                draft.detailCampusEyebrow,
                (v) => patch("detailCampusEyebrow", v),
              )}
              {field(
                "keyResultsHeading",
                "关键成果 · 小标题",
                draft.keyResultsHeading,
                (v) => patch("keyResultsHeading", v),
              )}
              {field(
                "repProjectsHeading",
                "代表项目 · 小标题",
                draft.repProjectsHeading,
                (v) => patch("repProjectsHeading", v),
              )}
            </div>
            <div className="flex shrink-0 gap-2 border-t border-line bg-surface px-6 py-4">
              <button
                type="button"
                onClick={closeResumePageCopyModal}
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
