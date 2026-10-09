import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const chrome =
  process.env.CHROME_PATH ||
  ["/usr/local/bin/google-chrome", "/usr/local/bin/chrome", "/usr/bin/google-chrome"].find((p) =>
    fs.existsSync(p),
  );

if (!chrome) {
  console.error("Chrome not found");
  process.exit(1);
}

const files = [
  "侯钟棋-海外技术支持-中文-一页版.html",
  "侯钟棋-海外技术支持-中文-两页版.html",
  "Hou-Zhongqi-Overseas-Technical-Support-EN-1page.html",
  "Hou-Zhongqi-Overseas-Technical-Support-EN-2page.html",
];

const outDir = path.join(__dirname, "pdf");
fs.mkdirSync(outDir, { recursive: true });

for (const file of files) {
  const htmlPath = path.join(__dirname, file);
  const pdfPath = path.join(outDir, file.replace(/\.html$/, ".pdf"));
  const ud = fs.mkdtempSync(path.join(os.tmpdir(), "resume-pdf-"));
  const fileUrl = `file://${htmlPath}`;
  try {
    execFileSync(
      "timeout",
      [
        "40s",
        chrome,
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--disable-dev-shm-usage",
        `--user-data-dir=${ud}`,
        "--no-pdf-header-footer",
        "--print-to-pdf-no-header",
        `--print-to-pdf=${pdfPath}`,
        fileUrl,
      ],
      { stdio: "inherit" },
    );
  } catch {
    // Chrome may hang after writing PDF; timeout is expected.
  }
  if (!fs.existsSync(pdfPath)) {
    console.error("Failed:", pdfPath);
    process.exitCode = 1;
  } else {
    console.log("Wrote", pdfPath);
  }
}
