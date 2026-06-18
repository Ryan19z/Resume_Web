/**
 * 模拟 LLM 误拆项目 → 合并后应恢复为 3 条（侯钟棋简历）
 * npx tsx scripts/test-project-consolidate.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parseResumeHeuristic } from "../lib/server/resume-parse-heuristic.ts";
import {
  autoClassifyResumeContent,
  consolidateFragmentedProjects,
  reconcileProjectList,
} from "../lib/server/resume-parse-reconcile.ts";
import { mapParsedResumeToSite } from "../lib/resume-parse-mapper.ts";
import { defaultSiteContent } from "../lib/default-site-content.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const text = fs.readFileSync(
  path.join(__dirname, "fixtures", "houzhongqi-resume-extract.txt"),
  "utf8",
);

const { parsed: heuristicParsed } = parseResumeHeuristic(text);

/** 模拟 DeepSeek 把每条 bullet 拆成独立 project 的输出 */
const fragmented = [
  {
    title: "惯导定位越野车（英飞凌TC264/TC377）",
    period: "2022.12-2023.08",
    role: "项目成员",
    bullets: [],
  },
  {
    title:
      "根据比赛规定，要求车辆完成跑圈要求。通过商讨制定策略，使用GPS+IMU方案作为车辆的感知系统，完成比赛。",
    period: "",
    role: "项目成员",
    bullets: [],
  },
  {
    title:
      "对比GPS_TAU1201(UART驱动)与IMU660RA(SPI驱动)外设传感器功能方案，采用GPS与IMU传感器融合",
    period: "",
    role: "项目成员",
    bullets: [],
  },
  {
    title: "算法，通过互补算法提升数据实时性。缩短越野车循迹响应时间，减少2s比赛用时",
    period: "",
    role: "项目成员",
    bullets: [],
  },
  {
    title: "自动红外循迹系统（德州仪器MSPM0G3507）",
    period: "2024.07-2024.08",
    role: "项目成员",
    bullets: [],
  },
  {
    title:
      "针对循迹场景，以MPU6050 + 红外循迹模块为导向设计自动循迹系统，为循迹提供可行方案",
    period: "",
    role: "项目成员",
    bullets: [],
  },
  {
    title: "使用Keil5 ARM平台，通过SysConfig图形化配置GPIO/UART外设，缩短开发周期20%",
    period: "",
    role: "项目成员",
    bullets: [],
  },
  {
    title: "基于μC/OS-II车载电控单元（STM32F103C8T6）",
    period: "2025.02-2025.04",
    role: "项目成员",
    bullets: [],
  },
  {
    title: "嘉立创 EDA 绘制 PCB 对该项目进行学习",
    period: "",
    role: "项目成员",
    bullets: [],
  },
  {
    title:
      "项目成果：构建毫秒级响应系统，障碍物识别响应延迟<50ms，在μC/OS-II环境下，电机成功切换不同档位",
    period: "",
    role: "项目成员",
    bullets: [],
  },
];

const consolidated = consolidateFragmentedProjects(fragmented);
const reconciled = reconcileProjectList(fragmented, heuristicParsed.projects);
const mapped = mapParsedResumeToSite(
  { ...heuristicParsed, projects: reconciled.projects },
  defaultSiteContent,
);

const withBasketball = autoClassifyResumeContent({
  ...heuristicParsed,
  projects: [
    ...reconciled.projects,
    {
      title: "院篮球队成员",
      period: "2022-2023",
      role: "院篮球队成员",
      description: "获院级比赛亚军、季军",
      bullets: [],
    },
  ],
}).parsed;

console.log("=== 项目误拆合并测试（侯钟棋） ===\n");
console.log("模拟 LLM 误拆:", fragmented.length, "条");
console.log("仅合并:", consolidated.length, "条");
console.log("合并+规则回退:", reconciled.projects.length, "条");
for (const p of reconciled.projects) {
  console.log(`  · ${p.period ?? ""} | ${p.title} | bullets=${p.bullets?.length ?? 0}`);
}

const asserts = [
  ["heuristic_three", heuristicParsed.projects.length === 3],
  ["consolidated_le_three", consolidated.length <= 4],
  ["reconciled_three", reconciled.projects.length === 3],
  [
    "mapped_three",
    mapped.sitePatch.projectExperience.length === 3,
  ],
  [
    "first_project_bullets",
    (reconciled.projects[0]?.bullets?.length ?? 0) >= 2,
  ],
  [
    "basketball_relocated",
    !withBasketball.projects.some((p) => /篮球队/.test(p.title)),
  ],
  [
    "basketball_in_campus",
    (withBasketball.education[0]?.campusExperiences ?? []).some((c) =>
      /篮球队/.test(c.role),
    ),
  ],
];

let failed = 0;
for (const [label, ok] of asserts) {
  console.log(ok ? "PASS" : "FAIL", label);
  if (!ok) failed++;
}
process.exit(failed ? 1 : 0);
