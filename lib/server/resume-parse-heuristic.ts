import type {
  ParsedEducation,
  ParsedExperience,
  ParsedProject,
  ParsedResume,
} from "@/lib/resume-parse-types";
import { splitSchoolMajorBlob } from "@/lib/education-display";
import {
  buildParseQualityWarnings,
  computeParseConfidence,
  consolidateFragmentedProjects,
  isCampusActivityNotProject,
  isProjectAnchorTitle,
  normalizeAwardList,
  reconcileWorkAndProjects,
} from "@/lib/server/resume-parse-reconcile";
const MONTH =
  "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)";

/** 日期区间核心（可用于行首/行尾匹配） */
export const DATE_RANGE_CORE =
  `(?:\\d{4}年\\d{1,2}月\\s*[-–—~至到]+\\s*(?:至今|现在|[Pp]resent|[Nn]ow|\\d{4}年\\d{1,2}月)|\\d{4}[\\./年-]\\d{1,2}(?:[\\./月-]\\d{1,2})?(?:日)?\\s*[-–—~至到]+\\s*(?:至今|现在|[Pp]resent|[Nn]ow|\\d{4}[\\./年-]\\d{1,2}(?:[\\./月-]\\d{1,2})?(?:日)?)|${MONTH}\\.?\\s+\\d{4}\\s*[-–—~至到]+\\s*(?:[Pp]resent|[Nn]ow|至今|现在|${MONTH}\\.?\\s+\\d{4}))`;

const DATE_RANGE_AT_START = new RegExp(
  `^\\s*(${DATE_RANGE_CORE})\\s*`,
  "i",
);

const DATE_RANGE_AT_END = new RegExp(
  `\\s+(${DATE_RANGE_CORE})\\s*$`,
  "i",
);

const SECTION_PATTERNS: { key: string; re: RegExp }[] = [
  {
    key: "summary",
    re: /^(?:个人简介|自我介绍|基本信息|个人总结)$/i,
  },
  {
    key: "experience",
    re: /^(?:工作经历|工作经验|职业经历|employment|work\s*experience|professional\s*experience)$/i,
  },
  {
    key: "internship",
    re: /^(?:实习经历|实习经验|internship)$/i,
  },
  {
    key: "education",
    re: /^(?:教育背景|教育经历|学历|education|academic)$/i,
  },
  {
    key: "campus",
    re: /^(?:在校经历|校园经历|学生工作|校内经历|campus\s*activities?)$/i,
  },
  {
    key: "skills",
    re: /^(?:专业技能|技能|核心技能|个人能力|technical\s*skills|skills|competencies)$/i,
  },
  {
    key: "projects",
    re: /^(?:项目经历|项目经验|代表项目|projects?|portfolio)$/i,
  },
  {
    key: "awards",
    re: /^(?:奖项荣誉|荣誉奖项|获奖情况|个人荣誉|awards?|honors?|certificates?)$/i,
  },
  {
    key: "selfEval",
    re: /^(?:自我评价|个人评价|self[-\s]?evaluation|about\s*me)$/i,
  },
  {
    key: "volunteer",
    re: /^(?:志愿服务经历|志愿经历|volunteer\s*experience)$/i,
  },
  {
    key: "summary",
    re: /^(?:关于我|summary|profile|objective)$/i,
  },
];

function cleanLine(line: string): string {
  return line.replace(/\s+/g, " ").trim();
}

function isBullet(line: string): boolean {
  return (
    /^[-•●·▪◦*❖◆◇]\s*/.test(line) || /^\d+[.)]\s+/.test(line)
  );
}

function stripBullet(line: string): string {
  return cleanLine(
    line.replace(/^[-•●·▪◦*❖◆◇]\s*/, "").replace(/^\d+[.)]\s+/, ""),
  );
}

/** PDF 换行导致要点被截断时，将续行拼回上一条 */
function isLocationOnlyLine(line: string): boolean {
  const t = cleanLine(line);
  return (
    t.length >= 2 &&
    t.length <= 12 &&
    /^[\u4e00-\u9fff]{2,10}(?:市|省|区|州|县)$/.test(t)
  );
}

function shouldMergeBulletContinuation(
  line: string,
  bullets: string[] | undefined,
  mode: "experience" | "project" = "experience",
): boolean {
  if (!bullets?.length) return false;
  const t = cleanLine(line);
  if (!t || isBullet(t)) return false;
  if (mode === "project" && isProjectTitleOnlyLine(line)) return false;
  if (DATE_RANGE_AT_START.test(line) || DATE_RANGE_AT_END.test(line)) return false;
  if (isWorkCompanyLine(line) || isEducationLine(line)) return false;
  if (isLocationOnlyLine(line)) return false;
  if (
    /^(?:工作经历|工作经验|项目经验|项目经历|教育经历|在校经历|实习经历|志愿服务|个人总结|自我评价)/.test(
      t,
    )
  ) {
    return false;
  }
  return true;
}

function appendBulletContinuation(bullets: string[], line: string): void {
  const extra = stripBullet(cleanLine(line));
  if (!extra) return;
  const last = bullets.length - 1;
  const prev = bullets[last] ?? "";
  const joiner =
    /[，,、；;：:]$/.test(prev) || /^[以及而与及]/.test(extra) ? "" : "";
  bullets[last] = `${prev}${joiner}${extra}`;
}

function isCommaSeparatedSkillList(line: string): boolean {
  const t = stripBullet(cleanLine(line));
  if (!t || t.length > 280) return false;
  if (SKILL_TOOL_LABEL_RE.test(t) || SKILL_SOFT_LABEL_RE.test(t)) return false;
  const parts = splitSkillBlob(t);
  if (parts.length < 2) return false;
  const techLike = parts.filter(
    (p) => /[A-Za-z]/.test(p) && p.length >= 2 && p.length <= 32,
  ).length;
  return techLike >= 2;
}

function isHeroWorthyLine(line: string): boolean {
  const t = stripBullet(cleanLine(line));
  if (t.length < 8 || t.length > 140) return false;
  if (/^(?:熟练掌握|精通|熟悉|掌握|了解|具备|积极主动|结果导向)/.test(t) && !/\d/.test(t)) {
    return false;
  }
  return (
    /(?:\d+%|≥\d+%|≥\s*\d+%|提升|降低|增长|完成.*\d+|取数\s*\d+|满意度|销售额|转化率)/i.test(
      t,
    ) ||
    /(?:证书|Certification|PMP|CET[-\s]?[46]|奖学金|竞赛.*奖|专利|荣誉)/i.test(t) ||
    /^\d+年\+/.test(t) ||
    /(?:SQL|Python|PowerBI|Tableau).{0,40}(?:熟练|精通|流利)/i.test(t) ||
    /留学期间取得|工作期间取得/i.test(t)
  );
}

function isOrphanAwardDate(line: string): boolean {
  const t = line.trim().replace(/\s/g, "");
  if (!t) return false;
  return /^\d{4}[.\-/年]\d{1,2}/.test(t) || /^\d{4}$/.test(t);
}

function buildHeroPreviewLines(input: {
  awards: string[];
  summaryLines: string[];
  selfEval: string[];
  experience: ParsedExperience[];
  projects: ParsedProject[];
}): string[] {
  const lines: string[] = [];
  const push = (raw: string) => {
    const t = stripBullet(cleanLine(raw)).slice(0, 120).trim();
    if (!t || isOrphanAwardDate(t) || /大学|GPA|gpa|学院/i.test(t)) return;
    if (lines.includes(t)) return;
    lines.push(t);
  };

  for (const a of input.awards) push(a);

  const useAwardsOnly = input.awards.length >= 2;
  if (!useAwardsOnly) {
    for (const raw of [...input.summaryLines, ...input.selfEval]) {
      if (isHeroWorthyLine(raw)) push(raw);
    }
    for (const e of input.experience) {
      for (const b of e.keyResults) {
        if (isHeroWorthyLine(b)) push(b);
      }
    }
    for (const p of input.projects) {
      for (const b of p.bullets ?? []) {
        if (isHeroWorthyLine(b)) push(b);
      }
    }
  }

  return lines.slice(0, 6);
}

function isProjectTitleOnlyLine(line: string): boolean {
  const t = cleanLine(line);
  if (t.length < 4 || t.length > 72) return false;
  if (isBullet(t) || DATE_RANGE_AT_START.test(line) || DATE_RANGE_AT_END.test(line)) {
    return false;
  }
  if (isWorkCompanyLine(t) || isEducationLine(t)) return false;
  if (/有限公司|股份有限公司|集团—/.test(t)) return false;
  if (/^(?:负责|参与|完成|协助|推动)/.test(t)) return false;
  return isValidProjectTitle(t);
}

function normalizeEmail(raw?: string): string | undefined {
  if (!raw) return undefined;
  return raw.replace(/\s+/g, "").replace(/，/g, ",").trim() || undefined;
}

function normalizePhone(raw?: string): string | undefined {
  if (!raw) return undefined;
  const dashed = raw.match(
    /(?:\+?\s*86[-\s]?)?1[3-9]\d[-\s]?\d{4}[-\s]?\d{4}/,
  );
  if (dashed) {
    const digits = dashed[0].replace(/\D/g, "");
    if (digits.length === 13 && digits.startsWith("86")) {
      return `+86 ${digits.slice(2)}`;
    }
    if (digits.length === 11) return digits;
    return dashed[0].replace(/\s+/g, " ").trim();
  }
  const cn = raw.match(/\b1[3-9]\d{9}\b/);
  if (cn) return cn[0];
  return undefined;
}

