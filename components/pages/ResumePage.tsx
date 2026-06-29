"use client";

import { SITE_PAPER_SECTION_X } from "@/components/SitePaperFrame";
import { EducationEditorPanel } from "@/components/EducationEditorPanel";
import { ExperienceEditorModal } from "@/components/ExperienceEditorModal";
import { RepresentativeProjectOverlay } from "@/components/RepresentativeProjectOverlay";
import { useInteractionMode } from "@/context/InteractionModeProvider";
import { useLanguageMode } from "@/context/LanguageModeProvider";
import { useSiteContent } from "@/context/SiteContentProvider";
import { defaultSiteContent } from "@/lib/default-site-content";
import {
  educationCardHasMoreBullets,
  experienceCardHasMoreKeyResults,
  getEducationCardBullets,
  getExperienceCardKeyResults,
} from "@/lib/experience-card-display";
import { SEAMLESS_INPUT } from "@/lib/inline-edit-styles";
import {
  representativeProjectHasOpenableMedia,
  representativeProjectMediaLabel,
} from "@/lib/representative-project-labels";
import type { EducationItem, ExperienceItem, RepresentativeProject } from "@/lib/types";
import { resolveEducationDisplay } from "@/lib/education-display";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { useInlineEditAutosave } from "@/lib/use-inline-edit-autosave";
import { useCallback, useEffect, useRef, useState } from "react";

const DEBOUNCE_MS = 550;

function SpreadRepProjectItem({
  project,
  locale,
  onOpenRepProject,
}: {
  project: RepresentativeProject;
  locale: "zh" | "en";
  onOpenRepProject: (project: RepresentativeProject) => void;
}) {
  const openable = representativeProjectHasOpenableMedia(project.media);
  const mediaLabel = project.media
    ? representativeProjectMediaLabel(project.media, locale)
    : "";

  if (!openable) {
    return (
      <div className="rounded-lg border border-line/70 bg-paper/45 px-3 py-2 text-sm leading-relaxed">
        <span className="font-medium text-ink">{project.title}</span>
        {project.description?.trim() ? (
          <span className="text-ink-muted"> — {project.description.trim()}</span>
        ) : null}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpenRepProject(project);
      }}
      className="micro-card w-full rounded-lg border border-line/70 bg-paper/45 px-3 py-2.5 text-left transition-colors hover:border-[rgb(var(--selection)/0.28)] hover:bg-[rgb(var(--selection)/0.06)]"
    >
      <span className="font-medium text-ink">{project.title}</span>
      {project.description?.trim() ? (
        <span className="text-ink-muted"> — {project.description.trim()}</span>
      ) : null}
      <p className="mt-1.5 text-[12px] font-medium text-[rgb(var(--selection))]">
        {locale === "zh" ? `点击查看${mediaLabel} →` : `View ${mediaLabel} →`}
      </p>
    </button>
  );
}

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

