import type { HeroAsideMode } from "./types";
import {
  DEMO_SAMPLE_VIDEO_MP4,
  PLACEHOLDER_IMAGES,
  PORTFOLIO_LINK_PLACEHOLDER,
} from "./media-defaults";

export type SpotlightKind =
  | "image"
  | "gallery"
  | "video"
  | "code"
  | "link"
  | "document";

export type SpotlightMediaLinks = {
  image: string;
  gallery: string[];
  video: string;
  link: string;
  document: string;
};

export type RoleFitDraft = {
  id: string;
  title: string;
  fit: string;
  proof?: string;
};

export type ContactEntry = {
  platform: string;
  account: string;
};

export type ContactQrDraft = {
  id: string;
  src: string;
  caption: string;
};

const DEFAULT_ROLE_FITS_ZH = [
  {
    title: "摄影",
    fit: "具备视觉叙事与成片交付能力，能围绕业务目标输出可传播画面。",
  },
  {
    title: "设计",
    fit: "能把抽象需求转成信息结构与界面细节，兼顾审美与可用性。",
  },
  {
    title: "软件工程",
    fit: "可独立推进从需求拆解、实现到上线的完整交付闭环。",
  },
  {
    title: "数据工程",
    fit: "善于把业务问题量化，搭建指标与分析链路支持决策。",
  },
  {
    title: "销售",
    fit: "擅长提炼价值卖点，用案例与结果驱动客户沟通和转化。",
  },
] as const;

const DEFAULT_ROLE_FITS_EN = [
  {
    title: "Photography",
    fit: "Strong in visual storytelling and delivery, producing assets that support business goals.",
  },
  {
    title: "Design",
    fit: "Able to turn abstract requirements into clear information architecture and UI details.",
  },
  {
    title: "Software Engineering",
    fit: "Capable of driving the full lifecycle from requirement breakdown to production delivery.",
  },
  {
    title: "Data Engineering",
    fit: "Comfortable quantifying business questions and building metrics pipelines for decisions.",
  },
  {
    title: "Sales",
    fit: "Skilled at converting product value into client language and outcome-focused communication.",
  },
] as const;

export function extractProofLines(lines: string[], mode: "zh" | "en"): string[] {
  const cleaned = lines.map((x) => x.trim()).filter(Boolean);
  if (cleaned.length === 0) {
    return [
      mode === "zh"
        ? "可基于你的项目经历补充可量化结果。"
        : "Add measurable outcomes from your real project work.",
    ];
  }
  return cleaned;
}

export function buildSkillTags(targetRole: string): string[] {
  const fromRole = targetRole
    .split(/[、,，/|·\s]+/)
    .map((x) => x.trim())
    .filter((x) => x.length >= 2 && x.length <= 10);
  const base = [
    "结果导向",
    "跨团队协作",
    "结构化表达",
    "方案落地",
    "数据复盘",
    "用户洞察",
  ];
  return Array.from(new Set([...fromRole, ...base])).slice(0, 8);
}

export function buildDefaultRoleFits(
  mode: "zh" | "en",
  proofs: string[],
): RoleFitDraft[] {
  const roleBase = mode === "zh" ? DEFAULT_ROLE_FITS_ZH : DEFAULT_ROLE_FITS_EN;
  return roleBase.map((item, i) => ({
    id: `rf-${mode}-${i + 1}`,
    title: item.title,
    fit: item.fit,
    proof: proofs[i % proofs.length],
  }));
}

export function parseContactEntries(raw: string): ContactEntry[] {
  return raw
    .split(/[\n|；;]+/)
    .map((x) => x.trim())
    .filter(Boolean)
    .map((part) => {
      const cleaned = part.replace(/^contact\s*[-–—:：]\s*/i, "").trim();
      const colonIdx = cleaned.search(/[:：]/);
      if (colonIdx > 0) {
        const platform = cleaned.slice(0, colonIdx).trim();
        const account = cleaned.slice(colonIdx + 1).trim();
        if (platform && account) return { platform, account };
      }
      return { platform: "", account: cleaned || part };
    })
    .filter((x) => x.account);
}