export function extractContactsFromText(text: string): {
  email?: string;
  phone?: string;
  extra?: string;
} {
  const emailMatch = text.match(
    /[a-zA-Z0-9._%+-]+\s*@\s*[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
  );
  const email = normalizeEmail(emailMatch?.[0]);

  const phoneMatch =
    text.match(/\+?\s*86[-\s]?1[3-9]\d[-\s]?\d{4}[-\s]?\d{4}/) ??
    text.match(/(?:\+86[-\s]?)?1[3-9]\d[-\s]?\d{4}[-\s]?\d{4}/) ??
    text.match(/\b1[3-9]\d{9}\b/);
  const phone = normalizePhone(phoneMatch?.[0]);

  const wechat =
    text.match(/(?:微信|WeChat|wx)[:：\s]*([a-zA-Z0-9_-]{4,20})/i) ??
    text.match(/\bwx[:：\s]*([a-zA-Z0-9_-]{4,20})/i);

  return {
    email,
    phone,
    extra: wechat ? `微信：${wechat[1]}` : undefined,
  };
}

function splitSections(lines: string[]): Record<string, string[]> {
  const sections: Record<string, string[]> = {};
  let current = "body";
  sections[current] = [];

  for (const raw of lines) {
    const rawLine = raw.trim();
    if (!rawLine) continue;
    const normalized = cleanLine(rawLine);

    const matched = SECTION_PATTERNS.find((p) => p.re.test(normalized));
    if (matched) {
      current = matched.key;
      if (!sections[current]) sections[current] = [];
      continue;
    }
    if (!sections[current]) sections[current] = [];
    sections[current].push(rawLine);
  }
  return sections;
}

/** 是否存在独立的「项目经历/项目经验」分区（含实质内容） */
function hasDedicatedProjectSection(
  sections: Record<string, string[]>,
  allLines: string[],
): boolean {
  const projLines = sections.projects ?? [];
  const substantive = projLines.filter((l) => {
    const t = cleanLine(l);
    if (t.length < 6) return false;
    if (/^(?:项目经历|项目经验|代表项目|projects?)$/i.test(t)) return false;
    return true;
  });
  if (substantive.length >= 2) return true;

  const headerIdx = allLines.findIndex((l) =>
    /^项目(?:经历|经验|项目)$/.test(cleanLine(l)),
  );
  if (headerIdx >= 0) {
    const after = allLines.slice(headerIdx + 1, headerIdx + 40);
    if (
      after.some(
        (l) => /项目负责人/.test(l) || /^项目概述|^项目描述/.test(l.trim()),
      )
    ) {
      return true;
    }
  }
  return false;
}

function inferName(lines: string[]): string | undefined {
  for (const line of lines.slice(0, 15)) {
    const labeled = line.match(
      /姓名[:：\s]*([\u4e00-\u9fff]{2,4})(?=民族|性别|出生|现居|邮箱|电话|$|\s)/,
    );
    if (labeled?.[1]) return labeled[1];
  }
  for (const line of lines.slice(0, 8)) {
    const n = cleanLine(line);
    if (EMAIL_RE.test(n) || /1[3-9]\d/.test(n)) continue;
    if (n.length > 40) continue;
    if (/^(resume|curriculum|个人简历|简历)$/i.test(n)) continue;
    if (/^[\u4e00-\u9fff]{2,4}$/.test(n)) return n;
    if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}$/.test(n)) return n;
    const pipe = n.split(/[|｜/]/)[0]?.trim();
    if (pipe && pipe.length <= 20 && /^[\u4e00-\u9fff]{2,4}$/.test(pipe)) return pipe;
  }
  return undefined;
}

const EMAIL_RE = /@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

function inferTargetRole(text: string): string | undefined {
  const m = text.match(
    /(?:求职意向|目标岗位|期望职位|意向岗位)[:：\s]*([^\n|｜]{2,30})/i,
  );
  if (m?.[1]) return m[1].trim();
  if (/数据分析|自动化|工程师|开发|设计|支持/i.test(text)) {
    if (/数据分析/i.test(text)) return "数据分析师";
    if (/自动化/i.test(text)) return "自动化工程师";
  }
  return undefined;
}

function splitCompanyAndTitle(block: string): { company: string; title: string } {
  const trimmed = block.trim();
  if (!trimmed) return { company: "", title: "" };

  const multiParts = trimmed
    .split(/\s{2,}|\t/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (multiParts.length >= 2) {
    return {
      company: multiParts[0] ?? "",
      title: multiParts.slice(1).join(" "),
    };
  }

  const pipeParts = trimmed.split(/[|｜/]/).map((p) => p.trim()).filter(Boolean);
  if (pipeParts.length >= 2) {
    return { company: pipeParts[0] ?? "", title: pipeParts[1] ?? "" };
  }

  const parenMatch = trimmed.match(/^(.+?[）\)])(?:\s*[-–—]\s*)?(.+)$/);
  if (parenMatch) {
    return { company: parenMatch[1]!.trim(), title: parenMatch[2]!.trim() };
  }

  const jobRe =
    /(?:工程师|经理|主管|总监|专员|实习|开发|设计|分析师|顾问|Assistant|Specialist|Engineer|Developer|Manager|Analyst|Intern|Researcher|Support|技术支持)/i;
  const words = cleanLine(trimmed).split(/\s+/);
  let best = { company: trimmed, title: "" };
  for (let i = 0; i < words.length; i++) {
    const titleCandidate = words.slice(i).join(" ");
    if (jobRe.test(titleCandidate) && titleCandidate.length <= 48) {
      best = { company: words.slice(0, i).join(" "), title: titleCandidate };
    }
  }
  return best;
}

/** 从「个人简介」等混合段落提取教育信息 */
function parseEducationFromProfile(lines: string[]): ParsedEducation[] {
  const joined = lines.join("\n");
  const eduLine = lines.find(
    (l) =>
      /大学|学院|本科|硕士|博士|GPA|gpa/i.test(l) &&
      !/竞赛|项目|公司|工程师/i.test(l),
  );
  if (!eduLine) return [];

  const periodMatch = eduLine.match(
    /(\d{4}[.\/年-]\d{1,2}(?:[.\/月-]\d{1,2})?\s*[-–—~至到]+\s*\d{4}[.\/年-]?\d{0,2}(?:[.\/月-]?\d{0,2})?)/,
  );
  const period = periodMatch?.[1]?.trim() ?? "";

  const withoutPeriod = eduLine.replace(periodMatch?.[0] ?? "", "").trim();
  const parts = withoutPeriod
    .split(/[|｜/]/)
    .map((p) => p.trim())
    .filter(Boolean);

  let school = "";
  let degree = "";
  const highlights: string[] = [];

  for (const p of parts) {
    if (/大学|学院/i.test(p)) school = p.replace(/[|｜].*$/, "").trim();
    else if (/本科|硕士|博士|专科|学士|自动化|计算机|专业/i.test(p))
      degree = degree ? `${degree} · ${p}` : p;
    else if (/GPA|gpa/i.test(p)) highlights.push(p);
  }

  if (!school && parts[0]) school = parts[0]!;

  const gpaInText = joined.match(/GPA\s*[\d.]+[^|\n]*/i);
  if (gpaInText && !highlights.includes(gpaInText[0])) {
    highlights.push(cleanLine(gpaInText[0]));
  }

  if (!school && !degree) return [];

  return [
    {
      school: school || "学校",
      degree: degree || "本科",
      period,
      summary: undefined,
      highlights,
    },
  ];
}

const SKILL_TOOL_LABEL_RE =
  /^(?:语言能力|办公工具|技术基础|核心能力|专业技能|技能)[:：]/i;
const SKILL_SOFT_LABEL_RE =
  /^(?:技术理解|问题解决|用户感知|跨团队协作)[:：]/i;

/** 判断是否为「个人能力」型描述行（非项目/工作描述） */
function isSkillProfileLine(line: string): boolean {
  const t = stripBullet(cleanLine(line));
  if (!t || t.length > 220) return false;
  if (isProjectOrWorkNarrativeLine(line)) return false;
  if (
    /^(?:负责|完成|设计|开发|参与|使用\s*AD|基于|项目|个人主要|以低功耗|采用|规划|集)/.test(
      t,
    )
  ) {
    return false;
  }
  if (/^(?:熟练|精通|熟悉|掌握|了解|具备)/.test(t)) return true;
  if (SKILL_TOOL_LABEL_RE.test(t) || SKILL_SOFT_LABEL_RE.test(t)) return true;
  return false;
}

function isProjectOrWorkNarrativeLine(line: string): boolean {
  const t = stripBullet(cleanLine(line));
  if (!t) return false;
  if (DATE_RANGE_AT_START.test(line) || DATE_RANGE_AT_END.test(line)) return true;
  if (/^(?:根据比赛|针对|项目概述|个人主要|项目成果)/.test(t)) return true;
  if (/^(?:惯导|自动红外|基于μC|基于ESP|ELEGOO)/.test(t)) return true;
  if (/使用GPS|GPS\+IMU方案作为|操作系统为导向设计|完成跑圈/.test(t)) return true;
  if (/（[^）]{2,40}）/.test(t) && /\d{4}[.\-/]/.test(line)) return true;
  return false;
}

function isIntroSkillBoundaryLine(line: string): boolean {
  const t = cleanLine(line);
  if (!t) return false;
  if (DATE_RANGE_AT_START.test(line) || DATE_RANGE_AT_END.test(line)) return true;
  if (/^(?:惯导|自动红外|基于μC|基于ESP|ELEGOO)/.test(t)) return true;
  if (/^(?:根据比赛|针对(?:实时|循迹)|项目概述|个人主要|奖项荣誉|工作经历)/.test(t)) {
    return true;
  }
  if (/（[^）]{2,48}）/.test(t) && /\d{4}[.\-/]/.test(line)) return true;
  return false;
}

/** 仅取个人简介中的能力标签行，遇到项目/工作描述即停止 */
function takeSummarySkillBlock(summaryLines: string[]): string[] {
  const out: string[] = [];
  for (const raw of summaryLines) {
    if (isIntroSkillBoundaryLine(raw)) {
      if (
        /大学|学院|本科|硕士|GPA|gpa/i.test(raw) &&
        !/惯导|红外|μC|ESP32|TC264|MSPM0/.test(raw)
      ) {
        continue;
      }
      break;
    }
    out.push(raw);
  }
  return out;
}

/** 仅取个人简介中的能力标签行，遇到项目/工作描述即停止 */
function takeIntroSkillLines(summaryLines: string[]): string[] {
  const out: string[] = [];
  let pending: string | null = null;

  const flushPending = () => {
    if (pending) {
      out.push(pending);
      pending = null;
    }
  };

  for (const raw of summaryLines) {
    const line = raw.trim();
    if (!line) continue;
    if (isIntroSkillBoundaryLine(line)) {
      flushPending();
      break;
    }

    const t = stripBullet(cleanLine(line));
    if (!t) continue;
    if (/^浙江科技大学|^[\u4e00-\u9fff]{2,8}\s*\|/.test(t) && /GPA|本科|大学/.test(t)) {
      continue;
    }

    if (isBullet(line) || SKILL_TOOL_LABEL_RE.test(t) || SKILL_SOFT_LABEL_RE.test(t)) {
      flushPending();
      pending = line;
      continue;
    }

    if (
      pending &&
      !isBullet(line) &&
      line.length <= 120 &&
      !isIntroSkillBoundaryLine(line)
    ) {
      pending = `${pending} ${line}`;
      continue;
    }

    flushPending();
  }
  flushPending();
  return out;
}

function extractSoftSkillKeywords(line: string): string[] {
  const found: string[] = [];
  const rules: Array<[RegExp, string]> = [
    [/数据分析|数据驱动|数据说话/, "数据分析"],
    [/海外客户|用户|客户|反馈处理/, "用户沟通"],
    [/跨团队|协作|协调/, "跨团队协作"],
    [/自动化|智能硬件|硬件开发/, "智能硬件"],
    [/工具化|提效|效率/, "工具化思维"],
    [/英语|CET[-\s]?6|CET[-\s]?4/, "英语"],
  ];
  for (const [re, label] of rules) {
    if (re.test(line) && !found.includes(label)) found.push(label);
  }
  if (/CET[-\s]?6/i.test(line) && !found.includes("CET-6")) found.push("CET-6");
  if (/CET[-\s]?4/i.test(line) && !found.includes("CET-4")) found.push("CET-4");
  return found;
}

