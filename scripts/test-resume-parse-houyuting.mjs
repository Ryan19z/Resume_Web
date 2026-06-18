/**
 * 侯玉婷简历解析测试
 * npx tsx scripts/test-resume-parse-houyuting.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parseResumeHeuristic } from "../lib/server/resume-parse-heuristic.ts";
import { mapParsedResumeToSite } from "../lib/resume-parse-mapper.ts";
import { defaultSiteContent } from "../lib/default-site-content.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.join(__dirname, "fixtures", "houyuting-resume-pdf.txt");
if (!fs.existsSync(fixture)) {
  console.error("Run: npx tsx scripts/debug-houyuting-pdf.mjs first");
  process.exit(1);
}
const text = fs.readFileSync(fixture, "utf8");

const { parsed, warnings } = parseResumeHeuristic(text);
const mapped = mapParsedResumeToSite(parsed, defaultSiteContent);

console.log("=== 侯玉婷简历解析测试 ===\n");
console.log("姓名:", parsed.name);
console.log("工作经历:", parsed.experience.length);
for (const e of parsed.experience) {
  console.log(`  ${e.period} | ${e.company.slice(0, 24)} | ${e.title} | bullets=${e.keyResults.length}`);
}
console.log("项目经历:", parsed.projects.length);
for (const p of parsed.projects) {
  console.log(`  ${p.period ?? ""} | ${p.title} | bullets=${(p.bullets ?? []).length}`);
}

const expKr = mapped.sitePatch.experience.reduce((n, e) => n + e.keyResults.length, 0);
const projKr = mapped.sitePatch.projectExperience.reduce((n, e) => n + e.keyResults.length, 0);
console.log("\n导入后: 工作经历 keyResults 合计", expKr, "项目经历 keyResults 合计", projKr);

const asserts = [
  ["name", parsed.name === "侯玉婷"],
  ["work_count", parsed.experience.length >= 3],
  ["work_bullets", parsed.experience.every((e) => e.keyResults.length >= 1)],
  ["work_total_bullets", parsed.experience.reduce((n, e) => n + e.keyResults.length, 0) >= 6],
  ["project_count", parsed.projects.length >= 3],
  ["project_bullets", parsed.projects.every((p) => (p.bullets ?? []).length >= 2)],
  ["mapped_work_kr", expKr >= 6],
  ["mapped_proj_kr", projKr >= 6],
  ["has_tesla", parsed.experience.some((e) => /特斯拉|拓速乐/.test(e.company))],
  ["has_baison", parsed.experience.some((e) => /百盛/.test(e.company))],
  ["edu_count", parsed.education.length >= 2],
  ["edu_master", parsed.education.some((e) => /硕士/.test(e.degree))],
  ["hero_lines", (parsed.heroPreviewLines?.length ?? 0) >= 2],
  ["merged_bullets", parsed.experience[0]?.keyResults[0]?.length > 80],
  ["clean_skills", !(parsed.transferableSkills ?? []).some((s) => /年\+|任职经历/.test(s))],
];

let failed = 0;
for (const [label, ok] of asserts) {
  console.log(ok ? "PASS" : "FAIL", label);
  if (!ok) failed++;
}
if (warnings.length) console.log("\n警告:", warnings);
process.exit(failed ? 1 : 0);
