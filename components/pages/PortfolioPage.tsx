"use client";

import { SITE_PAPER_SECTION_X } from "@/components/SitePaperFrame";
import { useSiteContent } from "@/context/SiteContentProvider";
import { useLanguageMode } from "@/context/LanguageModeProvider";
import { defaultSiteContent } from "@/lib/default-site-content";
import {
  PLACEHOLDER_IMAGES,
  PORTFOLIO_LINK_PLACEHOLDER,
} from "@/lib/media-defaults";
import { SEAMLESS_INPUT } from "@/lib/inline-edit-styles";
import { isReasonableHttpUrl } from "@/lib/is-reasonable-http-url";
import { randomId } from "@/lib/random-id";
import type { PortfolioCopy, PortfolioProject } from "@/lib/types";
import { motion } from "framer-motion";
import { useInlineEditAutosave } from "@/lib/use-inline-edit-autosave";
import { useCallback, useEffect, useRef, useState } from "react";

const DEBOUNCE_MS = 550;

function ProjectCard({
  project,
  index,
  canEdit,
  onRemove,
  pageCopy,
  mode,
}: {
  project: PortfolioProject;
  index: number;
  canEdit: boolean;
  onRemove: (id: string) => void;
  pageCopy: PortfolioCopy;
  mode: "zh" | "en";
}) {
  const poster = project.posterSrc ?? project.coverSrc;
  const hasCover = Boolean(project.coverSrc?.trim());
  const safeHref =
    project.href && project.href !== "#" && isReasonableHttpUrl(project.href)
      ? project.href
      : null;
  if (!hasCover) {
    return (
      <motion.article
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 28,
          mass: 0.88,
          delay: index * 0.05,
        }}
        className="micro-card group relative flex flex-col rounded-2xl border border-line bg-surface p-6 shadow-[0_1px_2px_rgba(0,0,0,0.08)] print:break-inside-avoid"
      >
        {canEdit ? (
          <button
            type="button"
            aria-label={mode === "zh" ? "删除作品" : "Delete project"}
            onClick={() => onRemove(project.id)}
            className="absolute right-3 top-3 z-[2] rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm transition-colors hover:bg-black/60 print:hidden"
          >
            {mode === "zh" ? "删除" : "Delete"}
          </button>
        ) : null}
        <h3 className="pr-16 text-lg font-bold tracking-[-0.02em] text-ink">
          {project.title}
        </h3>
        {project.description ? (
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink/85">
            {project.description}
          </p>
        ) : null}
        {safeHref ? (
          <a
            href={safeHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex text-sm font-medium text-ink-muted underline-offset-2 hover:text-ink hover:underline"
          >
            {pageCopy.openLinkLabel}
          </a>
        ) : null}
      </motion.article>
    );
  }
  return (
    <motion.article
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 28,
        mass: 0.88,
        delay: index * 0.05,
      }}
      className="micro-card group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.08)] print:break-inside-avoid"
    >
      {canEdit ? (
        <button
          type="button"
          aria-label={mode === "zh" ? "删除作品" : "Delete project"}
          onClick={() => onRemove(project.id)}
          className="absolute right-3 top-3 z-[2] rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm transition-colors hover:bg-black/60 print:hidden"
        >
          {mode === "zh" ? "删除" : "Delete"}
        </button>
      ) : null}
      {safeHref ? (
        <a
          href={safeHref}
          target="_blank"
          rel="noopener noreferrer"
          className="relative block aspect-[16/10] overflow-hidden bg-line/40"
        >
          <img
            src={project.coverSrc}
            alt={project.title}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            loading={index < 2 ? "eager" : "lazy"}
            decoding="async"
            referrerPolicy="no-referrer"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-80" />
          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2 text-white">
            <div className="min-w-0">
              <h3 className="truncate text-base font-bold tracking-[-0.02em] drop-shadow-sm">
                {project.title}
              </h3>
              {project.description ? (
                <p className="mt-0.5 truncate text-xs font-medium text-white/90 drop-shadow-sm">
                  {project.description}
                </p>
              ) : null}
            </div>
            <span className="shrink-0 rounded-full bg-surface/25 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide backdrop-blur-md">
              {pageCopy.openLinkLabel}
            </span>
          </div>
        </a>
      ) : (
        <div className="relative block aspect-[16/10] overflow-hidden bg-line/40">
          <img
            src={project.coverSrc}
            alt={project.title}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            loading={index < 2 ? "eager" : "lazy"}
            decoding="async"
            referrerPolicy="no-referrer"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-80" />
          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2 text-white">
            <div className="min-w-0">
              <h3 className="truncate text-base font-bold tracking-[-0.02em] drop-shadow-sm">
                {project.title}
              </h3>
              {project.description ? (
                <p className="mt-0.5 truncate text-xs font-medium text-white/90 drop-shadow-sm">
                  {project.description}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center gap-3 border-t border-line/80 p-4">
        <div className="relative h-11 w-16 shrink-0 overflow-hidden rounded-lg bg-line/50">
          <img
            src={poster}
            alt={`${project.title} ${mode === "zh" ? "海报" : "poster"}`}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-ink-muted">
            {pageCopy.posterThumbTitle}
          </p>
          <p className="truncate text-xs text-ink-muted/90">
            {pageCopy.posterThumbCaption}
          </p>
        </div>
      </div>
    </motion.article>
  );
}

function AddProjectForm({
  onAdd,
  onCancel,
  mode,
}: {
  onAdd: (p: PortfolioProject) => void;
  onCancel: () => void;
  mode: "zh" | "en";
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverSrc, setCoverSrc] = useState<string>(PLACEHOLDER_IMAGES.wide1);
  const [posterSrc, setPosterSrc] = useState("");
  const [href, setHref] = useState("https://");
  const [linkError, setLinkError] = useState<string | null>(null);

  const submit = () => {
    const t = title.trim();
    if (!t) return;
    const link = href.trim();
    if (!isReasonableHttpUrl(link)) {
      setLinkError(
        mode === "zh"
          ? "请填写有效的 http(s) 作品链接（需包含完整域名，不能仅为 https://）"
          : "Please enter a valid http(s) portfolio URL with a full domain.",
      );
      return;
    }
    setLinkError(null);
    const cover = coverSrc.trim() || PLACEHOLDER_IMAGES.wide2;
    const post = posterSrc.trim();
    onAdd({
      id: randomId("proj-"),
      title: t,
      description: description.trim() || undefined,
      coverSrc: cover,
      posterSrc: post || undefined,
      href: link,
    });
    onCancel();
  };

  return (
    <div className="mb-10 rounded-3xl border border-line bg-surface p-6 shadow-[0_1px_2px_rgba(0,0,0,0.08)]">
      <h3 className="mb-1 text-base font-semibold tracking-[-0.02em]">
        {mode === "zh" ? "新增作品" : "Add project"}
      </h3>
      <p className="mb-5 text-xs leading-relaxed text-ink-muted">
        {mode === "zh"
          ? "填写标题、主图链接与 HR 要看的作品页链接；海报图为可选项。"
          : "Provide title, cover URL and portfolio link for HR review; poster image is optional."}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs sm:col-span-2">
          <span className="font-medium text-ink">标题</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-xl border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink/20"
            placeholder={mode === "zh" ? "例如：年度品牌片" : "e.g. Annual brand reel"}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs sm:col-span-2">
          <span className="font-medium text-ink">
            {mode === "zh" ? "简介（可选）" : "Summary (optional)"}
          </span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="rounded-xl border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink/20"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs sm:col-span-2">
          <span className="font-medium text-ink">
            {mode === "zh" ? "主图 / 封面 URL" : "Main image / cover URL"}
          </span>
          <input
            value={coverSrc}
            onChange={(e) => setCoverSrc(e.target.value)}
            className="rounded-xl border border-line bg-paper px-3 py-2 font-mono text-[11px] outline-none focus:border-ink/20"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs sm:col-span-2">
          <span className="font-medium text-ink">
            {mode === "zh"
              ? "海报 / 备选图 URL（可选）"
              : "Poster / fallback image URL (optional)"}
          </span>
          <input
            value={posterSrc}
            onChange={(e) => setPosterSrc(e.target.value)}
            className="rounded-xl border border-line bg-paper px-3 py-2 font-mono text-[11px] outline-none focus:border-ink/20"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs sm:col-span-2">
          <span className="font-medium text-ink">
            {mode === "zh"
              ? "作品外链（Behance / 视频页等）"
              : "External project link (Behance/video/etc.)"}
          </span>
          <input
            value={href}
            onChange={(e) => {
              setHref(e.target.value);
              if (linkError) setLinkError(null);
            }}
            className="rounded-xl border border-line bg-paper px-3 py-2 font-mono text-[11px] outline-none focus:border-ink/20"
            placeholder={PORTFOLIO_LINK_PLACEHOLDER}
          />
          {linkError ? (
            <span className="text-[11px] leading-relaxed text-red-600/90">
              {linkError}
            </span>
          ) : null}
        </label>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={submit}
          className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-white hover:opacity-90"
        >
          {mode === "zh" ? "添加到作品集" : "Add to portfolio"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-line px-5 py-2.5 text-sm font-medium text-ink-muted hover:bg-ink/[0.04]"
        >
          {mode === "zh" ? "取消" : "Cancel"}
        </button>
      </div>
    </div>
  );
}

export function PortfolioPage() {
  const { mode } = useLanguageMode();
  const {
    site,
    canEdit,
    previewMode,
    addPortfolioProject,
    removePortfolioProject,
    editPermissionLoaded,
    updatePortfolioCopy,
  } = useSiteContent();
  const [adding, setAdding] = useState(false);
  const pc = site.portfolioCopy ?? defaultSiteContent.portfolioCopy;
  const projects = Array.isArray(site.projects)
    ? site.projects
    : defaultSiteContent.projects;
  const showAuthorTools = canEdit && !previewMode;
  const canInline = editPermissionLoaded && canEdit && !previewMode;
  const i18n = {
    addEntry:
      mode === "zh" ? "+ 插入作品（链接与图片）" : "+ Add project (link + image)",
    helperTitle:
      mode === "zh"
        ? "作品卡片上的辅助文案（就地编辑，停顿后自动保存）"
        : "Card helper copy (inline edit, auto-save after pause)",
    tagOpenLabel: mode === "zh" ? "封面角标" : "Cover badge",
    thumbTitle: mode === "zh" ? "缩略图区标题" : "Thumbnail title",
    thumbCaption: mode === "zh" ? "缩略图区说明" : "Thumbnail caption",
  };

  const [pageEyebrow, setPageEyebrow] = useState(() => pc.pageEyebrow ?? "");
  const [pageTitle, setPageTitle] = useState(() => pc.pageTitle ?? "");
  const [pageIntro, setPageIntro] = useState(() => pc.pageIntro ?? "");
  const [openLinkLabel, setOpenLinkLabel] = useState(
    () => pc.openLinkLabel ?? "",
  );
  const [posterThumbTitle, setPosterThumbTitle] = useState(
    () => pc.posterThumbTitle ?? "",
  );
  const [posterThumbCaption, setPosterThumbCaption] = useState(
    () => pc.posterThumbCaption ?? "",
  );

  const siteSnap = JSON.stringify(pc);
  useEffect(() => {
    const next = site.portfolioCopy ?? defaultSiteContent.portfolioCopy;
    setPageEyebrow(next.pageEyebrow ?? "");
    setPageTitle(next.pageTitle ?? "");
    setPageIntro(next.pageIntro ?? "");
    setOpenLinkLabel(next.openLinkLabel ?? "");
    setPosterThumbTitle(next.posterThumbTitle ?? "");
    setPosterThumbCaption(next.posterThumbCaption ?? "");
  }, [siteSnap]);

  const saveRef = useRef(updatePortfolioCopy);
  saveRef.current = updatePortfolioCopy;

  const savePortfolioCopy = useCallback(() => {
    saveRef.current({
      pageEyebrow,
      pageTitle,
      pageIntro,
      openLinkLabel,
      posterThumbTitle,
      posterThumbCaption,
    });
  }, [
    pageEyebrow,
    pageTitle,
    pageIntro,
    openLinkLabel,
    posterThumbTitle,
    posterThumbCaption,
  ]);

  useInlineEditAutosave(
    "portfolio-page",
    canInline,
    savePortfolioCopy,
    [
      pageEyebrow,
      pageTitle,
      pageIntro,
      openLinkLabel,
      posterThumbTitle,
      posterThumbCaption,
    ],
    { debounceMs: DEBOUNCE_MS, resetToken: siteSnap },
  );

  const cardCopy: PortfolioCopy = canInline
    ? {
        ...pc,
        pageEyebrow,
        pageTitle,
        pageIntro,
        openLinkLabel,
        posterThumbTitle,
        posterThumbCaption,
      }
    : pc;

  return (
    <div className={`${SITE_PAPER_SECTION_X} pb-16 pt-12 sm:pb-20 sm:pt-16 md:pt-20`}>
      <header className="mb-10 max-w-2xl">
        {canInline ? (
          <>
            <input
              type="text"
              name="portfolio-page-eyebrow"
              title="点击修改，停顿后自动保存"
              value={pageEyebrow}
              onChange={(e) => setPageEyebrow(e.target.value)}
              maxLength={48}
              className={`${SEAMLESS_INPUT} mb-3 block w-full text-[12px] font-semibold uppercase tracking-[0.16em] text-ink-muted`}
            />
            <input
              type="text"
              name="portfolio-page-title"
              title="点击修改，停顿后自动保存"
              value={pageTitle}
              onChange={(e) => setPageTitle(e.target.value)}
              maxLength={48}
              className={`${SEAMLESS_INPUT} block w-full text-3xl font-bold tracking-[-0.03em] text-ink sm:text-4xl`}
            />
            <textarea
              name="portfolio-page-intro"
              title="点击修改，停顿后自动保存"
              value={pageIntro}
              onChange={(e) => setPageIntro(e.target.value)}
              maxLength={400}
              rows={4}
              className={`${SEAMLESS_INPUT} mt-4 max-w-lg resize-y text-sm leading-relaxed text-ink-muted`}
            />
          </>
        ) : (
          <>
            <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              {pc.pageEyebrow}
            </p>
            <h2 className="text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
              {pc.pageTitle}
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-ink-muted">
              {pc.pageIntro}
            </p>
          </>
        )}
      </header>

      {showAuthorTools ? (
        <div className="mb-6 print:hidden">
          {adding ? (
            <AddProjectForm
              mode={mode}
              onAdd={(p) => {
                addPortfolioProject(p);
                setAdding(false);
              }}
              onCancel={() => setAdding(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="rounded-full border border-dashed border-ink/20 bg-surface/80 px-5 py-3 text-sm font-medium text-ink-muted transition-colors hover:border-ink/30 hover:text-ink"
            >
              {i18n.addEntry}
            </button>
          )}
        </div>
      ) : null}

      {canInline ? (
        <div className="mb-8 max-w-2xl rounded-2xl border border-line/80 bg-surface/40 px-4 py-4 print:hidden">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted/80">
            {i18n.helperTitle}
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-[11px] text-ink-muted">
              <span>{i18n.tagOpenLabel}</span>
              <input
                type="text"
                value={openLinkLabel}
                onChange={(e) => setOpenLinkLabel(e.target.value)}
                maxLength={32}
                className={`${SEAMLESS_INPUT} text-xs font-medium text-ink`}
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-ink-muted">
              <span>{i18n.thumbTitle}</span>
              <input
                type="text"
                value={posterThumbTitle}
                onChange={(e) => setPosterThumbTitle(e.target.value)}
                maxLength={48}
                className={`${SEAMLESS_INPUT} text-xs font-medium text-ink`}
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-ink-muted sm:col-span-1">
              <span>{i18n.thumbCaption}</span>
              <input
                type="text"
                value={posterThumbCaption}
                onChange={(e) => setPosterThumbCaption(e.target.value)}
                maxLength={80}
                className={`${SEAMLESS_INPUT} text-xs text-ink`}
              />
            </label>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {projects.map((p, i) => (
          <ProjectCard
            key={p.id}
            project={p}
            index={i}
            canEdit={showAuthorTools}
            onRemove={removePortfolioProject}
            pageCopy={cardCopy}
            mode={mode}
          />
        ))}
      </div>
    </div>
  );
}
