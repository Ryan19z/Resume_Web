import type { ParsedResume, ResumeParseMethod } from "@/lib/resume-parse-types";

export type ImportCheckStatus = "pass" | "warn" | "fail";

export type ImportCheckItem = {
  id: string;
  status: ImportCheckStatus;
  titleZh: string;
  titleEn: string;
  detailZh?: string;
  detailEn?: string;
};

export type ImportQualityGrade = "good" | "fair" | "needs_review";

export type ImportQualityReport = {
  score: number;
  grade: ImportQualityGrade;
  summaryZh: string;
  summaryEn: string;
  checklist: ImportCheckItem[];
  warnCount: number;
  failCount: number;
};

function extOf(fileName: string): string {
  const i = fileName.lastIndexOf(".");
  return i >= 0 ? fileName.slice(i).toLowerCase() : "";
}

export function buildImportQualityReport(input: {
  parsed: ParsedResume;
  warnings: string[];
  confidence: number;
  textLength: number;
  fileName: string;
  method: ResumeParseMethod;
  llmFallback: boolean;
  planAllowsAi?: boolean;
}): ImportQualityReport {
  const {
    parsed,
    warnings,
    confidence,
    textLength,
    fileName,
    method,
    llmFallback,
    planAllowsAi = true,
  } = input;
  const checklist: ImportCheckItem[] = [];
  const ext = extOf(fileName);

  const push = (item: ImportCheckItem) => {
    checklist.push(item);
  };

  if (parsed.name?.trim()) {
    push({
      id: "name",
      status: "pass",
      titleZh: "姓名已识别",
      titleEn: "Name detected",
      detailZh: parsed.name.trim(),
      detailEn: parsed.name.trim(),
    });
  } else {
    push({
      id: "name",
      status: "fail",
      titleZh: "未识别姓名",
      titleEn: "Name missing",
      detailZh: "填入后请在首页手动填写姓名。",
      detailEn: "Fill in your name on the home section after apply.",
    });
  }

  const hasContact = Boolean(
    parsed.contactEmail?.trim() || parsed.contactPhone?.trim(),
  );
  push({
    id: "contact",
    status: hasContact ? "pass" : "warn",
    titleZh: hasContact ? "联系方式已识别" : "联系方式可能不全",
    titleEn: hasContact ? "Contact info detected" : "Contact info may be incomplete",
    detailZh: hasContact
      ? [parsed.contactEmail, parsed.contactPhone].filter(Boolean).join(" · ")
      : "请在首页补充邮箱或电话。",
    detailEn: hasContact
      ? [parsed.contactEmail, parsed.contactPhone].filter(Boolean).join(" · ")
      : "Add email or phone on the home section.",
  });

  if (parsed.education.length > 0) {
    push({
      id: "education",
      status: "pass",
      titleZh: `教育背景 ${parsed.education.length} 条`,
      titleEn: `${parsed.education.length} education item(s)`,
      detailZh: "打开教育卡片 → 校园成果，核对奖项是否一条一项。",
      detailEn: "Open education cards → campus section; one award per line.",
    });
  } else {
    push({
      id: "education",
      status: "warn",
      titleZh: "未识别教育背景",
      titleEn: "No education detected",
      detailZh: "请在「履历 → 教育背景」中手动补充。",
      detailEn: "Add education under Resume manually.",
    });
  }

  const expN = parsed.experience.length;
  const projN = parsed.projects.length;
  if (expN + projN === 0) {
    push({
      id: "career",
      status: "fail",
      titleZh: "未识别工作与项目经历",
      titleEn: "No work or project experience",
      detailZh: "请在「履历」中手动补充。",
      detailEn: "Add experience under Resume manually.",
    });
  } else {
    const campusInProject = warnings.some((w) =>
      /校园|运动|社团|篮球队/.test(w),
    );
    push({
      id: "career",
      status: campusInProject ? "warn" : "pass",
      titleZh: `工作经历 ${expN} 条 · 项目 ${projN} 条`,
      titleEn: `Work ${expN} · Projects ${projN}`,
      detailZh: campusInProject
        ? "系统已尝试将校园经历移出项目区，请打开履历核对。"
        : "核对同一项目是否被拆成多条、要点是否完整。",
      detailEn: campusInProject
        ? "Campus items may have been moved; review Resume sections."
        : "Check merged projects and bullet completeness.",
    });
  }

  const awardN = parsed.awards?.length ?? 0;
  if (awardN > 0) {
    const awardWarn = warnings.some((w) => /奖项|荣誉|合并|重复/.test(w));
    push({
      id: "awards",
      status: awardWarn ? "warn" : "pass",
      titleZh: `奖项荣誉 ${awardN} 条`,
      titleEn: `${awardN} award line(s)`,
      detailZh: awardWarn
        ? "可能存在拆分或重复，请在教育 → 奖项荣誉中逐条核对。"
        : "每条应为「竞赛名 + 等级 + 日期」完整一行。",
      detailEn: awardWarn
        ? "Possible split/duplicate awards; review in education section."
        : "Each line should be full award + level + date.",
    });
  }

  if (textLength < 280) {
    push({
      id: "text",
      status: "fail",
      titleZh: "提取文字过少",
      titleEn: "Very little text extracted",
      detailZh: "可能是扫描件或版式异常，建议换文字版 PDF/Word 或手填。",
      detailEn: "Likely scan or layout issue; use text-based file or fill manually.",
    });
  } else if (textLength < 800) {
    push({
      id: "text",
      status: "warn",
      titleZh: "提取文字偏少",
      titleEn: "Limited text extracted",
      detailZh: "请重点核对各区块是否遗漏。",
      detailEn: "Review all sections for missing content.",
    });
  } else {
    push({
      id: "text",
      status: "pass",
      titleZh: "文字提取量正常",
      titleEn: "Text extraction looks OK",
      detailZh: `约 ${textLength.toLocaleString()} 字`,
      detailEn: `About ${textLength.toLocaleString()} characters`,
    });
  }

  if (llmFallback) {
    push({
      id: "method",
      status: "warn",
      titleZh: "AI 解析未成功，已用规则引擎",
      titleEn: "AI failed; rule engine used",
      detailZh: "字段完整度可能低于 AI 解析，请逐项核对。",
      detailEn: "Completeness may be lower; review the checklist.",
    });
  } else if (method === "heuristic") {
    const manualHintZh =
      ext === ".doc"
        ? "旧版 .doc 格式支持有限，建议另存为 .docx 后重导。"
        : planAllowsAi
          ? "结构复杂时建议升级含 AI 的套餐，或导入后手动微调。"
          : "结构复杂时请导入后手动微调各区块。";
    const manualHintEn =
      ext === ".doc"
        ? "Legacy .doc has limited support; save as .docx and retry."
        : planAllowsAi
          ? "For complex layouts, upgrade to an AI plan or edit manually."
          : "For complex layouts, edit sections manually after import.";
    push({
      id: "method",
      status: "warn",
      titleZh: "本次为规则引擎解析",
      titleEn: "Parsed with rule engine",
      detailZh: manualHintZh,
      detailEn: manualHintEn,
    });
  } else {
    push({
      id: "method",
      status: "pass",
      titleZh: "本次为 AI 深度解析",
      titleEn: "Parsed with AI",
    });
  }

  if (warnings.length > 0) {
    push({
      id: "system-warnings",
      status: "warn",
      titleZh: `系统提示 ${warnings.length} 条`,
      titleEn: `${warnings.length} system note(s)`,
      detailZh: "见下方「建议核对」详情。",
      detailEn: "See “Please review” below for details.",
    });
  }

  const failCount = checklist.filter((c) => c.status === "fail").length;
  const warnCount = checklist.filter((c) => c.status === "warn").length;
  const passCount = checklist.filter((c) => c.status === "pass").length;
  const passRatio = checklist.length ? passCount / checklist.length : 0;

  let score = Math.round(confidence * 55 + passRatio * 45);
  score -= failCount * 12;
  score -= warnCount * 4;
  score = Math.max(15, Math.min(98, score));

  let grade: ImportQualityGrade = "needs_review";
  if (score >= 78 && failCount === 0) grade = "good";
  else if (score >= 55 && failCount <= 1) grade = "fair";

  const summaryZh =
    grade === "good"
      ? "整体质量较好，填入后按清单快速扫一遍即可。"
      : grade === "fair"
        ? "可用作初稿，填入前请对照核对清单修改。"
        : "建议先处理标红/黄色项，或改用手动填写部分区块。";

  const summaryEn =
    grade === "good"
      ? "Looks good overall; a quick checklist pass after apply is enough."
      : grade === "fair"
        ? "Usable as a draft; review the checklist before or after apply."
        : "Fix red/yellow items first, or fill some sections manually.";

  return {
    score,
    grade,
    summaryZh,
    summaryEn,
    checklist,
    warnCount,
    failCount,
  };
}

export function gradeLabel(
  grade: ImportQualityGrade,
  lang: "zh" | "en",
): string {
  if (lang === "zh") {
    if (grade === "good") return "质量良好";
    if (grade === "fair") return "建议核对";
    return "需重点核对";
  }
  if (grade === "good") return "Good quality";
  if (grade === "fair") return "Review suggested";
  return "Needs careful review";
}
