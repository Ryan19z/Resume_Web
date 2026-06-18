import type {
  ParsedCampusHighlight,
  ParsedEducation,
  ParsedExperience,
  ParsedProject,
  ParsedResume,
} from "@/lib/resume-parse-types";

/** 将日期区间转为 YYYYMM 便于比较（未知端点用当前年月） */
function periodToRange(period: string): { start: number; end: number } | null {
  const p = period.replace(/\s/g, "");
  if (!p) return null;
  const now = new Date();
  const nowYm = now.getFullYear() * 100 + (now.getMonth() + 1);

  const cn = p.match(
    /(\d{4})年(\d{1,2})月[-–—~至到]+(?:至今|现在|[Pp]resent|[Nn]ow|(\d{4})年(\d{1,2})月)/,
  );
  if (cn) {
    const start = parseInt(cn[1]!, 10) * 100 + parseInt(cn[2]!, 10);
    let end = nowYm;
    if (cn[3] && cn[4]) {
      end = parseInt(cn[3], 10) * 100 + parseInt(cn[4], 10);
    }
    return { start, end: Math.max(start, end) };
  }

  const m = p.match(
    /(\d{4})[.\-/年]?(\d{1,2})?(?:[.\-/月](\d{1,2})日?)?[-–—~至到]+(?:至今|现在|[Pp]resent|[Nn]ow|(\d{4}))/,
  );
  if (!m) {
    const yOnly = p.match(/(\d{4})/);
    if (yOnly) {
      const y = parseInt(yOnly[1]!, 10);
      return { start: y * 100 + 1, end: y * 100 + 12 };
    }
    return null;
  }

  const sy = parseInt(m[1]!, 10);
  const sm = m[2] ? parseInt(m[2], 10) : 1;
  const start = sy * 100 + sm;

  let end = nowYm;
  if (m[4]) {
    end = parseInt(m[4], 10) * 100 + 12;
  }

  return { start, end: Math.max(start, end) };
}

export function periodsOverlap(a: string, b: string): boolean {
  const ra = periodToRange(a);
  const rb = periodToRange(b);
  if (!ra || !rb) return false;
  return ra.start <= rb.end && rb.start <= ra.end;
}

function findBestExperienceForProject(
  experience: ParsedExperience[],
  project: ParsedProject,
): ParsedExperience | null {
  if (!experience.length || !project.period?.trim()) {
    return experience.length === 1 ? experience[0]! : null;
  }

  let best: ParsedExperience | null = null;
  let bestScore = -1;

  for (const exp of experience) {
    if (!exp.period?.trim()) continue;
    if (!periodsOverlap(exp.period, project.period)) continue;

    let score = 10;
    if (exp.keyResults.length === 0) score += 5;
    if (/公司|有限公司|股份/.test(exp.company)) score += 2;
    if (score > bestScore) {
      best = exp;
      bestScore = score;
    }
  }

  if (best) return best;
  return experience.length === 1 ? experience[0]! : null;
}

function projectToWorkBullets(project: ParsedProject): string[] {
  const out: string[] = [];
  const title = project.title?.trim();
  const period = project.period?.trim();
  if (title) {
    out.push(period ? `【${title} · ${period}】` : `【${title}】`);
  }
  if (project.description?.trim()) {
    out.push(project.description.trim().slice(0, 280));
  }
  for (const b of project.bullets ?? []) {
    const t = b.trim();
    if (t) out.push(t);
  }
  return out.slice(0, 10);
}

export type ReconcileOptions = {
  /** 是否存在独立的「项目经历/项目经验」分区且含实质内容 */
  hasDedicatedProjectSection: boolean;
};

export type ReconcileResult = {
  experience: ParsedExperience[];
  projects: ParsedProject[];
  warnings: string[];
};

/**
 * 将误归入「项目经历」的在职项目合并回「工作经历」：
 * - 工作经历条目存在但几乎无要点，而项目与在职时间段重叠
 * - 或简历无独立项目分区、项目均为「项目负责人」型在职成果
 */
