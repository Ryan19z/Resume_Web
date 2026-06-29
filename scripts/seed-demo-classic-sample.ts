/**
 * 创建 / 刷新推流演示专用 resume（固定 ID：r_demo_classic001，链接长期有效）
 *
 * 用法：npm run seed:demo
 */
import fs from "fs/promises";
import path from "path";
import { buildDemoClassicSampleBundle } from "../lib/demo-classic-sample-content";
import { ensureDemoClassicSampleSpace } from "../lib/server/demo-resume-seed";

const projectRoot = path.resolve(import.meta.dirname ?? __dirname, "..");
const bundleExportPath = path.join(projectRoot, "data", "demo-classic-sample.bundle.json");
const linksExportPath = path.join(projectRoot, "public", "demo", "demo-resume-links.json");

async function main() {
  const savedAt = Date.now();
  const bundleZh = buildDemoClassicSampleBundle("zh", savedAt);

  await fs.mkdir(path.dirname(bundleExportPath), { recursive: true });
  await fs.writeFile(
    bundleExportPath,
    JSON.stringify({ fileVersion: 1, updatedAt: savedAt, bundle: bundleZh }, null, 2),
    "utf8",
  );

  const result = await ensureDemoClassicSampleSpace();

  const payload = {
    ...result,
    bundleFile: path.relative(projectRoot, bundleExportPath),
    pdfZh: "public/demo/classic-sample-resume-zh.pdf",
    pdfEn: "public/demo/classic-sample-resume-en.pdf",
    htmlZh: "public/demo/classic-sample-resume-zh.html",
    htmlEn: "public/demo/classic-sample-resume-en.html",
    note: "viewUrlProd 为线上对比链接；本地调试请先 npm run dev 后打开 viewUrlLocal",
  };

  await fs.mkdir(path.dirname(linksExportPath), { recursive: true });
  await fs.writeFile(linksExportPath, JSON.stringify(payload, null, 2), "utf8");

  console.log(JSON.stringify(payload, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
