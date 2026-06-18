import { emptyHeroSpotlightForImport, resetHeroPersonalDisplayForImport } from "@/lib/default-site-content";
import { splitSchoolMajorBlob } from "@/lib/education-display";
import { isReasonableHttpUrl } from "@/lib/is-reasonable-http-url";
import { randomId } from "@/lib/random-id";
import type { ParsedResume } from "@/lib/resume-parse-types";
import type {
  EducationItem,
  ExperienceItem,
  PortfolioProject,
  RoleFitEntry,
  SiteContent,
} from "@/lib/types";

export type MappedResumeImport = {
  profilePatch: { name: string; tagline: string };
  sitePatch: Partial<SiteContent> & {
    experience: ExperienceItem[];
    projectExperience: ExperienceItem[];
    education: EducationItem[];
    projects: PortfolioProject[];
    heroPreviewLines: string[];
    transferableSkills: string[];
    roleFitEntries: RoleFitEntry[];
  };
  fieldsFilled: string[];
};

const FIELD_LABELS: Record<string, string> = {
  name: "姓名",
  targetRole: "目标岗位",
  tagline: "一句话介绍",
  contactEmail: "邮箱",
  contactPhone: "电话",
  contactExtra: "其他联系方式",
  heroPreviewLines: "核心亮点",
  transferableSkills: "技能标签",
  experience: "工作经历",
  projectExperience: "项目经历",
  education: "教育背景",
  projects: "作品/项目",
  awards: "奖项荣誉",
};

export function fieldLabel(key: string): string {
  return FIELD_LABELS[key] ?? key;
}

/** 导入时格式化电话，保留 +86 与国际区号可读性 */
export function formatPhoneForDisplay(raw?: string): string | undefined {
  if (!raw?.trim()) return undefined;
  const compact = raw.replace(/\s+/g, "");
  const intl = compact.match(/^\+?(86)(1[3-9]\d{9})$/);
  if (intl) return `+86 ${intl[2]}`;
  const cn = compact.match(/^(?:\+?86)?(1[3-9]\d{9})$/);
  if (cn) return `+86 ${cn[1]}`;
  const dashed = raw.match(/(?:\+86|86)[-\s]?1[3-9]\d[-\s]?\d{4}[-\s]?\d{4}/);
  if (dashed) {
    const digits = dashed[0].replace(/\D/g, "");
    if (digits.length >= 13 && digits.startsWith("86"))
      return `+86 ${digits.slice(2)}`;
  }
  return raw.trim();
}

function sanitizeTagline(raw: string | undefined, parsed: ParsedResume): string {
  const t = raw?.trim() ?? "";
  if (!t) return buildFallbackTagline(parsed);
  if (/大学|学院|GPA|gpa|本科|硕士/.test(t) && t.length > 50) {
    return buildFallbackTagline(parsed);
  }
  if (t.length > 160) return `${t.slice(0, 157)}…`;
  return t;
}

function buildFallbackTagline(parsed: ParsedResume): string {
  const edu = parsed.education[0];
  const role = parsed.targetRole?.trim();
  const parts: string[] = [];
  if (edu?.school) {
    parts.push(`${edu.school}${edu.degree ? ` · ${edu.degree}` : ""}`);
  }
  if (role) parts.push(`意向岗位：${role}`);
  if (parsed.experience[0]?.title) {
    parts.push(`近期经历：${parsed.experience[0].title}`);
  }
  if (parts.length) return parts.join("；").slice(0, 160);
  return "请补充一句话介绍。";
}

function pickHeroLines(parsed: ParsedResume): string[] {
  const lines: string[] = [];
  if (parsed.awards?.length) lines.push(...parsed.awards.slice(0, 4));
  if (parsed.heroPreviewLines?.length) {
    for (const l of parsed.heroPreviewLines) {
      if (!lines.includes(l) && !/大学|GPA|gpa|学院/i.test(l)) lines.push(l);
    }
  }
  for (const e of parsed.experience) {
    for (const b of e.keyResults) {
      if (lines.length >= 6) break;
      const slice = b.slice(0, 120);
      if (
        /(?:\d+%|≥\d+%|提升|降低|证书|PMP|CET|奖学金|竞赛.*奖|取数\s*\d+|满意度)/i.test(
          slice,
        ) &&
        !lines.includes(slice)
      ) {
        lines.push(slice);
      }
    }
  }
  return lines.slice(0, 6);
}

