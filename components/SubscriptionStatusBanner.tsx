"use client";

import { useLanguageMode } from "@/context/LanguageModeProvider";
import { useSiteContent } from "@/context/SiteContentProvider";
import { parseClientResumeScope } from "@/lib/resume-scope";
import type { ReactNode } from "react";

export function SubscriptionStatusBanner() {
  const { mode } = useLanguageMode();
  const {
    canEdit,
    editPermissionLoaded,
    entitlements,
    previewMode,
    resumeScopeActive,
  } = useSiteContent();
  const scope = parseClientResumeScope();

  if (!resumeScopeActive || !scope.resumeId) return null;
  if (!editPermissionLoaded || previewMode) return null;

  const zh = mode === "zh";
  const tierLabel = zh ? entitlements.tierLabelZh : entitlements.tierLabelEn;
  const daysLeft = entitlements.daysLeft;

  const bannerShell = (content: ReactNode) => (
    <>
      <div
        className="pointer-events-none fixed left-0 right-0 z-[60] flex justify-start px-3 pr-[5.75rem] max-sm:items-start sm:z-[63] sm:justify-center sm:px-4 sm:pr-4 print:hidden"
        style={{ top: "calc(2.5rem + env(safe-area-inset-top, 0px) + 0.35rem)" }}
      >
        {content}
      </div>
      <div
        className="pointer-events-none h-[3.75rem] shrink-0 sm:h-[2.35rem] print:hidden"
        aria-hidden
      />
    </>
  );

  if (entitlements.legacyUnlimited && entitlements.active) {
    if (!canEdit) return null;
    return bannerShell(
      <p className="max-w-xl rounded-full border border-line bg-surface/90 px-3 py-2 text-left text-[11px] leading-snug text-ink-muted shadow-sm backdrop-blur-md max-sm:max-w-full sm:px-4 sm:text-center">
        {zh
          ? `套餐：${tierLabel}（未设到期，功能全开）`
          : `Plan: ${tierLabel} (no expiry, all features)`}
      </p>,
    );
  }

  if (!entitlements.active) {
    return bannerShell(
      <p className="max-w-xl rounded-full border border-red-200 bg-red-50/95 px-3 py-2 text-left text-[11px] leading-snug text-red-800 shadow-sm backdrop-blur-md max-sm:max-w-full sm:px-4 sm:text-center">
        {zh
          ? `套餐已到期（${tierLabel}），编辑、导入与 HR 访问已暂停，请联系管理员续费。`
          : `Plan expired (${tierLabel}). Editing, import, and HR view are paused. Please renew.`}
      </p>,
    );
  }

  if (!canEdit) return null;

  const expiryText =
    daysLeft == null
      ? zh
        ? "未设到期"
        : "No expiry"
      : daysLeft <= 0
        ? zh
          ? "今日到期"
          : "Expires today"
        : zh
          ? `剩余 ${daysLeft} 天`
          : `${daysLeft} day(s) left`;

  const usageText = (() => {
    const totalUsed = entitlements.usage.smartImportUsed;
    const totalLimit = entitlements.quotas.smartImportPerMonth;
    if (entitlements.features.aiParse && entitlements.quotas.aiParsePerMonth > 0) {
      return zh
        ? `AI 分析 ${entitlements.usage.aiParseUsed}/${entitlements.quotas.aiParsePerMonth} 次 · 导入总计 ${totalUsed}/${totalLimit} 次`
        : `AI ${entitlements.usage.aiParseUsed}/${entitlements.quotas.aiParsePerMonth} · imports ${totalUsed}/${totalLimit}`;
    }
    return zh
      ? `简历导入 ${totalUsed}/${totalLimit} 次（规则引擎，不含 AI）`
      : `Import ${totalUsed}/${totalLimit} (rules only, no AI)`;
  })();

  return bannerShell(
    <p className="max-w-xl rounded-full border border-line bg-surface/90 px-3 py-2 text-left text-[11px] leading-snug text-ink-muted shadow-sm backdrop-blur-md max-sm:max-w-full sm:px-4 sm:text-center">
      {zh ? "当前套餐" : "Plan"}：{tierLabel} · {expiryText} · {usageText}
    </p>,
  );
}
