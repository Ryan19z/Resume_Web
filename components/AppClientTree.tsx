"use client";

import { CssLoadRecovery } from "@/components/CssLoadRecovery";
import { HomeShell } from "@/components/HomeShell";
import { forceTeardownDriverTourDom } from "@/components/SiteTourDriver";
import { InteractionModeProvider } from "@/context/InteractionModeProvider";
import { LanguageModeProvider } from "@/context/LanguageModeProvider";
import { SiteContentProvider } from "@/context/SiteContentProvider";
import { resetSiteTourCompletion } from "@/lib/site-tour-state";
import { useLayoutEffect } from "react";

function clearPersistedSiteDrafts() {
  if (typeof window === "undefined") return;
  const toRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (
      k &&
      (k.startsWith("resume-site-bundle-v2") ||
        k.startsWith("resume-site-profile-v1"))
    ) {
      toRemove.push(k);
    }
  }
  toRemove.forEach((k) => localStorage.removeItem(k));
}

/**
 * 直接挂载整站。此前用 `useEffect` 延迟挂载时，在部分环境下 effect 未跑或水合异常，
 * 会无限停在「正在加载…」；隧道 1033/530 仍属 Cloudflare 侧问题，与此处无关。
 *
 * `useLayoutEffect` 在首帧绘制前清理 driver.js 残留，避免 `body.driver-active`
 * 锁死全页指针事件（见 `forceTeardownDriverTourDom`）。
 */
export default function AppClientTree() {
  useLayoutEffect(() => {
    forceTeardownDriverTourDom();
    const params = new URLSearchParams(window.location.search);
    if (params.get("reset") === "default") {
      clearPersistedSiteDrafts();
      resetSiteTourCompletion();
      params.delete("reset");
      const qs = params.toString();
      window.location.replace(
        `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`,
      );
    }
  }, []);

  return (
    <LanguageModeProvider>
      <SiteContentProvider>
        <InteractionModeProvider>
          <CssLoadRecovery />
          <HomeShell />
        </InteractionModeProvider>
      </SiteContentProvider>
    </LanguageModeProvider>
  );
}