const DEFAULT_SPOTLIGHT_TITLE_ZH = "个人核心优势展示窗";
const DEFAULT_SPOTLIGHT_SUMMARY_PREFIX_ZH = "可展示你最拿得出手";

const DEFAULT_SPOTLIGHT_TITLES = new Set([
  DEFAULT_SPOTLIGHT_TITLE_ZH,
  "个人重点展示",
  "Core strength showcase",
  "Showcase",
]);

const DEFAULT_SPOTLIGHT_SUMMARY_PREFIXES = [
  DEFAULT_SPOTLIGHT_SUMMARY_PREFIX_ZH,
  "可展示代码、摄影作品",
  "Show your best proof",
  "Describe impact",
];

const PLACEHOLDER_MEDIA_URLS = new Set<string>([
  DEMO_SAMPLE_VIDEO_MP4,
  PORTFOLIO_LINK_PLACEHOLDER,
  ...Object.values(PLACEHOLDER_IMAGES),
]);

/** 占位/demo 链接不算用户实际上传的重点展示内容 */
export function isMeaningfulSpotlightMediaUrl(url?: string): boolean {
  const trimmed = url?.trim() ?? "";
  if (!trimmed) return false;
  return !PLACEHOLDER_MEDIA_URLS.has(trimmed);
}

export function sanitizeSpotlightMediaLinks(
  links: SpotlightMediaLinks,
): SpotlightMediaLinks {
  return {
    image: isMeaningfulSpotlightMediaUrl(links.image) ? links.image.trim() : "",
    gallery: links.gallery
      .map((u) => u.trim())
      .filter(isMeaningfulSpotlightMediaUrl),
    video: isMeaningfulSpotlightMediaUrl(links.video) ? links.video.trim() : "",
    link: isMeaningfulSpotlightMediaUrl(links.link) ? links.link.trim() : "",
    document: isMeaningfulSpotlightMediaUrl(links.document)
      ? links.document.trim()
      : "",
  };
}

export function resolveHeroAsideMode(mode?: HeroAsideMode): HeroAsideMode {
  return mode === "portrait" || mode === "hidden" ? mode : "showcase";
}

export function hasSpotlightMediaContent(
  links: SpotlightMediaLinks,
  code: string,
): boolean {
  if (code.trim()) return true;
  if (isMeaningfulSpotlightMediaUrl(links.image)) return true;
  if (links.gallery.some((u) => isMeaningfulSpotlightMediaUrl(u))) return true;
  if (isMeaningfulSpotlightMediaUrl(links.video)) return true;
  if (isMeaningfulSpotlightMediaUrl(links.link)) return true;
  if (isMeaningfulSpotlightMediaUrl(links.document)) return true;
  return false;
}

export function hasCustomSpotlightText(title: string, summary: string): boolean {
  const t = title.trim();
  const s = summary.trim();
  if (t && !DEFAULT_SPOTLIGHT_TITLES.has(t)) {
    return true;
  }
  if (
    s &&
    !DEFAULT_SPOTLIGHT_SUMMARY_PREFIXES.some((prefix) => s.startsWith(prefix))
  ) {
    return true;
  }
  return false;
}

export function hasShowcaseContent(
  title: string,
  summary: string,
  mediaLinks: SpotlightMediaLinks,
  code: string,
): boolean {
  return (
    hasSpotlightMediaContent(mediaLinks, code) ||
    hasCustomSpotlightText(title, summary)
  );
}

export function hasPortraitContent(portraitUrl?: string): boolean {
  return Boolean(portraitUrl?.trim());
}

export type VisitorAsideView = "showcase" | "portrait";

export type AsideTabView = VisitorAsideView | "hidden";

