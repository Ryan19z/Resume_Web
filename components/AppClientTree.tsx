"use client";

import { HomeShell } from "@/components/HomeShell";
import { forceTeardownDriverTourDom } from "@/components/SiteTourDriver";
import { SiteContentProvider } from "@/context/SiteContentProvider";
import { useLayoutEffect } from "react";

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
  }, []);

  return (
    <SiteContentProvider>
      <HomeShell />
    </SiteContentProvider>
  );
}
