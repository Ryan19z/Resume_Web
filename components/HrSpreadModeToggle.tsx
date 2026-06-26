"use client";

import { useInteractionMode } from "@/context/InteractionModeProvider";
import { useLanguageMode } from "@/context/LanguageModeProvider";

type Props = {
  className?: string;
  compact?: boolean;
};

export function HrSpreadModeToggle({ className = "", compact = false }: Props) {
  const { mode } = useLanguageMode();
  const { hrSpreadMode, toggleHrSpreadMode, hrSpreadModeReady } =
    useInteractionMode();

  if (!hrSpreadModeReady) return null;

  const label = hrSpreadMode
    ? mode === "zh"
      ? compact
        ? "HR 摊开"
        : "HR 摊开模式 · 开"
      : compact
        ? "HR spread"
        : "HR spread · On"
    : mode === "zh"
      ? compact
        ? "HR 摊开"
        : "HR 摊开模式"
      : compact
        ? "HR spread"
        : "HR spread mode";

  return (
    <button
      type="button"
      onClick={toggleHrSpreadMode}
      aria-pressed={hrSpreadMode}
      title={
        mode === "zh"
          ? hrSpreadMode
            ? "已展开全部关键成果；点击恢复默认卡片视图"
            : "在卡片上展开全部关键成果与项目说明，类似纸质简历"
          : hrSpreadMode
            ? "Showing all outcomes on cards; click for default view"
            : "Expand all key outcomes on cards, like a paper resume"
      }
      className={
        className ||
        `rounded-full border font-semibold shadow-sm backdrop-blur-md transition-colors ${
          compact ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-[11px] sm:px-4 sm:text-xs"
        } ${
          hrSpreadMode
            ? "border-[rgb(var(--selection)/0.35)] bg-[rgb(var(--selection)/0.12)] text-[rgb(var(--selection))]"
            : "border-line bg-surface/90 text-ink-muted hover:border-ink/15 hover:text-ink"
        }`
      }
    >
      {label}
    </button>
  );
}
