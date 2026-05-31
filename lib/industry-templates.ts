import type { IndustryTemplateId } from "@/context/InteractionModeProvider";
import type { SiteThemeId } from "@/lib/site-themes";
import type { RoleFitEntry } from "@/lib/types";

type LocaleText = { zh: string; en: string };

export type IndustryTemplate = {
  id: IndustryTemplateId;
  label: LocaleText;
  hint: LocaleText;
  theme: SiteThemeId;
  targetRole: LocaleText;
  background: { src: string; opacity: number };
  transferableSkills: { zh: string[]; en: string[] };
  roleFits: {
    zh: Array<Pick<RoleFitEntry, "title" | "fit" | "proof">>;
    en: Array<Pick<RoleFitEntry, "title" | "fit" | "proof">>;
  };
};

export const INDUSTRY_TEMPLATES: IndustryTemplate[] = [
  {
    id: "photographer",
    label: { zh: "摄影师", en: "Photographer" },
    hint: { zh: "作品氛围优先", en: "Visual-led profile" },
    theme: "warm",
    targetRole: { zh: "意向岗位 · 摄影师 / 影像创作", en: "Target role · Photographer" },
    background: {
      src: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1800&h=1200&fit=crop&q=82",
      opacity: 0.22,
    },
    transferableSkills: {
      zh: ["审美判断", "叙事能力", "构图与光线", "客户沟通", "后期统筹", "项目交付"],
      en: [
        "Visual Taste",
        "Storytelling",
        "Composition",
        "Client Communication",
        "Post-production",
        "Delivery",
      ],
    },
    roleFits: {
      zh: [
        {
          title: "摄影师",
          fit: "可独立完成拍摄策划、现场执行与后期交付，保证成片稳定性。",
          proof: "证据示例：单项目交付 120+ 素材，客户二次合作率持续提升。",
        },
        {
          title: "短视频创作者",
          fit: "擅长将产品卖点转为镜头语言，兼顾节奏、转场与传播感。",
          proof: "证据示例：系列短视频完播率提升 15%+。",
        },
      ],
      en: [
        {
          title: "Photographer",
          fit: "Own end-to-end shooting workflow from planning to final delivery.",
          proof: "Evidence: 120+ assets delivered in one campaign with high client retention.",
        },
        {
          title: "Video Creator",
          fit: "Translate product value into visual narrative with clear rhythm.",
          proof: "Evidence: +15% completion rate on short video series.",
        },
      ],
    },
  },
  {
    id: "softwareEngineer",
    label: { zh: "软件工程师", en: "Software Engineer" },
    hint: { zh: "理性与交付导向", en: "Engineering focus" },
    theme: "ocean",
    targetRole: { zh: "意向岗位 · 软件工程师", en: "Target role · Software Engineer" },
    background: {
      src: "https://images.unsplash.com/photo-1518773553398-650c184e0bb3?w=1800&h=1200&fit=crop&q=82",
      opacity: 0.16,
    },
    transferableSkills: {
      zh: ["系统设计", "性能优化", "工程规范", "故障排查", "跨团队协作", "持续交付"],
      en: [
        "System Design",
        "Performance",
        "Engineering Standards",
        "Troubleshooting",
        "Cross-team Collaboration",
        "Continuous Delivery",
      ],
    },
    roleFits: {
      zh: [
        {
          title: "前端工程师",
          fit: "关注可维护性和性能指标，能从需求到上线完整闭环交付。",
          proof: "证据示例：核心页面 LCP 从 3.1s 优化到 1.4s。",
        },
        {
          title: "全栈工程师",
          fit: "可覆盖 API、前端、部署链路，快速推进 MVP 到稳定版本。",
          proof: "证据示例：搭建 CI/CD 后平均发布时间缩短 40%。",
        },
      ],
      en: [
        {
          title: "Frontend Engineer",
          fit: "Strong in maintainability and performance-driven implementation.",
          proof: "Evidence: Improved core page LCP from 3.1s to 1.4s.",
        },
        {
          title: "Full-stack Engineer",
          fit: "Cover API, frontend, and deployment with end-to-end ownership.",
          proof: "Evidence: Reduced release cycle by 40% after CI/CD rollout.",
        },
      ],
    },
  },
  {
    id: "dataAnalyst",
    label: { zh: "数据分析师", en: "Data Analyst" },
    hint: { zh: "指标与洞察导向", en: "Insight-driven" },
    theme: "paper",
    targetRole: { zh: "意向岗位 · 数据分析师", en: "Target role · Data Analyst" },
    background: {
      src: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1800&h=1200&fit=crop&q=82",
      opacity: 0.15,
    },
    transferableSkills: {
      zh: ["指标体系", "SQL分析", "可视化表达", "A/B实验", "业务洞察", "复盘优化"],
      en: [
        "Metrics Framework",
        "SQL Analysis",
        "Data Visualization",
        "A/B Testing",
        "Business Insight",
        "Optimization",
      ],
    },
    roleFits: {
      zh: [
        {
          title: "数据分析师",
          fit: "擅长搭建指标体系并形成可执行建议，支持业务决策闭环。",
          proof: "证据示例：转化漏斗优化后注册转化提升 12%。",
        },
        {
          title: "商业分析师",
          fit: "能把复杂问题拆成可量化路径，用数据支持优先级判断。",
          proof: "证据示例：周报看板覆盖 5 条业务线，复盘效率显著提升。",
        },
      ],
      en: [
        {
          title: "Data Analyst",
          fit: "Build reliable KPI systems and provide actionable insights.",
          proof: "Evidence: +12% registration conversion after funnel optimization.",
        },
        {
          title: "Business Analyst",
          fit: "Break down complex questions into measurable decision paths.",
          proof: "Evidence: Dashboard framework adopted across 5 business lines.",
        },
      ],
    },
  },
  {
    id: "designer",
    label: { zh: "设计师", en: "Designer" },
    hint: { zh: "品牌与体验平衡", en: "Brand + UX" },
    theme: "editorial",
    targetRole: { zh: "意向岗位 · 设计师", en: "Target role · Designer" },
    background: {
      src: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=1800&h=1200&fit=crop&q=82",
      opacity: 0.2,
    },
    transferableSkills: {
      zh: ["信息架构", "视觉体系", "交互设计", "设计协作", "用户研究", "落地推进"],
      en: [
        "Information Architecture",
        "Visual System",
        "Interaction Design",
        "Design Collaboration",
        "User Research",
        "Execution",
      ],
    },
    roleFits: {
      zh: [
        {
          title: "UI 设计师",
          fit: "可建立统一视觉语言并沉淀组件规范，提升跨页面一致性。",
          proof: "证据示例：设计令牌落地后返工率降低 30%。",
        },
        {
          title: "产品设计师",
          fit: "从用户目标出发设计流程与界面，兼顾业务约束与体验质量。",
          proof: "证据示例：关键路径改版后任务完成率提升 18%。",
        },
      ],
      en: [
        {
          title: "UI Designer",
          fit: "Build scalable visual systems with reusable components.",
          proof: "Evidence: 30% less design rework after tokenized design system.",
        },
        {
          title: "Product Designer",
          fit: "Balance user goals, business constraints, and usability outcomes.",
          proof: "Evidence: +18% task completion after key journey redesign.",
        },
      ],
    },
  },
];

export function getIndustryTemplate(id: IndustryTemplateId): IndustryTemplate {
  const found = INDUSTRY_TEMPLATES.find((x) => x.id === id);
  return found ?? INDUSTRY_TEMPLATES[0];
}

