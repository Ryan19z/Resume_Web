"use client";

import { EducationEditorPanel } from "@/components/EducationEditorPanel";
import { ExperienceEditorModal } from "@/components/ExperienceEditorModal";
import { useLanguageMode } from "@/context/LanguageModeProvider";
import { useSiteContent } from "@/context/SiteContentProvider";
import { defaultSiteContent } from "@/lib/default-site-content";
import { SEAMLESS_INPUT } from "@/lib/inline-edit-styles";
import type { EducationItem, ExperienceItem } from "@/lib/types";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

const DEBOUNCE_MS = 550;

const listVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 260, damping: 28, mass: 0.85 },
  },
};

function ExperienceSection({
  items,
  onOpen,
  showExpEdit,
  onEdit,
  onDelete,
  editLabel,
  deleteLabel,
  sectionEyebrow,
  cardCta,
  headerExtra,
}: {
  items: ExperienceItem[];
  onOpen: (id: string) => void;
  showExpEdit: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  editLabel: string;
  deleteLabel: string;
  sectionEyebrow: ReactNode;
  cardCta: string;
  headerExtra?: ReactNode;
}) {
  return (
    <div className="mb-14">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1 text-[13px] font-medium uppercase tracking-[0.2em] text-ink-muted">
          {sectionEyebrow}
        </div>
        {headerExtra ? <div className="print:hidden">{headerExtra}</div> : null}
      </div>
      <motion.ul
        role="list"
        className="m-0 flex list-none flex-col gap-4 p-0"
        variants={listVariants}
        initial="show"
        animate="show"
      >
        {items.map((c) => (
          <motion.li
            key={c.id}
            role="listitem"
            variants={itemVariants}
            className="micro-card list-none rounded-2xl border border-line bg-surface/70 shadow-[0_1px_0_rgba(0,0,0,0.04)] backdrop-blur-sm print:break-inside-avoid"
          >
            <div className="flex flex-col sm:flex-row">
              <button
                type="button"
                onClick={() => onOpen(c.id)}
                className="flex-1 px-6 py-5 text-left transition-colors hover:bg-ink/[0.03]"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                  <h3 className="text-base font-semibold tracking-[-0.01em]">
                    {c.title}
                  </h3>
                  <span className="text-[13px] tabular-nums text-ink-muted">
                    {c.period}
                  </span>
                </div>
                <p className="mt-1 text-sm text-ink-muted">{c.subtitle}</p>
                {c.summary ? (
                  <p className="mt-3 text-sm leading-relaxed text-ink/85">
                    {c.summary}
                  </p>
                ) : null}
                <p className="mt-4 text-[13px] font-medium text-ink-muted">
                  {cardCta}
                </p>
              </button>
              {showExpEdit ? (
                <div className="flex shrink-0 border-t border-line print:hidden sm:border-l sm:border-t-0">
                  <button
                    type="button"
                    onClick={() => onEdit(c.id)}
                    className="w-full px-5 py-3 text-sm font-medium text-ink-muted transition-colors hover:bg-ink/[0.04] hover:text-ink sm:w-auto sm:py-0 sm:pt-8"
                  >
                    {editLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(c.id)}
                    className="w-full border-l border-line px-5 py-3 text-sm font-medium text-red-600/80 transition-colors hover:bg-red-50 hover:text-red-600 sm:w-auto sm:py-0 sm:pt-8"
                  >
                    {deleteLabel}
                  </button>
                </div>
              ) : null}
            </div>
          </motion.li>
        ))}
      </motion.ul>
    </div>
  );
}

function EducationSection({
  items,
  onOpen,
  cardCta,
}: {
  items: EducationItem[];
  onOpen: (id: string) => void;
  cardCta: string;
}) {
  return (
    <div>
      <motion.ul
        role="list"
        className="m-0 flex list-none flex-col gap-4 p-0"
        variants={listVariants}
        initial="show"
        animate="show"
      >
        {items.map((c) => (
          <motion.li
            key={c.id}
            role="listitem"
            variants={itemVariants}
            className="list-none print:break-inside-avoid"
          >
            <button
              type="button"
              onClick={() => onOpen(c.id)}
              className="micro-card w-full rounded-2xl border border-line bg-surface/70 px-6 py-5 text-left shadow-[0_1px_0_rgba(0,0,0,0.04)] backdrop-blur-sm transition-transform duration-200 hover:border-ink/12 active:scale-[0.99]"
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                <h3 className="text-base font-semibold tracking-[-0.01em]">
                  {c.title}
                </h3>
                <span className="text-[13px] tabular-nums text-ink-muted">
                  {c.period}
                </span>
              </div>
              <p className="mt-1 text-sm text-ink-muted">{c.subtitle}</p>
              <p className="mt-4 text-[13px] font-medium text-ink-muted">
                {cardCta}
              </p>
            </button>
          </motion.li>
        ))}
      </motion.ul>
    </div>
  );
}

