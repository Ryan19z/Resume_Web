import {
  DEMO_SAMPLE_VIDEO_MP4,
  PLACEHOLDER_IMAGES,
  PORTFOLIO_LINK_PLACEHOLDER,
} from "./media-defaults";
import { defaultPageBackground } from "./page-background";
import type { PersistedSiteBundle, SiteContent } from "./types";

/** 推流 / 演示用虚构人物（经典开源简历样例风格，非真实个人信息） */
/** 与纸质 PDF 对比样例统一显示名 */
export const DEMO_CLASSIC_SAMPLE_NAME_ZH = "XXX";
export const DEMO_CLASSIC_SAMPLE_NAME_EN = "Alex Sample";
export const DEMO_CLASSIC_SAMPLE_DISCLAIMER_ZH =
  "本页为产品功能演示用虚构样例，人物与经历均为示例数据。";
export const DEMO_CLASSIC_SAMPLE_DISCLAIMER_EN =
  "Fictional demo profile for product showcase only—not a real person.";

const siteZh: SiteContent = {
  name: DEMO_CLASSIC_SAMPLE_NAME_ZH,
  tagline:
    "6 年前端经验，专注 Web 性能与设计系统；擅长把复杂需求拆成可复用组件与可量化交付。",
  targetRole: "资深前端工程师",
  heroPreviewLines: [
    "将核心页面 LCP 从 3.1s 优化到 1.4s，转化率提升约 8%",
    "搭建跨 5 条业务线复用的组件库与设计令牌",
    "推动可访问性与响应式规范，减少一线设计返工",
  ],
  transferableSkills: [
    "React / Next.js",
    "TypeScript",
    "性能优化",
    "设计系统",
    "可访问性",
    "跨团队协作",
  ],
  roleFitEntries: [
    {
      id: "rf-zh-1",
      title: "前端工程",
      fit: "可独立推进从需求拆解、组件抽象到上线监控的完整闭环。",
      proof: "主导控制台 2.0 重构，首屏 JS 体积下降 38%。",
    },
    {
      id: "rf-zh-2",
      title: "体验与性能",
      fit: "熟悉 Core Web Vitals 与埋点漏斗，能用数据验证优化效果。",
      proof: "营销落地页体系支持 A/B，注册转化提升 12%。",
    },
    {
      id: "rf-zh-3",
      title: "设计协作",
      fit: "能把 Figma 设计令牌映射到代码，降低设计与开发沟通成本。",
      proof: "输出 Storybook 文档与用法规范，新人上手周期缩短一半。",
    },
  ],
  heroSpotlight: {
    title: "控制台 2.0 设计系统",
    summary:
      "展示代表项目：界面截图、30 秒交互演示视频，以及核心 Layout 组件代码片段。",
    media: { kind: "image", url: PLACEHOLDER_IMAGES.wide3 },
    mediaLinks: {
      image: PLACEHOLDER_IMAGES.wide3,
      gallery: [PLACEHOLDER_IMAGES.wide1, PLACEHOLDER_IMAGES.wide2],
      video: DEMO_SAMPLE_VIDEO_MP4,
      link: PORTFOLIO_LINK_PLACEHOLDER,
      document: "",
    },
    documentName: "",
  },
  heroAsideMode: "showcase",
  heroPortrait: {
    url: PLACEHOLDER_IMAGES.heroPortrait,
    caption: "演示证件照 · Unsplash 免费图",
  },
  contactEmail: "demo@example.com",
  contactPhone: "13800138000",
  contactExtra: "GitHub: demo-sample | 杭州 · 可远程",
  heroContactQrs: [
    {
      id: "qr-1",
      src: "/placeholders/demo-contact-qr.png",
      caption: "演示联系二维码（占位）",
    },
  ],
  heroContactQrSrc: "/placeholders/demo-contact-qr.png",
  heroContactQrCaption: "扫码备注：产品演示 · 非真实联系方式",
  heroCopy: {
    eyebrow: "Demo Portfolio",
    swipeHint: "向下滚动 · 浏览履历与作品集（演示样例）",
  },
  pageBackground: defaultPageBackground,
  resumeCopy: {
    pageEyebrow: "Résumé",
    pageTitle: "履历",
    pageIntro:
      "点击卡片查看详情；代表项目支持图片、视频与代码预览。本页内容为虚构演示数据。",
    experienceSectionEyebrow: "工作经历",
    projectExperienceSectionEyebrow: "项目经历",
    educationSectionEyebrow: "教育背景",
    experienceCardCta: "查看工作成果 →",
    educationCardCta: "查看校园成果 →",
    detailWorkEyebrow: "工作成果",
    detailCampusEyebrow: "校园成果",
    keyResultsHeading: "关键成果",
    repProjectsHeading: "代表项目",
  },
  portfolioCopy: {
    pageEyebrow: "Work",
    pageTitle: "作品集",
    pageIntro:
      "栅格展示封面与海报；点击可在新标签打开项目链接。演示用占位图与示例链接。",
    openLinkLabel: "打开链接",
    posterThumbTitle: "视频海报 / 备选图",
    posterThumbCaption: "主图与链接便于 HR 快速预览与跳转",
  },
  experience: [
    {
      id: "exp-1",
      title: "高级前端工程师",
      subtitle: "示例科技有限公司 · 核心产品部",
      period: "2022 — 至今",
      summary: "负责 Web 体验、性能与设计系统，对接产品与设计每周迭代。",
      keyResults: [
        "将核心页面 LCP 从 3.1s 优化到 1.4s，转化率提升约 8%。",
        "搭建组件库与设计令牌，跨 5 条业务线复用。",
        "推动 WCAG 2.1 AA 可访问性规范落地。",
      ],
      representativeProjects: [
        {
          id: "rp-1-1",
          title: "控制台 2.0 界面稿",
          description: "代表项目 · 图片展示",
          media: { kind: "image", url: PLACEHOLDER_IMAGES.wide1 },
        },
        {
          id: "rp-1-2",
          title: "交互动效演示",
          description: "代表项目 · 示例 mp4",
          media: { kind: "video", url: DEMO_SAMPLE_VIDEO_MP4 },
        },
        {
          id: "rp-1-3",
          title: "AppShell 布局组件",
          description: "代表项目 · 代码片段",
          media: {
            kind: "code",
            language: "tsx",
            code: `export function AppShell({ title, children }: Props) {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {children}
    </main>
  );
}`,
          },
        },
      ],
    },
    {
      id: "exp-2",
      title: "前端工程师",
      subtitle: "示例初创团队",
      period: "2019 — 2022",
      summary: "从 0 到 1 搭建营销站、注册漏斗与内部控制台。",
      keyResults: [
        "搭建营销落地页体系，支持多活动并行与 A/B 配置。",
        "实现注册到激活的关键路径埋点与可视化漏斗。",
        "引入 CI 预览环境，设计验收周期缩短 40%。",
      ],
      representativeProjects: [
        {
          id: "rp-2-1",
          title: "埋点 SDK 核心逻辑",
          description: "代表项目 · 代码片段",
          media: {
            kind: "code",
            language: "typescript",
            code: `export function track(event: string, props?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  window.dataLayer?.push({ event, ...props, ts: Date.now() });
}`,
          },
        },
      ],
    },
  ],
  projectExperience: [
    {
      id: "proj-exp-1",
      title: "Linkola 在线简历平台",
      subtitle: "个人开源实践 · 全栈",
      period: "2024 — 2025",
      summary:
        "基于 Next.js 的多租户可视化简历站点，支持编辑链接、HR 只读链接与智能导入。",
      keyResults: [
        "实现 IP 白名单 + Token 双模式鉴权与发布快照持久化。",
        "GitHub Actions 构建后 SCP 部署至阿里云轻量服务器。",
        "智能导入支持 PDF / Word，规则引擎 + 可选 AI 解析。",
      ],
      representativeProjects: [
        {
          id: "pe-rp-1",
          title: "部署流水线示意",
          description: "代表项目 · 图片",
          media: { kind: "image", url: PLACEHOLDER_IMAGES.wide4 },
        },
        {
          id: "pe-rp-2",
          title: "产品演示短片",
          description: "代表项目 · 视频",
          media: { kind: "video", url: DEMO_SAMPLE_VIDEO_MP4 },
        },
      ],
    },
  ],
  education: [
    {
      id: "edu-1",
      title: "计算机科学 · 本科",
      subtitle: "示例大学",
      period: "2015 — 2019",
      summary: "主修软件工程方向，兼顾课程项目与开源实践。",
      campusHighlights: [
        {
          heading: "竞赛与荣誉",
          bullets: [
            "全国大学生数学建模竞赛省一等奖。",
            "校级优秀毕业论文：面向弱网环境的资源调度策略。",
          ],
        },
        {
          heading: "校园实践",
          bullets: [
            "学生技术社团负责人，组织每学期黑客松。",
            "课程笔记开源仓库累计 star 800+（演示数据）。",
          ],
        },
      ],
      representativeProjects: [
        {
          id: "edu-rp-1",
          title: "建模论文附图",
          description: "校园成果 · 图片",
          media: { kind: "image", url: PLACEHOLDER_IMAGES.wide2 },
        },
        {
          id: "edu-rp-2",
          title: "社团活动纪录",
          description: "校园成果 · 视频",
          media: { kind: "video", url: DEMO_SAMPLE_VIDEO_MP4 },
        },
        {
          id: "edu-rp-3",
          title: "调度算法示意代码",
          description: "校园成果 · 代码",
          media: {
            kind: "code",
            language: "python",
            code: `def schedule(tasks, bandwidth):
    """弱网环境下的简单调度示意"""
    return sorted(tasks, key=lambda t: t.priority)[:bandwidth]`,
          },
        },
      ],
    },
  ],
  projects: [
    {
      id: "proj-1",
      title: "品牌先导片",
      description: "30 秒概念片 · 调色与节奏剪辑（演示）",
      coverSrc: PLACEHOLDER_IMAGES.wide1,
      posterSrc: PLACEHOLDER_IMAGES.wide5,
      href: PORTFOLIO_LINK_PLACEHOLDER,
    },
    {
      id: "proj-2",
      title: "产品官网改版",
      description: "信息架构 + 组件系统",
      coverSrc: PLACEHOLDER_IMAGES.wide2,
      href: PORTFOLIO_LINK_PLACEHOLDER,
    },
    {
      id: "proj-3",
      title: "数据可视化专题",
      description: "大屏与叙事动效",
      coverSrc: PLACEHOLDER_IMAGES.wide3,
      href: PORTFOLIO_LINK_PLACEHOLDER,
    },
    {
      id: "proj-4",
      title: "移动端活动页",
      description: "手势与物理动效",
      coverSrc: PLACEHOLDER_IMAGES.wide4,
      href: PORTFOLIO_LINK_PLACEHOLDER,
    },
  ],
};