export function reconcileWorkAndProjects(
  experience: ParsedExperience[],
  projects: ParsedProject[],
  options: ReconcileOptions,
): ReconcileResult {
  const warnings: string[] = [];
  if (!experience.length || !projects.length) {
    return { experience, projects, warnings };
  }

  const allWorkEmpty = experience.every((e) => e.keyResults.length === 0);
  const leaderProjects = projects.filter((p) =>
    /项目负责人|项目负责/.test(p.role ?? ""),
  );

  const shouldMerge =
    allWorkEmpty ||
    (!options.hasDedicatedProjectSection &&
      leaderProjects.length === projects.length &&
      leaderProjects.length > 0);

  if (!shouldMerge) {
    if (allWorkEmpty && projects.length > 0) {
      warnings.push(
        "已识别项目经历，但工作经历缺少职责描述；请导入后在「履历 → 工作经历」中核对或补充。",
      );
    }
    return { experience, projects, warnings };
  }

  const expCopy = experience.map((e) => ({
    ...e,
    keyResults: [...e.keyResults],
  }));
  const remaining: ParsedProject[] = [];
  let mergedCount = 0;

  for (const project of projects) {
    const isLeader = /项目负责人|项目负责/.test(project.role ?? "");
    const target = findBestExperienceForProject(expCopy, project);

    if (shouldMerge && isLeader && target) {
      const bullets = projectToWorkBullets(project);
      for (const b of bullets) {
        if (!target.keyResults.includes(b)) {
          target.keyResults.push(b);
        }
      }
      mergedCount++;
      continue;
    }

    if (allWorkEmpty && target) {
      const bullets = projectToWorkBullets(project);
      for (const b of bullets) {
        if (!target.keyResults.includes(b)) {
          target.keyResults.push(b);
        }
      }
      mergedCount++;
      continue;
    }

    remaining.push(project);
  }

  if (mergedCount > 0) {
    warnings.push(
      `已将 ${mergedCount} 项在职项目成果合并进「工作经历」（原 PDF 中项目描述位于公司经历区块或未单独分区）。请在履历页核对。`,
    );
  }

  if (expCopy.every((e) => e.keyResults.length === 0) && remaining.length > 0) {
    warnings.push(
      "未能将项目描述对应到具体公司经历，部分项目仍保留在「项目经历」；建议导入后手动调整。",
    );
  }

  return {
    experience: expCopy.map((e) => ({
      ...e,
      keyResults: e.keyResults.slice(0, 16),
    })),
    projects: remaining,
    warnings,
  };
}

export function buildParseQualityWarnings(input: {
  experience: ParsedExperience[];
  projects: ParsedProject[];
  name?: string;
  educationCount: number;
  method: "heuristic" | "llm";
  reconcileWarnings: string[];
}): string[] {
  const warnings = [...input.reconcileWarnings];

  if (!input.name?.trim()) {
    warnings.push("未识别姓名，请在「首屏与形象」中手动填写。");
  }
  if (input.experience.length === 0 && input.projects.length > 0) {
    warnings.push(
      "未识别工作经历，但识别到项目条目；若项目属于在职成果，请检查 PDF 是否文字版，或配置 AI 解析。",
    );
  }
  if (input.experience.length === 0 && input.projects.length === 0) {
    warnings.push("未识别工作经历与项目经历，导入后需在「履历」中手动补充。");
  }
  if (input.educationCount === 0) {
    warnings.push("未识别教育背景，请在「履历 → 教育背景」中补充。");
  }
  if (
    input.method === "heuristic" &&
    input.experience.some((e) => e.keyResults.length === 0) &&
    input.experience.length > 0
  ) {
    warnings.push(
      "部分工作经历缺少关键成果要点；可在编辑模式下逐条补充，或上传结构更清晰的 PDF。",
    );
  }

  return [...new Set(warnings)];
}

/** 根据识别到的字段与内容充实度估算 0–1 分数（非模型自报置信度） */
export function computeParseConfidence(parsed: ParsedResume): number {
  let score = 0.25;
  if (parsed.name?.trim()) score += 0.12;
  if (parsed.targetRole?.trim()) score += 0.08;
  if (parsed.contactEmail?.trim()) score += 0.06;
  if (parsed.contactPhone?.trim()) score += 0.06;
  if (parsed.contactExtra?.trim()) score += 0.02;
  if (parsed.education.length > 0) score += 0.1;
  if (parsed.experience.length > 0) score += 0.1;
  if (parsed.projects.length > 0) score += 0.08;
  if (parsed.awards?.length) score += 0.04;
  if (parsed.transferableSkills?.length) score += 0.04;
  if (parsed.heroPreviewLines?.length || parsed.tagline?.trim()) score += 0.03;

  if (parsed.experience.length > 0) {
    const filled = parsed.experience.filter(
      (e) => e.keyResults.length > 0 && e.company && e.title,
    ).length;
    score += 0.08 * (filled / parsed.experience.length);
  } else {
    score -= 0.05;
  }

  if (parsed.projects.length > 0) {
    const filled = parsed.projects.filter(
      (p) => (p.bullets?.length ?? 0) > 0 || Boolean(p.description?.trim()),
    ).length;
    score += 0.05 * (filled / parsed.projects.length);
  }

  if (parsed.education.length > 0) {
    const filled = parsed.education.filter((e) => e.school && e.degree).length;
    score += 0.04 * (filled / parsed.education.length);
  }

  return Math.max(0.2, Math.min(0.98, Math.round(score * 100) / 100));
}