function pickSkillTags(parsed: ParsedResume): string[] {
  if (!parsed.transferableSkills?.length) return [];
  return parsed.transferableSkills
    .map((s) => s.trim())
    .filter((s) => s.length >= 2 && s.length <= 24)
    .slice(0, 12);
}

function buildRoleFitEntries(parsed: ParsedResume): RoleFitEntry[] {
  const role = parsed.targetRole?.trim();
  if (!role) return [];
  const fit =
    parsed.tagline?.trim() ||
    (parsed.experience[0]
      ? `${parsed.experience[0].title} @ ${parsed.experience[0].company}`
      : "");
  if (!fit) return [];
  return [
    {
      id: randomId("rf-"),
      title: role,
      fit: fit.slice(0, 200),
    },
  ];
}

function mapEducationItem(
  e: ParsedResume["education"][number],
  awards: string[] | undefined,
  index: number,
): EducationItem {
  let school = e.school.trim();
  let degree = e.degree.trim();

  const merged = splitSchoolMajorBlob(school);
  if (merged && (!degree || /^(?:本科|硕士|博士|专科|学士)$/.test(degree))) {
    school = merged.school;
    degree =
      merged.major && !/本科|硕士|博士|专科|学士/.test(merged.major)
        ? `${merged.major} · 本科`
        : merged.major || "本科";
  }

  const title = degree || "学历 / 专业";
  const subtitle = school || "学校";

  const awardBullets = index === 0 ? (awards ?? []).slice(0, 6) : [];
  const highlightBullets = [...e.highlights, ...awardBullets]
    .filter(Boolean)
    .slice(0, 12);

  const courseBullets = highlightBullets
    .filter((h) => h.startsWith("主修课程"))
    .map((h) => h.replace(/^主修课程[:：]\s*/, ""));
  const legacyCampusBullets = highlightBullets.filter(
    (h) => !h.startsWith("主修课程"),
  );

  const campusRoleBlocks = (e.campusExperiences ?? []).map((c) => ({
    heading: `${c.role}（${c.period}）`,
    bullets: c.bullets,
  }));

  const campusHighlights = [
    ...(courseBullets.length
      ? [{ heading: "主修课程", bullets: courseBullets }]
      : []),
    ...campusRoleBlocks,
    ...(legacyCampusBullets.length && !campusRoleBlocks.length
      ? [{ heading: "在校经历", bullets: legacyCampusBullets }]
      : []),
  ];

  return {
    id: randomId("edu-"),
    title,
    subtitle,
    period: e.period || "起止时间",
    summary: e.summary?.trim() || undefined,
    campusHighlights,
    representativeProjects: [],
  };
}

function formatWorkSubtitle(company: string, title: string): string {
  const org = company.trim() || "公司 / 团队";
  const label = /实习|intern/i.test(title) ? "实习" : "正式";
  return `${org} · ${label}`;
}

function formatExperienceSubtitle(company: string, title: string): string {
  const org = company.trim() || "公司 / 团队";
  const tag = /实习|intern/i.test(title) ? "实习" : "正式";
  return `${org} · ${tag}`;
}

function parsePeriodStart(period?: string): number {
  const raw = period?.trim();
  if (!raw || raw === "起止时间") return Number.POSITIVE_INFINITY;
  const m = raw.match(/(19|20)\d{2}(?:[.\-/年]\s*(\d{1,2}))?/);
  if (!m) return Number.POSITIVE_INFINITY;
  const y = parseInt(m[0].slice(0, 4), 10);
  const mm = m[2] ? Math.min(12, Math.max(1, parseInt(m[2], 10))) : 1;
  return y * 100 + mm;
}

function sortByPeriodAsc<T>(items: T[], getPeriod: (x: T) => string | undefined): T[] {
  return [...items].sort((a, b) => parsePeriodStart(getPeriod(a)) - parsePeriodStart(getPeriod(b)));
}