function ExperienceCardBody({
  item,
  hrSpreadMode,
  cardCta,
  keyResultsHeading,
  repProjectsHeading,
  locale,
  onOpenRepProject,
}: {
  item: ExperienceItem;
  hrSpreadMode: boolean;
  cardCta: string;
  keyResultsHeading: string;
  repProjectsHeading: string;
  locale: "zh" | "en";
  onOpenRepProject: (project: RepresentativeProject) => void;
}) {
  const summary = item.summary?.trim() ?? "";
  const keyResults = getExperienceCardKeyResults(item, hrSpreadMode);
  const hasMoreResults =
    !hrSpreadMode && experienceCardHasMoreKeyResults(item);
  const repProjects = (item.representativeProjects ?? []).filter(
    (p) => p.title?.trim() || p.description?.trim(),
  );
  const showRepList = hrSpreadMode && repProjects.length > 0;
  const openableRepCount = repProjects.filter((p) =>
    representativeProjectHasOpenableMedia(p.media),
  ).length;

  return (
    <>
      {summary ? (
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink/85">
          {summary}
        </p>
      ) : null}
      {keyResults.length > 0 ? (
        <div className="mt-3">
          {hrSpreadMode ? (
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
              {keyResultsHeading}
            </p>
          ) : null}
          <ul className="flex flex-col gap-1.5">
            {keyResults.map((line, i) => (
              <li
                key={`${item.id}-kr-${i}`}
                className="flex gap-2.5 text-sm leading-relaxed text-ink/88"
              >
                <span
                  className="mt-[0.55rem] h-1 w-1 shrink-0 rounded-full bg-ink/35"
                  aria-hidden
                />
                <span>{line}</span>
              </li>
            ))}
          </ul>
          {hasMoreResults ? (
            <p className="mt-2 text-[12px] text-ink-muted">
              {locale === "zh"
                ? `还有 ${(item.keyResults ?? []).filter((x) => String(x ?? "").trim()).length - keyResults.length} 条成果，可开启 HR 摊开模式或点击查看详情`
                : `${(item.keyResults ?? []).filter((x) => String(x ?? "").trim()).length - keyResults.length} more outcomes — enable HR spread mode or open details`}
            </p>
          ) : null}
        </div>
      ) : !summary ? (
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          {locale === "zh" ? "点击查看详细成果与代表项目。" : "Open for outcomes and projects."}
        </p>
      ) : null}
      {showRepList ? (
        <div className="mt-4 border-t border-line/60 pt-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
            {repProjectsHeading}
          </p>
          <ul className="mt-2 space-y-2">
            {repProjects.map((project) => (
              <li key={project.id}>
                <SpreadRepProjectItem
                  project={project}
                  locale={locale}
                  onOpenRepProject={onOpenRepProject}
                />
              </li>
            ))}
          </ul>
          {openableRepCount > 0 ? (
            <p className="mt-2 text-[11px] text-ink-muted">
              {locale === "zh"
                ? "点击上方项目可直接预览图片、视频或文档"
                : "Tap a project above to preview images, video, or documents"}
            </p>
          ) : null}
        </div>
      ) : null}
      {!hrSpreadMode ? (
        <p className="mt-4 text-[13px] font-medium text-ink-muted">{cardCta}</p>
      ) : null}
    </>
  );
}

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
  hrSpreadMode,
  keyResultsHeading,
  repProjectsHeading,
  locale,
  onOpenRepProject,
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
  hrSpreadMode: boolean;
  keyResultsHeading: string;
  repProjectsHeading: string;
  locale: "zh" | "en";
  onOpenRepProject: (project: RepresentativeProject) => void;
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
            className="micro-card list-none rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.08)] backdrop-blur-sm print:break-inside-avoid"
          >
            <div className="flex flex-col sm:flex-row">
              <div
                role="button"
                tabIndex={0}
                onClick={() => onOpen(c.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpen(c.id);
                  }
                }}
                className="flex-1 cursor-pointer px-6 py-5 text-left transition-colors hover:bg-ink/[0.03]"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                  <h3 className="text-base font-semibold tracking-[-0.01em]">
                    {c.title}
                  </h3>
                  <span className="shrink-0 text-[13px] tabular-nums text-ink-muted sm:whitespace-nowrap sm:pl-3">
                    {c.period}
                  </span>
                </div>
                <p className="mt-1 text-sm text-ink-muted">{c.subtitle}</p>
                <ExperienceCardBody
                  item={c}
                  hrSpreadMode={hrSpreadMode}
                  cardCta={cardCta}
                  keyResultsHeading={keyResultsHeading}
                  repProjectsHeading={repProjectsHeading}
                  locale={locale}
                  onOpenRepProject={onOpenRepProject}
                />
              </div>
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
  hrSpreadMode,
  locale,
  repProjectsHeading,
  onOpenRepProject,
}: {
  items: EducationItem[];
  onOpen: (id: string) => void;
  cardCta: string;
  hrSpreadMode: boolean;
  locale: "zh" | "en";
  repProjectsHeading: string;
  onOpenRepProject: (project: RepresentativeProject) => void;
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
        {items.map((c) => {
          const { school, major } = resolveEducationDisplay(c);
          const bullets = getEducationCardBullets(c.campusHighlights ?? [], hrSpreadMode);
          const hasMoreBullets =
            !hrSpreadMode && educationCardHasMoreBullets(c.campusHighlights ?? []);
          const repProjects = (c.representativeProjects ?? []).filter(
            (p) => p.title?.trim() || p.description?.trim(),
          );
          const openableRepCount = repProjects.filter((p) =>
            representativeProjectHasOpenableMedia(p.media),
          ).length;
          return (
          <motion.li
            key={c.id}
            role="listitem"
            variants={itemVariants}
            className="list-none print:break-inside-avoid"
          >
            <div
              role="button"
              tabIndex={0}
              onClick={() => onOpen(c.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onOpen(c.id);
                }
              }}
              className="micro-card w-full cursor-pointer rounded-2xl border border-line bg-surface px-6 py-5 text-left shadow-[0_1px_2px_rgba(0,0,0,0.08)] backdrop-blur-sm transition-transform duration-200 hover:border-[rgb(var(--selection)/0.25)] active:scale-[0.99]"
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                <h3 className="text-base font-semibold tracking-[-0.01em]">
                  {school}
                </h3>
                <span className="text-[13px] tabular-nums text-ink-muted">
                  {c.period}
                </span>
              </div>
              <p className="mt-1 text-sm text-ink-muted">{major}</p>
              {c.summary?.trim() ? (
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink/85">
                  {c.summary.trim()}
                </p>
              ) : null}
              {bullets.length > 0 ? (
                <ul className={`flex flex-col gap-1.5 ${c.summary?.trim() ? "mt-3" : "mt-3"}`}>
                  {bullets.map((line, i) => (
                    <li
                      key={`${c.id}-edu-${i}`}
                      className="flex gap-2.5 text-sm leading-relaxed text-ink/88"
                    >
                      <span
                        className="mt-[0.55rem] h-1 w-1 shrink-0 rounded-full bg-ink/35"
                        aria-hidden
                      />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {hasMoreBullets ? (
                <p className="mt-2 text-[12px] text-ink-muted">
                  {locale === "zh"
                    ? "还有更多校园成果，可开启 HR 摊开模式或点击查看详情"
                    : "More campus highlights — enable HR spread mode or open details"}
                </p>
              ) : null}
              {hrSpreadMode && repProjects.length > 0 ? (
                <div className="mt-4 border-t border-line/60 pt-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                    {repProjectsHeading}
                  </p>
                  <ul className="mt-2 space-y-2">
                    {repProjects.map((project) => (
                      <li key={project.id}>
                        <SpreadRepProjectItem
                          project={project}
                          locale={locale}
                          onOpenRepProject={onOpenRepProject}
                        />
                      </li>
                    ))}
                  </ul>
                  {openableRepCount > 0 ? (
                    <p className="mt-2 text-[11px] text-ink-muted">
                      {locale === "zh"
                        ? "点击上方项目可直接预览图片、视频或文档"
                        : "Tap a project above to preview images, video, or documents"}
                    </p>
                  ) : null}
                </div>
              ) : null}
              {!hrSpreadMode ? (
                <p className="mt-4 text-[13px] font-medium text-ink-muted">
                  {cardCta}
                </p>
              ) : null}
            </div>
          </motion.li>
        );
        })}
      </motion.ul>
    </div>
  );
}

export function ResumePage() {
  const { mode } = useLanguageMode();
  const { hrSpreadMode } = useInteractionMode();
  const [activeRepProject, setActiveRepProject] =
    useState<RepresentativeProject | null>(null);
  useBodyScrollLock(Boolean(activeRepProject));

  useEffect(() => {
    if (!activeRepProject) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveRepProject(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeRepProject]);

  const {
    site,
    openExperienceDetail,
    openEducationDetail,
    canEdit,
    previewMode,
    addExperienceItem,
    removeExperienceItem,
    addProjectExperienceItem,
    removeProjectExperienceItem,
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
  const projectExperience = Array.isArray(site.projectExperience)
    ? site.projectExperience
    : defaultSiteContent.projectExperience;
  const education = Array.isArray(site.education)
    ? site.education
    : defaultSiteContent.education;
  const [expEditorId, setExpEditorId] = useState<string | null>(null);
  const [expEditorSection, setExpEditorSection] = useState<
    "experience" | "projectExperience"
  >("experience");
  const [eduEditing, setEduEditing] = useState(false);
  const showAuthorTools = canEdit && !previewMode;
  const canInline = editPermissionLoaded && canEdit && !previewMode;
  const showWorkSection = showAuthorTools || !previewMode || experience.length > 0;
  const showProjectSection =
    showAuthorTools || !previewMode || projectExperience.length > 0;
  const showEducationSection = showAuthorTools || !previewMode || education.length > 0;
  const i18n = {
    edit: mode === "zh" ? "编辑" : "Edit",
    remove: mode === "zh" ? "删除" : "Delete",
    addExp: mode === "zh" ? "+ 添加工作经历" : "+ Add experience",
    addProjectExp: mode === "zh" ? "+ 添加项目经历" : "+ Add project",
    addEdu: mode === "zh" ? "+ 添加教育经历" : "+ Add education",
    closeEdit: mode === "zh" ? "关闭编辑" : "Close editor",
    editSave: mode === "zh" ? "编辑 / 保存" : "Edit / Save",
    confirmDeleteExp:
      mode === "zh"
        ? "确认删除这条工作经历吗？删除后无法自动恢复。"
        : "Delete this experience item?",
    confirmDeleteProjectExp:
      mode === "zh"
        ? "确认删除这条项目经历吗？删除后无法自动恢复。"
        : "Delete this project item?",
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

  const saveRef = useRef(updateResumeCopy);
  saveRef.current = updateResumeCopy;

  const saveResumeCopy = useCallback(() => {
    saveRef.current({
      pageEyebrow,
      pageTitle,
      pageIntro,
      experienceSectionEyebrow: expSectionEyebrow,
      educationSectionEyebrow: eduSectionEyebrow,
      experienceCardCta: expCardCta,
      educationCardCta: eduCardCta,
    });
  }, [
    pageEyebrow,
    pageTitle,
    pageIntro,
    expSectionEyebrow,
    eduSectionEyebrow,
    expCardCta,
    eduCardCta,
  ]);

  useInlineEditAutosave(
    "resume-page",
    canInline,
    saveResumeCopy,
    [
      pageEyebrow,
      pageTitle,
      pageIntro,
      expSectionEyebrow,
      eduSectionEyebrow,
      expCardCta,
      eduCardCta,
    ],
    { debounceMs: DEBOUNCE_MS, resetToken: siteSnap },
  );

  return (
    <div className={`relative isolate ${SITE_PAPER_SECTION_X} pb-16 pt-12 sm:pb-20 sm:pt-16 md:pt-20`}>
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
              className={`${SEAMLESS_INPUT} mb-3 block w-full text-[12px] font-semibold uppercase tracking-[0.16em] text-ink-muted`}
            />
            <input
              type="text"
              name="resume-page-title"
              title="点击修改，停顿后自动保存"
              value={pageTitle}
              onChange={(e) => setPageTitle(e.target.value)}
              maxLength={48}
              className={`${SEAMLESS_INPUT} block w-full text-3xl font-bold tracking-[-0.03em] text-ink sm:text-4xl`}
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
            <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              {rc.pageEyebrow}
            </p>
            <h2 className="text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
              {rc.pageTitle}
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-muted">
              {rc.pageIntro}
            </p>
          </>
        )}
      </header>

      {showWorkSection ? (
        <ExperienceSection
          items={experience}
          onOpen={openExperienceDetail}
          showExpEdit={showAuthorTools}
          onEdit={(id) => {
            setExpEditorSection("experience");
            setExpEditorId(id);
          }}
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
          hrSpreadMode={hrSpreadMode}
          keyResultsHeading={rc.keyResultsHeading}
          repProjectsHeading={rc.repProjectsHeading}
          locale={mode}
          onOpenRepProject={setActiveRepProject}
          headerExtra={
            showAuthorTools ? (
              <button
                type="button"
                onClick={() => {
                  const id = addExperienceItem();
                  setExpEditorSection("experience");
                  setExpEditorId(id);
                }}
                className="rounded-full border border-dashed border-ink/20 bg-surface/90 px-4 py-2 text-xs font-medium text-ink-muted transition-colors hover:border-ink/30 hover:text-ink"
              >
                {i18n.addExp}
              </button>
            ) : null
          }
        />
      ) : null}

      {showProjectSection && projectExperience.length > 0 ? (
        <ExperienceSection
          items={projectExperience}
          onOpen={openExperienceDetail}
          showExpEdit={showAuthorTools}
          onEdit={(id) => {
            setExpEditorSection("projectExperience");
            setExpEditorId(id);
          }}
          onDelete={(id) => {
            if (!window.confirm(i18n.confirmDeleteProjectExp)) return;
            removeProjectExperienceItem(id);
            if (expEditorId === id) setExpEditorId(null);
          }}
          editLabel={i18n.edit}
          deleteLabel={i18n.remove}
          sectionEyebrow={
            <span>{rc.projectExperienceSectionEyebrow ?? "项目经历"}</span>
          }
          cardCta={mode === "zh" ? "查看项目详情 →" : "View project →"}
          hrSpreadMode={hrSpreadMode}
          keyResultsHeading={rc.keyResultsHeading}
          repProjectsHeading={rc.repProjectsHeading}
          locale={mode}
          onOpenRepProject={setActiveRepProject}
          headerExtra={
            showAuthorTools ? (
              <button
                type="button"
                onClick={() => {
                  const id = addProjectExperienceItem();
                  setExpEditorSection("projectExperience");
                  setExpEditorId(id);
                }}
                className="rounded-full border border-dashed border-ink/20 bg-surface/90 px-4 py-2 text-xs font-medium text-ink-muted transition-colors hover:border-ink/30 hover:text-ink"
              >
                {i18n.addProjectExp}
              </button>
            ) : null
          }
        />
      ) : null}
      {projectExperience.length === 0 && showAuthorTools ? (
        <div className="mb-14">
          <div className="mb-5 flex items-end justify-between gap-3">
            <div className="text-[13px] font-medium uppercase tracking-[0.2em] text-ink-muted">
              {rc.projectExperienceSectionEyebrow ?? "项目经历"}
            </div>
            <button
              type="button"
              onClick={() => {
                const id = addProjectExperienceItem();
                setExpEditorSection("projectExperience");
                setExpEditorId(id);
              }}
              className="rounded-full border border-dashed border-ink/20 bg-surface/90 px-4 py-2 text-xs font-medium text-ink-muted transition-colors hover:border-ink/30 hover:text-ink"
            >
              {i18n.addProjectExp}
            </button>
          </div>
        </div>
      ) : null}

      {showEducationSection ? (
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
            hrSpreadMode={hrSpreadMode}
            locale={mode}
            repProjectsHeading={rc.repProjectsHeading}
            onOpenRepProject={setActiveRepProject}
          />
        )}
      </div>
      ) : null}

      <ExperienceEditorModal
        open={Boolean(expEditorId)}
        experienceId={expEditorId}
        section={expEditorSection}
        onClose={() => setExpEditorId(null)}
      />
      <RepresentativeProjectOverlay
        project={activeRepProject}
        onClose={() => setActiveRepProject(null)}
        locale={mode}
      />
    </div>
  );
}
