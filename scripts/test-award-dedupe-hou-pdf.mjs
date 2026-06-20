/**
 * 从用户 PDF 提取并检查奖项去重
 * npx tsx scripts/test-award-dedupe-hou-pdf.mjs "d:\侯钟棋简历__ (1).pdf"
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { extractResumeText } from "../lib/server/resume-text-extract.ts";
import { parseResumeHeuristic } from "../lib/server/resume-parse-heuristic.ts";
import {
  awardDedupeKey,
  enrichParsedResumeAwards,
} from "../lib/server/resume-parse-reconcile.ts";
import { mapParsedResumeToSite } from "../lib/resume-parse-mapper.ts";
import { defaultSiteContent } from "../lib/default-site-content.ts";

const pdfPath =
  process.argv[2] ?? "d:\\侯钟棋简历__ (1).pdf";

const buf = fs.readFileSync(pdfPath);
const text = await extractResumeText(buf, ".pdf");
const { parsed: heuristicParsed } = parseResumeHeuristic(text);
const parsed = enrichParsedResumeAwards(
  heuristicParsed,
  heuristicParsed.awards ?? [],
);
const mapped = mapParsedResumeToSite(parsed, defaultSiteContent);
const block = mapped.sitePatch.education[0]?.campusHighlights?.find(
  (b) => b.heading === "奖项荣誉",
);
const bullets = block?.bullets ?? [];

console.log("PDF:", pdfPath);
console.log("text length:", text.length);
console.log("UI 奖项荣誉:", bullets.length);
bullets.forEach((b, i) => console.log(`${i + 1}. ${b}`));

const keys = bullets.map(awardDedupeKey);
const dupKeys = keys.filter((k, i) => keys.indexOf(k) !== i);
const failed = dupKeys.length > 0 || bullets.some((b) => /^英语水平/.test(b));

console.log(dupKeys.length ? "FAIL duplicate keys" : "PASS no duplicate keys");
process.exit(failed ? 1 : 0);
