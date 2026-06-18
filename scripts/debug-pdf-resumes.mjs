import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { extractResumeText } from "../lib/server/resume-text-extract.ts";
import { parseResumeHeuristic } from "../lib/server/resume-parse-heuristic.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "fixtures");

const files = [
  path.join(__dirname, "fixtures", "hou-resume.pdf"),
  path.join(__dirname, "fixtures", "wu-resume.pdf"),
];

for (const p of files) {
  console.log("\n========", p, "========");
  const buf = fs.readFileSync(p);
  const text = await extractResumeText(buf, path.extname(p));
  const base = path.basename(p, ".pdf").replace(/[^\w\u4e00-\u9fff-]+/g, "_");
  fs.writeFileSync(path.join(outDir, `${base}.txt`), text, "utf8");
  console.log("text length:", text.length);
  console.log(text.slice(0, 5000));
  const { parsed, confidence } = parseResumeHeuristic(text);
  console.log("\n--- PARSED confidence:", confidence);
  console.log("name:", parsed.name, "role:", parsed.targetRole);
  console.log("experience:", parsed.experience.length);
  for (const [i, e] of parsed.experience.entries()) {
    console.log(
      `  exp ${i}: ${e.period} | co=${e.company} | title=${e.title} | bullets=${e.keyResults.length}`,
    );
    for (const b of e.keyResults.slice(0, 3)) console.log(`    - ${b.slice(0, 100)}`);
  }
  console.log("projects:", parsed.projects.length);
  for (const [i, pr] of parsed.projects.entries()) {
    console.log(`  proj ${i}: ${pr.title?.slice(0, 80)}`);
    if (pr.description) console.log(`    desc: ${pr.description.slice(0, 120)}`);
  }
}
