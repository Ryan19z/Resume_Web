"use client";

import type { ReactNode } from "react";
import { useSiteContent } from "@/context/SiteContentProvider";
import { featureLockReason } from "@/lib/client-entitlements";
import type { PlanFeatures } from "@/lib/subscription-types";
import { useLanguageMode } from "@/context/LanguageModeProvider";

type Props = {
  feature: keyof PlanFeatures;
  onAllowed: () => void;
  className?: string;
  children: ReactNode;
  title?: string;
};

export function FeatureGateButton({
  feature,
  onAllowed,
  className,
  children,
  title,
}: Props) {
  const { mode } = useLanguageMode();
  const { entitlements } = useSiteContent();
  const lockReason = featureLockReason(entitlements, feature, mode);

  return (
    <button
      type="button"
      onClick={() => {
        if (lockReason) {
          window.alert(lockReason);
          return;
        }
        onAllowed();
      }}
      className={
        lockReason
          ? `${className ?? ""} opacity-70`.trim()
          : className
      }
      title={lockReason ?? title}
    >
      {children}
      {lockReason ? (
        <span className="ml-1 text-[10px] font-semibold text-amber-700">🔒</span>
      ) : null}
    </button>
  );
}
