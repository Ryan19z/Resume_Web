/**
 * 简历解析单元测试（无需启动 Next，直接测规则引擎 + 映射）
 * 运行：npm run test:resume-parse
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// 通过 tsx 或 next 编译前，用 require 加载编译产物；开发时用 ts-node/tsx 更佳。
// 此处内联最小化测试：读取 fixture，调用已编译的 heuristic（若不可用则内联断言）

const fixturePath = path.join(__dirname, "fixtures", "sample-resume-zh.txt");
const text = fs.readFileSync(fixturePath, "utf8");

let parseResumeHeuristic;
let mapParsedResumeToSite;

try {
  // 尝试加载 tsx 编译路径（用户本地 npm run test:resume-parse 前需 npm install）
  const tsx = await import("tsx/esm/api").catch(() => null);
  if (tsx?.register) {
    tsx.register();
  }
  const h = await import("../lib/server/resume-parse-heuristic.ts");
  const m = await import("../lib/resume-parse-mapper.ts");
  const d = await import("../lib/default-site-content.ts");
  parseResumeHeuristic = h.parseResumeHeuristic;
  mapParsedResumeToSite = (parsed) =>
    m.mapParsedResumeToSite(parsed, d.defaultSiteContent);
} catch (e) {
  console.error(
    "无法加载 TypeScript 模块。请先执行 npm install，并安装 tsx：npm install -D tsx",
  );
  console.error(e);
  process.exit(1);
}

const { parsed, confidence } = parseResumeHeuristic(text);
const mapped = mapParsedResumeToSite(parsed);

console.log("=== 简历解析测试 ===\n");
console.log("置信度:", Math.round(confidence * 100) + "%");
console.log("识别字段:", mapped.fieldsFilled.join(", "));
console.log("\n--- 基本信息 ---");
console.log("姓名:", parsed.name);
console.log("岗位:", parsed.targetRole);
console.log("邮箱:", parsed.contactEmail);
console.log("电话:", parsed.contactPhone);
console.log("\n--- 工作经历 (" + parsed.experience.length + ") ---");
for (const e of parsed.experience) {
  console.log(`  · ${e.period} | ${e.company} | ${e.title}`);
  for (const b of e.keyResults.slice(0, 2)) console.log(`    - ${b}`);
}
console.log("\n--- 教育 (" + parsed.education.length + ") ---");
for (const e of parsed.education) {
  console.log(`  · ${e.period} | ${e.school} | ${e.degree}`);
}
console.log("\n--- 技能 ---");
console.log(parsed.transferableSkills?.join(", "));
console.log("\n--- 项目 (" + parsed.projects.length + ") ---");
for (const p of parsed.projects) console.log(`  · ${p.title}`);

const asserts = [
  ["name", parsed.name === "李明"],
  ["email", parsed.contactEmail === "liming@example.com"],
  ["phone", parsed.contactPhone === "13800138000"],
  ["experience>=2", parsed.experience.length >= 2],
  ["education>=1", parsed.education.length >= 1],
  ["skills", (parsed.transferableSkills?.length ?? 0) >= 3],
  ["projects>=2", parsed.projects.length >= 2],
  ["fieldsFilled", mapped.fieldsFilled.length >= 5],
];

let failed = 0;
for (const [label, ok] of asserts) {
  if (!ok) {
    console.error("FAIL:", label);
    failed++;
  } else {
    console.log("PASS:", label);
  }
}

if (failed > 0) {
  console.error(`\n${failed} 项断言失败`);
  process.exit(1);
}
console.log("\n全部测试通过 ✓");
