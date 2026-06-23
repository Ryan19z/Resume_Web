"use client";

import { useSiteContent } from "@/context/SiteContentProvider";
import {
  fetchSiteTourStatus,
  markSiteTourSeenOnServer,
} from "@/lib/site-tour-client";
import { parseClientResumeScope } from "@/lib/resume-scope";
import {
  hasSeenEditorHelpIntro,
  isEditUrlSession,
} from "@/lib/editor-help-guide-state";
import {
  hasCompletedSiteTour,
  hasOfferedAutoTourThisSession,
  markAutoTourOfferedThisSession,
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
          "顶部「首页 / 履历 / 作品」可平滑滚动到对应区域；右侧「分享」可复制链接、发邮件或扫码。完整步骤见右上角「使用说明」。",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: "#tour-top-actions",
      popover: {
        title: "预览与使用说明",
        description:
          "「使用说明」含完整新手教程，底部可重新播放本引导。「预览」仅在有编辑权限时出现，用于隐藏编辑入口、模拟 HR 访客视角。",
        side: "bottom",
        align: "end",
      },
    },
    {
      element: "#tour-resume-import",
      popover: {
        title: "智能导入简历",
        description:
          "有编辑权限时，可上传 PDF / Word / 文本简历，自动识别并填入姓名、经历、教育、项目与奖项。导入后请在预览里核对，再逐页微调。",
        side: "left",
        align: "end",
      },
    },
    {
      element: "#tour-hero-edit",
      popover: {
        title: "首屏就地编辑",
        description:
          "首页可直接点改姓名、岗位、简介、亮点与联系方式，停顿后自动保存。右侧展示窗也支持切换与编辑预览素材。",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "#resume",
      popover: {
        title: "履历分区",
        description:
          "工作经历、项目经历与教育背景集中在此。点击卡片可展开详情，支持新增 / 编辑 / 删除条目。",
        side: "top",
        align: "center",
      },
    },
    {
      element: "#portfolio",
      popover: {
        title: "作品分区",
        description:
          "展示代表作品集：标题、封面与外链。建议至少放 2 个最能证明能力的项目。",
        side: "top",
        align: "center",
      },
    },
    {
      element: "#tour-site-editor",
      popover: {
        title: "站点编辑与链接工具",
        description:
          "「站点编辑」可改首屏形象与分区文案。同区域还有独立的「链接安全」（编辑口令）与「链接访问记录」（HR 是否打开 ViewURL）。",
        side: "left",
        align: "end",
      },
    },
    {
      element: "#tour-share-resume",
      popover: {
        title: "分享简历",
        description:
          "复制访客链接（会自动去掉编辑密钥）、发送到邮箱，或生成二维码。分享前建议先点「预览」自查一遍。",
        side: "bottom",
        align: "end",
      },
    },
    {
      element: "#tour-theme",
      popover: {
        title: "主题与背景",
        description:
          "左下角可更换整站配色，并选择纯色纸面、自定义图片或轻柔流光背景。",
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

/** 首屏必须具备的引导锚点（不依赖编辑权限） */
const CORE_TOUR_SELECTORS = [
  "#tour-anchors",
  "#tour-top-actions",
  "#tour-hero-edit",
  "#resume",
  "#portfolio",
  "#tour-share-resume",
  "#tour-theme",
] as const;

/** 有编辑权限时才出现的锚点；缺失时不阻塞引导启动 */
const OPTIONAL_TOUR_SELECTORS = [
  "#tour-resume-import",
  "#tour-site-editor",
] as const;

function coreTourSelectorsReady(): boolean {
  if (typeof document === "undefined") return false;
  return CORE_TOUR_SELECTORS.every((sel) => Boolean(document.querySelector(sel)));
}

async function waitForTourSelectorsMounted(
  shouldAbort?: () => boolean,
  maxMs = 8000,
): Promise<void> {
  if (typeof document === "undefined") return;
  const startedAt = Date.now();
  const deadline = startedAt + maxMs;
  let coreReadyAt = 0;

  while (Date.now() < deadline) {
    if (shouldAbort?.()) return;

    if (coreTourSelectorsReady()) {
      if (!coreReadyAt) coreReadyAt = Date.now();
      const optionalReady = OPTIONAL_TOUR_SELECTORS.every((sel) =>
        Boolean(document.querySelector(sel)),
      );
      const waitedAfterCore = Date.now() - coreReadyAt;
      if (optionalReady || waitedAfterCore >= 1200) {
        return;
      }
    }

    await new Promise((r) => setTimeout(r, 80));
  }
}

let activeTourRunId = 0;

export type RunSiteTourOptions = {
  /** 自动启动在 React cleanup 时应中止，且不应误标「已完成」 */
  shouldAbort?: () => boolean;
};

const DRIVER_CSS_ID = "resume-driver-js-stylesheet";

function ensureDriverStylesheet(): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();
  const existing = document.getElementById(DRIVER_CSS_ID);
  if (existing instanceof HTMLLinkElement && existing.sheet) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    let link = document.getElementById(DRIVER_CSS_ID) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = DRIVER_CSS_ID;
      link.rel = "stylesheet";
      link.href = "/vendor/driver.css";
      document.head.appendChild(link);
    }
    if (link.sheet) {
      resolve();
      return;
    }
    const done = () => resolve();
    link.addEventListener("load", done, { once: true });
    link.addEventListener("error", done, { once: true });
    window.setTimeout(done, 1200);
  });
}