export function ResumePage() {
  const { mode } = useLanguageMode();
  const {
    site,
    openExperienceDetail,
    openEducationDetail,
    canEdit,
    previewMode,
    addExperienceItem,
    removeExperienceItem,
    updateEducationItems,
    addEducationItem,
    removeEducationItem,
    editPermissionLoaded,
    updateResumeCopy,
  } = useSiteContent();
  const rc = site.resumeCopy ?? defaultSiteContent.resumeCopy;
  const experience = Array.isArray(site.experience)
    ? site.experience
    : defaultSiteContent.experience;
  const education = Array.isArray(site.education)
    ? site.education
    : defaultSiteContent.education;
  const [expEditorId, setExpEditorId] = useState<string | null>(null);
  const [eduEditing, setEduEditing] = useState(false);
  const showAuthorTools = canEdit && !previewMode;
  const canInline = editPermissionLoaded && canEdit && !previewMode;
  const i18n = {
    edit: mode === "zh" ? "编辑" : "Edit",
    remove: mode === "zh" ? "删除" : "Delete",
    addExp: mode === "zh" ? "+ 添加工作经历" : "+ Add experience",
    addEdu: mode === "zh" ? "+ 添加教育经历" : "+ Add education",
    closeEdit: mode === "zh" ? "关闭编辑" : "Close editor",
    editSave: mode === "zh" ? "编辑 / 保存" : "Edit / Save",
    confirmDeleteExp:
      mode === "zh"
        ? "确认删除这条工作经历吗？删除后无法自动恢复。"
        : "Delete this experience item?",
  };

  const [pageEyebrow, setPageEyebrow] = useState(() => rc.pageEyebrow ?? "");
  const [pageTitle, setPageTitle] = useState(() => rc.pageTitle ?? "");
  const [pageIntro, setPageIntro] = useState(() => rc.pageIntro ?? "");
  const [expSectionEyebrow, setExpSectionEyebrow] = useState(
    () => rc.experienceSectionEyebrow ?? "",
  );
  const [eduSectionEyebrow, setEduSectionEyebrow] = useState(
    () => rc.educationSectionEyebrow ?? "",
  );
  const [expCardCta, setExpCardCta] = useState(() => rc.experienceCardCta ?? "");
  const [eduCardCta, setEduCardCta] = useState(() => rc.educationCardCta ?? "");

  const siteSnap = JSON.stringify(rc);
  const saveRef = useRef(updateResumeCopy);
  saveRef.current = updateResumeCopy;
  const skipAutoSaveRef = useRef(true);

  useEffect(() => {
    const next = site.resumeCopy ?? defaultSiteContent.resumeCopy;
    setPageEyebrow(next.pageEyebrow ?? "");
    setPageTitle(next.pageTitle ?? "");
    setPageIntro(next.pageIntro ?? "");
    setExpSectionEyebrow(next.experienceSectionEyebrow ?? "");
    setEduSectionEyebrow(next.educationSectionEyebrow ?? "");
    setExpCardCta(next.experienceCardCta ?? "");
    setEduCardCta(next.educationCardCta ?? "");
  }, [siteSnap]);

  useEffect(() => {
    if (!canInline) {
      skipAutoSaveRef.current = true;
      return;
    }
    if (skipAutoSaveRef.current) {
      skipAutoSaveRef.current = false;
      return;
    }
    const t = window.setTimeout(() => {
      saveRef.current({
        pageEyebrow,
        pageTitle,
        pageIntro,
        experienceSectionEyebrow: expSectionEyebrow,
        educationSectionEyebrow: eduSectionEyebrow,
        experienceCardCta: expCardCta,
        educationCardCta: eduCardCta,
      });
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [
    pageEyebrow,
    pageTitle,
    pageIntro,
    expSectionEyebrow,
    eduSectionEyebrow,
    expCardCta,
    eduCardCta,
    canInline,
  ]);

  return (
    <div className="relative isolate px-10 pb-24 pt-20 sm:px-16 md:px-24">
      <header className="mb-12 max-w-xl">
        {canInline ? (
          <>
            <input
              type="text"
              name="resume-page-eyebrow"
              title="点击修改，停顿后自动保存"
              value={pageEyebrow}
              onChange={(e) => setPageEyebrow(e.target.value)}
              maxLength={48}
              className={`${SEAMLESS_INPUT} mb-3 block w-full text-[13px] font-medium uppercase tracking-[0.22em] text-ink-muted`}
            />
            <input
              type="text"
              name="resume-page-title"
              title="点击修改，停顿后自动保存"
              value={pageTitle}
              onChange={(e) => setPageTitle(e.target.value)}
              maxLength={48}
              className={`${SEAMLESS_INPUT} block w-full text-3xl font-semibold tracking-[-0.03em] text-ink sm:text-4xl`}
            />
            <textarea
              name="resume-page-intro"
              title="点击修改，停顿后自动保存"
              value={pageIntro}
              onChange={(e) => setPageIntro(e.target.value)}
              maxLength={400}
              rows={4}
              className={`${SEAMLESS_INPUT} mt-3 max-w-md resize-y text-sm leading-relaxed text-ink-muted`}
            />
          </>
        ) : (
          <>
            <p className="mb-3 text-[13px] font-medium uppercase tracking-[0.22em] text-ink-muted">
              {rc.pageEyebrow}
            </p>
            <h2 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
              {rc.pageTitle}
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-muted">
              {rc.pageIntro}
            </p>
          </>
        )}
      </header>

      <ExperienceSection
        items={experience}
        onOpen={openExperienceDetail}
        showExpEdit={showAuthorTools}
        onEdit={(id) => setExpEditorId(id)}
        onDelete={(id) => {
          if (!window.confirm(i18n.confirmDeleteExp)) return;
          removeExperienceItem(id);
          if (expEditorId === id) setExpEditorId(null);
        }}
        editLabel={i18n.edit}
        deleteLabel={i18n.remove}
        sectionEyebrow={
          canInline ? (
            <input
              type="text"
              name="resume-exp-section-eyebrow"
              title="点击修改，停顿后自动保存"
              value={expSectionEyebrow}
              onChange={(e) => setExpSectionEyebrow(e.target.value)}
              maxLength={48}
              className={`${SEAMLESS_INPUT} w-full text-[13px] font-medium uppercase tracking-[0.2em] text-ink-muted`}
            />
          ) : (
            rc.experienceSectionEyebrow
          )
        }
        cardCta={canInline ? expCardCta : rc.experienceCardCta}
        headerExtra={
          showAuthorTools ? (
            <button
              type="button"
              onClick={() => {
                const id = addExperienceItem();
                setExpEditorId(id);
              }}
              className="rounded-full border border-dashed border-ink/20 bg-surface/90 px-4 py-2 text-xs font-medium text-ink-muted transition-colors hover:border-ink/30 hover:text-ink"
            >
              {i18n.addExp}
            </button>
          ) : null
        }
      />

      <div className="mb-14">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          {canInline ? (
            <input
              type="text"
              name="resume-edu-section-eyebrow"
              title="点击修改，停顿后自动保存"
              value={eduSectionEyebrow}
              onChange={(e) => setEduSectionEyebrow(e.target.value)}
              maxLength={48}
              className={`${SEAMLESS_INPUT} min-w-0 flex-1 text-[13px] font-medium uppercase tracking-[0.2em] text-ink-muted sm:max-w-md`}
            />
          ) : (
            <p className="text-[13px] font-medium uppercase tracking-[0.2em] text-ink-muted">
              {rc.educationSectionEyebrow}
            </p>
          )}
          {showAuthorTools ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  const id = addEducationItem();
                  setEduEditing(true);
                  setTimeout(() => {
                    const el = document.getElementById(`edu-entry-${id}`);
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                  }, 50);
                }}
                className="rounded-full border border-dashed border-ink/20 bg-surface/90 px-4 py-2 text-xs font-medium text-ink-muted transition-colors hover:border-ink/30 hover:text-ink print:hidden"
              >
                {i18n.addEdu}
              </button>
              <button
                type="button"
                onClick={() => setEduEditing((v) => !v)}
                className="rounded-full border border-line bg-surface px-4 py-2 text-xs font-medium text-ink-muted shadow-sm transition-colors hover:border-ink/15 hover:text-ink print:hidden"
              >
                {eduEditing ? i18n.closeEdit : i18n.editSave}
              </button>
            </div>
          ) : null}
        </div>

        {showAuthorTools && eduEditing ? (
          <EducationEditorPanel
            open={eduEditing}
            items={education}
            onSave={updateEducationItems}
            onRemoveItem={removeEducationItem}
            onClose={() => setEduEditing(false)}
          />
        ) : (
          <EducationSection
            items={education}
            onOpen={openEducationDetail}
            cardCta={canInline ? eduCardCta : rc.educationCardCta}
          />
        )}
      </div>

      <ExperienceEditorModal
        open={Boolean(expEditorId)}
        experienceId={expEditorId}
        onClose={() => setExpEditorId(null)}
      />
    </div>
  );
}