type ClassifyResult = {
  parsed: ParsedResume;
  warnings: string[];
};

const CAMPUS_ROLE_RE =
  /(学生会|班委|班长|团支书|社团|协会|主席团|新闻中心|志愿者|辅导员助理|校队|组织部|宣传部)/i;
const WORKLIKE_RE =
  /(实习|兼职|全职|教师|助教|辅导|运营|销售|顾问|客服|商务|地推|门店|创业|经营|接单|客户|转化|营收|GMV)/i;
const PROJECTLIKE_RE =
  /(项目|系统|平台|小程序|网站|APP|比赛|竞赛|建模|开发|设计|课题|研究|方案)/i;

function uniqPush<T>(arr: T[], item: T, same: (a: T, b: T) => boolean) {
  if (!arr.some((x) => same(x, item))) arr.push(item);
}

function classifyCampusEntry(
  edu: ParsedEducation,
  c: ParsedCampusHighlight,
  outExp: ParsedExperience[],
  outProjects: ParsedProject[],
): "campus" | "work" | "project" {
  const joined = `${c.role} ${c.bullets.join(" ")}`.trim();
  if (!joined) return "campus";

  const isCampusRole = CAMPUS_ROLE_RE.test(c.role);
  const looksWork = WORKLIKE_RE.test(joined);
  const looksProject = PROJECTLIKE_RE.test(joined);

  if (!isCampusRole && looksWork) {
    const exp: ParsedExperience = {
      title: c.role,
      company: edu.school || "公司 / 团队",
      period: c.period,
      summary: c.bullets[0],
      keyResults: c.bullets.slice(0, 10),
    };
    uniqPush(
      outExp,
      exp,
      (a, b) =>
        a.title === b.title &&
        a.company === b.company &&
        a.period.replace(/\s/g, "") === b.period.replace(/\s/g, ""),
    );
    return "work";
  }

  if (!isCampusRole && looksProject) {
    const project: ParsedProject = {
      title: c.role,
      role: c.role,
      period: c.period,
      description: c.bullets[0],
      bullets: c.bullets.slice(0, 10),
    };
    uniqPush(
      outProjects,
      project,
      (a, b) =>
        a.title === b.title &&
        (a.period ?? "").replace(/\s/g, "") === (b.period ?? "").replace(/\s/g, ""),
    );
    return "project";
  }

  return "campus";
}

/**
 * 自动归类策略（工作优先 + 项目镜像）：
 * - 校园经历中的“实践型条目”自动迁移到工作或项目
 * - 工作与项目不重复，一条经历只归到一个主类
 */
export function autoClassifyResumeContent(parsed: ParsedResume): ClassifyResult {
  const out: ParsedResume = {
    ...parsed,
    experience: parsed.experience.map((e) => ({ ...e, keyResults: [...e.keyResults] })),
    projects: parsed.projects.map((p) => ({
      ...p,
      bullets: p.bullets ? [...p.bullets] : undefined,
    })),
    education: parsed.education.map((e) => ({
      ...e,
      highlights: [...e.highlights],
      campusExperiences: (e.campusExperiences ?? []).map((c) => ({
        ...c,
        bullets: [...c.bullets],
      })),
    })),
  };

  let movedToWork = 0;
  let movedToProject = 0;

  for (const edu of out.education) {
    if (!edu.campusExperiences?.length) continue;
    const remain: ParsedCampusHighlight[] = [];
    for (const c of edu.campusExperiences) {
      const beforeExp = out.experience.length;
      const beforeProj = out.projects.length;
      const label = classifyCampusEntry(edu, c, out.experience, out.projects);
      const afterExp = out.experience.length;
      const afterProj = out.projects.length;

      if (label === "work") {
        if (afterExp > beforeExp) movedToWork++;
        continue;
      }
      if (label === "project") {
        if (afterProj > beforeProj) movedToProject++;
        continue;
      }
      remain.push(c);
    }
    edu.campusExperiences = remain;
  }

  const warnings: string[] = [];
  if (movedToWork > 0 || movedToProject > 0) {
    warnings.push(
      `已自动归类实践型经历：转入工作经历 ${movedToWork} 条，转入项目经历 ${movedToProject} 条。请在履历页核对。`,
    );
  }

  return { parsed: out, warnings };
}