/**
 * 引导样式使用 `public/vendor/driver.css`，避免 `import('driver.js/dist/driver.css')`
 * 经 Webpack 再注入时与 Next 主样式表竞态，出现整页 Tailwind/preflight 不生效。
 */
export async function runSiteTour(options?: RunSiteTourOptions): Promise<void> {
  if (typeof window === "undefined") return;
  const runId = ++activeTourRunId;
  const shouldAbort = options?.shouldAbort;

  forceTeardownDriverTourDom();
  try {
    await ensureDriverStylesheet();
    if (shouldAbort?.() || runId !== activeTourRunId) return;

    await waitForTourSelectorsMounted(shouldAbort);
    if (shouldAbort?.() || runId !== activeTourRunId) return;

    const { driver } = await import("driver.js");
    if (shouldAbort?.() || runId !== activeTourRunId) return;

    const steps = filterExistingSteps(buildSteps());
    if (steps.length === 0) {
      console.warn("[SiteTourDriver] no tour steps with matching DOM nodes");
      if (!shouldAbort?.()) {
        markSiteTourCompleted();
        notifySiteTourFinished();
      }
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
      if (shouldAbort?.() || runId !== activeTourRunId) {
        forceTeardownDriverTourDom();
        return;
      }
      d.drive();
    });
  } catch (e) {
    console.error("[SiteTourDriver] runSiteTour failed:", e);
    forceTeardownDriverTourDom();
    if (!shouldAbort?.()) {
      markSiteTourCompleted();
      notifySiteTourFinished();
    }
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
 * 首次进入自动播放一次（可跳过）。
 * 同一 IP 首次打开站点时播放；服务端记录后，同 IP 刷新不再自动播放。
 * 手动「重新播放新手引导」不受 IP 记录影响。
 */
export function SiteTourAutoStart() {
  const { previewMode, editPermissionLoaded, canEdit } = useSiteContent();
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (previewMode) return;
    if (!editPermissionLoaded) return;
    /** HR 只读 ViewURL：不自动播放引导，避免干扰浏览 */
    if (!canEdit) {
      markSiteTourCompleted();
      notifySiteTourFinished();
      return;
    }
    /** 首次 EditURL：先弹出「使用说明」，用户点「开始 9 步引导」后再播 tour */
    if (isEditUrlSession() && !hasSeenEditorHelpIntro()) return;
    if (hasCompletedSiteTour()) return;
    if (hasOfferedAutoTourThisSession()) return;

    let cancelled = false;
    const shouldAbort = () => cancelled;

    const timer = window.setTimeout(() => {
      void (async () => {
        if (cancelled) return;

        try {
          const { shouldAutoPlay } = await fetchSiteTourStatus(
            parseClientResumeScope(),
          );
          if (cancelled) return;
          if (!shouldAutoPlay) {
            markSiteTourCompleted();
            return;
          }
        } catch {
          if (cancelled) return;
        }

        markAutoTourOfferedThisSession();
        void markSiteTourSeenOnServer(parseClientResumeScope()).catch(() => {
          /* 离线时仍播放一次，localStorage 在引导结束时写入 */
        });

        window.requestAnimationFrame(() => {
          if (cancelled) return;
          void runSiteTour({ shouldAbort }).catch((err) =>
            console.error("[SiteTourDriver] auto tour:", err),
          );
        });
      })();
    }, 900);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      forceTeardownDriverTourDom();
    };
  }, [previewMode, editPermissionLoaded, canEdit]);
  return null;
}
