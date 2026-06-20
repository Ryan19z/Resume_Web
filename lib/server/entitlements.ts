import { planLabel, SUBSCRIPTION_PLANS } from "@/lib/subscription-plans";
import {
  ALL_FEATURES_ENABLED,
  EXPIRED_FEATURES,
  type ClientEntitlements,
  type PlanFeatures,
  type SubscriptionStatus,
  type SubscriptionTier,
} from "@/lib/subscription-types";
import { sanitizeResumeId } from "@/lib/resume-scope";
import {
  planFeaturesForTier,
  planQuotasForTier,
  readSubscriptionRecord,
  readUsageRecord,
} from "@/lib/server/subscription-store";

function now(): number {
  return Date.now();
}

function computeDaysLeft(expiresAt: number | null): number | null {
  if (expiresAt == null) return null;
  return Math.ceil((expiresAt - now()) / (24 * 60 * 60 * 1000));
}

function isExpiredRecord(
  status: SubscriptionStatus,
  expiresAt: number | null,
): boolean {
  if (status === "cancelled" || status === "expired") return true;
  if (expiresAt != null && expiresAt <= now()) return true;
  return false;
}

function unlimitedEntitlements(): ClientEntitlements {
  return {
    tier: "legacy",
    tierLabelZh: planLabel("legacy", "zh"),
    tierLabelEn: planLabel("legacy", "en"),
    status: "active",
    active: true,
    expiresAt: null,
    daysLeft: null,
    legacyUnlimited: true,
    features: ALL_FEATURES_ENABLED,
    quotas: SUBSCRIPTION_PLANS.legacy.quotas,
    usage: { smartImportUsed: 0, aiParseUsed: 0 },
  };
}

export function toClientEntitlements(input: {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  expiresAt: number | null;
  legacyUnlimited: boolean;
  usage: { smartImport: number; aiParse: number };
  note?: string;
}): ClientEntitlements {
  const expired = isExpiredRecord(input.status, input.expiresAt);
  const active = !expired;
  const features: PlanFeatures = active
    ? planFeaturesForTier(input.tier)
    : EXPIRED_FEATURES;
  const quotas = planQuotasForTier(input.tier);

  return {
    tier: input.tier,
    tierLabelZh: planLabel(input.tier, "zh"),
    tierLabelEn: planLabel(input.tier, "en"),
    status: expired ? "expired" : input.status,
    active,
    expiresAt: input.expiresAt,
    daysLeft: computeDaysLeft(input.expiresAt),
    legacyUnlimited: input.legacyUnlimited,
    features,
    quotas,
    usage: {
      smartImportUsed: input.usage.smartImport,
      aiParseUsed: input.usage.aiParse,
    },
    note: input.note,
  };
}

export async function resolveEntitlements(
  resumeIdRaw?: string,
): Promise<ClientEntitlements> {
  const resumeId = resumeIdRaw ? sanitizeResumeId(resumeIdRaw) : "";
  if (!resumeId) {
    return unlimitedEntitlements();
  }

  const record = await readSubscriptionRecord(resumeId);
  const usage = await readUsageRecord(resumeId);

  if (!record) {
    return toClientEntitlements({
      tier: "legacy",
      status: "active",
      expiresAt: null,
      legacyUnlimited: true,
      usage,
    });
  }

  return toClientEntitlements({
    tier: record.tier,
    status: record.status,
    expiresAt: record.expiresAt,
    legacyUnlimited: record.tier === "legacy" && record.expiresAt == null,
    usage,
    note: record.note,
  });
}

export type EntitlementCheckResult =
  | { ok: true; entitlements: ClientEntitlements }
  | { ok: false; entitlements: ClientEntitlements; message: string; code: string };

export async function requireFeature(
  resumeIdRaw: string | undefined,
  feature: keyof PlanFeatures,
): Promise<EntitlementCheckResult> {
  const entitlements = await resolveEntitlements(resumeIdRaw);
  if (!entitlements.features[feature]) {
    const labels: Record<keyof PlanFeatures, string> = {
      editing: "在线编辑",
      publicView: "对外访问",
      smartImport: "智能导入",
      aiParse: "AI 深度解析",
      viewLog: "链接访问记录",
      shareEmail: "邮件代发分享",
    };
    const reason = !entitlements.active
      ? "套餐已到期或已取消，请续费后继续使用。"
      : `当前套餐（${entitlements.tierLabelZh}）未包含「${labels[feature]}」，请升级套餐。`;
    return {
      ok: false,
      entitlements,
      message: reason,
      code: !entitlements.active ? "subscription_expired" : "feature_not_in_plan",
    };
  }
  return { ok: true, entitlements };
}

export async function requireParseQuota(
  resumeIdRaw: string | undefined,
  useAi: boolean,
): Promise<EntitlementCheckResult> {
  const feature: keyof PlanFeatures = useAi ? "aiParse" : "smartImport";
  const base = await requireFeature(resumeIdRaw, feature);
  if (!base.ok) return base;

  const { entitlements } = base;
  const used = useAi
    ? entitlements.usage.aiParseUsed
    : entitlements.usage.smartImportUsed;
  const limit = useAi
    ? entitlements.quotas.aiParsePerMonth
    : entitlements.quotas.smartImportPerMonth;

  if (limit > 0 && used >= limit) {
    return {
      ok: false,
      entitlements,
      message: useAi
        ? `本月 AI 解析次数已用完（${used}/${limit}），请下月再试或升级套餐。`
        : `本月智能导入次数已用完（${used}/${limit}），请下月再试或升级套餐。`,
      code: "quota_exceeded",
    };
  }

  return base;
}

export function entitlementsPayload(entitlements: ClientEntitlements) {
  return entitlements;
}
