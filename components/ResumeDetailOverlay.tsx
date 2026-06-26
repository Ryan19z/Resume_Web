"use client";

import { RepresentativeProjectOverlay } from "@/components/RepresentativeProjectOverlay";
import { useSiteContent } from "@/context/SiteContentProvider";
import { resolveEducationDisplay } from "@/lib/education-display";
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
        ? site.experience.some((e) => e.id === resumeDetail.id) ||
          (site.projectExperience ?? []).some((e) => e.id === resumeDetail.id)
        : site.education.some((e) => e.id === resumeDetail.id);
    if (!exists) closeResumeDetail();
  }, [
    resumeDetail,
    site.experience,
    site.projectExperience,
    site.education,
    closeResumeDetail,
  ]);

  useBodyScrollLock(Boolean(resumeDetail));

  const payload = useMemo(() => {
    if (!resumeDetail) return null;
    const rc = site.resumeCopy;
    if (resumeDetail.kind === "experience") {
      const item =
        site.experience.find((e) => e.id === resumeDetail.id) ??
        site.projectExperience?.find((e) => e.id === resumeDetail.id);
      if (!item) return null;
      const isProjectItem = (site.projectExperience ?? []).some(
        (e) => e.id === item.id,
      );
      return {
        kind: "experience" as const,
        eyebrow: isProjectItem ? "项目详情" : rc.detailWorkEyebrow,
        title: item.title,
        meta: `${item.subtitle} · ${item.period}`,
        intro: item.summary,
        keyResults: item.keyResults,
        representativeProjects: item.representativeProjects,
      };
    }
    const item = site.education.find((e) => e.id === resumeDetail.id);
    if (!item) return null;
    const { school, major } = resolveEducationDisplay(item);
    return {
      kind: "education" as const,
      eyebrow: rc.detailCampusEyebrow,
      title: school,
      meta: `${major} · ${item.period}`,
      intro: item.summary,
      blocks: item.campusHighlights,
      representativeProjects: item.representativeProjects,
    };
  }, [resumeDetail, site.education, site.experience, site.projectExperience, site.resumeCopy]);

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
                    {(Array.isArray(payload.keyResults)
                      ? payload.keyResults
                      : []
                    ).length > 0 ? (
                      <ul className="flex flex-col gap-3">
                        {payload.keyResults.map((line, i) => (
                          <li
                            key={i}
                            className="micro-card rounded-xl border border-line bg-surface px-5 py-4 text-[15px] leading-relaxed text-ink/90 shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
                          >
                            {line}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm leading-relaxed text-ink-muted">
                        暂无详细描述。可在「站点编辑」中补充项目要点或成果。
                      </p>
                    )}
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
