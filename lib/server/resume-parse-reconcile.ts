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

/** 项目标题是否像「惯导定位越野车（TC264）」这类主标题，而非职责 bullet */
export function isProjectAnchorTitle(title: string): boolean {
  const t = title.trim();
  if (t.length < 4 || t.length > 96) return false;
  if (
    /[（(][^）)]*(?:TC\d+|STM32|MSPM0|ESP32|μC|TC377|TC264|F103|G3507|TC264|TC377|NB-IoT|FM33|PIC24)[^）)]*[）)]/i.test(
      t,
    )
  ) {
    return true;
  }
  if (/^基于/.test(t)) return true;
  if (
    /(?:系统|单元|越野车|循迹|平台|装置|主控|电控)(?:[（(]|$)/.test(t) &&
    t.length <= 72 &&
    !/^(?:根据|针对|使用|通过|配置|对比|设计|利用|制定|主导|将|采用|实现|完成|编写|开发|优化|移植|建立|搭建)/.test(
      t,
    )
  ) {
    return true;
  }
  if (/^(?:惯导|红外循迹|车载电控|智能车|竞赛)/.test(t) && t.length <= 72) {
    return true;
  }
  return false;
}

/** 是否像被误当成独立项目的职责/技术 bullet */
function isProjectFragmentTitle(title: string): boolean {
  const t = title.trim();
  if (!t) return true;
  if (isProjectAnchorTitle(t)) return false;
  if (
    /^(?:根据|针对|使用|通过|配置|对比|设计|利用|制定|主导|项目成果|将|采用|实现|完成|编写|开发|优化|移植|建立|搭建|缩短|减少|提高|降低|嘉立创|利用霍尔|电机进入|对比FreeRTOS)/.test(
      t,
    )
  ) {
    return true;
  }
  if (/^算法[，,、：:]/.test(t)) return true;
  if (/[。；]$/.test(t) && t.length >= 8) return true;
  if (t.length > 28 && /[，,、]/.test(t)) return true;
  if (/^(?:办公工具|数据分析|技术栈|技术理解力|需求分析|跨团队协作)[:：]/.test(t)) {
    return true;
  }
  return false;
}

function mergeFragmentIntoProject(
  target: ParsedProject,
  fragment: ParsedProject,
): void {
  const parts: string[] = [];
  if (fragment.description?.trim()) parts.push(fragment.description.trim());
  if (fragment.bullets?.length) parts.push(...fragment.bullets);
  if (isProjectFragmentTitle(fragment.title)) {
    parts.unshift(fragment.title.trim());
  } else if (
    fragment.title.trim() &&
    fragment.title.trim() !== target.title.trim() &&
    !isProjectAnchorTitle(fragment.title)
  ) {
    parts.unshift(fragment.title.trim());
  }
  target.bullets = target.bullets ?? [];
  for (const p of parts) {
    const t = p.trim();
    if (!t) continue;
    if (!target.bullets.some((b) => b.trim() === t)) {
      target.bullets.push(t);
    }
  }
  if (fragment.link?.trim() && !target.link?.trim()) {
    target.link = fragment.link.trim();
  }
  if (
    fragment.role?.trim() &&
    fragment.role !== "项目成员" &&
    (!target.role?.trim() || target.role === "项目成员")
  ) {
    target.role = fragment.role.trim();
  }
}

/**
 * 合并 LLM 等误拆的项目条目：同一项目下的多条 bullet 不应各占一条「项目经历」。
 */
export function consolidateFragmentedProjects(
  projects: ParsedProject[],
): ParsedProject[] {
  if (projects.length <= 1) return projects;

  const result: ParsedProject[] = [];
  let current: ParsedProject | null = null;

  for (const raw of projects) {
    const p: ParsedProject = {
      ...raw,
      bullets: raw.bullets ? [...raw.bullets] : undefined,
    };
    const hasPeriod = Boolean(p.period?.trim());
    const isAnchor = hasPeriod && isProjectAnchorTitle(p.title);
    const isFragment =
      isProjectFragmentTitle(p.title) ||
      (!hasPeriod && !isProjectAnchorTitle(p.title));

    if (isAnchor || (!isFragment && hasPeriod && !isProjectFragmentTitle(p.title))) {
      if (current) result.push(current);
      current = p;
      continue;
    }

    if (isFragment) {
      if (current) {
        mergeFragmentIntoProject(current, p);
        continue;
      }
      if (result.length > 0) {
        mergeFragmentIntoProject(result[result.length - 1]!, p);
        continue;
      }
    }

    if (current) result.push(current);
    current = p;
  }

  if (current) result.push(current);
  return result.filter((p) => p.title?.trim());
}

