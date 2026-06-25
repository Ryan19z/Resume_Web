import type {
  PlanFeatures,
  PlanQuotas,
  SubscriptionTier,
} from "@/lib/subscription-types";

export type PlanDefinition = {
  tier: SubscriptionTier;
  labelZh: string;
  labelEn: string;
  durationDays: number | null;
  features: PlanFeatures;
  quotas: PlanQuotas;
};

/** 单次成功智能导入估算成本（元），管理页展示用；可按实际 API 账单调整 */
export const ESTIMATED_IMPORT_COST_YUAN = 0.02;

export const IMPORT_QUOTA_POLICY_ZH =
  "对客户只需记住两行：① 每月总共能成功导入几次；② 其中几次走 AI（约 2 分/次）。试用 5 次、月租 15 次、季租/年租更多。";

/** 客户可见：每月 AI 简历分析次数说明 */
export function customerAiResumeAnalysisLabel(tier: SubscriptionTier): string {
  const plan = SUBSCRIPTION_PLANS[tier];
  if (!plan.features.aiParse || plan.quotas.aiParsePerMonth <= 0) {
    return "0 次（本档不含 AI，仅规则引擎导入）";
  }
  return `${plan.quotas.aiParsePerMonth} 次/月`;
}

/** 客户可见：每月简历导入总次数（AI + 规则引擎合计） */
export function customerResumeImportTotalLabel(tier: SubscriptionTier): string {
  const n = SUBSCRIPTION_PLANS[tier].quotas.smartImportPerMonth;
  return `${n} 次/月`;
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionTier, PlanDefinition> = {
  legacy: {
    tier: "legacy",
    labelZh: "存量客户（未设到期）",
    labelEn: "Legacy (no expiry set)",
    durationDays: null,
    features: {
      editing: true,
      publicView: true,
      smartImport: true,
      aiParse: true,
      viewLog: true,
      shareEmail: true,
    },
    quotas: {
      smartImportPerMonth: 999,
      aiParsePerMonth: 999,
    },
  },
  trial: {
    tier: "trial",
    labelZh: "试用",
    labelEn: "Trial",
    durationDays: 7,
    features: {
      editing: true,
      publicView: true,
      smartImport: true,
      aiParse: true,
      viewLog: true,
      shareEmail: false,
    },
    quotas: {
      smartImportPerMonth: 15,
      aiParsePerMonth: 5,
    },
  },
  monthly: {
    tier: "monthly",
    labelZh: "月租",
    labelEn: "Monthly",
    durationDays: 30,
    features: {
      editing: true,
      publicView: true,
      smartImport: true,
      aiParse: true,
      viewLog: true,
      shareEmail: true,
    },
    quotas: {
      smartImportPerMonth: 100,
      aiParsePerMonth: 15,
    },
  },
  quarterly: {
    tier: "quarterly",
    labelZh: "季租",
    labelEn: "Quarterly",
    durationDays: 90,
    features: {
      editing: true,
      publicView: true,
      smartImport: true,
      aiParse: true,
      viewLog: true,
      shareEmail: true,
    },
    quotas: {
      smartImportPerMonth: 150,
      aiParsePerMonth: 40,
    },
  },
  yearly: {
    tier: "yearly",
    labelZh: "年租",
    labelEn: "Yearly",
    durationDays: 365,
    features: {
      editing: true,
      publicView: true,
      smartImport: true,
      aiParse: true,
      viewLog: true,
      shareEmail: true,
    },
    quotas: {
      smartImportPerMonth: 200,
      aiParsePerMonth: 80,
    },
  },
};

export const MANAGED_TIERS: SubscriptionTier[] = [
  "trial",
  "monthly",
  "quarterly",
  "yearly",
];

/** 管理页套餐对照表行（与 SUBSCRIPTION_PLANS 同步） */
export type PlanComparisonRowId =
  | "duration"
  | "editing"
  | "publicView"
  | "resumeImportTotal"
  | "aiResumeAnalysis"
  | "viewLog"
  | "shareEmail"
  | "importCostEstimate";

export type PlanComparisonRow = {
  id: PlanComparisonRowId;
  labelZh: string;
  detailZh: string;
};

export const PLAN_COMPARISON_ROWS: PlanComparisonRow[] = [
  {
    id: "duration",
    labelZh: "默认周期",
    detailZh: "开户或按档位续费时默认有效天数",
  },
  {
    id: "editing",
    labelZh: "在线编辑与发布",
    detailZh: "EditURL 修改简历并保存到服务器",
  },
  {
    id: "publicView",
    labelZh: "HR 只读访问",
    detailZh: "ViewURL 对外展示，到期后可能暂停",
  },
  {
    id: "resumeImportTotal",
    labelZh: "简历导入（总次数）",
    detailZh: "每月上传 PDF/Word 并成功填入的次数上限（AI + 规则引擎合计）",
  },
  {
    id: "aiResumeAnalysis",
    labelZh: "AI 简历分析（客户关心的次数）",
    detailZh: "走大模型 DeepSeek 等的次数；用完后本档仍可规则引擎导入（若未超总次数）",
  },
  {
    id: "importCostEstimate",
    labelZh: "AI 成本估算（上限）",
    detailZh: "按「AI 简历分析次数 × 2 分」估算，仅供你内部参考",
  },
  {
    id: "viewLog",
    labelZh: "链接访问记录",
    detailZh: "查看 HR 何时打开 ViewURL、大致地区",
  },
  {
    id: "shareEmail",
    labelZh: "分享邮件代发",
    detailZh: "服务器代发 ViewURL 到 HR 邮箱（需 Resend）",
  },
];

export function planComparisonCell(
  tier: SubscriptionTier,
  rowId: PlanComparisonRowId,
): string {
  const plan = SUBSCRIPTION_PLANS[tier];
  switch (rowId) {
    case "duration":
      return plan.durationDays != null ? `${plan.durationDays} 天` : "不设到期";
    case "resumeImportTotal":
      return customerResumeImportTotalLabel(tier);
    case "aiResumeAnalysis":
      return customerAiResumeAnalysisLabel(tier);
    case "importCostEstimate": {
      if (!plan.features.aiParse || plan.quotas.aiParsePerMonth <= 0) {
        return "约 ¥0（无 AI）";
      }
      const yuan = plan.quotas.aiParsePerMonth * ESTIMATED_IMPORT_COST_YUAN;
      return `约 ¥${yuan.toFixed(2)}/月`;
    }
    case "editing":
    case "publicView":
    case "viewLog":
    case "shareEmail":
      return plan.features[rowId] ? "✓ 包含" : "× 不含";
    default:
      return "—";
  }
}

export function planLabel(tier: SubscriptionTier, lang: "zh" | "en"): string {
  const plan = SUBSCRIPTION_PLANS[tier];
  return lang === "zh" ? plan.labelZh : plan.labelEn;
}

export function tierDurationMs(tier: SubscriptionTier): number | null {
  const days = SUBSCRIPTION_PLANS[tier].durationDays;
  if (days == null) return null;
  return days * 24 * 60 * 60 * 1000;
}
