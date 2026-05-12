"use client";

import { useSiteContent } from "@/context/SiteContentProvider";
import {
  hasCompletedSiteTour,
  markSiteTourCompleted,
  notifySiteTourFinished,
} from "@/lib/site-tour-state";
import type { Config, DriveStep } from "driver.js";
import { useEffect } from "react";

export {
  hasCompletedSiteTour,
  markSiteTourCompleted,
  resetSiteTourCompletion,
} from "@/lib/site-tour-state";

/**
 * 移除 driver.js 留在文档上的 class 与节点。
 *
 * `public/vendor/driver.css` 中有：
 * `.driver-active * { pointer-events: none }`，仅对 `.driver-active-element`、
 * `.driver-popover` 及其后代恢复点击。若引导在热更新/异常/刷新过程中中断
 * 且未执行完整 destroy，`body` 仍带 `driver-active` 但页面上已无弹层，则
 * **整页无法点击**（履历卡片、「使用说明」、站点编辑等全部失效）。
 */
export function forceTeardownDriverTourDom(): void {
  if (typeof document === "undefined") return;

  document.querySelectorAll("svg.driver-overlay").forEach((n) => n.remove());
  document.querySelectorAll(".driver-popover").forEach((n) => n.remove());
  document.getElementById("driver-dummy-element")?.remove();

  document.querySelectorAll(".driver-active-element").forEach((el) => {
    if (!(el instanceof HTMLElement)) return;
    el.classList.remove("driver-active-element", "driver-no-interaction");
    el.removeAttribute("aria-haspopup");
    el.removeAttribute("aria-expanded");
    el.removeAttribute("aria-controls");
  });

  document.body.classList.remove("driver-active", "driver-fade", "driver-simple");
  document.documentElement.classList.remove(
    "driver-active",
    "driver-fade",
    "driver-simple",
  );
}