export type ProjectReconcileResult = {
  projects: ParsedProject[];
  warnings: string[];
};

/**
 * 优先合并碎片；若仍明显多于规则引擎识别数，则回退规则引擎项目列表。
 */
export function reconcileProjectList(
  projects: ParsedProject[],
  heuristicProjects: ParsedProject[],
): ProjectReconcileResult {
  const warnings: string[] = [];
  const before = projects.length;
  let merged = consolidateFragmentedProjects(projects);

  if (
    heuristicProjects.length >= 1 &&
    merged.length > Math.max(heuristicProjects.length + 1, heuristicProjects.length * 1.5)
  ) {
    warnings.push(
      `AI 将项目拆分为 ${before} 条（合并后仍有 ${merged.length} 条），已改用规则引擎识别的 ${heuristicProjects.length} 个项目条目；请导入后核对要点是否完整。`,
    );
    merged = heuristicProjects;
  } else if (before > merged.length) {
    warnings.push(
      `已将 ${before - merged.length} 条误识别的项目要点合并进对应项目，请在「履历 → 项目经历」中核对。`,
    );
  }

  return { projects: merged, warnings };
}

type ClassifyResult = {
  parsed: ParsedResume;
  warnings: string[];
};

const CAMPUS_ROLE_RE =
  /(学生会|班委|班长|团支书|社团|协会|主席团|新闻中心|志愿者|辅导员助理|校队|院队|组织部|宣传部|篮球队|足球队|羽毛球队|乒乓球队|运动队|田径队|辩论队|艺术团|合唱团|主持队|球队成员|篮球队员|实验室队员|智能车实验室)/i;

const CAMPUS_ACTIVITY_NOT_PROJECT_RE =
  /(篮球队|足球队|羽毛球队|乒乓球队|运动队|田径队|校队|院队|球队成员|篮球队员|院级比赛|校级比赛|院级.*(?:亚|季|冠)军|热爱运动|院篮|校篮|社团活动|学生工作|学生会|班委|志愿者服务)/i;

/** 是否应归入校园经历，而非工程/学术「项目经历」 */
export function isCampusActivityNotProject(p: ParsedProject): boolean {
  const joined = `${p.title} ${p.role ?? ""} ${p.description ?? ""} ${(p.bullets ?? []).join(" ")}`.trim();
  if (!joined) return false;
  if (isProjectAnchorTitle(p.title) && !CAMPUS_ACTIVITY_NOT_PROJECT_RE.test(joined)) {
    return false;
  }
  if (CAMPUS_ACTIVITY_NOT_PROJECT_RE.test(joined)) return true;
  if (CAMPUS_ROLE_RE.test(p.title) || CAMPUS_ROLE_RE.test(p.role ?? "")) {
    return !isProjectAnchorTitle(p.title);
  }
  if (
    /(?:成员|队员)$/.test(p.title.trim()) &&
    !/(?:系统|单元|平台|电控|循迹|定位|开发|主控|STM32|TC264|MSPM0|μC)/.test(
      joined,
    )
  ) {
    return true;
  }
  return false;
}

