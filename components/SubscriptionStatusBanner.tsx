"use client";

import { useLanguageMode } from "@/context/LanguageModeProvider";
import { useSiteContent } from "@/context/SiteContentProvider";
import { parseClientResumeScope } from "@/lib/resume-scope";

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

  if (entitlements.legacyUnlimited && entitlements.active) {
    if (!canEdit) return null;
    return (
      <div className="pointer-events-none fixed left-0 right-0 top-[3.65rem] z-[63] flex justify-center px-4 pt-1 print:hidden sm:top-14">
        <p className="max-w-xl rounded-full border border-line bg-surface/90 px-4 py-2 text-center text-[11px] leading-snug text-ink-muted shadow-sm backdrop-blur-md">
          {zh
            ? `套餐：${tierLabel}（未设到期，功能全开）`
            : `Plan: ${tierLabel} (no expiry, all features)`}
        </p>
      </div>
    );
  }

  if (!entitlements.active) {
    return (
      <div className="pointer-events-none fixed left-0 right-0 top-[3.65rem] z-[63] flex justify-center px-4 pt-1 print:hidden sm:top-14">
        <p className="max-w-xl rounded-full border border-red-200 bg-red-50/95 px-4 py-2 text-center text-[11px] leading-snug text-red-800 shadow-sm backdrop-blur-md">
          {zh
            ? `套餐已到期（${tierLabel}），编辑、导入与 HR 访问已暂停，请联系管理员续费。`
            : `Plan expired (${tierLabel}). Editing, import, and HR view are paused. Please renew.`}
        </p>
      </div>
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

  return (
    <div className="pointer-events-none fixed left-0 right-0 top-[3.65rem] z-[63] flex justify-center px-4 pt-1 print:hidden sm:top-14">
      <p className="max-w-xl rounded-full border border-line bg-surface/90 px-4 py-2 text-center text-[11px] leading-snug text-ink-muted shadow-sm backdrop-blur-md">
        {zh ? "当前套餐" : "Plan"}：{tierLabel} · {expiryText} · {usageText}
      </p>
    </div>
  );
}