const siteEn: SiteContent = {
  ...siteZh,
  name: DEMO_CLASSIC_SAMPLE_NAME_EN,
  tagline:
    "6 years in front-end engineering—Web performance, design systems, and measurable delivery.",
  targetRole: "Senior Front-End Engineer",
  heroPreviewLines: [
    "Cut core LCP from 3.1s to 1.4s; conversion up ~8%",
    "Design tokens + component library reused across 5 product lines",
    "Shipped WCAG 2.1 AA guidelines with design partners",
  ],
  transferableSkills: [
    "React / Next.js",
    "TypeScript",
    "Performance",
    "Design systems",
    "Accessibility",
    "Cross-functional delivery",
  ],
  roleFitEntries: [
    {
      id: "rf-en-1",
      title: "Front-end",
      fit: "Owns the loop from requirements to components, release, and monitoring.",
      proof: "Led console 2.0 rebuild; first-load JS down 38%.",
    },
    {
      id: "rf-en-2",
      title: "Performance",
      fit: "Uses Core Web Vitals and funnels to validate optimizations.",
      proof: "Landing page A/B framework lifted signup conversion 12%.",
    },
    {
      id: "rf-en-3",
      title: "Design ops",
      fit: "Maps Figma tokens to code and documents patterns in Storybook.",
      proof: "Cut onboarding time for new engineers roughly in half.",
    },
  ],
  heroSpotlight: {
    ...siteZh.heroSpotlight!,
    title: "Console 2.0 design system",
    summary:
      "Demo showcase: UI screenshot, 30s interaction clip, and core layout component code.",
  },
  heroPortrait: {
    url: PLACEHOLDER_IMAGES.heroPortrait,
    caption: "Demo portrait · Unsplash (free to use)",
  },
  contactEmail: "demo@example.com",
  contactExtra: "GitHub: demo-sample | Hangzhou · open to remote",
  heroContactQrs: [
    {
      id: "qr-1",
      src: "/placeholders/demo-contact-qr.png",
      caption: "Demo contact QR (placeholder)",
    },
  ],
  heroContactQrCaption: "Demo only—not a real contact channel",
  heroCopy: {
    eyebrow: "Demo Portfolio",
    swipeHint: "Scroll for résumé & work samples (fictional demo)",
  },
  resumeCopy: {
    ...siteZh.resumeCopy!,
    pageIntro:
      "Tap cards for details; rep projects support image, video, and code. Fictional demo data.",
    experienceSectionEyebrow: "Experience",
    projectExperienceSectionEyebrow: "Projects",
    educationSectionEyebrow: "Education",
  },
  portfolioCopy: {
    ...siteZh.portfolioCopy!,
    pageIntro:
      "Grid of covers and posters; links open in a new tab. Placeholder media for demo.",
  },
  experience: siteZh.experience.map((item, i) => ({
    ...item,
    title: i === 0 ? "Senior Front-End Engineer" : "Front-End Engineer",
    subtitle:
      i === 0 ? "Sample Tech Co. · Core product" : "Sample startup team",
    summary:
      i === 0
        ? "Web UX, performance, and design system with weekly design/product sync."
        : "Built marketing site, signup funnel, and internal console from scratch.",
  })),
  projectExperience: [
    {
      ...siteZh.projectExperience![0],
      title: "Linkola online résumé platform",
      subtitle: "Personal open-source practice · full-stack",
      summary:
        "Multi-tenant visual résumé site on Next.js with edit/view links and smart import.",
    },
  ],
  education: [
    {
      ...siteZh.education[0],
      subtitle: "Sample University",
      summary: "CS major with coursework projects and open-source practice.",
    },
  ],
  projects: siteZh.projects.map((p) => ({
    ...p,
    title:
      p.id === "proj-1"
        ? "Brand teaser"
        : p.id === "proj-2"
          ? "Marketing site redesign"
          : p.id === "proj-3"
            ? "Data viz feature"
            : "Mobile campaign page",
    description: p.description?.replace("（演示）", " (demo)") ?? p.description,
  })),
};

