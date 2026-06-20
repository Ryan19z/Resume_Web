/**
 * 校园详情应同时包含篮球队 + 奖项荣誉
 * npx tsx scripts/test-education-awards.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parseResumeHeuristic } from "../lib/server/resume-parse-heuristic.ts";
import {
  autoClassifyResumeContent,
  enrichParsedResumeAwards,
} from "../lib/server/resume-parse-reconcile.ts";
import { mapParsedResumeToSite } from "../lib/resume-parse-mapper.ts";
import { defaultSiteContent } from "../lib/default-site-content.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const text = fs.readFileSync(
  path.join(__dirname, "fixtures", "houzhongqi-resume-extract.txt"),
  "utf8",
);

const { parsed: heuristicParsed } = parseResumeHeuristic(text);
let parsed = autoClassifyResumeContent({
  ...heuristicParsed,
  projects: [
    ...heuristicParsed.projects,
    {
      title: "院篮球队成员",
      period: "2022-2023",
      role: "院篮球队成员",
      description: "获院级比赛亚军、季军",
      bullets: [],
    },
  ],
}).parsed;

parsed = enrichParsedResumeAwards(parsed, heuristicParsed.awards ?? []);
const mapped = mapParsedResumeToSite(parsed, defaultSiteContent);
const edu = mapped.sitePatch.education[0];
const headings = edu?.campusHighlights?.map((b) => b.heading) ?? [];
const awardBlock = edu?.campusHighlights?.find((b) => b.heading === "奖项荣誉");
const basketballBlock = edu?.campusHighlights?.find((b) =>
  /篮球队/.test(b.heading),
);

console.log("=== 教育校园详情（奖项 + 篮球队）===\n");
console.log("parsed.awards:", parsed.awards?.length ?? 0);
console.log("campus headings:", headings.join(" | "));
console.log("奖项荣誉条数:", awardBlock?.bullets.length ?? 0);
if (awardBlock) {
  for (const b of awardBlock.bullets) console.log("  ·", b);
}

const asserts = [
  ["has_basketball_block", Boolean(basketballBlock)],
  ["has_award_block", Boolean(awardBlock)],
  ["award_count_gte_4", (awardBlock?.bullets.length ?? 0) >= 4],
  ["parsed_awards_gte_4", (parsed.awards?.length ?? 0) >= 4],
  [
    "award_has_scholarship",
    (awardBlock?.bullets ?? []).some((b) => /奖学金/.test(b)),
  ],
  [
    "award_has_english",
    (awardBlock?.bullets ?? []).some((b) => /英语/.test(b)),
  ],
  [
    "smart_car_merged",
    (awardBlock?.bullets ?? []).some(
      (b) => /智能车竞赛/.test(b) && /浙江省二等奖/.test(b),
    ),
  ],
  [
    "english_comp_merged",
    (awardBlock?.bullets ?? []).some(
      (b) => /英语竞赛/.test(b) && /校一等奖/.test(b),
    ),
  ],
  [
    "award_count_lte_8",
    (awardBlock?.bullets.length ?? 0) <= 8 &&
      (awardBlock?.bullets.length ?? 0) >= 5,
  ],
  [
    "no_semantic_duplicate_awards",
    new Set((awardBlock?.bullets ?? []).map((b) =>
      b
        .replace(/[（(]\d{4}[.\-/年]?\d{1,2}[)）]/g, "")
        .replace(/\s+/g, "")
        .toLowerCase(),
    )).size === (awardBlock?.bullets.length ?? 0),
  ],
];

let failed = 0;
for (const [label, ok] of asserts) {
  console.log(ok ? "PASS" : "FAIL", label);
  if (!ok) failed++;
}
process.exit(failed ? 1 : 0);
