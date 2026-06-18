/**
 * 测试柳湘鑫格式简历解析 + 覆盖导入
 * npx tsx scripts/test-resume-parse-liu.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parseResumeHeuristic } from "../lib/server/resume-parse-heuristic.ts";
import {
  applyMappedImportToSite,
  formatPhoneForDisplay,
  mapParsedResumeToSite,
} from "../lib/resume-parse-mapper.ts";
import { defaultSiteContent } from "../lib/default-site-content.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const text = fs.readFileSync(
  path.join(__dirname, "fixtures", "sample-resume-liu.txt"),
  "utf8",
);
const pdfText = fs.readFileSync(
  path.join(__dirname, "fixtures", "liu-resume-pdf.txt"),
  "utf8",
);

const { parsed, confidence } = parseResumeHeuristic(text);
const pdfParsed = parseResumeHeuristic(pdfText).parsed;
const mapped = mapParsedResumeToSite(parsed, defaultSiteContent);
const prevPersonSite = {
  ...defaultSiteContent,
  heroPreviewLines: ["旧人亮点：转化率提升 18%", "旧人亮点：带队 5 人"],
  heroPortrait: { url: "https://example.com/old-portrait.jpg", caption: "旧证件照" },
  heroAsideMode: "portrait",
  heroContactQrs: [{ id: "qr-1", src: "https://example.com/old-qr.png", caption: "旧微信" }],
};
const afterImportFromPrev = applyMappedImportToSite(prevPersonSite, mapped);

console.log("=== 柳湘鑫简历解析测试 ===\n");
console.log("置信度:", Math.round(confidence * 100) + "%");
console.log("字段:", mapped.fieldsFilled.join(", "));
console.log("\n姓名:", parsed.name);
console.log("邮箱:", parsed.contactEmail);
console.log("电话(raw):", parsed.contactPhone);
console.log("电话(display):", formatPhoneForDisplay(parsed.contactPhone));
console.log("社媒:", parsed.contactExtra ?? "(空)");
console.log("\n教育:", parsed.education.length);
for (const e of parsed.education) {
  console.log(`  ${e.period} | ${e.school} | ${e.degree}`);
  if (e.highlights.length) {
    for (const h of e.highlights) console.log(`    - ${h}`);
  }
  for (const c of e.campusExperiences ?? []) {
    console.log(`    [${c.role}] bullets=${c.bullets.length}`);
    for (const b of c.bullets) console.log(`      · ${b.slice(0, 60)}`);
  }
}
console.log("\n工作经历:", parsed.experience.length);
for (const e of parsed.experience) {
  console.log(`  ${e.period} | ${e.company} | ${e.title}`);
}
console.log("\n项目:", parsed.projects.length);
console.log("核心亮点:", mapped.sitePatch.heroPreviewLines.length);
console.log("技能标签:", mapped.sitePatch.transferableSkills.length);
console.log("岗位适配:", mapped.sitePatch.roleFitEntries.length);
console.log("\n导入后项目数:", afterImportFromPrev.projects.length);
console.log("导入后亮点数:", afterImportFromPrev.heroPreviewLines.length);
console.log("导入后社媒:", afterImportFromPrev.contactExtra ?? "(空)");
console.log("导入后证件照:", afterImportFromPrev.heroPortrait?.url || "(空)");
console.log("导入后右侧模式:", afterImportFromPrev.heroAsideMode);

const edu1 = mapped.sitePatch.education[0];
const edu2 = mapped.sitePatch.education[1];
const pdfMapped = mapParsedResumeToSite(pdfParsed, defaultSiteContent);
const pdfEdu2 = pdfMapped.sitePatch.education.find((e) =>
  e.subtitle.includes("四川外国语"),
);

const campusBlock = (edu, role) =>
  edu?.campusHighlights.find((g) => g.heading.includes(role));

const asserts = [
  ["name", parsed.name === "柳湘鑫"],
  ["email", parsed.contactEmail === "1079891832@qq.com"],
  ["phone_display", formatPhoneForDisplay(parsed.contactPhone) === "+86 19196424518"],
  ["no_contact_extra", parsed.contactExtra === undefined],
  ["education_count", parsed.education.length === 2],
  ["edu1_school", edu1?.subtitle.includes("布达佩斯")],
  ["edu1_major", edu1?.title.includes("商业和市场营销")],
  ["edu1_separated", edu1?.subtitle === "布达佩斯城市大学" && edu1?.title.includes("商业和市场营销")],
  ["edu2_school", edu2?.subtitle.includes("四川外国语大学")],
  ["edu2_major", edu2?.title.includes("商务英语")],
  ["experience", parsed.experience.length === 4],
  ["no_projects", parsed.projects.length === 0],
  ["no_hero_lines", mapped.sitePatch.heroPreviewLines.length === 0],
  ["no_skills", mapped.sitePatch.transferableSkills.length === 0],
  ["import_clears_projects", afterImportFromPrev.projects.length === 0],
  ["import_clears_project_experience", afterImportFromPrev.projectExperience.length === 0],
  ["import_clears_default_hero", afterImportFromPrev.heroPreviewLines.length === 0],
  ["import_clears_old_hero", !afterImportFromPrev.heroPreviewLines.some((l) => /旧人亮点/.test(l))],
  ["import_clears_portrait", !afterImportFromPrev.heroPortrait?.url],
  ["import_resets_aside", afterImportFromPrev.heroAsideMode === "hidden"],
  ["import_clears_contact_qr", !afterImportFromPrev.heroContactQrs?.some((q) => q.src)],
  ["import_clears_role_fit", afterImportFromPrev.roleFitEntries.length === 0],
  ["import_clears_contact_extra", afterImportFromPrev.contactExtra === undefined],
  [
    "edu1_campus",
    campusBlock(edu1, "学生会副会长")?.bullets.length >= 2,
  ],
  [
    "edu2_campus",
    campusBlock(edu2, "学生会主席")?.bullets.length >= 2,
  ],
  [
    "edu2_courses",
    edu2?.campusHighlights.some((g) => g.heading === "主修课程" && g.bullets.length >= 1),
  ],
  ["no_campus_as_education", !parsed.education.some((e) => /学生会|接待助理|办公室助理/.test(e.degree))],
  [
    "pdf_chair_bullets",
    campusBlock(pdfEdu2, "学生会主席")?.bullets.length >= 2,
  ],
  [
    "pdf_chair_content",
    campusBlock(pdfEdu2, "学生会主席")?.bullets.some((b) => /策划组织|活动宣传/.test(b)),
  ],
];

let failed = 0;
for (const [label, ok] of asserts) {
  console.log(ok ? "PASS" : "FAIL", label);
  if (!ok) failed++;
}
process.exit(failed ? 1 : 0);
