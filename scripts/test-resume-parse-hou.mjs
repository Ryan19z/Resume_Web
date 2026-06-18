/**
 * 测试侯钟棋格式简历解析
 * npx tsx scripts/test-resume-parse-hou.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parseResumeHeuristic } from "../lib/server/resume-parse-heuristic.ts";
import { mapParsedResumeToSite } from "../lib/resume-parse-mapper.ts";
import { defaultSiteContent } from "../lib/default-site-content.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const text = fs.readFileSync(
  path.join(__dirname, "fixtures", "sample-resume-hou.txt"),
  "utf8",
);
const pdfText = fs.readFileSync(
  path.join(__dirname, "fixtures", "hou-resume-pdf.txt"),
  "utf8",
);

const { parsed, confidence } = parseResumeHeuristic(text);
const pdfParsed = parseResumeHeuristic(pdfText).parsed;
const mapped = mapParsedResumeToSite(parsed, defaultSiteContent);
const pdfMapped = mapParsedResumeToSite(pdfParsed, defaultSiteContent);

console.log("=== 侯钟棋简历解析测试 ===\n");
console.log("置信度:", Math.round(confidence * 100) + "%");
console.log("字段:", mapped.fieldsFilled.join(", "));
console.log("\n姓名:", parsed.name);
console.log("邮箱:", parsed.contactEmail);
console.log("电话:", parsed.contactPhone);
console.log("一句话:", mapped.sitePatch.tagline);
console.log("\n教育:", parsed.education.length);
for (const e of parsed.education) {
  console.log(`  ${e.school} | ${e.degree} | ${e.period}`);
}
console.log("\n工作经历:", parsed.experience.length);
for (const e of parsed.experience) {
  console.log(`  ${e.period} | ${e.company} | ${e.title} | bullets:${e.keyResults.length}`);
}
console.log("\n项目:", parsed.projects.length);
for (const p of parsed.projects) {
  console.log(`  · ${p.title}`);
}
console.log("\n奖项:", parsed.awards?.length ?? 0);
console.log("\n核心亮点:", mapped.sitePatch.heroPreviewLines?.join(" | "));

const asserts = [
  ["name", parsed.name === "侯钟棋"],
  ["email", parsed.contactEmail === "zhongqi_hou@foxmail.com"],
  ["phone", parsed.contactPhone === "17816769251" || parsed.contactPhone === "178-1676-9251"],
  ["education", parsed.education.length >= 1],
  ["education_school", parsed.education[0]?.school.includes("浙江科技")],
  ["experience", parsed.experience.length >= 1],
  ["projects", parsed.projects.length >= 2],
  ["portfolio_empty", mapped.sitePatch.projects.length === 0],
  ["project_experience", mapped.sitePatch.projectExperience.length >= 2],
  ["awards", (parsed.awards?.length ?? 0) >= 2],
  ["hero_lines", (mapped.sitePatch.heroPreviewLines?.length ?? 0) >= 2],
  ["tagline_not_edu_dump", !/GPA.*大学/.test(mapped.sitePatch.tagline ?? "")],
  [
    "pdf_no_bare_date_hero",
    !pdfParsed.heroPreviewLines?.some((l) => /^\d{4}[.\-/]\d{1,2}$/.test(l.trim())),
  ],
  [
    "pdf_english_award_merged",
    pdfParsed.awards?.some((a) =>
      /英语竞赛.*校一等奖.*2022/.test(a.replace(/\s/g, "")),
    ),
  ],
  [
    "pdf_skill_keywords",
    pdfMapped.sitePatch.transferableSkills.length >= 8 &&
      pdfMapped.sitePatch.transferableSkills.every((s) => s.length <= 24) &&
      !pdfMapped.sitePatch.transferableSkills.some((s) =>
        /以μC|GPS\+IMU方案作为|操作系统为导向|负责|制定了/.test(s),
      ),
  ],
  [
    "pdf_skill_has_tools",
    pdfMapped.sitePatch.transferableSkills.some((s) =>
      /CET-6|ProcessOn|Visio|Xmind/i.test(s),
    ),
  ],
  [
    "pdf_skill_has_soft",
    pdfMapped.sitePatch.transferableSkills.some((s) =>
      /数据分析|跨团队|智能硬件|用户沟通/.test(s),
    ),
  ],
];

let failed = 0;
for (const [label, ok] of asserts) {
  console.log(ok ? "PASS" : "FAIL", label);
  if (!ok) failed++;
}
process.exit(failed ? 1 : 0);
