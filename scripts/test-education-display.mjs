/**
 * 测试学校+专业合并字符串拆分
 * npx tsx scripts/test-education-display.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { resolveEducationDisplay, splitSchoolMajorBlob } from "../lib/education-display.ts";
import { parseResumeHeuristic } from "../lib/server/resume-parse-heuristic.ts";
import { mapParsedResumeToSite } from "../lib/resume-parse-mapper.ts";
import { defaultSiteContent } from "../lib/default-site-content.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const mergedText = `柳湘鑫
1079891832@qq.com | +86 19196424518

教育经历
2023.09 - 2026.2 布达佩斯城市大学商业和市场营销
2020.09 - 2023.06 四川外国语大学成都学院商务英语
`;

const split1 = splitSchoolMajorBlob("布达佩斯城市大学商业和市场营销");
const split2 = splitSchoolMajorBlob("四川外国语大学成都学院商务英语");

const { parsed } = parseResumeHeuristic(mergedText);
const mapped = mapParsedResumeToSite(parsed, defaultSiteContent);

const display1 = resolveEducationDisplay({
  id: "1",
  title: "本科",
  subtitle: "布达佩斯城市大学商业和市场营销",
  period: "2023.09-2026.2",
  campusHighlights: [],
  representativeProjects: [],
});

const asserts = [
  ["split1_school", split1?.school === "布达佩斯城市大学"],
  ["split1_major", split1?.major === "商业和市场营销"],
  ["split2_school", split2?.school === "四川外国语大学成都学院"],
  ["split2_major", split2?.major === "商务英语"],
  ["parse_merged_count", parsed.education.length === 2],
  ["parse_merged_school", mapped.sitePatch.education[0]?.subtitle === "布达佩斯城市大学"],
  ["parse_merged_major", mapped.sitePatch.education[0]?.title.includes("商业和市场营销")],
  ["display_legacy_school", display1.school === "布达佩斯城市大学"],
  ["display_legacy_major", display1.major === "商业和市场营销"],
];

let failed = 0;
for (const [label, ok] of asserts) {
  console.log(ok ? "PASS" : "FAIL", label);
  if (!ok) failed++;
}
process.exit(failed ? 1 : 0);