export function mapParsedResumeToSite(
  parsed: ParsedResume,
  current: SiteContent,
): MappedResumeImport {
  const fieldsFilled: string[] = [];

  const name = parsed.name?.trim() || current.name;
  if (parsed.name?.trim()) fieldsFilled.push("name");

  const tagline = sanitizeTagline(parsed.tagline, parsed);
  if (tagline && tagline !== "请补充一句话介绍。") fieldsFilled.push("tagline");

  const heroLines = pickHeroLines(parsed);
  const skillTags = pickSkillTags(parsed);
  const roleFitEntries = buildRoleFitEntries(parsed);

  const phone = formatPhoneForDisplay(parsed.contactPhone);

  const experience: ExperienceItem[] = sortByPeriodAsc(parsed.experience, (e) => e.period).map((e) => ({
    id: randomId("exp-"),
    title: e.title || "职位",
    subtitle: formatExperienceSubtitle(e.company, e.title),
    period: e.period || "起止时间",
    summary: e.summary?.trim() || undefined,
    keyResults:
      e.keyResults.length > 0
        ? e.keyResults.slice(0, 8)
        : ([e.summary?.trim()].filter(Boolean) as string[]),
    representativeProjects: [],
  }));

  const projectExperience: ExperienceItem[] = sortByPeriodAsc(parsed.projects, (p) => p.period).map((p) => {
    const bullets = (p.bullets ?? []).filter(Boolean).slice(0, 12);
    const keyResults =
      bullets.length > 0
        ? bullets
        : ([p.description?.trim()].filter(Boolean) as string[]);
    return {
      id: randomId("pexp-"),
      title: p.title,
      subtitle: p.role?.trim() || "项目负责人",
      period: p.period?.trim() || "起止时间",
      summary: p.description?.trim() || undefined,
      keyResults,
      representativeProjects: [],
    };
  });

  const education: EducationItem[] = sortByPeriodAsc(parsed.education, (e) => e.period).map((e, i) =>
    mapEducationItem(e, parsed.awards, i),
  );

  const projects: PortfolioProject[] = parsed.projects
    .filter((p) => p.link?.trim() && isReasonableHttpUrl(p.link.trim()))
    .map((p) => ({
      id: randomId("proj-"),
      title: p.title,
      description: p.description?.trim() || undefined,
      coverSrc: "",
      href: p.link!.trim(),
    }));

  const sitePatch: MappedResumeImport["sitePatch"] = {
    name,
    tagline,
    heroPreviewLines: heroLines,
    transferableSkills: skillTags,
    roleFitEntries,
    experience,
    projectExperience,
    education,
    projects,
    contactEmail: parsed.contactEmail?.trim() || undefined,
    contactPhone: phone,
    contactExtra: parsed.contactExtra?.trim() || undefined,
  };

  if (parsed.targetRole?.trim()) {
    sitePatch.targetRole = parsed.targetRole.trim();
    fieldsFilled.push("targetRole");
  }
  if (sitePatch.contactEmail) fieldsFilled.push("contactEmail");
  if (sitePatch.contactPhone) fieldsFilled.push("contactPhone");
  if (sitePatch.contactExtra) fieldsFilled.push("contactExtra");
  if (heroLines.length) fieldsFilled.push("heroPreviewLines");
  if (skillTags.length) fieldsFilled.push("transferableSkills");
  if (experience.length) fieldsFilled.push("experience");
  if (projectExperience.length) fieldsFilled.push("projectExperience");
  if (education.length) fieldsFilled.push("education");
  if (projects.length) fieldsFilled.push("projects");
  if (parsed.awards?.length) fieldsFilled.push("awards");

  return {
    profilePatch: { name, tagline },
    sitePatch,
    fieldsFilled,
  };
}

/** 导入时全量替换列表字段，避免残留上一份简历内容 */
export function applyMappedImportToSite(
  current: SiteContent,
  mapped: MappedResumeImport,
): SiteContent {
  const patch = mapped.sitePatch;
  return {
    ...current,
    name: patch.name ?? current.name,
    tagline: patch.tagline ?? current.tagline,
    targetRole: patch.targetRole ?? current.targetRole,
    contactEmail: patch.contactEmail,
    contactPhone: patch.contactPhone,
    contactExtra: patch.contactExtra,
    heroPreviewLines: patch.heroPreviewLines,
    transferableSkills: patch.transferableSkills,
    roleFitEntries: patch.roleFitEntries,
    experience: patch.experience,
    projectExperience: patch.projectExperience,
    education: patch.education,
    projects: patch.projects,
    heroSpotlight: emptyHeroSpotlightForImport(),
    ...resetHeroPersonalDisplayForImport(),
  };
}
