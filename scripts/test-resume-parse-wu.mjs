/**
 * 吴恩酒简历解析测试
 * npx tsx scripts/test-resume-parse-wu.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parseResumeHeuristic } from "../lib/server/resume-parse-heuristic.ts";
import {
  applyMappedImportToSite,
  mapParsedResumeToSite,
} from "../lib/resume-parse-mapper.ts";
import { defaultSiteContent } from "../lib/default-site-content.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const text = fs.readFileSync(
  path.join(__dirname, "fixtures", "wu-resume.txt"),
  "utf8",
);
const pdfText = fs.readFileSync(
  path.join(__dirname, "fixtures", "wu-resume-pdf.txt"),
  "utf8",
);

const { parsed } = parseResumeHeuristic(text);
const pdfParsed = parseResumeHeuristic(pdfText).parsed;
const mapped = mapParsedResumeToSite(parsed, defaultSiteContent);
const pdfMapped = mapParsedResumeToSite(pdfParsed, defaultSiteContent);
const afterImport = applyMappedImportToSite(defaultSiteContent, mapped);

console.log("=== 吴恩酒简历解析测试 ===\n");
console.log("姓名:", parsed.name);
console.log("工作经历:", parsed.experience.length);
for (const e of parsed.experience) {
  console.log(`  ${e.period} | ${e.company} | ${e.title}`);
}
console.log("项目经历:", parsed.projects.length);
for (const p of parsed.projects) {
  console.log(
    `  ${p.period ?? ""} | ${p.title} | bullets=${(p.bullets ?? []).length} desc=${Boolean(p.description?.trim())}`,
  );
}
console.log("\nPDF 项目经历:", pdfParsed.projects.length);
for (const p of pdfParsed.projects) {
  console.log(
    `  ${p.period ?? ""} | ${p.title} | bullets=${(p.bullets ?? []).length}`,
  );
}
console.log("\n导入后项目经历 keyResults:");
for (const p of pdfMapped.sitePatch.projectExperience) {
  console.log(`  ${p.title} | keyResults=${p.keyResults.length} summary=${Boolean(p.summary)}`);
}
console.log("导入后作品集:", afterImport.projects.length);
console.log("导入后项目经历:", afterImport.projectExperience.length);

const badWork = parsed.experience.filter(
  (e) => e.company === "项目负责人" || !e.title,
);
const leaderProjects = parsed.projects.filter((p) =>
  p.title.includes("NB-IoT"),
);

const asserts = [
  ["name", parsed.name === "吴恩酒"],
  ["work_count", parsed.experience.length >= 3 && parsed.experience.length <= 5],
  ["no_leader_as_work", badWork.length === 0],
  ["has_weixing", parsed.experience.some((e) => e.company.includes("威星"))],
  ["work_bullets", parsed.experience.some((e) => !/实习/.test(e.title) && e.keyResults.length >= 3)],
  ["intern_bullets", parsed.experience.filter((e) => /实习/.test(e.title)).every((e) => e.keyResults.length >= 2)],
  ["has_intern", parsed.experience.some((e) => /实习/.test(e.title))],
  ["intern_count", parsed.experience.filter((e) => /实习/.test(e.title)).length === 2],
  ["work_bullets", parsed.experience.some((e) => !/实习/.test(e.title) && e.keyResults.length >= 3)],
  ["intern_bullets", parsed.experience.filter((e) => /实习/.test(e.title)).every((e) => e.keyResults.length >= 2)],
  ["subtitle_label", mapped.sitePatch.experience.every((e) => /· (正式|实习)$/.test(e.subtitle))],
  ["project_count", parsed.projects.length >= 5 && parsed.projects.length <= 8],
  ["has_nbiot_project", leaderProjects.length >= 2],
  ["portfolio_empty", afterImport.projects.length === 0],
  ["spotlight_cleared", afterImport.heroSpotlight.media.url === ""],
  ["spotlight_links_cleared", !afterImport.heroSpotlight.mediaLinks?.image],
  ["portrait_cleared", !afterImport.heroPortrait?.url],
  ["aside_hidden", afterImport.heroAsideMode === "hidden"],
  [
    "project_experience_filled",
    afterImport.projectExperience.length >= 5,
  ],
  [
    "project_bullets",
    parsed.projects.filter((p) => /项目负责人|个人项目/.test(p.role ?? "")).every(
      (p) => (p.bullets?.length ?? 0) >= 3,
    ),
  ],
  [
    "pdf_project_bullets",
    pdfParsed.projects.every((p) => (p.bullets?.length ?? 0) >= 3),
  ],
  [
    "pdf_project_key_results",
    pdfMapped.sitePatch.projectExperience.every((p) => p.keyResults.length >= 3),
  ],
  ["edu", parsed.education.some((e) => e.school.includes("浙江科技"))],
  [
    "pdf_skill_keywords",
    pdfMapped.sitePatch.transferableSkills.length >= 8 &&
      pdfMapped.sitePatch.transferableSkills.every((s) => s.length <= 24) &&
      !pdfMapped.sitePatch.transferableSkills.some((s) => /负责|制定了|包括外/.test(s)),
  ],
  [
    "pdf_skill_has_core",
    pdfMapped.sitePatch.transferableSkills.some((s) => /C\/C\+\+|STM32|FreeRTOS|ESP32/i.test(s)),
  ],
  [
    "pdf_hero_honors",
    pdfMapped.sitePatch.heroPreviewLines.some((s) => /CET4|奖学金|竞赛/i.test(s)) &&
      !pdfMapped.sitePatch.heroPreviewLines.some((s) => /HMI|按键菜单|管理员界面/.test(s)),
  ],
];

let failed = 0;
for (const [label, ok] of asserts) {
  console.log(ok ? "PASS" : "FAIL", label);
  if (!ok) failed++;
}
process.exit(failed ? 1 : 0);
