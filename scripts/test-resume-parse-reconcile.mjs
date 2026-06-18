/**
 * 在职项目归并测试
 * npx tsx scripts/test-resume-parse-reconcile.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parseResumeHeuristic } from "../lib/server/resume-parse-heuristic.ts";
import { mapParsedResumeToSite } from "../lib/resume-parse-mapper.ts";
import { defaultSiteContent } from "../lib/default-site-content.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const text = fs.readFileSync(
  path.join(__dirname, "fixtures", "work-embedded-resume.txt"),
  "utf8",
);

const { parsed, warnings } = parseResumeHeuristic(text);
const mapped = mapParsedResumeToSite(parsed, defaultSiteContent);

console.log("=== 在职项目归并测试 ===\n");
console.log("工作经历:", parsed.experience.length);
for (const e of parsed.experience) {
  console.log(`  ${e.period} | ${e.company} | ${e.title} | bullets=${e.keyResults.length}`);
}
console.log("项目经历:", parsed.projects.length);
for (const p of parsed.projects) {
  console.log(`  ${p.period ?? ""} | ${p.title}`);
}
console.log("\n导入后工作经历 keyResults:");
for (const e of mapped.sitePatch.experience) {
  console.log(`  ${e.title} @ ${e.subtitle}: ${e.keyResults.length} 条`);
}
console.log("\n警告:", warnings);

const asserts = [
  ["has_work", parsed.experience.length >= 1],
  ["work_has_bullets", parsed.experience.some((e) => e.keyResults.length >= 3)],
  ["projects_merged_or_few", parsed.projects.length <= 1],
  ["mapped_work_filled", mapped.sitePatch.experience.some((e) => e.keyResults.length >= 3)],
  ["has_warnings", warnings.length >= 1],
];

let failed = 0;
for (const [label, ok] of asserts) {
  console.log(ok ? "PASS" : "FAIL", label);
  if (!ok) failed++;
}
process.exit(failed ? 1 : 0);