export function buildDemoClassicSampleBundle(
  lang: "zh" | "en",
  savedAt = Date.now(),
): PersistedSiteBundle {
  const site = lang === "zh" ? siteZh : siteEn;
  const name = lang === "zh" ? DEMO_CLASSIC_SAMPLE_NAME_ZH : DEMO_CLASSIC_SAMPLE_NAME_EN;
  return {
    version: 2,
    profile: {
      name,
      tagline: site.tagline,
      setupDismissed: true,
    },
    site,
    savedAt,
  };
}

/** 传统纸质简历结构化数据（与网站内容一致，供 PDF / HTML 导出） */
export type ClassicPaperResume = {
  lang: "zh" | "en";
  name: string;
  targetRole: string;
  intentLine: string;
  personalLine: string;
  contact: { email: string; phone: string };
  portraitUrl: string;
  summary: string;
  skills: string[];
  skillNotes: string[];
  experience: Array<{
    title: string;
    company: string;
    period: string;
    summary?: string;
    bullets: string[];
  }>;
  projects: Array<{
    title: string;
    org: string;
    period: string;
    summary?: string;
    bullets: string[];
  }>;
  education: Array<{
    school: string;
    degree: string;
    period: string;
    detail?: string;
    bullets: string[];
  }>;
  honors: string[];
  selfEvaluation: string;
  disclaimer: string;
};