function buildSteps(): DriveStep[] {
  return [
    {
      element: "#tour-anchors",
      popover: {
        title: "欢迎与分区导航",
        description:
          "点击「首屏 / 履历 / 作品」可平滑滚动到对应区域；右侧「分享」可复制链接或扫码打开。若你有编辑权限，下一步会介绍右上角的预览与使用说明。",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: "#tour-top-actions",
      popover: {
        title: "预览与使用说明",
        description:
          "「使用说明」随时打开完整手册并可在底部重新播放本引导；「预览」仅在有编辑权限时出现，用于隐藏编辑入口、模拟访客视角。",
        side: "bottom",
        align: "end",
      },
    },
    {
      element: "#tour-hero-edit",
      popover: {
        title: "首屏就地编辑",
        description:
          "首屏与预览一致：直接点击姓名、岗位、介绍或三条要点即可修改，停顿后自动保存；左上角小标题与形象照等在右下角「站点编辑」里。",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "#tour-site-editor",
      popover: {
        title: "站点编辑",
        description:
          "打开后可编辑首屏完整资料、履历页与作品页的文案，以及添加作品条目等。",
        side: "top",
        align: "end",
      },
    },
    {
      element: "#tour-share-resume",
      popover: {
        title: "分享简历",
        description:
          "可复制当前页面链接、发送到您的邮箱备份，或生成二维码用手机扫一扫打开。",
        side: "bottom",
        align: "end",
      },
    },
    {
      element: "#tour-theme",
      popover: {
        title: "主题切换",
        description: "左下角可更换整站配色与纸张风格。",
        side: "top",
        align: "start",
      },
    },
  ];
}

function resolveStepElement(step: DriveStep): Element | null {
  const raw = step.element;
  if (typeof raw === "string") {
    return document.querySelector(raw);
  }
  if (typeof raw === "function") {
    try {
      const el = raw();
      return el instanceof Element ? el : null;
    } catch {
      return null;
    }
  }
  return raw instanceof Element ? raw : null;
}

function filterExistingSteps(steps: DriveStep[]): DriveStep[] {
  if (typeof document === "undefined") return steps;
  return steps.filter((s) => Boolean(resolveStepElement(s)));
}

const TOUR_STEP_TARGET_COUNT = buildSteps().length;

async function waitForTourSelectorsMounted(maxMs = 6000): Promise<void> {
  if (typeof document === "undefined") return;
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    if (filterExistingSteps(buildSteps()).length === TOUR_STEP_TARGET_COUNT) {
      return;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
}

const DRIVER_CSS_ID = "resume-driver-js-stylesheet";

function ensureDriverStylesheet(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(DRIVER_CSS_ID)) return;
  const link = document.createElement("link");
  link.id = DRIVER_CSS_ID;
  link.rel = "stylesheet";
  link.href = "/vendor/driver.css";
  document.head.appendChild(link);
}

/**
 * 引导样式使用 `public/vendor/driver.css`，避免 `import('driver.js/dist/driver.css')`
 * 经 Webpack 再注入时与 Next 主样式表竞态，出现整页 Tailwind/preflight 不生效。
 */
export async function runSiteTour(): Promise<void> {
  if (typeof window === "undefined") return;
  forceTeardownDriverTourDom();
  try {
    ensureDriverStylesheet();
    await waitForTourSelectorsMounted();
    const { driver } = await import("driver.js");
    const steps = filterExistingSteps(buildSteps());
    if (steps.length === 0) {
      console.warn("[SiteTourDriver] no tour steps with matching DOM nodes");
      markSiteTourCompleted();
      notifySiteTourFinished();
      return;
    }
    const config: Config = {
      showProgress: true,
      smoothScroll: true,
      nextBtnText: "下一步",
      prevBtnText: "上一步",
      doneBtnText: "完成",
      steps,
      onDestroyed: () => {
        markSiteTourCompleted();
        forceTeardownDriverTourDom();
        notifySiteTourFinished();
      },
    };
    const d = driver(config);
    requestAnimationFrame(() => {
      d.drive();
    });
  } catch (e) {
    console.error("[SiteTourDriver] runSiteTour failed:", e);
    forceTeardownDriverTourDom();
    markSiteTourCompleted();
    notifySiteTourFinished();
  }
}

const START_EVENT = "resume-start-site-tour";

export function dispatchStartSiteTour() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(START_EVENT));
}

/** 监听全局事件以启动引导（供「重新播放」使用） */
export function SiteTourListener() {
  useEffect(() => {
    const onStart = () => {
      void runSiteTour().catch((err) =>
        console.error("[SiteTourDriver] tour from event:", err),
      );
    };
    window.addEventListener(START_EVENT, onStart);
    return () => window.removeEventListener(START_EVENT, onStart);
  }, []);
  return null;
}

/**
 * 首次进入自动播放一次（可跳过）。首帧布局后即启动，不等待权限接口。
 * 只读访客同样会播放：步骤会按 DOM 自动过滤；预览模式下不启动。
 */
export function SiteTourAutoStart() {
  const { previewMode } = useSiteContent();
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (previewMode) return;
    if (hasCompletedSiteTour()) return;

    let cancelled = false;
    let id2 = 0;

    const kick = () => {
      if (cancelled) return;
      void runSiteTour().catch((err) =>
        console.error("[SiteTourDriver] auto tour:", err),
      );
    };

    // 不等待 /api/can-edit：隧道或弱网时权限请求可能很慢，导致引导迟迟不出现。
    // 双 requestAnimationFrame：等浏览器完成首帧布局后再启动，避免目标节点尚未挂载。
    const id1 = window.requestAnimationFrame(() => {
      id2 = window.requestAnimationFrame(kick);
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(id1);
      window.cancelAnimationFrame(id2);
      /** 预览切换 / StrictMode / HMR 时取消待启动的引导，并清掉可能半截的 driver DOM */
      forceTeardownDriverTourDom();
    };
  }, [previewMode]);
  return null;
}
