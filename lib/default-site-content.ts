import {
  DEMO_SAMPLE_VIDEO_MP4,
  PAGE_BACKGROUND_DEFAULT,
  PLACEHOLDER_IMAGES,
  PORTFOLIO_LINK_PLACEHOLDER,
} from "./media-defaults";
import type { SiteContent } from "./types";

export const defaultSiteContent: SiteContent = {
  name: "你的名字",
  tagline: "用一行话，描述你正在做的事。",
  targetRole: "意向岗位 · 如 资深前端工程师",
  heroPreviewLines: [
    "首屏要点一：领域 / 年限 / 核心技能",
    "首屏要点二：一条可量化成果（数据或影响面）",
    "首屏要点三：与目标岗位最相关的关键词",
  ],
  transferableSkills: [
    "结果导向",
    "跨团队协作",
    "结构化表达",
    "方案落地",
    "数据复盘",
    "用户洞察",
  ],
  heroSpotlight: {
    title: "个人核心优势展示窗",
    summary:
      "可展示你最拿得出手的一项成果：代码片段、摄影作品、Vlog、广告案例、小程序链接或项目网址。",
    media: {
      kind: "image",
      url: PLACEHOLDER_IMAGES.wide3,
    },
    mediaLinks: {
      image: PLACEHOLDER_IMAGES.wide3,
      video: DEMO_SAMPLE_VIDEO_MP4,
      link: PORTFOLIO_LINK_PLACEHOLDER,
      document: "",
    },
    documentName: "",
  },
  contactEmail: "hertz.hou719@gmail.com",
  heroPortraitSrc: PLACEHOLDER_IMAGES.heroPortrait,
  pageBackgroundImageSrc: PAGE_BACKGROUND_DEFAULT,
  pageBackgroundImageOpacity: 0.18,
  heroCopy: {
    eyebrow: "Portfolio",
    swipeHint: "向下滚动 · 浏览履历与作品集",
    portraitCaption: "当前为山水风景示意（竖版 800×1000 裁剪）；可改为证件照",
    portraitGuidance:
      "建议使用「肩部以上」的半身形象照，背景尽量简洁，面部清晰、光线均匀；避免全身照或过于花哨的背景，以免抢占姓名与岗位等文字信息。文件若本地上传，请控制在约 600KB 以内，或使用图床 HTTPS 链接。",
  },
  resumeCopy: {
    pageEyebrow: "Résumé",
    pageTitle: "履历",
    pageIntro:
      "点击卡片查看详情；代表项目内可打开图片、视频或代码。若当前网络 IP 已授权，可编辑经历与教育信息。",
    experienceSectionEyebrow: "工作经历",
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
      "栅格展示封面与海报；主图区域点击在新标签打开链接。若本机 IP 已授权，可在此插入新作品条目。",
    openLinkLabel: "打开链接",
    posterThumbTitle: "视频海报 / 备选图",
    posterThumbCaption: "主图与链接便于 HR 快速预览与跳转",
  },
  experience: [
    {
      id: "exp-1",
      title: "高级前端工程师",
      subtitle: "某科技公司 · 核心产品",
      period: "2022 — 至今",
      summary: "负责 Web 体验与性能，推动设计系统落地。",
      keyResults: [
        "将核心页面 LCP 从 3.1s 优化到 1.4s，转化率提升约 8%。",
        "搭建组件库与设计令牌，跨 5 条业务线复用。",
        "推动可访问性与响应式规范，减少一线设计返工。",
      ],
      representativeProjects: [
        {
          id: "rp-1-1",
          title: "控制台 2.0 视觉稿",
          description: "示例：图片展示",
          media: {
            kind: "image",
            url: PLACEHOLDER_IMAGES.wide1,
          },
        },
        {
          id: "rp-1-2",
          title: "动效演示（示例视频）",
          description: "可替换为你的 mp4 地址",
          media: {
            kind: "video",
            url: DEMO_SAMPLE_VIDEO_MP4,
          },
        },
      ],
    },
    {
      id: "exp-2",
      title: "前端工程师",
      subtitle: "某初创团队",
      period: "2019 — 2022",
      summary: "从 0 到 1 搭建营销站与控制台。",
      keyResults: [
        "搭建营销落地页体系，支持多活动并行与 A/B 配置。",
        "实现注册到激活的关键路径埋点与可视化漏斗。",
      ],
      representativeProjects: [
        {
          id: "rp-2-1",
          title: "核心模块示例代码",
          description: "示例：代码片段",
          media: {
            kind: "code",
            language: "tsx",
            code: `export function Greeting({ name }: { name: string }) {
  return <p className="text-sm">Hello, {name}</p>;
}`,
          },
        },
      ],
    },
  ],
  education: [
    {
      id: "edu-1",
      title: "计算机科学 · 本科",
      subtitle: "某大学",
      period: "2015 — 2019",
      summary:
        "在校期间兼顾课程与竞赛实践，以下为分组要点与可点开查看的展示素材示例。",
      campusHighlights: [
        {
          heading: "学术与竞赛",
          bullets: [
            "全国大学生数学建模竞赛省一等奖。",
            "校级优秀毕业论文：面向弱网环境的资源调度策略。",
          ],
        },
        {
          heading: "校园实践",
          bullets: [
            "学生技术社团负责人，组织每学期黑客松与分享会。",
            "开源课程笔记仓库累计 star 800+。",
          ],
        },
      ],
      representativeProjects: [
        {
          id: "edu-rp-1",
          title: "数学建模论文附图",
          description: "示例：图片",
          media: {
            kind: "image",
            url: PLACEHOLDER_IMAGES.wide2,
          },
        },
        {
          id: "edu-rp-2",
          title: "社团活动纪录短片",
          description: "示例：视频",
          media: {
            kind: "video",
            url: DEMO_SAMPLE_VIDEO_MP4,
          },
        },
        {
          id: "edu-rp-3",
          title: "课程设计核心代码",
          description: "示例：代码片段",
          media: {
            kind: "code",
            language: "python",
            code: `def schedule(tasks, bandwidth):
    """弱网环境下的简单调度示意"""
    return sorted(tasks, key=lambda t: t.priority)[: bandwidth]`,
          },
        },
      ],
    },
  ],
  projects: [
    {
      id: "proj-1",
      title: "品牌先导片",
      description: "30 秒概念片 · 调色与节奏剪辑",
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
