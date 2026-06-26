"use client";

import { DocumentEmbedPreview } from "@/components/DocumentEmbedPreview";
import type { RepresentativeProject } from "@/lib/types";
import { AnimatePresence, motion } from "framer-motion";

export function RepresentativeProjectOverlay({
  project,
  onClose,
  locale = "zh",
}: {
  project: RepresentativeProject | null;
  onClose: () => void;
  locale?: "zh" | "en";
}) {
  const closeLabel = locale === "zh" ? "关闭" : "Close";
  const previewLabel = locale === "zh" ? "关闭预览" : "Close preview";
  const externalLinkLabel = locale === "zh" ? "外部链接" : "External link";
  const openLinkLabel = locale === "zh" ? "打开链接" : "Open link";
  const openDocLabel = locale === "zh" ? "打开文档" : "Open document";
  const downloadLabel = locale === "zh" ? "下载文件" : "Download";

  return (
    <AnimatePresence>
      {project ? (
        <motion.div
          className="fixed inset-0 z-[75] flex flex-col bg-ink/45 backdrop-blur-[2px] print:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label={previewLabel}
            className="absolute inset-0"
            onClick={onClose}
          />
          <motion.div
            className="relative z-[1] mx-auto mt-auto flex h-[min(94vh,920px)] w-full max-w-6xl flex-col overflow-hidden rounded-t-3xl border border-line bg-surface shadow-[0_10px_40px_rgba(0,0,0,0.22)] sm:mb-auto sm:mt-12 sm:rounded-3xl"
            initial={{ y: 48, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 36, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 32 }}
          >
            <header className="flex items-center justify-between gap-3 border-b border-line bg-surface px-5 py-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-line px-3 py-2 text-sm font-medium text-ink-muted hover:border-[rgb(var(--selection)/0.2)] hover:text-[rgb(var(--selection))]"
              >
                {closeLabel}
              </button>
              <div className="min-w-0 flex-1 text-center">
                <p className="truncate text-sm font-semibold tracking-[-0.02em]">
                  {project.title}
                </p>
                {project.description ? (
                  <p className="truncate text-xs text-ink-muted">
                    {project.description}
                  </p>
                ) : null}
              </div>
              <span className="w-14 shrink-0" />
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
              {project.media.kind === "image" ? (
                <div className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-2xl border border-line/60 bg-line/30">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={project.media.url}
                    alt={project.title}
                    width={1920}
                    height={1080}
                    decoding="async"
                    fetchPriority="high"
                    referrerPolicy="no-referrer"
                    className="mx-auto block h-auto max-h-[min(88vh,960px)] w-full object-contain [image-rendering:auto]"
                  />
                </div>
              ) : null}
              {project.media.kind === "video" ? (
                <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-2xl border border-line/60 bg-black shadow-inner">
                  <video
                    src={project.media.url}
                    controls
                    playsInline
                    preload="auto"
                    controlsList="nodownload"
                    className="mx-auto block h-auto max-h-[min(88vh,960px)] w-full object-contain"
                  >
                    {locale === "zh"
                      ? "您的浏览器不支持视频播放。"
                      : "Your browser does not support video playback."}
                  </video>
                </div>
              ) : null}
              {project.media.kind === "code" ? (
                <pre className="overflow-x-auto rounded-2xl border border-line bg-[#111827] p-4 text-[13px] leading-relaxed text-zinc-100 shadow-inner">
                  <code>{project.media.code}</code>
                </pre>
              ) : null}
              {project.media.kind === "link" ? (
                <div className="mx-auto w-full max-w-3xl rounded-2xl border border-dashed border-line/80 bg-surface p-6 text-center">
                  <p className="mb-3 text-sm text-ink-muted">{externalLinkLabel}</p>
                  <a
                    href={project.media.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex rounded-full border border-line px-4 py-2 text-sm font-medium text-ink hover:border-ink/20"
                  >
                    {openLinkLabel}
                  </a>
                  <p className="mt-3 break-all text-xs text-ink-muted">
                    {project.media.url}
                  </p>
                </div>
              ) : null}
              {project.media.kind === "document" ? (
                <div className="mx-auto w-full max-w-5xl space-y-3">
                  <DocumentEmbedPreview
                    url={project.media.url}
                    fileName={project.media.fileName}
                    title={project.media.fileName || project.title || "document"}
                    heightClassName="h-[72vh]"
                    className="rounded-2xl"
                  />
                  <div className="rounded-2xl border border-dashed border-line/80 bg-surface px-4 py-4 text-sm text-ink">
                    <p className="font-medium">
                      {project.media.fileName || project.media.url.split("/").pop()}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a
                        href={project.media.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-ink/20"
                      >
                        {openDocLabel}
                      </a>
                      <a
                        href={`${project.media.url}${project.media.url.includes("?") ? "&" : "?"}download=1`}
                        download={project.media.fileName || true}
                        className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-ink/20"
                      >
                        {downloadLabel}
                      </a>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