/** 将误放入 projects 的校园/运动/社团条目移至 education.campusExperiences */
export function relocateCampusActivitiesFromProjects(
  parsed: ParsedResume,
): { parsed: ParsedResume; warnings: string[] } {
  const warnings: string[] = [];
  const remaining: ParsedProject[] = [];
  let moved = 0;

  for (const p of parsed.projects) {
    if (!isCampusActivityNotProject(p)) {
      remaining.push(p);
      continue;
    }
    moved++;
    const edu = parsed.education[0];
    if (edu) {
      if (!edu.campusExperiences) edu.campusExperiences = [];
      const role = p.title.trim() || p.role?.trim() || "校园经历";
      const bullets = [
        ...(p.bullets ?? []),
        ...(p.description?.trim() ? [p.description.trim()] : []),
      ].filter(Boolean);
      const period = p.period?.trim() ?? "";
      const exists = edu.campusExperiences.some(
        (c) =>
          c.role === role &&
          c.period.replace(/\s/g, "") === period.replace(/\s/g, ""),
      );
      if (!exists) {
        edu.campusExperiences.push({
          role,
          period,
          bullets: bullets.slice(0, 10),
        });
      }
    }
  }

  if (moved > 0) {
    warnings.push(
      `已将 ${moved} 条校园/运动/社团经历从「项目经历」移至「教育背景 → 校园经历」，请在履历页核对。`,
    );
  }

  return {
    parsed: { ...parsed, projects: remaining },
    warnings,
  };
}
const WORKLIKE_RE =
  /(实习|兼职|全职|教师|助教|辅导|运营|销售|顾问|客服|商务|地推|门店|创业|经营|接单|客户|转化|营收|GMV)/i;
const PROJECTLIKE_RE =
  /(项目|系统|平台|小程序|网站|APP|比赛|竞赛|建模|开发|设计|课题|研究|方案)/i;

function uniqPush<T>(arr: T[], item: T, same: (a: T, b: T) => boolean) {
  if (!arr.some((x) => same(x, item))) arr.push(item);
}

function dedupeAwardStrings(items: string[]): string[] {
  const seen = new Set<string>();
  return items
    .map((x) => x.trim())
    .filter((x) => {
      if (!x || x.length < 3 || seen.has(x)) return false;
      seen.add(x);
      return true;
    });
}

const AWARD_LIKE_RE =
  /(?:奖|竞赛|大赛|学金|Honor|Scholarship|CET|英语|三等奖|二等奖|一等奖|参赛奖|优秀奖)/i;

export function isAwardLikeText(text: string): boolean {
  const t = text.trim();
  if (!t || t.length < 3) return false;
  if (/^主修课程/.test(t)) return false;
  if (/GPA|gpa/.test(t) && !/奖/.test(t)) return false;
  return AWARD_LIKE_RE.test(t);
}

/** 合并 LLM/规则/教育亮点中的奖项，避免导入后校园详情丢失荣誉 */
export function enrichParsedResumeAwards(
  parsed: ParsedResume,
  fallbackAwards: string[] = [],
): ParsedResume {
  const fromHighlights = parsed.education.flatMap((e) =>
    e.highlights.filter(isAwardLikeText),
  );
  const fromCampus = parsed.education.flatMap((e) =>
    (e.campusExperiences ?? []).flatMap((c) =>
      c.bullets.filter(isAwardLikeText),
    ),
  );
  const awards = dedupeAwardStrings([
    ...(parsed.awards ?? []),
    ...fromHighlights,
    ...fromCampus,
    ...fallbackAwards,
  ]).slice(0, 12);

  const education = parsed.education.map((e) => ({
    ...e,
    highlights: e.highlights.filter(
      (h) => !isAwardLikeText(h) || /GPA|gpa|CET|英语/i.test(h),
    ),
  }));

  return {
    ...parsed,
    education,
    awards: awards.length ? awards : undefined,
  };
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

  const consolidated = consolidateFragmentedProjects(out.projects);
  if (consolidated.length < out.projects.length) {
    warnings.push(
      `已将 ${out.projects.length - consolidated.length} 条误拆的项目要点合并进对应项目。`,
    );
  }
  out.projects = consolidated;

  const relocated = relocateCampusActivitiesFromProjects(out);
  out.projects = relocated.parsed.projects;
  if (relocated.parsed.education[0]) {
    out.education[0] = relocated.parsed.education[0]!;
  }
  warnings.push(...relocated.warnings);

  return { parsed: out, warnings };
}
