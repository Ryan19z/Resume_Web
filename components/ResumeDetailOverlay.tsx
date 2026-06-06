"use client";

import { useSiteContent } from "@/context/SiteContentProvider";
import type { AchievementBlock, RepresentativeProject } from "@/lib/types";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

function Blocks({ blocks }: { blocks: AchievementBlock[] }) {
  return (
    <div className="flex flex-col gap-8">
      {blocks.map((b, bi) => (
        <section key={`${b.heading}-${bi}`}>
          <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
            {b.heading}
          </h3>
          <ul className="flex flex-col gap-3">
            {b.bullets.map((line, li) => (
              <li
                key={`${bi}-${li}`}
                className="micro-card rounded-xl border border-line bg-surface px-5 py-4 text-[15px] leading-relaxed text-ink/90 shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
              >
                {line}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function RepresentativeProjectOverlay({
  project,
  onClose,
}: {
  project: RepresentativeProject | null;
  onClose: () => void;
}) {
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
            aria-label="关闭预览"
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
                关闭
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
                  {/* 使用原生 img 保留外链原图分辨率，避免小视口被压缩 */}
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
                    您的浏览器不支持视频播放。
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
                  <p className="mb-3 text-sm text-ink-muted">外部链接</p>
                  <a
                    href={project.media.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex rounded-full border border-line px-4 py-2 text-sm font-medium text-ink hover:border-ink/20"
                  >
                    打开链接
                  </a>
                  <p className="mt-3 break-all text-xs text-ink-muted">
                    {project.media.url}
                  </p>
                </div>
              ) : null}
              {project.media.kind === "document" ? (
                <div className="mx-auto w-full max-w-5xl space-y-3">
                  {project.media.url.toLowerCase().endsWith(".pdf") ? (
                    <div className="overflow-hidden rounded-2xl border border-line/60 bg-surface/40">
                      <iframe
                        src={project.media.url}
                        title={project.media.fileName || project.title || "document"}
                        className="h-[72vh] w-full"
                      />
                    </div>
                  ) : null}
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
                        打开文档
                      </a>
                      <a
                        href={`${project.media.url}${project.media.url.includes("?") ? "&" : "?"}download=1`}
                        download={project.media.fileName || true}
                        className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-ink/20"
                      >
                        下载文档
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

export function ResumeDetailOverlay() {
  const { resumeDetail, closeResumeDetail, site } = useSiteContent();
  const [rep, setRep] = useState<RepresentativeProject | null>(null);
  const repRef = useRef(rep);
  repRef.current = rep;

  useEffect(() => {
    setRep(null);
  }, [resumeDetail?.kind, resumeDetail?.id]);

  useEffect(() => {
    if (!resumeDetail) return;
    const exists =
      resumeDetail.kind === "experience"
        ? site.experience.some((e) => e.id === resumeDetail.id)
        : site.education.some((e) => e.id === resumeDetail.id);
    if (!exists) closeResumeDetail();
  }, [resumeDetail, site.experience, site.education, closeResumeDetail]);

  useBodyScrollLock(Boolean(resumeDetail));

  const payload = useMemo(() => {
    if (!resumeDetail) return null;
    const rc = site.resumeCopy;
    if (resumeDetail.kind === "experience") {
      const item = site.experience.find((e) => e.id === resumeDetail.id);
      if (!item) return null;
      return {
        kind: "experience" as const,
        eyebrow: rc.detailWorkEyebrow,
        title: item.title,
        meta: `${item.subtitle} · ${item.period}`,
        intro: item.summary,
        keyResults: item.keyResults,
        representativeProjects: item.representativeProjects,
      };
    }
    const item = site.education.find((e) => e.id === resumeDetail.id);
    if (!item) return null;
    return {
      kind: "education" as const,
      eyebrow: rc.detailCampusEyebrow,
      title: item.title,
      meta: `${item.subtitle} · ${item.period}`,
      intro: item.summary,
      blocks: item.campusHighlights,
      representativeProjects: item.representativeProjects,
    };
  }, [resumeDetail, site.education, site.experience, site.resumeCopy]);

  useEffect(() => {
    if (!resumeDetail) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (repRef.current) setRep(null);
      else closeResumeDetail();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [resumeDetail, closeResumeDetail]);

  return (
    <>
      <AnimatePresence>
        {resumeDetail && payload ? (
          <motion.div
            className="fixed inset-0 z-[70] flex flex-col bg-ink/45 backdrop-blur-[2px] print:hidden sm:items-center sm:justify-center sm:p-6"
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 34,
              mass: 0.9,
            }}
          >
            <button
              type="button"
              aria-label="关闭详情"
              className="absolute inset-0"
              onClick={closeResumeDetail}
            />
            <motion.div
              className="relative z-[1] flex h-full w-full flex-col overflow-hidden bg-surface sm:h-[min(92vh,920px)] sm:max-w-6xl sm:rounded-3xl sm:border sm:border-line sm:shadow-[0_10px_40px_rgba(0,0,0,0.22)]"
              initial={{ y: 24, opacity: 0.92 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 18, opacity: 0.92 }}
              transition={{ type: "spring", stiffness: 280, damping: 30 }}
            >
              <header className="flex shrink-0 items-center justify-between gap-4 border-b border-line/90 bg-surface px-5 py-4 sm:px-8">
                <button
                  type="button"
                  onClick={closeResumeDetail}
                  className="rounded-full border border-line px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:border-[rgb(var(--selection)/0.2)] hover:text-[rgb(var(--selection))]"
                >
                  ← 返回
                </button>
                <span className="truncate rounded-full border border-[rgb(var(--selection)/0.22)] bg-[rgb(var(--selection)/0.08)] px-3 py-1 text-center text-[12px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--selection))]">
                  {payload.eyebrow}
                </span>
                <span className="w-16 shrink-0" aria-hidden />
              </header>
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-10 sm:px-12 sm:py-12">
                <h1 className="mb-2 text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
                  {payload.title}
                </h1>
                <p className="mb-8 text-sm text-ink-muted">{payload.meta}</p>
              {payload.kind === "experience" ? (
                <>
                  {payload.intro ? (
                    <p className="mb-8 max-w-2xl whitespace-pre-wrap text-base leading-relaxed text-ink/85">
                      {payload.intro}
                    </p>
                  ) : null}
                  <section className="mb-12">
                    <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                      {site.resumeCopy.keyResultsHeading}
                    </h3>
                    <ul className="flex flex-col gap-3">
                      {(Array.isArray(payload.keyResults)
                        ? payload.keyResults
                        : []
                      ).map((line, i) => (
                        <li
                          key={i}
                          className="micro-card rounded-xl border border-line bg-surface px-5 py-4 text-[15px] leading-relaxed text-ink/90 shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
                        >
                          {line}
                        </li>
                      ))}
                    </ul>
                  </section>
                  {payload.representativeProjects.length > 0 ? (
                    <section>
                      <h3 className="mb-4 text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                        {site.resumeCopy.repProjectsHeading}
                      </h3>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {payload.representativeProjects.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setRep(p)}
                            className="micro-card rounded-xl border border-line bg-surface px-5 py-4 text-left transition-transform active:scale-[0.99]"
                          >
                            <p className="font-semibold tracking-[-0.01em] text-ink">
                              {p.title}
                            </p>
                            {p.description ? (
                              <p className="mt-1 whitespace-pre-wrap text-sm text-ink-muted">
                                {p.description}
                              </p>
                            ) : null}
                            <p className="mt-3 text-[13px] font-medium text-[rgb(var(--selection))]">
                              查看
                              {p.media.kind === "image"
                                ? "图片"
                                : p.media.kind === "video"
                                  ? "视频"
                                  : p.media.kind === "code"
                                    ? "代码"
                                    : p.media.kind === "link"
                                      ? "链接"
                                      : "文档"}{" "}
                              →
                            </p>
                          </button>
                        ))}
                      </div>
                    </section>
                  ) : null}
                </>
              ) : (
                <>
                  {payload.intro ? (
                    <p className="mb-8 max-w-2xl whitespace-pre-wrap text-base leading-relaxed text-ink/85">
                      {payload.intro}
                    </p>
                  ) : null}
                  <Blocks blocks={payload.blocks} />
                  {payload.representativeProjects.length > 0 ? (
                    <section className="mt-12">
                      <h3 className="mb-4 text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                        {site.resumeCopy.repProjectsHeading}
                      </h3>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {payload.representativeProjects.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setRep(p)}
                            className="micro-card rounded-xl border border-line bg-surface px-5 py-4 text-left transition-transform active:scale-[0.99]"
                          >
                            <p className="font-semibold tracking-[-0.01em]">
                              {p.title}
                            </p>
                            {p.description ? (
                              <p className="mt-1 whitespace-pre-wrap text-sm text-ink-muted">
                                {p.description}
                              </p>
                            ) : null}
                            <p className="mt-3 text-[13px] font-medium text-[rgb(var(--selection))]">
                              查看
                              {p.media.kind === "image"
                                ? "图片"
                                : p.media.kind === "video"
                                  ? "视频"
                                  : p.media.kind === "code"
                                    ? "代码"
                                    : p.media.kind === "link"
                                      ? "链接"
                                      : "文档"}{" "}
                              →
                            </p>
                          </button>
                        ))}
                      </div>
                    </section>
                  ) : null}
                </>
              )}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <RepresentativeProjectOverlay
        project={rep}
        onClose={() => setRep(null)}
      />
    </>
  );
}
