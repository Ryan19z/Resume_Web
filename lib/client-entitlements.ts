import { SUBSCRIPTION_PLANS } from "@/lib/subscription-plans";
import {
  ALL_FEATURES_ENABLED,
  type ClientEntitlements,
  type PlanFeatures,
} from "@/lib/subscription-types";

export const DEFAULT_CLIENT_ENTITLEMENTS: ClientEntitlements = {
  tier: "legacy",
  tierLabelZh: "站长模式",
  tierLabelEn: "Owner mode",
  status: "active",
  active: true,
  expiresAt: null,
  daysLeft: null,
  legacyUnlimited: true,
  features: ALL_FEATURES_ENABLED,
  quotas: SUBSCRIPTION_PLANS.legacy.quotas,
  usage: { smartImportUsed: 0, aiParseUsed: 0 },
};

export function hasEntitlementFeature(
  entitlements: ClientEntitlements,
  feature: keyof PlanFeatures,
): boolean {
  return entitlements.features[feature];
}

export function featureLockReason(
  entitlements: ClientEntitlements,
  feature: keyof PlanFeatures,
  lang: "zh" | "en",
): string | null {
  if (hasEntitlementFeature(entitlements, feature)) return null;
  if (!entitlements.active) {
    return lang === "zh"
      ? "套餐已到期，该功能已暂停。请联系管理员续费。"
      : "Your plan has expired. Please renew to use this feature.";
  }
  const labels: Record<keyof PlanFeatures, { zh: string; en: string }> = {
    editing: { zh: "在线编辑", en: "Editing" },
    publicView: { zh: "对外访问", en: "Public view" },
    smartImport: { zh: "智能导入", en: "Smart import" },
    aiParse: { zh: "AI 深度解析", en: "AI parsing" },
    viewLog: { zh: "访问记录", en: "View log" },
    shareEmail: { zh: "邮件代发", en: "Email share" },
  };
  const label = labels[feature][lang];
  return lang === "zh"
    ? `当前套餐（${entitlements.tierLabelZh}）不含「${label}」，请升级。`
    : `Your plan (${entitlements.tierLabelEn}) does not include "${label}". Please upgrade.`;
}
