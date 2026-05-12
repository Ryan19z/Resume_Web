"use client";

import { useSiteContent } from "@/context/SiteContentProvider";
import { SEAMLESS_INPUT } from "@/lib/inline-edit-styles";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const DEBOUNCE_MS = 550;

export function HeroPage() {
  const {
    site,
    canEdit,
    editPermissionLoaded,
    previewMode,
    updateQuickHeroFields,
  } = useSiteContent();
  const portrait = site.heroPortraitSrc?.trim();
  const canInline = editPermissionLoaded && canEdit && !previewMode;

  const hp = Array.isArray(site.heroPreviewLines)
    ? site.heroPreviewLines
    : ["", "", ""];
  const hp0 = hp[0] ?? "";
  const hp1 = hp[1] ?? "";
  const hp2 = hp[2] ?? "";
  const experiences = Array.isArray(site.experience) ? site.experience : [];
  const heroCopy = site.heroCopy ?? {
    eyebrow: "",
    swipeHint: "",
    portraitCaption: "",
    portraitGuidance: "",
  };

  const [name, setName] = useState(site.name ?? "");
  const [targetRole, setTargetRole] = useState(site.targetRole ?? "");
  const [tagline, setTagline] = useState(site.tagline ?? "");
  const [l0, setL0] = useState(hp0);
  const [l1, setL1] = useState(hp1);
  const [l2, setL2] = useState(hp2);

  const siteSnap = `${site.name}|${site.targetRole}|${site.tagline}|${hp0}|${hp1}|${hp2}`;
  const siteRef = useRef(site);
  siteRef.current = site;

  useEffect(() => {
    const s = siteRef.current;
    const lines = Array.isArray(s.heroPreviewLines)
      ? s.heroPreviewLines
      : ["", "", ""];
    setName(s.name ?? "");
    setTargetRole(s.targetRole ?? "");
    setTagline(s.tagline ?? "");
    setL0(lines[0] ?? "");
    setL1(lines[1] ?? "");
    setL2(lines[2] ?? "");
  }, [siteSnap]);

  const saveRef = useRef(updateQuickHeroFields);
  saveRef.current = updateQuickHeroFields;

  useEffect(() => {
    if (!canInline) return;
    const t = window.setTimeout(() => {
      saveRef.current({
        name,
        tagline,
        targetRole,
        heroPreviewLines: [l0, l1, l2],
      });
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [name, tagline, targetRole, l0, l1, l2, canInline]);

  const visitorLines = hp.filter((x) => String(x ?? "").trim().length > 0);

  return (
    <div className="relative min-h-[min(100svh,880px)] px-6 py-16 sm:px-10 sm:py-20 md:px-14 lg:px-16">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 lg:grid-cols-12 lg:items-start lg:gap-12">
        <div className="flex min-w-0 flex-col lg:col-span-7">
          <motion.div
            id="tour-hero-edit"
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 30,
              mass: 0.9,
            }}
          >
            <p className="mb-3 text-[12px] font-medium uppercase tracking-[0.2em] text-ink-muted sm:mb-4">
              {heroCopy.eyebrow}
            </p>

            {canInline ? (
              <input
                type="text"
                name="hero-name"
                title="点击修改，停顿后自动保存"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                autoComplete="name"
                className={`${SEAMLESS_INPUT} text-[clamp(1.85rem,4.2vw,3rem)] font-semibold leading-[1.08] tracking-[-0.03em] text-ink`}
              />
            ) : (
              <h1 className="text-[clamp(1.85rem,4.2vw,3rem)] font-semibold leading-[1.08] tracking-[-0.03em]">
                {site.name}
              </h1>
            )}

            {canInline ? (
              <input
                type="text"
                name="hero-role"
                title="点击修改，停顿后自动保存"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                maxLength={80}
                className={`${SEAMLESS_INPUT} mt-3 text-base font-semibold text-ink/90 sm:text-lg`}
              />
            ) : (
              <p className="mt-3 text-base font-semibold text-ink/90 sm:text-lg">
                {site.targetRole}
              </p>
            )}

            {canInline ? (
              <textarea
                name="hero-tagline"
                title="点击修改，停顿后自动保存"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                maxLength={200}
                rows={3}
                className={`${SEAMLESS_INPUT} mt-5 max-w-xl resize-y text-base leading-relaxed text-ink-muted sm:text-lg`}
              />
            ) : (
              <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-muted sm:text-lg">
                {site.tagline}
              </p>
            )}

            {canInline ? (
              <ul className="mt-6 max-w-xl list-none space-y-2 border-l-2 border-line pl-4 text-sm leading-relaxed text-ink/90 sm:text-[15px]">
                <li>
                  <input
                    type="text"
                    title="点击修改，停顿后自动保存"
                    value={l0}
                    onChange={(e) => setL0(e.target.value)}
                    placeholder="要点一"
                    maxLength={120}
                    className={`${SEAMLESS_INPUT} text-sm sm:text-[15px]`}
                  />
                </li>
                <li>
                  <input
                    type="text"
                    title="点击修改，停顿后自动保存"
                    value={l1}
                    onChange={(e) => setL1(e.target.value)}
                    placeholder="要点二"
                    maxLength={120}
                    className={`${SEAMLESS_INPUT} text-sm sm:text-[15px]`}
                  />
                </li>
                <li>
                  <input
                    type="text"
                    title="点击修改，停顿后自动保存"
                    value={l2}
                    onChange={(e) => setL2(e.target.value)}
                    placeholder="要点三"
                    maxLength={120}
                    className={`${SEAMLESS_INPUT} text-sm sm:text-[15px]`}
                  />
                </li>
              </ul>
            ) : visitorLines.length > 0 ? (
              <ul className="mt-6 max-w-xl space-y-2 border-l-2 border-line pl-4 text-sm leading-relaxed text-ink/90 sm:text-[15px]">
                {visitorLines.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            ) : null}
          </motion.div>

          {experiences.length > 0 ? (
            <div className="mt-8 border-t border-line/60 pt-6">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                近期经历
              </p>
              <ul className="space-y-2">
                {experiences.slice(0, 3).map((e) => (
                  <li key={e.id}>
                    <a
                      href="#resume"
                      className="block rounded-xl border border-line/80 bg-surface/50 px-3 py-2.5 text-left transition-colors hover:border-ink/15 hover:bg-surface"
                    >
                      <span className="block text-sm font-semibold text-ink">
                        {e.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-ink-muted">
                        {e.subtitle} · {e.period}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <motion.p
            className="mt-10 text-xs text-ink-muted/85 sm:mt-12"
            initial={false}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            {heroCopy.swipeHint}
          </motion.p>
        </div>

        <motion.div
          className="flex min-w-0 justify-center lg:col-span-5 lg:justify-end lg:pt-2"
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            type: "spring",
            stiffness: 220,
            damping: 28,
            delay: 0.05,
          }}
        >
          <div className="w-full max-w-[200px] sm:max-w-[220px] lg:max-w-[240px]">
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl border border-line/90 bg-surface shadow-[0_12px_40px_-20px_rgba(0,0,0,0.2)]">
              {portrait ? (
                <img
                  src={portrait}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover object-center"
                  loading="eager"
                  decoding="async"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-b from-line/35 to-paper px-4 text-center">
                  <p className="text-xs text-ink-muted">形象照</p>
                  <p className="text-[10px] leading-relaxed text-ink-muted/80">
                    「站点编辑」→「首屏与形象」上传或粘贴链接
                  </p>
                </div>
              )}
            </div>
            <p className="mt-3 text-center text-[10px] leading-snug text-ink-muted/75">
              {heroCopy.portraitCaption}
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
