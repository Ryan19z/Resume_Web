#!/usr/bin/env node
/**
 * 导入质量评分回归（无需 API）
 * node scripts/test-import-quality.mjs
 */
import { buildImportQualityReport } from "../lib/import-quality-review.ts";

const sampleParsed = {
  name: "侯钟棋",
  targetRole: "硬件工程师",
  contactEmail: "a@b.com",
  contactPhone: "13800000000",
  experience: [{ title: "实习", company: "某公司", period: "2024", keyResults: ["成果1"] }],
  education: [{ degree: "本科", school: "某大学", period: "2021-2025", highlights: [] }],
  projects: [
    { title: "智能车", period: "2023", bullets: ["要点1"], description: "desc" },
  ],
  awards: ["竞赛 省二等奖（2023.07）"],
};

const report = buildImportQualityReport({
  parsed: sampleParsed,
  warnings: [],
  confidence: 0.82,
  textLength: 3200,
  fileName: "resume.docx",
  method: "llm",
  llmFallback: false,
});

console.log("score=", report.score, "grade=", report.grade);
console.log("checklist=", report.checklist.length, "pass=", report.checklist.filter((c) => c.status === "pass").length);
if (report.score < 70 || report.grade === "needs_review") {
  console.error("FAIL: expected good sample to score reasonably");
  process.exit(1);
}
console.log("OK");
