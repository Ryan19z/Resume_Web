"use client";

import {
  ESTIMATED_IMPORT_COST_YUAN,
  IMPORT_QUOTA_POLICY_ZH,
  MANAGED_TIERS,
  PLAN_COMPARISON_ROWS,
  planComparisonCell,
  SUBSCRIPTION_PLANS,
} from "@/lib/subscription-plans";
import type { SubscriptionTier } from "@/lib/subscription-types";

type Props = {
  highlightTier?: SubscriptionTier;
};

export function PlanComparisonTable({ highlightTier }: Props) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
      <table className="min-w-[720px] w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line bg-paper/80">
            <th className="min-w-[180px] px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
              功能 / 配额
            </th>
            {MANAGED_TIERS.map((tier) => {
              const plan = SUBSCRIPTION_PLANS[tier];
              const highlighted = tier === highlightTier;
              return (
                <th
                  key={tier}
                  className={`min-w-[100px] px-3 py-3 text-center ${
                    highlighted ? "bg-ink/[0.06]" : ""
                  }`}
                >
                  <span className="block text-sm font-semibold text-ink">
                    {plan.labelZh}
                  </span>
                  {plan.durationDays != null ? (
                    <span className="mt-0.5 block text-[11px] font-normal text-ink-muted">
                      {plan.durationDays} 天
                    </span>
                  ) : null}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {PLAN_COMPARISON_ROWS.map((row) => (
            <tr key={row.id} className="border-t border-line/70">
              <td className="px-4 py-3 align-top">
                <span className="font-medium text-ink">{row.labelZh}</span>
                <span className="mt-0.5 block text-[11px] leading-snug text-ink-muted">
                  {row.detailZh}
                </span>
              </td>
              {MANAGED_TIERS.map((tier) => {
                const value = planComparisonCell(tier, row.id);
                const highlighted = tier === highlightTier;
                const emphasize =
                  row.id === "aiResumeAnalysis" &&
                  SUBSCRIPTION_PLANS[tier].features.aiParse;
                return (
                  <td
                    key={`${row.id}-${tier}`}
                    className={`px-3 py-3 text-center align-top text-[12px] ${
                      highlighted ? "bg-ink/[0.04]" : ""
                    } ${
                      emphasize
                        ? "font-semibold text-emerald-800"
                        : value.startsWith("✓")
                          ? "font-medium text-emerald-800"
                          : "text-ink-muted"
                    }`}
                  >
                    {value}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-line/70 px-4 py-3 text-[11px] leading-relaxed text-ink-muted">
        {IMPORT_QUOTA_POLICY_ZH} AI 单次约 ¥
        {ESTIMATED_IMPORT_COST_YUAN.toFixed(2)}。一次成功导入若走了 AI，会同时占用
        「总导入次数」和「AI 次数」各 1 次。
      </p>
    </div>
  );
}
