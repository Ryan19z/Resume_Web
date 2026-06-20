/**
 * 奖项语义去重测试（PDF 提取文本）
 * npx tsx scripts/test-award-dedupe-pdf.mjs [fixture-path]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parseResumeHeuristic } from "../lib/server/resume-parse-heuristic.ts";
import {
  enrichParsedResumeAwards,
  normalizeAwardList,
} from "../lib/server/resume-parse-reconcile.ts";
import { mapParsedResumeToSite } from "../lib/resume-parse-mapper.ts";
import { defaultSiteContent } from "../lib/default-site-content.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture =
  process.argv[2] ??
  path.join(__dirname, "fixtures", "hou-resume-pdf.txt");

const text = fs.readFileSync(fixture, "utf8");
const { parsed: heuristicParsed } = parseResumeHeuristic(text);

// 模拟 API：LLM 奖项 + 规则引擎 fallback（常见重复来源）
const llmLikeAwards = (heuristicParsed.awards ?? []).map((a) =>
  a.replace(/（(\d{4}[.\-/年]\d{1,2})）/g, " $1"),
);

const parsed = enrichParsedResumeAwards(
  { ...heuristicParsed, awards: llmLikeAwards },
  heuristicParsed.awards ?? [],
);

const mapped = mapParsedResumeToSite(parsed, defaultSiteContent);
const block = mapped.sitePatch.education[0]?.campusHighlights?.find(
  (b) => b.heading === "奖项荣誉",
);

console.log("=== 输入来源 ===");
console.log("heuristic awards:", heuristicParsed.awards?.length);
console.log("enriched awards:", parsed.awards?.length);
console.log("UI 奖项荣誉条数:", block?.bullets.length ?? 0);
console.log("\n=== UI bullets ===");
block?.bullets.forEach((b, i) => console.log(`${i + 1}. ${b}`));

const dupes = findNearDuplicates(block?.bullets ?? []);
if (dupes.length) {
  console.log("\n=== 疑似重复对 ===");
  dupes.forEach(([a, b]) => console.log("-", a, "\n ", b));
}

const asserts = [
  ["ui_count_lte_7", (block?.bullets.length ?? 0) <= 7],
  ["no_near_duplicates", dupes.length === 0],
  ["has_smart_car", (block?.bullets ?? []).some((b) => /智能车/.test(b))],
  [
    "cet_not_in_awards",
    !(block?.bullets ?? []).some((b) => /^英语水平/.test(b)),
  ],
];

let failed = 0;
for (const [label, ok] of asserts) {
  console.log(ok ? "PASS" : "FAIL", label);
  if (!ok) failed++;
}
process.exit(failed ? 1 : 0);

function normalizeAwardKey(s) {
  return s
    .replace(/^[\s\u25a1\u25aa\u2022\u00b7\u25cf□■●◆◇▪◦❖\-*]+/g, "")
    .replace(/[（(](\d{4}[.\-/年]?\d{1,2}(?:[.\-/月]?\d{1,2})?)[)）]/g, "$1")
    .replace(/\s+/g, "")
    .replace(/[，,、；;：:]/g, "")
    .toLowerCase();
}

function findNearDuplicates(items) {
  const out = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const ki = normalizeAwardKey(items[i]);
      const kj = normalizeAwardKey(items[j]);
      if (!ki || !kj) continue;
      if (ki === kj || ki.includes(kj) || kj.includes(ki)) {
        out.push([items[i], items[j]]);
      }
    }
  }
  return out;
}
