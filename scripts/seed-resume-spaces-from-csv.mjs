#!/usr/bin/env node
/**
 * 将 CSV 中的 resume 空间重置为「新客户空白模板」（示例邮箱等）。
 * 仅当该空间尚未发布过内容，或你确认要覆盖时使用。
 *
 * 用法：
 *   node scripts/seed-resume-spaces-from-csv.mjs --csv linkola-url-sheet.csv --base https://linkola.cn
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

function parseArgs(argv) {
  const opts = {
    csv: path.join(projectRoot, "linkola-url-sheet.csv"),
    base: "https://linkola.cn",
  };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--csv" && argv[i + 1]) opts.csv = path.resolve(argv[++i]);
    if (argv[i] === "--base" && argv[i + 1]) opts.base = argv[++i].replace(/\/$/, "");
  }
  return opts;
}

function parseCsvLine(line) {
  const cells = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      cells.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  return cells;
}

async function loadDefaultBundle() {
  const starterPath = path.join(projectRoot, "scripts", "new-customer-starter.bundle.json");
  try {
    return JSON.parse(await fs.readFile(starterPath, "utf8"));
  } catch {
    const mod = await import("../lib/persist-site.ts");
    return mod.buildNewCustomerDefaultBundle();
  }
}

async function seedOne(base, resumeId, editToken, bundle) {
  const url = `${base}/api/site?resumeId=${encodeURIComponent(resumeId)}&editToken=${encodeURIComponent(editToken)}&lang=zh`;
  const resp = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bundle),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || !data.ok) {
    throw new Error(data.message || `HTTP ${resp.status}`);
  }
}

async function main() {
  const opts = parseArgs(process.argv);
  const text = await fs.readFile(opts.csv, "utf8");
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) {
    console.error("CSV 无数据行。");
    process.exit(1);
  }

  const header = parseCsvLine(lines[0]);
  const editIdx = header.indexOf("EditURL");
  const idIdx = header.indexOf("resumeId");
  if (editIdx < 0) {
    console.error("CSV 缺少 EditURL 列。");
    process.exit(1);
  }

  const bundle = await loadDefaultBundle();
  console.log(`向 ${opts.base} 写入空白模板（邮箱: ${bundle.site.contactEmail}）…`);

  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvLine(lines[i]);
    const editUrl = row[editIdx];
    const resumeId = idIdx >= 0 ? row[idIdx] : "";
    if (!editUrl) continue;
    const u = new URL(editUrl);
    const rid = resumeId || u.searchParams.get("resumeId");
    const editToken = u.searchParams.get("editToken");
    if (!rid || !editToken) {
      console.warn(`  跳过第 ${i} 行：缺少 resumeId/editToken`);
      continue;
    }
    await seedOne(opts.base, rid, editToken, bundle);
    console.log(`  [${i}/${lines.length - 1}] ${rid}`);
  }

  console.log("\n完成。");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
