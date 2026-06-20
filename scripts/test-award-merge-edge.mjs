/**
 * 奖项合并边界用例
 * npx tsx scripts/test-award-merge-edge.mjs
 */
import { normalizeAwardList, enrichParsedResumeAwards } from "../lib/server/resume-parse-reconcile.ts";
import { mapParsedResumeToSite } from "../lib/resume-parse-mapper.ts";
import { defaultSiteContent } from "../lib/default-site-content.ts";

const cases = [
  ["LLM split name + prize+date", ["第十八届全国大学生智能车竞赛", "浙江省二等奖（2023.07）"]],
  ["LLM split name + prize + paren date", ["第十八届全国大学生智能车竞赛", "浙江省二等奖", "（2023.07）"]],
  ["LLM split english", ["浙江省大学生英语竞赛", "校一等奖（2022.05）"]],
  ["single line full", ["第十八届全国大学生智能车竞赛 浙江省二等奖（2023.07）"]],
  ["prize with spaces", ["浙江省大学生英语竞赛", "校一等奖", "  2022.05"]],
];

let failed = 0;
for (const [label, input] of cases) {
  const out = normalizeAwardList(input);
  const merged = out.length === 1 && /二等奖|一等奖/.test(out[0] ?? "");
  console.log(merged ? "PASS" : "FAIL", label, "→", out.length, "条:", out[0] ?? "(empty)");
  if (!merged) failed++;
}

const parsed = enrichParsedResumeAwards({
  name: "侯钟棋",
  experience: [],
  education: [
    {
      school: "浙江科技大学",
      degree: "自动化",
      period: "2021-2025",
      highlights: ["GPA：3.04", "浙江省大学生英语竞赛", "校一等奖"],
      campusExperiences: [],
    },
  ],
  projects: [],
  awards: [
    "第十八届全国大学生智能车竞赛",
    "浙江省二等奖（2023.07）",
    "浙江省大学生英语竞赛",
    "校一等奖（2022.05）",
  ],
});
const mapped = mapParsedResumeToSite(parsed, defaultSiteContent);
const awardBlock = mapped.sitePatch.education[0]?.campusHighlights?.find(
  (b) => b.heading === "奖项荣誉",
);
const smartCar = (awardBlock?.bullets ?? []).some(
  (b) => /智能车竞赛/.test(b) && /浙江省二等奖/.test(b),
);
const english = (awardBlock?.bullets ?? []).some(
  (b) => /英语竞赛/.test(b) && /校一等奖/.test(b),
);
console.log(smartCar ? "PASS" : "FAIL", "LLM pipeline smart car merged");
console.log(english ? "PASS" : "FAIL", "LLM pipeline english merged");
const noDupEnglish = !(awardBlock?.bullets ?? []).some((b) =>
  /校一等奖.*校一等奖/.test(b),
);
console.log(noDupEnglish ? "PASS" : "FAIL", "no duplicate prize fragment");
console.log("parsed.awards:", parsed.awards);
console.log("UI bullets:", awardBlock?.bullets);
if (!smartCar || !english || !noDupEnglish) failed++;

process.exit(failed ? 1 : 0);