export function buildClassicPaperResume(lang: "zh" | "en"): ClassicPaperResume {
  const site = lang === "zh" ? siteZh : siteEn;
  const zh = lang === "zh";

  return {
    lang,
    name: "XXX",
    targetRole: site.targetRole,
    intentLine: zh
      ? `求职意向：${site.targetRole} | 杭州 | 25K/月 | 随时到岗`
      : `Objective: ${site.targetRole} | Hangzhou | Remote OK | Available now`,
    personalLine: zh
      ? "28岁 | 男 | 浙江杭州 | 6年工作经验"
      : "28 | Male | Hangzhou, CN | 6 years experience",
    contact: {
      email: site.contactEmail ?? "demo@example.com",
      phone: site.contactPhone ?? "13800138000",
    },
    portraitUrl: PLACEHOLDER_IMAGES.heroPortrait,
    summary: site.tagline,
    skills: site.transferableSkills ?? [],
    skillNotes: zh
      ? [
          "语言能力：通过大学英语六级（CET-6），可阅读英文技术文档并进行书面沟通。",
          "计算机：熟练掌握 React / Next.js / TypeScript，熟悉前端工程化与性能优化。",
          "团队能力：具备跨职能协作经验，能在产品、设计与后端之间推进需求落地。",
        ]
      : [
          "Languages: CET-6 English; comfortable with technical docs and async written communication.",
          "Engineering: React, Next.js, TypeScript; performance tuning and design-system delivery.",
          "Collaboration: works across product, design, and backend to ship iteratively.",
        ],
    experience: site.experience.map((e) => ({
      title: e.title,
      company: e.subtitle,
      period: e.period.replace(/ — /g, " ~ ").replace(/—/g, " ~ "),
      summary: e.summary,
      bullets: e.keyResults,
    })),
    projects: (site.projectExperience ?? []).map((p) => ({
      title: p.title,
      org: p.subtitle,
      period: p.period.replace(/ — /g, " ~ ").replace(/—/g, " ~ "),
      summary: p.summary,
      bullets: p.keyResults,
    })),
    education: site.education.map((e) => ({
      school: e.subtitle,
      degree: e.title,
      period: e.period.replace(/ — /g, " ~ ").replace(/—/g, " ~ "),
      detail: zh
        ? "专业成绩：GPA 3.7/4（专业前 10%），主修课程：数据结构、操作系统、计算机网络、软件工程、数据库系统。"
        : "GPA 3.7/4 (top 10%); coursework in algorithms, OS, networks, software engineering, databases.",
      bullets: e.campusHighlights.flatMap((b) => b.bullets),
    })),
    honors: zh
      ? [
          "全国大学生数学建模竞赛省一等奖（演示数据）",
          "大学英语六级（CET-6）",
          "校级优秀毕业论文",
          "GitHub 开源贡献者（演示数据）",
        ]
      : [
          "Provincial first prize, Mathematical Modeling Contest (demo)",
          "CET-6 English certificate",
          "Outstanding undergraduate thesis",
          "Open-source contributor (demo)",
        ],
    selfEvaluation: zh
      ? `${site.tagline} 工作积极认真，具备较强的学习能力与问题解决能力；注重代码质量与用户体验，能在高压迭代中保持清晰沟通。性格踏实稳重，具备良好团队精神，期望加入重视工程文化与产品体验的团队。`
      : `${site.tagline} Proactive, structured, and delivery-focused. Cares about code quality and user experience under fast iteration. Calm collaborator seeking teams that value craft and measurable outcomes.`,
    disclaimer: zh
      ? DEMO_CLASSIC_SAMPLE_DISCLAIMER_ZH
      : DEMO_CLASSIC_SAMPLE_DISCLAIMER_EN,
  };
}
