export type AchievementBlock = {
  heading: string;
  bullets: string[];
};

/** 代表项目：点击进入可展示图片 / 视频 / 代码 */
export type RepresentativeProjectMedia =
  | { kind: "image"; url: string }
  | { kind: "video"; url: string }
  | { kind: "code"; code: string; language?: string };

export type RepresentativeProject = {
  id: string;
  title: string;
  description?: string;
  media: RepresentativeProjectMedia;
};

export type ExperienceItem = {
  id: string;
  /** 职位 */
  title: string;
  /** 公司 / 团队 */
  subtitle: string;
  /** 工作时间 */
  period: string;
  /** 简介 */
  summary?: string;
  /** 关键成果（列表） */
  keyResults: string[];
  /** 代表项目 */
  representativeProjects: RepresentativeProject[];
};

export type EducationItem = {
  id: string;
  /** 学历 + 专业等主标题，例如：计算机科学 · 本科 */
  title: string;
  /** 大学名称 */
  subtitle: string;
  /** 在校时间 */
  period: string;
  /** 详情页顶部介绍（可选） */
  summary?: string;
  campusHighlights: AchievementBlock[];
  /** 校园成果中的图片 / 视频 / 代码展示，与工作经历代表项目一致 */
  representativeProjects: RepresentativeProject[];
};

/** 首页除姓名、一句话介绍外的可编辑文案 */
export type HeroCopy = {
  eyebrow: string;
  swipeHint: string;
  portraitCaption: string;
  /** 形象照建议（展示在资料弹窗中，可编辑） */
  portraitGuidance: string;
};

/** 作品集页眉、卡片辅助说明等可编辑文案 */
export type PortfolioCopy = {
  pageEyebrow: string;
  pageTitle: string;
  pageIntro: string;
  openLinkLabel: string;
  posterThumbTitle: string;
  posterThumbCaption: string;
};

/** 履历页标题、分区与详情页中的可编辑文案 */
export type ResumeCopy = {
  pageEyebrow: string;
  pageTitle: string;
  pageIntro: string;
  experienceSectionEyebrow: string;
  educationSectionEyebrow: string;
  experienceCardCta: string;
  educationCardCta: string;
  detailWorkEyebrow: string;
  detailCampusEyebrow: string;
  keyResultsHeading: string;
  repProjectsHeading: string;
};

export type PortfolioProject = {
  id: string;
  title: string;
  description?: string;
  coverSrc: string;
  posterSrc?: string;
  href: string;
};

export type SiteContent = {
  name: string;
  tagline: string;
  /** 求职意向 / 目标岗位（首屏突出展示） */
  targetRole: string;
  /** 首屏三条以内要点（固定三条槽位，可为空字符串） */
  heroPreviewLines: string[];
  /** 页脚联系邮箱 */
  contactEmail?: string;
  /** 页脚其它联系方式一行（如微信） */
  contactExtra?: string;
  /** 第一页右侧形象照（URL 或 data URL） */
  heroPortraitSrc?: string;
  /**
   * 整页背景图（URL 或 data URL）。存盘里若键存在且为空字符串，表示用户主动关闭背景图。
   */
  pageBackgroundImageSrc?: string;
  /** 背景图叠在主题纸色上的不透明度，0–1 */
  pageBackgroundImageOpacity?: number;
  heroCopy: HeroCopy;
  resumeCopy: ResumeCopy;
  portfolioCopy: PortfolioCopy;
  experience: ExperienceItem[];
  education: EducationItem[];
  projects: PortfolioProject[];
};

/** 资料弹窗保存时的扩展字段 */
export type ProfileSetupMeta = {
  targetRole?: string;
  heroPreviewLines?: string[];
  contactEmail?: string;
  contactExtra?: string;
  pageBackgroundImageSrc?: string;
  pageBackgroundImageOpacity?: number;
};

export type PersistedProfile = {
  name: string;
  tagline: string;
  setupDismissed: boolean;
};

/** localStorage 完整快照 */
export type PersistedSiteBundle = {
  version: 2;
  profile: PersistedProfile;
  site: SiteContent;
  /** 本机或服务器最后一次保存的毫秒时间戳，用于与本机草稿比对 */
  savedAt?: number;
};
