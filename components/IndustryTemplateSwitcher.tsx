"use client";

import { useInteractionMode } from "@/context/InteractionModeProvider";
import { useLanguageMode } from "@/context/LanguageModeProvider";
import { useSiteContent } from "@/context/SiteContentProvider";
import { useTheme } from "@/context/ThemeProvider";
import {
  INDUSTRY_TEMPLATES,
  getIndustryTemplate,
} from "@/lib/industry-templates";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useId, useRef, useState } from "react";

export function IndustryTemplateSwitcher() {
  const {
    canEdit,
    editPermissionLoaded,
    previewMode,
    updateQuickHeroFields,
    updatePageBackground,
  } = useSiteContent();
  const { mode } = useLanguageMode();
  const { setTheme } = useTheme();
  const { industryTemplateId, setIndustryTemplateId } = useInteractionMode();

  const [open, setOpen] = useState(false);
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

  const current = industryTemplateId
    ? getIndustryTemplate(industryTemplateId)
    : null;

  const i18n = {
    title: mode === "zh" ? "行业模板" : "Industry template",
    hint: mode === "zh" ? "一键切换背景与岗位侧重点" : "Apply role-focused preset",
    selected: mode === "zh" ? "当前" : "Current",
    custom: mode === "zh" ? "自定义" : "Custom",
  };

  return (
    <div
      ref={rootRef}
      className="pointer-events-auto fixed bottom-[4.9rem] left-5 z-[65] print:hidden sm:bottom-[7.2rem] sm:left-8"
    >
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-line bg-surface/90 px-3.5 py-2 text-left text-[12px] font-medium text-ink shadow-[0_1px_0_rgb(0_0_0/0.04)] backdrop-blur-md transition-colors hover:border-ink/12 hover:bg-surface"
      >
        <span className="text-[14px]" aria-hidden>
          ◈
        </span>
        <span className="min-w-0">
          <span className="block leading-tight text-ink">{i18n.title}</span>
          <span className="block truncate text-[11px] font-normal text-ink-muted">
            {current
              ? `${i18n.selected}: ${current.label[mode]}`
              : `${i18n.selected}: ${i18n.custom}`}
          </span>
        </span>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            id={menuId}
            role="menu"
            aria-label={i18n.title}
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
            className="absolute bottom-full left-0 mb-2 w-[min(92vw,290px)] overflow-hidden rounded-2xl border border-line bg-surface/95 py-1.5 shadow-xl backdrop-blur-md"
          >
            <div className="px-3 pb-2 pt-1 text-[11px] text-ink-muted">
              {i18n.hint}
            </div>
            {INDUSTRY_TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                role="menuitem"
                onClick={() => {
                  setIndustryTemplateId(tpl.id);
                  setTheme(tpl.theme);
                  updateQuickHeroFields({
                    targetRole: tpl.targetRole[mode],
                    transferableSkills: tpl.transferableSkills[mode],
                    roleFitEntries: tpl.roleFits[mode].map((item, index) => ({
                      id: `rf-${tpl.id}-${index + 1}`,
                      title: item.title,
                      fit: item.fit,
                      proof: item.proof,
                    })),
                  });
                  updatePageBackground({
                    kind: "image",
                    imageUrl: tpl.background.src,
                    imageStrength: Math.max(
                      30,
                      Math.round(tpl.background.opacity * 100),
                    ),
                  });
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-ink/[0.04] ${
                  industryTemplateId === tpl.id ? "bg-ink/[0.06] font-medium" : ""
                }`}
              >
                <span className="min-w-0">
                  <span className="block text-ink">{tpl.label[mode]}</span>
                  <span className="block text-[11px] text-ink-muted">
                    {tpl.hint[mode]}
                  </span>
                </span>
                <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-[10px] uppercase text-ink-muted">
                  {tpl.theme}
                </span>
              </button>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