/** 预览/HR：根据实际上传内容决定展示哪些切换按钮（编辑模式始终显示全部选项） */
export function resolveAsideTabViews(options: {
  spotlightTitle: string;
  spotlightSummary: string;
  mediaLinks: SpotlightMediaLinks;
  spotlightCode: string;
  portraitUrl?: string;
  includeHidden: boolean;
}): AsideTabView[] {
  const hasShowcase = hasShowcaseContent(
    options.spotlightTitle,
    options.spotlightSummary,
    options.mediaLinks,
    options.spotlightCode,
  );
  const hasPortrait = hasPortraitContent(options.portraitUrl);
  const views: AsideTabView[] = [];
  if (hasShowcase) views.push("showcase");
  if (hasPortrait) views.push("portrait");
  if (options.includeHidden) views.push("hidden");
  return views;
}

/** 当前应展示的面板（模式与内容不一致时回退到有内容的一项） */
export function resolveEffectiveAsidePanel(options: {
  canInline: boolean;
  heroAsideMode: HeroAsideMode;
  visitorAside: ReturnType<typeof resolveVisitorAside>;
  visitorAsideView: VisitorAsideView | null;
}): HeroAsideMode {
  const { canInline, heroAsideMode, visitorAside, visitorAsideView } = options;
  if (canInline) {
    return heroAsideMode;
  }
  if (!visitorAside.show || !visitorAside.defaultView) return "hidden";
  if (visitorAsideView && visitorAside.views.includes(visitorAsideView)) {
    return visitorAsideView;
  }
  return visitorAside.defaultView;
}

/** 访客/预览：根据实际内容决定展示哪几项、是否可切换 */
export function resolveVisitorAside(options: {
  mode?: HeroAsideMode;
  spotlightTitle: string;
  spotlightSummary: string;
  mediaLinks: SpotlightMediaLinks;
  spotlightCode: string;
  portraitUrl?: string;
}): {
  show: boolean;
  views: VisitorAsideView[];
  defaultView: VisitorAsideView | null;
} {
  if (resolveHeroAsideMode(options.mode) === "hidden") {
    return { show: false, views: [], defaultView: null };
  }
  const hasShowcase = hasShowcaseContent(
    options.spotlightTitle,
    options.spotlightSummary,
    options.mediaLinks,
    options.spotlightCode,
  );
  const hasPortrait = hasPortraitContent(options.portraitUrl);

  if (!hasShowcase && !hasPortrait) {
    return { show: false, views: [], defaultView: null };
  }
  if (hasShowcase && hasPortrait) {
    const preferred: VisitorAsideView =
      options.mode === "portrait" ? "portrait" : "showcase";
    return {
      show: true,
      views: ["showcase", "portrait"],
      defaultView: preferred,
    };
  }
  if (hasPortrait) {
    return { show: true, views: ["portrait"], defaultView: "portrait" };
  }
  return { show: true, views: ["showcase"], defaultView: "showcase" };
}

/** 访客/预览模式下是否展示首屏右侧区域 */
export function shouldShowHeroAside(options: {
  mode?: HeroAsideMode;
  spotlightTitle: string;
  spotlightSummary: string;
  mediaLinks: SpotlightMediaLinks;
  spotlightCode: string;
  portraitUrl?: string;
  isEditing: boolean;
}): boolean {
  if (options.isEditing) return true;
  return resolveVisitorAside(options).show;
}

export function formatContactEntryDisplay(entry: ContactEntry): string {
  const platform = entry.platform.trim();
  let account = entry.account.trim();
  account = account
    .replace(/^[-–—]\s*/, "")
    .replace(/^contact\s*[-–—:：]\s*/i, "")
    .trim();
  if (!platform || /^contact$/i.test(platform)) return account;
  const platformClean = platform.replace(/^contact\s*[-–—:：]\s*/i, "").trim();
  if (!platformClean) return account;
  return `${platformClean}: ${account}`;
}
