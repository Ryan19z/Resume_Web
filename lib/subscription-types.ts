export type SubscriptionTier =
  | "legacy"
  | "trial"
  | "monthly"
  | "quarterly"
  | "yearly";

export type SubscriptionStatus = "active" | "expired" | "cancelled";

export type PlanFeatures = {
  editing: boolean;
  publicView: boolean;
  smartImport: boolean;
  aiParse: boolean;
  viewLog: boolean;
  shareEmail: boolean;
};

export type PlanQuotas = {
  smartImportPerMonth: number;
  aiParsePerMonth: number;
};

export type SubscriptionRecord = {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  startedAt: number;
  expiresAt: number | null;
  note?: string;
  updatedAt: number;
};

export type UsageRecord = {
  monthKey: string;
  smartImport: number;
  aiParse: number;
};

export type ClientEntitlements = {
  tier: SubscriptionTier;
  tierLabelZh: string;
  tierLabelEn: string;
  status: SubscriptionStatus;
  active: boolean;
  expiresAt: number | null;
  daysLeft: number | null;
  legacyUnlimited: boolean;
  features: PlanFeatures;
  quotas: PlanQuotas;
  usage: {
    smartImportUsed: number;
    aiParseUsed: number;
  };
  note?: string;
};

export const ALL_FEATURES_ENABLED: PlanFeatures = {
  editing: true,
  publicView: true,
  smartImport: true,
  aiParse: true,
  viewLog: true,
  shareEmail: true,
};

export const EXPIRED_FEATURES: PlanFeatures = {
  editing: false,
  publicView: false,
  smartImport: false,
  aiParse: false,
  viewLog: false,
  shareEmail: false,
};
