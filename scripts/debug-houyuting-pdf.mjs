import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { extractResumeText } from "../lib/server/resume-text-extract.ts";
import { parseResumeHeuristic } from "../lib/server/resume-parse-heuristic.ts";
import { mapParsedResumeToSite } from "../lib/resume-parse-mapper.ts";
import { defaultSiteContent } from "../lib/default-site-content.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pdfPath =
  process.argv[2] ??
  "c:/Users/linjj/Desktop/侯玉婷_4年+工作经验_美国本硕留学经历.pdf";

const buf = fs.readFileSync(pdfPath);
const text = await extractResumeText(buf, ".pdf");
const outPath = path.join(__dirname, "fixtures", "houyuting-resume-pdf.txt");
fs.writeFileSync(outPath, text, "utf8");

console.log("text length:", text.length);
console.log("\n--- TEXT ---\n");
console.log(text);
console.log("\n--- PARSE ---\n");

const { parsed, warnings } = parseResumeHeuristic(text);
const mapped = mapParsedResumeToSite(parsed, defaultSiteContent);

console.log("name:", parsed.name);
console.log("targetRole:", parsed.targetRole);
console.log("experience:", parsed.experience.length);
for (const [i, e] of parsed.experience.entries()) {
  console.log(
    `  exp ${i}: ${e.period} | co=${e.company} | title=${e.title} | bullets=${e.keyResults.length}`,
  );
  for (const b of e.keyResults.slice(0, 5)) console.log(`    - ${b.slice(0, 120)}`);
}
console.log("projects:", parsed.projects.length);
for (const [i, p] of parsed.projects.entries()) {
  console.log(
    `  proj ${i}: ${p.period ?? ""} | ${p.title} | bullets=${(p.bullets ?? []).length}`,
  );
}
console.log("\nmapped experience:");
for (const e of mapped.sitePatch.experience) {
  console.log(`  ${e.title} | ${e.subtitle} | keyResults=${e.keyResults.length}`);
}
console.log("\nmapped projectExperience:");
for (const e of mapped.sitePatch.projectExperience) {
  console.log(`  ${e.title} | keyResults=${e.keyResults.length} summary=${Boolean(e.summary)}`);
}
console.log("\nwarnings:", warnings);
