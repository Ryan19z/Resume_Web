"use client";

import {
  buildImportQualityReport,
  gradeLabel,
  type ImportCheckItem,
  type ImportQualityReport,
} from "@/lib/import-quality-review";
import type { ParsedResume, ResumeParseMethod } from "@/lib/resume-parse-types";
import { useMemo } from "react";

function StatusIcon({ status }: { status: ImportCheckItem["status"] }) {
  if (status === "pass") {
    return (
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[11px] text-emerald-700"
        aria-hidden
      >
        ✓
      </span>
    );
  }
  if (status === "warn") {
    return (
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-[11px] text-amber-800"
        aria-hidden
      >
        !
      </span>
    );
  }
  return (
    <span
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-[11px] text-red-700"
      aria-hidden
    >
      ×
    </span>
  );
}

function scoreRingColor(grade: ImportQualityReport["grade"]): string {
  if (grade === "good") return "text-emerald-600";
  if (grade === "fair") return "text-amber-600";
  return "text-red-600";
}

export function ImportQualityPanel({
  parsed,
  warnings,
  confidence,
  textLength,
  fileName,
  method,
  llmFallback,
  planAllowsAi = true,
  lang,
}: {
  parsed: ParsedResume;
  warnings: string[];
  confidence: number;
  textLength: number;
  fileName: string;
  method: ResumeParseMethod;
  llmFallback: boolean;
  planAllowsAi?: boolean;
  lang: "zh" | "en";
}) {
  const report = useMemo(
    () =>
      buildImportQualityReport({
        parsed,
        warnings,
        confidence,
        textLength,
        fileName,
        method,
        llmFallback,
        planAllowsAi,
      }),
    [
      parsed,
      warnings,
      confidence,
      textLength,
      fileName,
      method,
      llmFallback,
      planAllowsAi,
    ],
  );

  const i18n =
    lang === "zh"
      ? {
          title: "导入质量评分",
          checklist: "核对清单",
          scoreHint: "分数由字段完整度与下方检查项综合估算，非 AI 自报置信度。",
          applyHintGood: "整体较好，填入后建议快速浏览履历与教育奖项。",
          applyHintFair: "可作初稿填入；请按清单逐项检查后再分享给 HR。",
          applyHintReview: "存在明显缺口，填入后请务必手动修正标红项。",
        }
      : {
          title: "Import quality score",
          checklist: "Review checklist",
          scoreHint:
            "Score combines field completeness and checks below—not model self-reported confidence.",
          applyHintGood: "Looks fine; skim resume and awards after apply.",
          applyHintFair: "OK as a draft; follow the checklist before sharing.",
          applyHintReview: "Notable gaps; fix red items after apply.",
        };

  const applyHint =
    report.grade === "good"
      ? i18n.applyHintGood
      : report.grade === "fair"
        ? i18n.applyHintFair
        : i18n.applyHintReview;

  const ringColor = scoreRingColor(report.grade);

  return (
    <div className="flex flex-col gap-3">
      <div
        className={`rounded-2xl border p-4 ${
          report.grade === "good"
            ? "border-emerald-500/25 bg-emerald-500/[0.06]"
            : report.grade === "fair"
              ? "border-amber-500/25 bg-amber-500/[0.06]"
              : "border-red-500/20 bg-red-500/[0.05]"
        }`}
      >
        <div className="flex items-start gap-4">
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
            <svg className={`h-16 w-16 -rotate-90 ${ringColor}`} viewBox="0 0 36 36" aria-hidden>
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="opacity-20"
              />
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={`${(report.score / 100) * 94.2} 94.2`}
              />
            </svg>
            <span className="absolute text-lg font-bold tabular-nums text-ink">
              {report.score}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">
              {i18n.title} · {gradeLabel(report.grade, lang)}
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
              {lang === "zh" ? report.summaryZh : report.summaryEn}
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-ink-muted/90">
              {i18n.scoreHint}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-paper/50 p-4">
        <p className="mb-3 text-sm font-medium text-ink">{i18n.checklist}</p>
        <ul className="space-y-2.5">
          {report.checklist.map((item) => (
            <li key={item.id} className="flex gap-2.5">
              <StatusIcon status={item.status} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-ink">
                  {lang === "zh" ? item.titleZh : item.titleEn}
                </p>
                {(lang === "zh" ? item.detailZh : item.detailEn) ? (
                  <p className="mt-0.5 text-[12px] leading-relaxed text-ink-muted">
                    {lang === "zh" ? item.detailZh : item.detailEn}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="rounded-xl border border-line/80 bg-ink/[0.03] px-3 py-2 text-[12px] leading-relaxed text-ink-muted">
        {applyHint}
      </p>
    </div>
  );
}
