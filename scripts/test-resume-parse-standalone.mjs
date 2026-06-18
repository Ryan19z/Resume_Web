/**
 * 纯 JS 简历解析 smoke test（无需 npm install）
 * 运行：node scripts/test-resume-parse-standalone.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_RE = /(?:\+?\d{1,3}[-.\s]?)?(?:1[3-9]\d{9}|\d{3,4}[-.\s]?\d{7,8})/g;
const MONTH =
  "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)";
const DATE_RANGE_RE = new RegExp(
  `^\\s*(\\d{4}[\\./年-]\\d{1,2}(?:[\\./月-]\\d{1,2})?\\s*(?:日)?\\s*[-–—~至到]+\\s*(?:至今|现在|[Pp]resent|[Nn]ow|\\d{4}[\\./年-]\\d{1,2}(?:[\\./月-]\\d{1,2})?(?:日)?)|(?:${MONTH}\\.?\\s+\\d{4}\\s*[-–—~至到]+\\s*(?:[Pp]resent|[Nn]ow|至今|现在|(?:${MONTH}\\.?\\s+\\d{4}))))\\s*`,
  "i",
);

const SECTION_PATTERNS = [
  { key: "experience", re: /^(?:工作经历|工作经验|实习经历|职业经历|employment|work\s*experience|professional\s*experience|experience)$/i },
  { key: "education", re: /^(?:教育背景|教育经历|学历|education|academic)$/i },
  { key: "skills", re: /^(?:专业技能|技能|核心技能|technical\s*skills|skills|competencies)$/i },
  { key: "projects", re: /^(?:项目经历|项目经验|代表项目|projects?|portfolio)$/i },
  { key: "summary", re: /^(?:个人简介|自我评价|关于我|summary|profile|objective|about)$/i },
];

function cleanLine(line) {
  return line.replace(/\s+/g, " ").trim();
}
function isBullet(line) {
  return /^[-•●·▪◦*]\s+/.test(line) || /^\d+[.)]\s+/.test(line);
}
function stripBullet(line) {
  return cleanLine(line.replace(/^[-•●·▪◦*]\s+/, "").replace(/^\d+[.)]\s+/, ""));
}
function splitSections(lines) {
  const sections = { header: [] };
  let current = "header";
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
function splitCompanyAndTitle(block) {
  const trimmed = block.trim();
  if (!trimmed) return { company: "", title: "" };
  const multiParts = trimmed.split(/\s{2,}|\t/).map((p) => p.trim()).filter(Boolean);
  if (multiParts.length >= 2) {
    return { company: multiParts[0], title: multiParts.slice(1).join(" ") };
  }
  const parts = trimmed.split(/[|｜/]/).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) return { company: parts[0], title: parts[1] };
  const normalized = cleanLine(trimmed);
  const words = normalized.split(/\s+/);
  const jobRe = /(?:工程师|经理|主管|总监|专员|实习|开发|设计|分析师|Assistant|Specialist|Engineer|Developer|Manager|Analyst|Intern|Researcher|Support)/i;
  let best = { company: trimmed, title: "" };
  for (let i = 0; i < words.length; i++) {
    const titleCandidate = words.slice(i).join(" ");
    if (jobRe.test(titleCandidate) && titleCandidate.length <= 48 && titleCandidate.length >= 2) {
      best = { company: words.slice(0, i).join(" "), title: titleCandidate };
    }
  }
  if (best.title) return best;
  return { company: trimmed, title: "" };
}
function parseExperienceBlock(lines) {
  const items = [];
  let current = null;
  const flush = () => {
    if (current && (current.title || current.company)) items.push(current);
    current = null;
  };
  for (const raw of lines) {
    const rawLine = raw.trim();
    if (!rawLine) continue;
    const line = cleanLine(rawLine);
    if (isBullet(line)) {
      if (!current) current = { title: "", company: "", period: "", keyResults: [] };
      current.keyResults.push(stripBullet(line));
      continue;
    }
    const dateMatch = rawLine.match(DATE_RANGE_RE);
    if (dateMatch) {
      flush();
      const period = (dateMatch[1] ?? dateMatch[0]).trim();
      const rest = rawLine.slice(dateMatch[0].length).trim();
      const { company, title } = splitCompanyAndTitle(rest);
      current = { title, company, period, keyResults: [] };
      continue;
    }
  }
  flush();
  return items;
}

const text = fs.readFileSync(path.join(__dirname, "fixtures", "sample-resume-zh.txt"), "utf8");
const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
const sections = splitSections(lines);
const emails = text.match(EMAIL_RE);
const phones = text.match(PHONE_RE);
const experience = parseExperienceBlock(sections.experience ?? []);

console.log("姓名候选:", sections.header?.[0]);
console.log("邮箱:", emails?.[0]);
console.log("电话:", phones?.[0]);
console.log("工作经历:", experience.length);
for (const e of experience) {
  console.log(`  ${e.period} | ${e.company} | ${e.title} | bullets:${e.keyResults.length}`);
}

const ok =
  sections.header?.[0] === "李明" &&
  emails?.[0] === "liming@example.com" &&
  experience.length >= 2 &&
  experience[0]?.company.includes("智云") &&
  experience[0]?.title.includes("AI");

console.log("\n--- 英文样例 ---");
const textEn = fs.readFileSync(path.join(__dirname, "fixtures", "sample-resume-en.txt"), "utf8");
const sectionsEn = splitSections(textEn.split("\n").map((l) => l.trim()).filter(Boolean));
const expEn = parseExperienceBlock(sectionsEn.experience ?? []);
console.log("姓名:", sectionsEn.header?.[0]);
console.log("工作经历:", expEn.length);
for (const e of expEn.slice(0, 2)) {
  console.log(`  ${e.period} | ${e.company} | ${e.title}`);
}
const okEn =
  sectionsEn.header?.[0]?.includes("Jake") &&
  expEn.length >= 2 &&
  expEn[0]?.title.toLowerCase().includes("research");

if (!ok || !okEn) {
  console.error("SMOKE TEST FAILED", { ok, okEn });
  process.exit(1);
}
console.log("\nSMOKE TEST PASSED ✓");