function splitSkillBlob(blob: string): string[] {
  const items: string[] = [];
  let current = "";
  let depth = 0;
  for (const ch of blob) {
    if (ch === "（" || ch === "(") depth++;
    if (depth > 0) {
      current += ch;
      if (ch === "）" || ch === ")") depth--;
      continue;
    }
    if (/[、,，;；/|]/.test(ch)) {
      if (current.trim()) items.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) items.push(current.trim());
  return items
    .map((s) => s.replace(/^[（(]+/, "").replace(/[）)]+$/, "").trim())
    .filter(Boolean);
}

function normalizeSkillToken(raw: string): string | null {
  let t = raw.trim().replace(/^[●·▪◦*❖◆◇]\s*/, "");
  t = t.replace(/[（(].*[）)]/g, "").trim();
  if (!t) return null;

  const labeled = t.match(
    /^(?:语言能力|办公工具|技术基础|核心能力|专业技能|技能|技术理解|问题解决|用户感知|跨团队协作)[:：]\s*(.+)$/i,
  );
  if (labeled?.[1]) {
    const inner = labeled[1].trim();
    for (const part of splitSkillBlob(inner)) {
      const n = normalizeSkillToken(part);
      if (n) return n;
    }
  }

  const compact = t.toLowerCase().replace(/\s+/g, "");
  const aliasMap: Record<string, string> = {
    "c/c++": "C/C++",
    cplusplus: "C/C++",
    "nb-iot": "NB-IoT",
    nbiot: "NB-IoT",
    cat1: "CAT1",
    freertos: "FreeRTOS",
    esp32: "ESP32",
    stm32: "STM32",
    "485": "RS485",
    rs485: "RS485",
    rs232: "RS232",
    usart: "USART",
    i2c: "I2C",
    spi: "SPI",
    ble: "BLE",
    wifi: "WiFi",
    lora: "LoRa",
    dma: "DMA",
    can: "CAN",
    python: "Python",
    sql: "SQL",
    typescript: "TypeScript",
    react: "React",
    nextjs: "Next.js",
    langchain: "LangChain",
    tableau: "Tableau",
    powerbi: "PowerBI",
    pandas: "Pandas",
    tensorflow: "TensorFlow",
    sklearn: "sklearn",
    jira: "Jira",
    matlab: "Matlab",
    plc: "PLC",
    mcu: "MCU",
    fpga: "FPGA",
    git: "Git",
    linux: "Linux",
    cet4: "CET-4",
    cet6: "CET-6",
    processon: "ProcessOn",
    visio: "Visio",
    xmind: "Xmind",
    platformio: "PlatformIO",
    keilmdk: "Keil MDK",
    altiumdesigner: "Altium Designer",
    vscode: "VS Code",
  };
  if (aliasMap[compact]) return aliasMap[compact];

  const embeddedTech = t.match(
    /\b(?:SQL|Python|TypeScript|React|Next\.js|LangChain|Tableau|Power\s*BI|PowerBI|Pandas|TensorFlow|sklearn|Jira|Xmind)\b/i,
  );
  if (embeddedTech) {
    const token = embeddedTech[0];
    const key = token.toLowerCase().replace(/\s+/g, "").replace("next.js", "nextjs");
    if (aliasMap[key]) return aliasMap[key]!;
    if (/^sql$/i.test(token)) return "SQL";
    if (/^power\s*bi$/i.test(token)) return "PowerBI";
    return token;
  }

  const stm32 = t.match(/STM32(?:F\d+(?:\/F\d+)*)?/i);
  if (stm32) return stm32[0].toUpperCase();
  if (/^altium\s*designer$/i.test(t)) return "Altium Designer";
  if (/^keil\s*mdk$/i.test(t)) return "Keil MDK";
  if (/^vs\s*code$/i.test(t)) return "VS Code";
  if (/^蓝牙\s*ble$/i.test(t)) return "BLE";
  if (/^网络模组\s*cat1$/i.test(t)) return "CAT1";
  if (/^485$/i.test(t)) return "RS485";
  if (/^标准库\/hal库$/i.test(t) || /^hal库$/i.test(t)) return "STM32 HAL";
  if (/^word$/i.test(t)) return "Word";
  if (/^powerpoint$/i.test(t)) return "PowerPoint";
  if (/^μc\/os-ii$/i.test(t) || /^uc\/os-ii$/i.test(t)) return "μC/OS-II";

  if (/^[以通过针对采用使用针对]/.test(t)) return null;
  if (/[\u4e00-\u9fff]{4,}/.test(t) && /[的地了与着将]/.test(t)) return null;
  if (t.length >= 8 && /[\u4e00-\u9fff]/.test(t) && !/[A-Za-z]{2,}/.test(t)) {
    return null;
  }

  if (/[（(]/.test(t) && t.length > 16) return null;

  if (t.length >= 2 && t.length <= 20 && !/[，。；]/.test(t) && !/^(负责|通过|设计|开发)/.test(t)) {
    return t;
  }
  return null;
}

function extractSkillKeywordsFromText(raw: string): string[] {
  const line = stripBullet(cleanLine(raw));
  if (!line) return [];
  const found: string[] = [];

  if (isCommaSeparatedSkillList(line)) {
    for (const part of splitSkillBlob(line)) {
      const n = normalizeSkillToken(part);
      if (n) found.push(n);
    }
    return found;
  }

  if (SKILL_SOFT_LABEL_RE.test(line)) {
    return extractSoftSkillKeywords(line);
  }

  const labeled = line.match(
    /^(?:语言能力|办公工具|技术基础|核心能力|专业技能|技能)[:：]\s*(.+)$/i,
  );
  if (labeled?.[1]) {
    if (/^语言能力/i.test(line)) {
      if (/CET[-\s]?6/i.test(line)) found.push("CET-6");
      if (/CET[-\s]?4/i.test(line)) found.push("CET-4");
      if (/英语/i.test(line) && !found.includes("英语")) found.push("英语");
    }
    const toolPatterns = [
      /ProcessOn/gi,
      /Visio/gi,
      /Xmind/gi,
      /\bWord\b/gi,
      /Powerpoint/gi,
      /Matlab/gi,
      /Python/gi,
    ];
    for (const re of toolPatterns) {
      for (const m of line.matchAll(re)) {
        const n = normalizeSkillToken(m[0]);
        if (n) found.push(n);
      }
    }
    for (const part of splitSkillBlob(labeled[1])) {
      const n = normalizeSkillToken(part);
      if (n) found.push(n);
    }
    return found;
  }

  if (!isSkillProfileLine(line)) return found;

  const patterns = [
    /C\/C\+\+/gi,
    /TypeScript/gi,
    /Next\.js/gi,
    /LangChain/gi,
    /Prompt\s*Engineering/gi,
    /\bRAG\b/gi,
    /Tableau/gi,
    /Power\s*BI|PowerBI/gi,
    /Pandas/gi,
    /TensorFlow/gi,
    /sklearn/gi,
    /\bSQL\b/gi,
    /STM32(?:F\d+)?(?:\/F\d+)*/gi,
    /ESP32/gi,
    /μC\/OS-II|uC\/OS-II/gi,
    /FreeRTOS/gi,
    /Altium\s*Designer/gi,
    /嘉立创EDA/gi,
    /Keil\s*MDK/gi,
    /PlatformIO/gi,
    /VS\s*Code/gi,
    /MPU6050/gi,
    /GPS\+IMU|\bGPS\b|\bIMU\b/gi,
    /\bPID\b/gi,
    /VOFA\+/gi,
    /(?:USART|RS232|RS485|I2C|SPI|CAN|DMA|\bBLE\b|LoRa|WiFi|\bPython\b|Matlab|PLC|MCU|FPGA|Linux|Git)/gi,
    /NB[-\s]?IoT/gi,
    /CAT1/gi,
    /CET[-\s]?[46]/gi,
    /ProcessOn/gi,
    /Visio/gi,
    /Xmind/gi,
    /Jira/gi,
    /TC264|TC377|MSPM0/gi,
    /AI Agent/gi,
    /\bReact\b/gi,
  ];
  for (const re of patterns) {
    for (const m of line.matchAll(re)) {
      const n = normalizeSkillToken(m[0]);
      if (n) found.push(n);
    }
  }

  for (const m of line.matchAll(/(?:包括|如)[:：]?\s*([^。；]+)/g)) {
    for (const part of splitSkillBlob(m[1]!)) {
      const n = normalizeSkillToken(part);
      if (n) found.push(n);
    }
  }

  return found;
}

const SKILL_TAG_PRIORITY = [
  "C/C++",
  "STM32",
  "μC/OS-II",
  "FreeRTOS",
  "ESP32",
  "Matlab",
  "GPS",
  "IMU",
  "MPU6050",
  "PID",
  "CET-6",
  "CET-4",
  "英语",
  "ProcessOn",
  "Visio",
  "Xmind",
  "Word",
  "PowerPoint",
  "Altium Designer",
  "嘉立创EDA",
  "Keil MDK",
  "PlatformIO",
  "VS Code",
  "NB-IoT",
  "CAT1",
  "USART",
  "RS485",
  "I2C",
  "SPI",
  "BLE",
  "WiFi",
  "Python",
  "数据分析",
  "用户沟通",
  "跨团队协作",
  "智能硬件",
  "工具化思维",
];

function skillTagPriorityScore(tag: string): number {
  const lower = tag.toLowerCase();
  const idx = SKILL_TAG_PRIORITY.findIndex(
    (p) =>
      lower.includes(p.toLowerCase()) ||
      p.toLowerCase().includes(lower.replace(/\s/g, "")),
  );
  return idx === -1 ? 80 : idx;
}

function dedupeSkillTags(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of items) {
    if (/[（(]|插件开发环境|[)）]$/.test(s)) continue;
    if (/^会?使用/.test(s)) continue;
    if (/年\+|任职经历|留学经历|英文流利|分析师/.test(s)) continue;
    if (/直接面对|面向用户|做事严谨|性格开朗|协调软硬件/.test(s)) continue;
    if (
      /[\u4e00-\u9fff]/.test(s) &&
      !/[A-Za-z]/.test(s) &&
      s.length > 8 &&
      !/^(?:用户沟通|数据分析|跨团队协作|智能硬件|工具化思维|结果导向|英语)$/.test(s)
    ) {
      continue;
    }
    if (/^[以通过针对采用使用]/.test(s)) continue;
    if (/操作系统为导向|方案作为|GPS\+IMU方案/.test(s)) continue;
    if (/^(能够|可以|具备|了解)/.test(s)) continue;
    if (/^[\u4e00-\u9fff]+$/.test(s) && s.length > 8) continue;
    if (
      /[\u4e00-\u9fff]{3,}/.test(s) &&
      !/[A-Za-z0-9]/.test(s) &&
      (s.length > 8 || /[的地在了与将]/.test(s))
    ) {
      continue;
    }
    const key = s.toLowerCase().replace(/\s+/g, "");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out
    .sort((a, b) => skillTagPriorityScore(a) - skillTagPriorityScore(b))
    .slice(0, 12);
}

function coalesceSkillProfileLines(allLines: string[]): string[] {
  const out: string[] = [];
  for (const raw of allLines) {
    const line = raw.trim();
    if (!line) continue;
    if (isProjectOrWorkNarrativeLine(line)) continue;

    const isContinuation =
      out.length > 0 &&
      !isBullet(line) &&
      !DATE_RANGE_AT_START.test(line) &&
      !/^(?:教育背景|工作经历|实习经历|项目经验|项目经历|个人能力|自我评价|个人荣誉|奖项荣誉)/.test(
        cleanLine(line),
      ) &&
      !isSkillProfileLine(line) &&
      line.length <= 120 &&
      /^[a-zA-Z0-9（）)、，。；\u4e00-\u9fffμ]/.test(line) &&
      !/^(?:负责|完成|设计|开发|参与|项目概述|个人主要)/.test(
        stripBullet(cleanLine(line)),
      );

    if (isContinuation) {
      out[out.length - 1] = `${out[out.length - 1]!} ${line}`;
      continue;
    }

    if (isSkillProfileLine(line)) {
      out.push(line);
    }
  }
  return out;
}

function extractEmbeddedSkillProfileLines(allLines: string[]): string[] {
  const block: string[] = [];
  let inSkillsSection = false;

  for (const raw of allLines) {
    const t = cleanLine(raw);
    if (/^(?:个人能力|专业技能|核心技能|技能)$/.test(t)) {
      inSkillsSection = true;
      continue;
    }
    if (
      inSkillsSection &&
      /^(?:教育背景|工作经历|实习经历|项目经验|项目经历|奖项荣誉|个人荣誉|自我评价)/.test(
        t,
      )
    ) {
      break;
    }
    if (inSkillsSection) {
      block.push(raw);
      continue;
    }
    if (isSkillProfileLine(raw) && !isProjectOrWorkNarrativeLine(raw)) {
      block.push(raw);
    }
  }
  return coalesceSkillProfileLines(block);
}

/** 从个人简介 / 个人能力等章节提取关键词型技能标签 */
function parseSkillTags(
  sectionLines: string[],
  allLines: string[],
  sections: Record<string, string[]>,
): string[] {
  const skills: string[] = [];
  const summarySkillBlock = takeSummarySkillBlock(sections.summary ?? []);

  for (const raw of summarySkillBlock) {
    const line = stripBullet(cleanLine(raw));
    if (!line) continue;
    if (
      /^❖/.test(raw.trim()) ||
      SKILL_TOOL_LABEL_RE.test(line) ||
      SKILL_SOFT_LABEL_RE.test(line)
    ) {
      skills.push(...extractSkillKeywordsFromText(raw));
    }
  }

  for (const raw of takeIntroSkillLines(summarySkillBlock)) {
    skills.push(...extractSkillKeywordsFromText(raw));
  }

  for (const raw of sectionLines) {
    skills.push(...extractSkillKeywordsFromText(raw));
  }

  for (const raw of coalesceSkillProfileLines(sectionLines)) {
    skills.push(...extractSkillKeywordsFromText(raw));
  }

  for (const raw of extractEmbeddedSkillProfileLines(allLines)) {
    skills.push(...extractSkillKeywordsFromText(raw));
  }

  return dedupeSkillTags(skills);
}

function parseInlineHonors(lines: string[]): string[] {
  const honors: string[] = [];
  for (const raw of lines) {
    const line = cleanLine(raw);
    const m = line.match(/^个人荣誉[:：]\s*(.+)$/);
    if (!m?.[1]) continue;
    for (const part of m[1].split(/[、,，;；]/)) {
      const item = part.trim().replace(/[。．.]+$/g, "");
      if (item.length >= 2 && item.length <= 48) honors.push(item);
    }
  }
  return honors;
}

function dedupeStringList(items: string[]): string[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseAwardsBlock(lines: string[]): string[] {
  const raw: string[] = [];
  for (const line of lines) {
    const t = stripBullet(cleanLine(line));
    if (!t) continue;
    if (/^(?:奖项|荣誉)/i.test(t) && t.length < 10) continue;
    if (t.length < 2) continue;
    raw.push(t);
  }
  return normalizeAwardList(raw).slice(0, 12);
}

function isEducationLine(text: string): boolean {
  if (/大学|学院/i.test(text)) return true;
  if (/建筑电气与智能化|商务英语|自动化专业/.test(text)) return true;
  return (
    /本科|硕士|GPA|gpa/i.test(text) &&
    !/工程师|实习|支持|ELEGOO/i.test(text)
  );
}

function isWorkCompanyLine(text: string): boolean {
  return (
    /(?:有限公司|股份有限公司|集团有限公司|集团—|Corp|Inc|Ltd)/i.test(text) ||
    /（.*(?:500强|上市|TO\s*[BC]|港股).*/.test(text)
  );
}

function classifyEntryTitle(title: string): "work" | "project" {
  if (/项目负责人|项目负责/.test(title)) return "project";
  if (/大学|学院|本科|硕士|GPA|gpa/i.test(title) && !/公司|集团/.test(title)) {
    return "project";
  }
  if (isWorkCompanyLine(title)) return "work";
  if (
    /工程师|实习|支持|经理|主管|总监|专员|顾问|分析师|研究员|Developer|Engineer|Support|Analyst|Intern|ELEGOO|(?:有限|集团|Inc|Corp|Ltd|公司)(?!.*大学)/i.test(
      title,
    )
  ) {
    return "work";
  }
  return "project";
}

function splitTitleAndLocation(line: string): string {
  const parts = line
    .split(/\s{2,}|\t/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length >= 2 && parts[parts.length - 1]!.length <= 12) {
    return parts.slice(0, -1).join(" ");
  }
  return line.trim();
}

function isExperienceMetaLine(line: string): boolean {
  return /^(?:效率提升|客户体验|增长运营|专项分析|临时性|参与专项|负责所属|参与超市)/.test(
    line,
  );
}

function isValidExperience(e: ParsedExperience): boolean {
  const title = e.title?.trim() ?? "";
  const company = e.company?.trim() ?? "";
  if (!title && !company) return false;
  if (title === "项目负责人" || company === "项目负责人") return false;
  if (!title && /负责人/.test(company) && !/公司|有限公司/.test(company)) {
    return false;
  }
  if (/项目概述|个人主要|项目描述|项目经验|教育背景|工作能力|个人能力|本人性格/.test(
    `${title}${company}`,
  )) {
    return false;
  }
  if (title === company && !/公司|有限公司/.test(company)) {
    return false;
  }
  return true;
}

function isValidProjectTitle(title: string): boolean {
  const t = title.trim();
  if (t.length < 4 || t.length > 120) return false;
  if (
    /^(项目概述|个人主要工作|个人主要|项目描述|教育背景|工作能力|个人能力|本人性格|项目经验|个人荣誉|霍尔检测)/.test(
      t,
    )
  ) {
    return false;
  }
  if (/项目负责人/.test(t)) return false;
  if (/篮球队|球队成员|院队|校队|运动会|社团活动|学生工作/.test(t)) return false;
  if (/^建筑电气与智能化$/.test(t)) return false;
  if (/[。；]/.test(t) && t.length > 24) return false;
  if (/^[a-zA-Z0-9]{0,2}[\u4e00-\u9fff]{1,6}[。；]?$/.test(t)) return false;
  if (t.length < 8 && !/[基于|NB-IoT|ESP32|μC|红外|智能|主控|定位|电控|循迹|FM33|PIC24|TC264|STM32]/.test(t)) {
    return false;
  }
  return true;
}

function parseConcatenatedWorkLine(rawLine: string): ParsedExperience | null {
  const startMatch = rawLine.match(DATE_RANGE_AT_START);
  if (!startMatch) return null;
  const period = startMatch[1]!.trim();
  const rest = rawLine.slice(startMatch[0].length).trim();
  if (!rest || /项目负责人/.test(rest)) return null;

  const companyMatch = rest.match(
    /([\u4e00-\u9fff（）()A-Za-z0-9·\s-]+(?:有限公司|股份有限公司|公司|科技(?:有限公司)?))/,
  );
  if (companyMatch?.[1]) {
    const company = companyMatch[1].trim();
    const title = rest.slice(0, rest.indexOf(company)).trim();
    if (title && company) {
      return { title, company, period, keyResults: [] };
    }
  }

  if (/大学|学院|智能化|专业|本科/.test(rest) && !/公司/.test(rest)) return null;
  if (/工程师|实习生|主管|经理|助理|开发|销售|支持/.test(rest)) {
    return { title: rest, company: "", period, keyResults: [] };
  }
  return null;
}

function isInternshipTitle(title: string): boolean {
  return /实习|intern/i.test(title);
}

function experienceStartYear(period: string): number {
  const m = period.match(/(\d{4})/);
  return m ? parseInt(m[1]!, 10) : 0;
}

/** 将 PDF 中「个人主要工作 / xxx开发」等区块的要点挂到对应经历上 */
function attachExperienceBulletBlocks(
  allLines: string[],
  experience: ParsedExperience[],
): void {
  const fullTime = experience.filter((e) => !isInternshipTitle(e.title));
  const interns = [...experience.filter((e) => isInternshipTitle(e.title))].sort(
    (a, b) => experienceStartYear(a.period) - experienceStartYear(b.period),
  );

  let mode: "none" | "ft" | "intern" = "none";
  let internIdx = -1;

  const isInternProjectHeading = (line: string): boolean => {
    if (isBullet(line) || DATE_RANGE_AT_START.test(line)) return false;
    if (/^个人主要工作/.test(line)) return false;
    if (line.length > 72) return false;
    return /(?:开发|项目)[：:]\s*$/.test(line.replace(/\s+/g, "")) ||
      /(?:管理系统|充电桩|平台).+[：:]\s*$/.test(line);
  };

  for (const raw of allLines) {
    const line = raw.trim();
    if (!line) continue;

    if (/^个人主要工作[：:]/i.test(line)) {
      mode = "ft";
      continue;
    }

    if (isInternProjectHeading(line)) {
      if (mode === "intern") internIdx++;
      else {
        mode = "intern";
        internIdx = 0;
      }
      const intern = interns[internIdx];
      if (intern) {
        const heading = line.replace(/[：:]\s*$/, "").trim();
        if (heading && !intern.summary) intern.summary = heading;
      }
      continue;
    }

    if (
      mode !== "none" &&
      !isBullet(line) &&
      (DATE_RANGE_AT_START.test(line) ||
        /^(?:教育背景|工作经历|实习经历|项目经验|项目经历|个人能力|个人荣誉|自我评价)/.test(
          line,
        ) ||
        /^项目概述|^个人荣誉/.test(line))
    ) {
      mode = "none";
      internIdx = -1;
      continue;
    }

    if (!isBullet(line)) continue;

    const bullet = stripBullet(line);
    if (!bullet) continue;

    if (/^(熟练掌握|熟悉|精通)/.test(bullet)) {
      mode = "none";
      internIdx = -1;
      continue;
    }

    if (mode === "ft" && fullTime[0]) {
      fullTime[0].keyResults.push(bullet);
    } else if (mode === "intern" && internIdx >= 0 && interns[internIdx]) {
      interns[internIdx]!.keyResults.push(bullet);
    }
  }
}

function sortExperiencesForDisplay(items: ParsedExperience[]): ParsedExperience[] {
  return [...items].sort(
    (a, b) => experienceStartYear(b.period) - experienceStartYear(a.period),
  );
}

/** 解析「日期行 + 下一行公司/学校」型条目（常见于 PDF 提取） */
function parseMultilineCareerRecords(
  allLines: string[],
  campusOut: ParsedCampusActivity[] = [],
  courseOut: ParsedCourseNote[] = [],
): {
  education: ParsedEducation[];
  experience: ParsedExperience[];
} {
  const education: ParsedEducation[] = [];
  const experience: ParsedExperience[] = [];

  for (let i = 0; i < allLines.length; i++) {
    const raw = allLines[i]!.trim();
    if (!raw || isBullet(raw)) continue;

    const startMatch = raw.match(DATE_RANGE_AT_START);
    if (!startMatch || /项目负责人/.test(raw)) continue;

    const period = startMatch[1]!.trim();
    const rest = raw.slice(startMatch[0].length).trim();

    let j = i + 1;
    while (j < allLines.length && !allLines[j]!.trim()) j++;
    const next = j < allLines.length ? allLines[j]!.trim() : "";
    const nextIsContinuation =
      next &&
      !isBullet(next) &&
      !DATE_RANGE_AT_START.test(next) &&
      !/^(?:教育背景|工作经历|实习经历|项目经验|项目经历|个人能力|自我评价|在校经历|校园经历)/.test(
        next,
      ) &&
      !/项目概述|个人主要|项目描述|个人荣誉/.test(next) &&
      next.length <= 64;

    if (nextIsContinuation && /大学|学院/.test(next) && !/公司/.test(next)) {
      const degree =
        rest && !/本科|硕士|博士/.test(rest) ? `${rest} · 本科` : rest || "本科";
      if (isValidEducationEntry(next, degree)) {
        education.push({
          school: next,
          degree,
          period,
          highlights: [],
        });
      } else {
        routeNonEducationEntry(next, degree, period, campusOut, courseOut);
      }
      i = j;
      continue;
    }

    if (nextIsContinuation && /公司|有限公司|股份有限公司/.test(next)) {
      experience.push({
        title: rest,
        company: next,
        period,
        keyResults: [],
      });
      i = j;
      continue;
    }

    if (!rest.trim()) {
      const collected: string[] = [];
      let k = j;
      while (k < allLines.length && collected.length < 3) {
        const t = allLines[k]?.trim() ?? "";
        if (!t || isBullet(t) || DATE_RANGE_AT_START.test(t)) break;
        if (
          /^(?:教育背景|工作经历|实习经历|项目经验|项目经历|个人能力|自我评价|在校经历)/.test(
            t,
          )
        ) {
          break;
        }
        if (/^项目概述|^个人主要|^项目描述|^个人荣誉/.test(t)) break;
        collected.push(t);
        k++;
      }
      const companyLine = collected.find((l) => /公司|有限公司|股份有限公司/.test(l));
      const titleLine = collected.find(
        (l) =>
          l !== companyLine &&
          /工程师|实习|经理|主管|开发|设计|分析师|顾问|支持|专员|总监|技术/i.test(l),
      );
      if (companyLine && titleLine) {
        experience.push({
          title: titleLine,
          company: companyLine,
          period,
          keyResults: [],
        });
        i = k - 1;
        continue;
      }
      if (companyLine) {
        experience.push({
          title: rest || "职位",
          company: companyLine,
          period,
          keyResults: [],
        });
        i = k - 1;
        continue;
      }
    }

    const work = parseConcatenatedWorkLine(raw);
    if (work && isValidExperience(work)) {
      experience.push(work);
      continue;
    }

    if (rest && /公司/.test(rest)) {
      const { company, title } = splitCompanyAndTitle(rest);
      if (company && title) {
        experience.push({ title, company, period, keyResults: [] });
        continue;
      }
    }

    const eduTimed = parseEducationTimedLines([raw], campusOut, courseOut);
    if (eduTimed.length && /大学|学院/.test(rest)) {
      education.push(...eduTimed);
    }
  }

  return { education, experience };
}

type ProjectOverviewBlock = { overview: string; bullets: string[] };

function isProjectOverviewStart(line: string): boolean {
  return /^项目(?:概述|描述)[：:]/.test(line);
}

/** 扫描「项目概述/项目描述 + 个人主要工作 + 要点」（PDF 常出现在负责人行之前） */
function parseProjectOverviewBlocks(allLines: string[]): ProjectOverviewBlock[] {
  const blocks: ProjectOverviewBlock[] = [];

  const isSectionStop = (line: string) =>
    /^(?:项目经验|工作经历|实习经历|教育背景|自我评价|工作能力|个人能力|本人性格|个人荣誉)/.test(
      line,
    );
  const isLeaderLine = (line: string) =>
    DATE_RANGE_AT_START.test(line) && /项目负责人/.test(line);

  for (let i = 0; i < allLines.length; i++) {
    const raw = allLines[i]!.trim();
    if (!isProjectOverviewStart(raw)) continue;

    let overview = raw.replace(/^项目(?:概述|描述)[：:]\s*/, "").trim();
    i++;

    while (i < allLines.length) {
      const l = allLines[i]!.trim();
      if (!l) {
        i++;
        continue;
      }
      if (/^个人主要工作[：:]?/.test(l)) {
        i++;
        break;
      }
      if (isProjectOverviewStart(l) || isLeaderLine(l) || isSectionStop(l)) {
        i--;
        break;
      }
      if (isBullet(l)) {
        i--;
        break;
      }
      overview += l;
      i++;
    }

    const bullets: string[] = [];
    while (i < allLines.length) {
      const l = allLines[i]!.trim();
      if (!l) {
        i++;
        continue;
      }
      if (isProjectOverviewStart(l) || isLeaderLine(l) || isSectionStop(l)) {
        i--;
        break;
      }
      if (/^个人主要工作[：:]?/.test(l)) {
        i++;
        continue;
      }
      if (isBullet(l)) {
        bullets.push(stripBullet(l));
        i++;
        continue;
      }
      if (
        bullets.length > 0 &&
        !isProjectOverviewStart(l) &&
        !isLeaderLine(l) &&
        !isSectionStop(l) &&
        !/^个人主要工作/.test(l) &&
        l.length <= 120
      ) {
        bullets[bullets.length - 1] = `${bullets[bullets.length - 1]!}${l}`;
        i++;
        continue;
      }
      if (bullets.length > 0) {
        i--;
        break;
      }
      i++;
    }

    if (overview || bullets.length) {
      blocks.push({ overview: overview.trim(), bullets });
    }
  }

  return blocks;
}

function projectOverviewMatchScore(
  title: string,
  block: ProjectOverviewBlock,
): number {
  const text = `${block.overview} ${block.bullets.join(" ")}`;
  let score = 0;
  if (/民用/.test(title) && /民用/.test(text)) score += 4;
  if (/商用/.test(title) && /商用/.test(text)) score += 4;
  if (/FM33LG/i.test(title) && /FM33LG/i.test(text)) score += 5;
  if (/PIC24/i.test(title) && /PIC24/i.test(text)) score += 5;
  if (/ESP32/i.test(title) && /ESP32/i.test(text)) score += 5;
  if (/工装/.test(title) && /工装/.test(text)) score += 2;
  if (/NB-IoT/i.test(title) && /NB-IoT/i.test(text)) score += 1;
  const compactTitle = title.replace(/\s+/g, "").slice(0, 12);
  if (compactTitle.length >= 4 && text.replace(/\s+/g, "").includes(compactTitle)) {
    score += 3;
  }
  return score;
}

function applyProjectOverviewBlock(
  project: ParsedProject,
  block: ProjectOverviewBlock,
): void {
  if (block.overview && !project.description?.trim()) {
    project.description = block.overview;
  }
  if (block.bullets.length && !(project.bullets?.length ?? 0)) {
    project.bullets = block.bullets.slice(0, 12);
  }
}

/** 将概述块挂到「项目负责人」条目（按文档顺序或标题关键词匹配） */
function attachProjectOverviewBlocks(
  allLines: string[],
  projects: ParsedProject[],
): void {
  const blocks = parseProjectOverviewBlocks(allLines);
  if (!blocks.length || !projects.length) return;

  const unmatched = new Set(blocks.map((_, idx) => idx));

  if (blocks.length === projects.length) {
    for (let i = 0; i < projects.length; i++) {
      const project = projects[i]!;
      if ((project.bullets?.length ?? 0) > 0 && project.description?.trim()) {
        continue;
      }
      applyProjectOverviewBlock(project, blocks[i]!);
      unmatched.delete(i);
    }
    return;
  }

  for (const project of projects) {
    if ((project.bullets?.length ?? 0) > 0 && project.description?.trim()) {
      continue;
    }
    let bestIdx = -1;
    let bestScore = 0;
    for (const idx of unmatched) {
      const score = projectOverviewMatchScore(project.title, blocks[idx]!);
      if (score > bestScore) {
        bestScore = score;
        bestIdx = idx;
      }
    }
    if (bestIdx >= 0 && bestScore >= 3) {
      applyProjectOverviewBlock(project, blocks[bestIdx]!);
      unmatched.delete(bestIdx);
    }
  }

  const remainingProjects = projects.filter(
    (p) => !(p.bullets?.length ?? 0) || !p.description?.trim(),
  );
  const remainingBlocks = [...unmatched]
    .sort((a, b) => a - b)
    .map((idx) => blocks[idx]!);
  for (let i = 0; i < remainingProjects.length && i < remainingBlocks.length; i++) {
    applyProjectOverviewBlock(remainingProjects[i]!, remainingBlocks[i]!);
  }
}

/** 解析「日期 + 项目负责人 + 下一行项目名」 */
function parseProjectLeaderEntries(allLines: string[]): ParsedProject[] {
  const projects: ParsedProject[] = [];

  for (let i = 0; i < allLines.length; i++) {
    const raw = allLines[i]!.trim();
    if (!/项目负责人/.test(raw)) continue;

    const startMatch = raw.match(DATE_RANGE_AT_START);
    if (!startMatch) continue;

    const period = startMatch[1]!.trim();
    let title = raw
      .slice(startMatch[0].length)
      .replace(/项目负责人/g, "")
      .trim();

    if (title.length < 4) {
      let j = i + 1;
      while (j < allLines.length && !allLines[j]!.trim()) j++;
      if (j < allLines.length) {
        const next = allLines[j]!.trim();
        if (
          !isBullet(next) &&
          !/项目负责人|项目概述|个人主要|教育背景|工作经历|自我评价|项目经验/.test(
            next,
          ) &&
          next.length >= 4 &&
          next.length <= 80
        ) {
          title = next;
          i = j;
        }
      }
    }

    if (!isValidProjectTitle(title)) continue;

    const bullets: string[] = [];
    for (let k = i + 1; k < allLines.length; k++) {
      const follow = allLines[k]!.trim();
      if (!follow) continue;
      if (DATE_RANGE_AT_START.test(follow) && /项目负责人/.test(follow)) break;
      if (/^(?:项目经验|工作经历|实习经历|教育背景|自我评价)/.test(follow)) break;
      if (isBullet(follow)) {
        bullets.push(stripBullet(follow));
        continue;
      }
      if (/^项目概述|^个人主要|^项目描述/.test(follow)) break;
      break;
    }

    projects.push({
      title,
      period,
      role: "项目负责人",
      description: undefined,
      bullets,
    });
  }

  return projects;
}

type TimedEntry = {
  title: string;
  period: string;
  company?: string;
  role?: string;
  bullets: string[];
  kind: "work" | "project";
};

/** 扫描全文：识别「标题 + 日期」型条目（常见于学生简历） */
function scanTimedEntries(allLines: string[]): TimedEntry[] {
  const entries: TimedEntry[] = [];
  let current: TimedEntry | null = null;

  const flush = () => {
    if (current && current.title) entries.push(current);
    current = null;
  };

  for (const raw of allLines) {
    const rawLine = raw.trim();
    if (!rawLine) continue;
    const line = cleanLine(rawLine);

    if (
      /^(?:个人简介|工作经历|实习经历|项目经历|教育背景|教育经历|志愿服务经历|奖项荣誉|自我评价|专业技能)$/i.test(
        line,
      )
    ) {
      flush();
      continue;
    }

    if (isBullet(line)) {
      if (current) current.bullets.push(stripBullet(line));
      continue;
    }

    let period = "";
    let titlePart = rawLine;

    const startMatch = rawLine.match(DATE_RANGE_AT_START);
    if (startMatch) {
      period = (startMatch[1] ?? startMatch[0]).trim();
      titlePart = rawLine.slice(startMatch[0].length).trim();
    } else {
      const endMatch = rawLine.match(DATE_RANGE_AT_END);
      if (endMatch) {
        period = (endMatch[1] ?? "").trim();
        titlePart = rawLine.slice(0, endMatch.index).trim();
      }
    }

    if (period && titlePart.length >= 2) {
      if (isEducationLine(titlePart)) continue;
      flush();
      const kind = classifyEntryTitle(titlePart);
      const { company, title } = splitCompanyAndTitle(titlePart);

      if (kind === "work") {
        current = {
          title: title || titlePart,
          company: company || "",
          period,
          bullets: [],
          kind: "work",
        };
      } else {
        const projectTitle =
          /项目负责人/.test(titlePart) ? "" : titlePart.replace(/\s+/g, " ");
        if (/项目负责人/.test(titlePart) && !projectTitle) {
          flush();
          current = {
            title: "项目负责人",
            period,
            bullets: [],
            kind: "project",
          };
        } else {
          const resolvedTitle = projectTitle || titlePart.replace(/\s+/g, " ");
          if (
            isCampusActivityNotProject({
              title: resolvedTitle,
              period,
              bullets: [],
            })
          ) {
            flush();
            continue;
          }
          current = {
            title: resolvedTitle,
            period,
            bullets: [],
            kind: "project",
          };
        }
      }
      continue;
    }

    if (current && !isBullet(line)) {
      if (
        current.kind === "project" &&
        current.title === "项目负责人" &&
        !DATE_RANGE_AT_START.test(line) &&
        line.length >= 4 &&
        line.length <= 80 &&
        !/项目概述|个人主要|教育背景|工作经历/.test(line)
      ) {
        current.title = line;
        continue;
      }
      if (
        /(?:有限公司|股份有限公司|公司)$/.test(line) &&
        current.kind === "work" &&
        !current.company
      ) {
        current.company = line;
        continue;
      }
      if (current.kind === "project") {
        const endDateOnLine = rawLine.match(DATE_RANGE_AT_END);
        const wouldStartNewProject =
          Boolean(endDateOnLine) &&
          isProjectAnchorTitle(
            rawLine.slice(0, endDateOnLine!.index).trim(),
          );
        const isSectionStop =
          /^(?:奖项荣誉|自我评价|专业技能|教育背景|工作经历|实习经历|项目经历|个人简介)/.test(
            line,
          );
        if (!wouldStartNewProject && !isSectionStop && line.length > 6) {
          if (shouldMergeBulletContinuation(rawLine, current.bullets, "project")) {
            appendBulletContinuation(current.bullets, rawLine);
          } else if (!isProjectAnchorTitle(rawLine)) {
            current.bullets.push(stripBullet(line));
          }
          continue;
        }
      }
      if (current.bullets.length === 0 && line.length > 8) {
        current.bullets.push(line);
      }
    }
  }
  flush();
  return entries;
}

function parseExperienceBlock(lines: string[]): ParsedExperience[] {
  const items: ParsedExperience[] = [];
  let current: ParsedExperience | null = null;

  const flush = () => {
    if (current && (current.title || current.company)) items.push(current);
    current = null;
  };

  for (const raw of lines) {
    const rawLine = raw.trim();
    if (!rawLine) continue;
    const line = cleanLine(rawLine);

    if (shouldMergeBulletContinuation(rawLine, current?.keyResults)) {
      if (!current) current = { title: "", company: "", period: "", keyResults: [] };
      appendBulletContinuation(current.keyResults, rawLine);
      continue;
    }

    if (isBullet(line)) {
      if (!current) current = { title: "", company: "", period: "", keyResults: [] };
      current.keyResults.push(stripBullet(line));
      continue;
    }

    const startMatch = rawLine.match(DATE_RANGE_AT_START);
    if (startMatch) {
      flush();
      const period = (startMatch[1] ?? startMatch[0]).trim();
      const rest = rawLine.slice(startMatch[0].length).trim();
      const { company, title } = splitCompanyAndTitle(rest);
      current = { title, company, period, keyResults: [] };
      continue;
    }

    const endMatch = rawLine.match(DATE_RANGE_AT_END);
    if (endMatch && (classifyEntryTitle(rawLine) === "work" || isWorkCompanyLine(rawLine))) {
      flush();
      const period = endMatch[1]!.trim();
      const rest = rawLine.slice(0, endMatch.index).trim();
      current = {
        title: "",
        company: rest,
        period,
        keyResults: [],
      };
      continue;
    }

    if (
      current &&
      !current.title?.trim() &&
      current.company?.trim() &&
      !DATE_RANGE_AT_START.test(rawLine) &&
      !DATE_RANGE_AT_END.test(rawLine) &&
      !isEducationLine(rawLine) &&
      line.length >= 2 &&
      line.length <= 96
    ) {
      current.title = splitTitleAndLocation(rawLine);
      continue;
    }

    if (
      current &&
      current.keyResults.length === 0 &&
      isExperienceMetaLine(line) &&
      line.length <= 48
    ) {
      current.keyResults.push(line);
      continue;
    }
  }
  flush();
  return items.filter((e) => e.title || e.company);
}

/** 解析「项目名 + 行尾日期 + 要点」型项目区块 */
function parseProjectBlock(lines: string[]): ParsedProject[] {
  const items: ParsedProject[] = [];
  let current: ParsedProject | null = null;

  const flush = () => {
    if (current?.title?.trim()) {
      items.push({
        title: current.title.trim(),
        period: current.period?.trim() || undefined,
        role: current.role ?? "项目成员",
        description: current.description,
        bullets: (current.bullets ?? []).slice(0, 12),
      });
    }
    current = null;
  };

  for (const raw of lines) {
    const rawLine = raw.trim();
    if (!rawLine) continue;
    const line = cleanLine(rawLine);

    if (shouldMergeBulletContinuation(rawLine, current?.bullets, "project")) {
      if (!current) current = { title: "", bullets: [] };
      current.bullets = current.bullets ?? [];
      appendBulletContinuation(current.bullets, rawLine);
      continue;
    }

    if (isBullet(line)) {
      if (!current) current = { title: "", bullets: [] };
      current.bullets = current.bullets ?? [];
      current.bullets.push(stripBullet(line));
      continue;
    }

    const endMatch = rawLine.match(DATE_RANGE_AT_END);
    if (endMatch) {
      flush();
      const period = endMatch[1]!.trim();
      const title = rawLine.slice(0, endMatch.index).trim();
      if (title.length >= 4 && !isEducationLine(title)) {
        current = { title, period, role: "项目成员", bullets: [] };
      }
      continue;
    }

    if (isProjectTitleOnlyLine(rawLine)) {
      flush();
      current = { title: line, role: "项目成员", bullets: [] };
      continue;
    }

    const startMatch = rawLine.match(DATE_RANGE_AT_START);
    if (startMatch) {
      flush();
      const period = (startMatch[1] ?? startMatch[0]).trim();
      const rest = rawLine.slice(startMatch[0].length).trim();
      if (rest.length >= 4 && isValidProjectTitle(rest)) {
        current = { title: rest, period, role: "项目成员", bullets: [] };
      }
      continue;
    }
  }
  flush();
  return items.filter((p) => isValidProjectTitle(p.title));
}

type ParsedCampusActivity = {
  school: string;
  period: string;
  role: string;
  bullets: string[];
};
type ParsedCourseNote = { school: string; period: string; text: string };

function stripDegreeLevel(degree: string): string {
  return degree.replace(/\s*·\s*(本科|硕士|博士|专科|学士)\s*$/, "").trim();
}

const CAMPUS_ROLE_RE =
  /(?:学生会|社联|社团|协会|志愿者|国际处|校区办公室|学生处|团委|宣传部|组织部|文艺部|体育部|班(?:长|委|主任))|(?:副?(?:主席|会长|部长)|主席|干事|助理|负责人)(?:[（(]|$)|(?:接待|办公室)(?:助理|干事)|(?:校区|国际处)/;

function isCampusRoleText(text: string): boolean {
  const t = stripDegreeLevel(text).trim();
  if (!t || t.length > 48) return false;
  if (/^(?:本科|硕士|博士|专科|学士)$/.test(t)) return false;
  if (CAMPUS_ROLE_RE.test(t)) return true;
  if (
    t.length <= 24 &&
    /(?:助理|干事|部长|主席|会长|副会长|负责人|成员)$/.test(t) &&
    !/(?:学|工程|管理|营销|英语|会计|金融|计算机|法学|医学|设计|艺术|教育|市场|贸易|经济)/.test(
      t,
    )
  ) {
    return true;
  }
  return false;
}

function isCourseListText(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (/等相关课程/.test(t)) return true;
  if (/^主修课程[:：]/.test(t)) return true;
  const commaCount = (t.match(/、|,/g) ?? []).length;
  if (commaCount >= 3 && t.length >= 24) return true;
  return false;
}

function isValidEducationEntry(school: string, degree: string): boolean {
  if (!school?.trim()) return false;
  if (!looksLikeSchoolName(school)) return false;
  const major = stripDegreeLevel(degree);
  if (isCourseListText(major) || isCourseListText(school)) return false;
  if (isCampusRoleText(major) || isCampusRoleText(degree)) return false;
  return Boolean(major || /本科|硕士|博士|专科|学士/.test(degree));
}

function schoolsMatch(a: string, b: string): boolean {
  const na = a.replace(/\s/g, "");
  const nb = b.replace(/\s/g, "");
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

function findMatchingEducation(
  items: ParsedEducation[],
  school: string,
): ParsedEducation | undefined {
  return items.find((e) => schoolsMatch(e.school, school));
}

function normalizePeriod(period: string): string {
  return period.replace(/\s/g, "").replace(/[–—~至到]/g, "-");
}

function tryParseCampusHeaderLine(
  line: string,
): { school: string; role: string; period: string } | null {
  const parsed = parseTimedEducationLikeLine(line);
  if (!parsed) return null;
  const role = stripDegreeLevel(parsed.degree);
  if (!isCampusRoleText(role) || !looksLikeSchoolName(parsed.school)) return null;
  return { school: parsed.school, role, period: parsed.period };
}

/** 将校园经历章节中职务标题后的描述段落挂接到对应条目 */
function attachCampusActivityBullets(
  allLines: string[],
  campus: ParsedCampusActivity[],
): void {
  if (!campus.length) return;

  let inCampus = false;
  let activeIdx = -1;
  let buffer = "";

  const flushBuffer = () => {
    if (activeIdx >= 0 && buffer.trim()) {
      const text = cleanLine(buffer);
      if (text) campus[activeIdx]!.bullets.push(text);
      buffer = "";
    }
  };

  const findCampusIndex = (header: {
    school: string;
    role: string;
    period: string;
  }) =>
    campus.findIndex(
      (a) =>
        schoolsMatch(a.school, header.school) &&
        a.role === header.role &&
        normalizePeriod(a.period) === normalizePeriod(header.period),
    );

  for (const raw of allLines) {
    const line = raw.trim();
    if (!line) continue;
    const cleaned = cleanLine(line);

    if (/^(?:校园经历|在校经历|学生工作|校内经历)$/i.test(cleaned)) {
      inCampus = true;
      continue;
    }

    if (
      inCampus &&
      /^(?:荣誉证书|荣誉奖项|获奖情况|自我评价|个人评价|实习经历|工作经历|项目经历|志愿服务|教育经历|教育背景)/i.test(
        cleaned,
      )
    ) {
      flushBuffer();
      inCampus = false;
      activeIdx = -1;
      continue;
    }

    if (!inCampus) continue;

    const header = tryParseCampusHeaderLine(line);
    if (header) {
      flushBuffer();
      activeIdx = findCampusIndex(header);
      continue;
    }

    if (activeIdx < 0) continue;

    if (isBullet(line)) {
      flushBuffer();
      campus[activeIdx]!.bullets.push(stripBullet(line));
      continue;
    }

    buffer += (buffer ? " " : "") + line;
    if (/[；;。.!！?？]$/.test(line.trim())) {
      flushBuffer();
    }
  }
  flushBuffer();
}

function routeNonEducationEntry(
  school: string,
  degree: string,
  period: string,
  campusOut: ParsedCampusActivity[],
  courseOut: ParsedCourseNote[],
): void {
  const major = stripDegreeLevel(degree);

  if (isCampusRoleText(major) && looksLikeSchoolName(school)) {
    campusOut.push({ school, period, role: major, bullets: [] });
    return;
  }

  if (isCourseListText(major)) {
    courseOut.push({ school, period, text: major });
    return;
  }

  if (isCourseListText(school)) {
    const merged =
      splitSchoolMajorBlob(major) ?? splitSchoolAndMajor(major);
    const targetSchool = looksLikeSchoolName(merged.school)
      ? merged.school
      : school;
    if (looksLikeSchoolName(targetSchool)) {
      courseOut.push({ school: targetSchool, period, text: school });
    }
  }
}

function mergeCampusAndCoursesIntoEducation(
  education: ParsedEducation[],
  campus: ParsedCampusActivity[],
  courses: ParsedCourseNote[],
): ParsedEducation[] {
  const result = education.map((e) => ({
    ...e,
    highlights: [...e.highlights],
    campusExperiences: [...(e.campusExperiences ?? [])],
  }));

  for (const act of campus) {
    const edu = findMatchingEducation(result, act.school);
    if (!edu) continue;
    const existing = edu.campusExperiences!.find(
      (c) =>
        c.role === act.role &&
        normalizePeriod(c.period) === normalizePeriod(act.period),
    );
    if (existing) {
      for (const b of act.bullets) {
        if (!existing.bullets.includes(b)) existing.bullets.push(b);
      }
    } else {
      edu.campusExperiences!.push({
        role: act.role,
        period: act.period,
        bullets: [...act.bullets],
      });
    }
  }

  for (const course of courses) {
    const edu = findMatchingEducation(result, course.school);
    const text = course.text.replace(/^主修课程[:：]\s*/, "");
    const bullet = `主修课程：${text}`;
    if (edu && !edu.highlights.some((h) => h.startsWith("主修课程"))) {
      edu.highlights.unshift(bullet);
    }
  }

  return result;
}

function dedupeCampusActivities(
  items: ParsedCampusActivity[],
): ParsedCampusActivity[] {
  const byKey = new Map<string, ParsedCampusActivity>();
  for (const a of items) {
    const key = `${a.school}|${a.role}|${normalizePeriod(a.period)}`;
    const existing = byKey.get(key);
    if (existing) {
      for (const b of a.bullets) {
        if (!existing.bullets.includes(b)) existing.bullets.push(b);
      }
    } else {
      byKey.set(key, { ...a, bullets: [...a.bullets] });
    }
  }
  return [...byKey.values()];
}

function dedupeCourseNotes(items: ParsedCourseNote[]): ParsedCourseNote[] {
  const seen = new Set<string>();
  return items.filter((c) => {
    const key = `${c.school}|${c.text}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseTimedEducationLikeLine(
  rawLine: string,
): { school: string; degree: string; period: string } | null {
  const trimmed = rawLine.trim();
  if (!trimmed) return null;
  if (/^(?:教育背景|教育经历|学历)$/i.test(cleanLine(trimmed))) return null;

  let period = "";
  let rest = trimmed;
  const startMatch = trimmed.match(DATE_RANGE_AT_START);
  const endMatch = trimmed.match(DATE_RANGE_AT_END);

  if (startMatch) {
    period = startMatch[1]!.trim();
    rest = trimmed.slice(startMatch[0].length).trim();
  } else if (endMatch) {
    period = endMatch[1]!.trim();
    rest = trimmed.slice(0, endMatch.index).trim();
  } else {
    return null;
  }

  if (!/大学|学院|本科|硕士|商务|市场|英语|marketing|english/i.test(rest)) return null;
  if (
    /公司|销售|助理|施工|工程师|NeXT|有限|集团/i.test(rest) &&
    !/大学|学院/.test(rest)
  ) {
    return null;
  }

  const { school, degree } = splitSchoolAndMajor(rest);
  if (!school) return null;
  return { school, degree, period };
}

function looksLikeSchoolName(text: string): boolean {
  const t = text.trim();
  if (!t || isCourseListText(t)) return false;
  return (
    /(?:大学|学院|University|College)$/i.test(t) ||
    /^[\u4e00-\u9fffA-Za-z0-9（）()·\-\s]{2,48}(?:大学|学院)/i.test(t)
  );
}

function splitSchoolAndMajor(block: string): { school: string; degree: string } {
  const trimmed = block.trim();
  const parts = trimmed
    .split(/\s{2,}|\t|[|｜/]/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    const schoolPart =
      parts.find((p) => looksLikeSchoolName(p)) ?? parts[0]!;
    const majorPart =
      parts.find(
        (p) =>
          p !== schoolPart &&
          !isCourseListText(p) &&
          !/^\d{4}/.test(p) &&
          !looksLikeSchoolName(p),
      ) ??
      parts.find((p) => p !== schoolPart && !isCourseListText(p)) ??
      "";

    let degree = majorPart.trim();
    if (degree && !/本科|硕士|博士|专科|学士/.test(degree)) {
      degree = `${degree} · 本科`;
    } else if (!degree) {
      degree = "本科";
    }

    return { school: schoolPart.trim(), degree };
  }

  const blobSplit = splitSchoolMajorBlob(trimmed);
  if (blobSplit) {
    let degree = blobSplit.major;
    if (degree && !/本科|硕士|博士|专科|学士/.test(degree)) {
      degree = `${degree} · 本科`;
    } else if (!degree) {
      degree = "本科";
    }
    return { school: blobSplit.school, degree };
  }

  const schoolPart =
    parts.find((p) => looksLikeSchoolName(p)) ??
    (parts.length >= 1 ? parts[0]! : "");
  let degree = "本科";

  return { school: schoolPart.trim(), degree };
}

function extractCourseListPart(block: string): string | undefined {
  const parts = block
    .trim()
    .split(/\s{2,}|\t|[|｜/]/)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.find(isCourseListText);
}

function parseEducationDetailLine(rawLine: string): {
  degree: string;
  highlights: string[];
} | null {
  const line = cleanLine(rawLine);
  if (!line) return null;
  if (
    !/^专业[-—：:\s]|本科|硕士|博士|专科|学士|GPA|gpa/i.test(line) ||
    DATE_RANGE_AT_START.test(rawLine) ||
    DATE_RANGE_AT_END.test(rawLine)
  ) {
    return null;
  }

  const parts = rawLine
    .split(/\s{2,}|\t/)
    .map((p) => p.trim())
    .filter(Boolean);
  let text = (parts[0] ?? line).replace(/^专业[-—：:\s]+/, "").trim();
  const highlights: string[] = [];

  const gpaMatch = text.match(/(?:\(?GPA[:：]?\s*[^)）]+(?:\/\d+\.?\d*)?\)?)/i);
  if (gpaMatch) {
    highlights.push(gpaMatch[0].replace(/^[（(]|[)）]$/g, "").trim());
    text = text.replace(gpaMatch[0], "").trim();
  }

  const honorMatch = text.match(/[：:]\s*(\d{4}[-–—~至到]+\d{4}年[^|｜]+(?:\|[^|｜]+)*)/);
  if (honorMatch) {
    highlights.push(honorMatch[1]!.trim());
    text = text.replace(honorMatch[0], "").trim();
  }

  text = text.replace(/[：:]\s*$/, "").trim();
  if (!text) return null;

  let degree = text;
  if (!/本科|硕士|博士|专科|学士/.test(degree)) {
    degree = `${degree} · 本科`;
  }

  return { degree, highlights };
}

/** 解析「日期 + 学校 + 专业」型教育条目（常见于中文简历） */
function parseEducationTimedLines(
  lines: string[],
  campusOut: ParsedCampusActivity[] = [],
  courseOut: ParsedCourseNote[] = [],
): ParsedEducation[] {
  const items: ParsedEducation[] = [];
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]!;
    const parsed = parseTimedEducationLikeLine(raw);
    if (!parsed) continue;
    let { school, degree, period } = parsed;
    const highlights: string[] = [];

    const nextRaw = lines[i + 1]?.trim() ?? "";
    const detail = nextRaw ? parseEducationDetailLine(nextRaw) : null;
    if (detail) {
      degree = detail.degree;
      highlights.push(...detail.highlights);
      i++;
    }

    const startMatch = raw.trim().match(DATE_RANGE_AT_START);
    const restAfterDate = startMatch
      ? raw.trim().slice(startMatch[0].length).trim()
      : raw.trim();
    const coursePart = extractCourseListPart(restAfterDate);

    if (coursePart && isValidEducationEntry(school, degree)) {
      courseOut.push({ school, period, text: coursePart });
      continue;
    }

    if (isValidEducationEntry(school, degree)) {
      items.push({ school, degree, period, highlights });
    } else {
      routeNonEducationEntry(school, degree, period, campusOut, courseOut);
    }
  }
  return items;
}

function parseEducationBlock(
  lines: string[],
  campusOut: ParsedCampusActivity[] = [],
  courseOut: ParsedCourseNote[] = [],
): ParsedEducation[] {
  const timed = parseEducationTimedLines(lines, campusOut, courseOut);
  if (timed.length) return timed;

  const items: ParsedEducation[] = [];
  let lastSchool = "";
  for (const raw of lines) {
    const line = cleanLine(raw);
    if (isCourseListText(line)) {
      const text = line.replace(/^主修课程[:：]\s*/, "");
      if (lastSchool) {
        courseOut.push({ school: lastSchool, period: "", text });
      }
      continue;
    }
    if (!/大学|学院|本科|硕士|博士/i.test(line)) continue;
    const periodMatch = line.match(
      /(\d{4}[.\/年-]\d{1,2}(?:[.\/月-]?\d{0,2})?\s*[-–—~至到]+\s*\d{4}[.\/年-]?\d{0,2}(?:[.\/月-]?\d{0,2})?)/,
    );
    const withoutPeriod = line.replace(periodMatch?.[0] ?? "", "").trim();
    const { school, degree } = splitSchoolAndMajor(withoutPeriod || line);
    if (isValidEducationEntry(school, degree)) {
      items.push({
        school: school || "学校",
        degree,
        period: periodMatch?.[1]?.trim() ?? "",
        highlights: [],
      });
      lastSchool = school;
    } else {
      routeNonEducationEntry(
        school,
        degree,
        periodMatch?.[1]?.trim() ?? "",
        campusOut,
        courseOut,
      );
    }
  }
  return items;
}

function buildTagline(
  selfEval: string[],
  targetRole?: string,
  school?: string,
  major?: string,
): string | undefined {
  if (selfEval.length) {
    const first = selfEval[0]!;
    if (first.length <= 120) return first;
    return `${first.slice(0, 117)}…`;
  }
  if (school && major) {
    return `${school}${major}背景${targetRole ? `，意向${targetRole}` : ""}。`.slice(
      0,
      120,
    );
  }
  return undefined;
}

function dedupeExperiences(items: ParsedExperience[]): ParsedExperience[] {
  const normalized = items.map((e) => {
    const copy = { ...e, keyResults: [...e.keyResults] };
    if (!copy.company?.trim() && /公司/.test(copy.title)) {
      const { company, title } = splitCompanyAndTitle(copy.title);
      if (company) {
        copy.company = company;
        copy.title = title;
      }
    }
    if (!copy.company?.trim() && /\s{2,}/.test(copy.title)) {
      const parts = copy.title
        .split(/\s{2,}/)
        .map((p) => p.trim())
        .filter(Boolean);
      if (parts.length >= 2) {
        copy.company = parts[0]!;
        copy.title = parts.slice(1).join(" ");
      }
    }
    return copy;
  });

  const out: ParsedExperience[] = [];
  for (const e of normalized) {
    if (!isValidExperience(e)) continue;

    const dupIdx = out.findIndex((x) => {
      if (x.period.replace(/\s/g, "") !== e.period.replace(/\s/g, "")) return false;
      const a = `${x.title}${x.company}`.replace(/\s/g, "");
      const b = `${e.title}${e.company}`.replace(/\s/g, "");
      return a === b || a.includes(b) || b.includes(a);
    });

    if (dupIdx === -1) {
      out.push(e);
      continue;
    }

    const dup = out[dupIdx]!;
    if (!dup.company && e.company) dup.company = e.company;
    if (!dup.title && e.title) dup.title = e.title;
    if (e.keyResults.length > dup.keyResults.length) {
      dup.keyResults = e.keyResults;
    }
  }
  return out;
}

function dedupeEducation(items: ParsedEducation[]): ParsedEducation[] {
  const byKey = new Map<string, ParsedEducation>();
  for (const e of items) {
    if (!isValidEducationEntry(e.school, e.degree)) continue;
    const key = `${e.school.replace(/\s/g, "")}|${stripDegreeLevel(e.degree)}|${e.period}`;
    const existing = byKey.get(key);
    if (existing) {
      if (!existing.campusExperiences) existing.campusExperiences = [];
      for (const h of e.highlights) {
        if (!existing.highlights.includes(h)) existing.highlights.push(h);
      }
      for (const c of e.campusExperiences ?? []) {
        const match = existing.campusExperiences!.find(
          (x) =>
            x.role === c.role &&
            normalizePeriod(x.period) === normalizePeriod(c.period),
        );
        if (match) {
          for (const b of c.bullets) {
            if (!match.bullets.includes(b)) match.bullets.push(b);
          }
        } else {
          existing.campusExperiences!.push({ ...c, bullets: [...c.bullets] });
        }
      }
    } else {
      byKey.set(key, {
        ...e,
        highlights: [...e.highlights],
        campusExperiences: (e.campusExperiences ?? []).map((c) => ({
          ...c,
          bullets: [...c.bullets],
        })),
      });
    }
  }
  return [...byKey.values()];
}

function collectCampusAndCourseFromAllLines(lines: string[]): {
  campus: ParsedCampusActivity[];
  courses: ParsedCourseNote[];
} {
  const campus: ParsedCampusActivity[] = [];
  const courses: ParsedCourseNote[] = [];
  for (const raw of lines) {
    const parsed = parseTimedEducationLikeLine(raw);
    if (!parsed) continue;
    const { school, degree, period } = parsed;
    if (isValidEducationEntry(school, degree)) continue;
    routeNonEducationEntry(school, degree, period, campus, courses);
  }
  return { campus, courses };
}

function dedupeProjects(items: ParsedProject[]): ParsedProject[] {
  const order: string[] = [];
  const byTitle = new Map<string, ParsedProject>();
  const richness = (p: ParsedProject) =>
    (p.bullets?.length ?? 0) * 2 +
    (p.description?.trim() ? 1 : 0) +
    (/项目负责人|项目负责/.test(p.role ?? "") ? 4 : 0);

  for (const p of items) {
    const key = p.title.trim();
    if (!key) continue;
    const existing = byTitle.get(key);
    if (!existing) {
      order.push(key);
      byTitle.set(key, p);
      continue;
    }
    if (richness(p) > richness(existing)) {
      byTitle.set(key, p);
    }
  }

  return order.map((key) => byTitle.get(key)!);
}

export function parseResumeHeuristic(rawText: string): {
  parsed: ParsedResume;
  confidence: number;
  warnings: string[];
} {
  const text = rawText.replace(/\r\n/g, "\n");
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const sections = splitSections(lines);

  const headerLines = sections.body?.slice(0, 5) ?? lines.slice(0, 5);
  const contacts = extractContactsFromText(text);

  const summaryLines = [
    ...(sections.summary ?? []),
    ...(sections.body ?? []).filter((l) =>
      /大学|学院|本科|GPA|语言|工具|能力/i.test(l),
    ),
  ];

  const awards = dedupeStringList([
    ...parseAwardsBlock(sections.awards ?? []),
    ...parseInlineHonors(lines),
  ]);
  const selfEval = (sections.selfEval ?? []).map(stripBullet).filter(Boolean);
  const summarySectionLines = (sections.summary ?? []).map(stripBullet).filter(Boolean);
  const skillTags = parseSkillTags(
    sections.skills ?? [],
    lines,
    sections,
  );

  const campusActivities: ParsedCampusActivity[] = [];
  const courseNotes: ParsedCourseNote[] = [];

  let education = parseEducationBlock(
    sections.education ?? [],
    campusActivities,
    courseNotes,
  );
  const multilineCareer = parseMultilineCareerRecords(
    lines,
    campusActivities,
    courseNotes,
  );
  if (!education.length) {
    education = parseEducationFromProfile(summaryLines);
  }
  if (sections.campus?.length) {
    parseEducationTimedLines(
      sections.campus,
      campusActivities,
      courseNotes,
    );
  }

  const scannedSide = collectCampusAndCourseFromAllLines(lines);
  campusActivities.push(...scannedSide.campus);
  courseNotes.push(...scannedSide.courses);

  education = dedupeEducation([
    ...education,
    ...multilineCareer.education,
  ]);

  attachCampusActivityBullets(lines, campusActivities);

  education = mergeCampusAndCoursesIntoEducation(
    education,
    dedupeCampusActivities(campusActivities),
    dedupeCourseNotes(courseNotes),
  );

  const timedEntries = scanTimedEntries(lines);
  const scannedWork = timedEntries
    .filter((e) => e.kind === "work")
    .map(
      (e): ParsedExperience => ({
        title: e.title,
        company: e.company ?? "",
        period: e.period,
        keyResults: e.bullets.length ? e.bullets : [],
        summary: undefined,
      }),
    )
    .filter(isValidExperience);

  const sectionWork = parseExperienceBlock(sections.experience ?? []);
  const sectionIntern = parseExperienceBlock(sections.internship ?? []);
  let experience = dedupeExperiences([
    ...sectionWork,
    ...sectionIntern,
    ...multilineCareer.experience,
    ...(sectionWork.length + sectionIntern.length ? [] : scannedWork),
  ]).filter(isValidExperience);

  attachExperienceBulletBlocks(lines, experience);
  experience = sortExperiencesForDisplay(experience);

  const leaderProjects = parseProjectLeaderEntries(lines);
  attachProjectOverviewBlocks(lines, leaderProjects);
  const sectionParsedProjects = parseProjectBlock(sections.projects ?? []);
  const leaderTitles = new Set(leaderProjects.map((p) => p.title.trim()));
  const scannedProjects = timedEntries
    .filter((e) => e.kind === "project")
    .filter((e) => isValidProjectTitle(e.title) && e.title !== "项目负责人")
    .filter((e) => !leaderTitles.has(e.title.trim()))
    .map(
      (p): ParsedProject => ({
        title: p.title,
        period: p.period,
        role: "个人项目",
        description:
          p.bullets.join(" ").slice(0, 480) || undefined,
        bullets: p.bullets.slice(0, 12),
      }),
    );
  let projects = dedupeProjects([
    ...sectionParsedProjects,
    ...leaderProjects,
    ...scannedProjects,
  ])
    .filter((p) => isValidProjectTitle(p.title))
    .filter((p) => !isCampusActivityNotProject(p));

  projects = consolidateFragmentedProjects(projects);

  const dedicatedProjectSection = hasDedicatedProjectSection(sections, lines);
  const reconciled = reconcileWorkAndProjects(experience, projects, {
    hasDedicatedProjectSection: dedicatedProjectSection,
  });
  experience = reconciled.experience;
  projects = reconciled.projects;

  const school = education[0]?.school;
  const major = education[0]?.degree;
  const name = inferName(headerLines.length ? headerLines : lines);
  const targetRole = inferTargetRole(text);
  const tagline = buildTagline(selfEval, targetRole, school, major);

  const warnings = buildParseQualityWarnings({
    experience,
    projects,
    name,
    educationCount: education.length,
    method: "heuristic",
    reconcileWarnings: reconciled.warnings,
  });

  const achievementBullets = timedEntries
    .flatMap((e) => e.bullets)
    .filter((b) =>
      /项目成果|竞赛.*(?:奖|赛|名)|奖学金|专利|精度提升\s*\d+|延迟\s*<\s*\d+/i.test(
        b,
      ),
    )
    .slice(0, 4);

  const heroPreviewLines = buildHeroPreviewLines({
    awards,
    summaryLines: summarySectionLines,
    selfEval,
    experience,
    projects,
  });

  const parsed: ParsedResume = {
    name,
    targetRole,
    tagline,
    contactEmail: contacts.email,
    contactPhone: contacts.phone,
    contactExtra: contacts.extra,
    heroPreviewLines: heroPreviewLines.length ? heroPreviewLines : undefined,
    transferableSkills: skillTags.length ? skillTags : undefined,
    experience,
    education,
    projects,
    awards: awards.length ? awards : undefined,
  };

  let confidence = computeParseConfidence(parsed);
  if (warnings.length > 0) {
    confidence = Math.max(
      0.2,
      confidence - Math.min(0.12, warnings.length * 0.03),
    );
  }

  return { parsed, confidence, warnings };
}
