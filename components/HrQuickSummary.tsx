"use client";

import { useLanguageMode } from "@/context/LanguageModeProvider";
import { useSiteContent } from "@/context/SiteContentProvider";
import { useMemo, useState } from "react";

/**
 * 访客 / HR 速览条：姓名、意向岗位、核心亮点与快捷联系。
 */
export function HrQuickSummary() {
  const { site, canEdit, editPermissionLoaded, previewMode } = useSiteContent();
  const { mode } = useLanguageMode();
  const [collapsed, setCollapsed] = useState(false);

  const show = editPermissionLoaded && !canEdit && !previewMode;
  const highlights = useMemo(
    () =>
      (site.heroPreviewLines ?? [])
        .map((l) => String(l ?? "").trim())
        .filter(Boolean)
        .slice(0, 3),
    [site.heroPreviewLines],
  );

  if (!show) return null;

  const email = site.contactEmail?.trim();
  const phone = site.contactPhone?.trim();
  const name = site.name?.trim() || (mode === "zh" ? "候选人" : "Candidate");
  const role = site.targetRole?.trim() || site.tagline?.trim();

  return (
    <section
      aria-label={mode === "zh" ? "HR 速览" : "HR quick view"}
      className="border-b border-line/70 bg-surface/80 px-4 py-3 backdrop-blur-sm sm:px-8 print:border-none print:bg-transparent print:py-2"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
              {mode === "zh" ? "HR 速览" : "Quick view"}
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-[-0.02em] text-ink">
              {name}
              {role ? (
                <span className="ml-2 text-base font-normal text-ink-muted">
                  · {role}
                </span>
              ) : null}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="shrink-0 rounded-full border border-line bg-paper/80 px-3 py-1.5 text-[11px] font-medium text-ink-muted transition-colors hover:border-ink/20 hover:text-ink sm:hidden"
          >
            {collapsed
              ? mode === "zh"
                ? "展开"
                : "Expand"
              : mode === "zh"
                ? "收起"
                : "Collapse"}
          </button>
        </div>

        {!collapsed ? (
          <>
            {highlights.length > 0 ? (
              <ul className="grid gap-1.5 sm:grid-cols-3">
                {highlights.map((line, i) => (
                  <li
                    key={`hr-hl-${i}`}
                    className="rounded-lg border border-line/70 bg-paper/60 px-3 py-2 text-xs leading-relaxed text-ink"
                  >
                    {line}
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {email ? (
                <a
                  href={`mailto:${email}`}
                  className="rounded-full border border-line bg-surface px-3 py-1.5 font-medium text-ink transition-colors hover:border-ink/20"
                >
                  {email}
                </a>
              ) : null}
              {phone ? (
                <a
                  href={`tel:${phone.replace(/\s/g, "")}`}
                  className="rounded-full border border-line bg-surface px-3 py-1.5 font-medium text-ink transition-colors hover:border-ink/20"
                >
                  {phone}
                </a>
              ) : null}
              <a
                href="#intro"
                className="rounded-full border border-line bg-surface px-3 py-1.5 font-medium text-ink-muted transition-colors hover:border-ink/20 hover:text-ink"
              >
                {mode === "zh" ? "完整联系方式" : "Full contact"}
              </a>
              <a
                href="#resume"
                className="rounded-full border border-line bg-surface px-3 py-1.5 font-medium text-ink-muted transition-colors hover:border-ink/20 hover:text-ink"
              >
                {mode === "zh" ? "查看履历" : "View resume"}
              </a>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
