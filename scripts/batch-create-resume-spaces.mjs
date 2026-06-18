#!/usr/bin/env node
/**
 * 批量创建独立 resume 空间并导出 CSV。
 *
 * 用法：
 *   node scripts/batch-create-resume-spaces.mjs --count 20 --base https://linkola.cn --admin-key 你的密钥
 *
 * 环境变量（可选）：
 *   RESUME_SPACE_BASE_URL / RESUME_SPACE_ADMIN_KEY
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

function parseArgs(argv) {
  const opts = {
    count: 20,
    base: process.env.RESUME_SPACE_BASE_URL?.trim() || "https://linkola.cn",
    adminKey: process.env.RESUME_SPACE_ADMIN_KEY?.trim() || "",
    out: path.join(projectRoot, "linkola-url-sheet.csv"),
    labelPrefix: "客户",
  };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--count" && argv[i + 1]) opts.count = Number(argv[++i]) || opts.count;
    else if (arg === "--base" && argv[i + 1]) opts.base = argv[++i].replace(/\/$/, "");
    else if (arg === "--admin-key" && argv[i + 1]) opts.adminKey = argv[++i];
    else if (arg === "--out" && argv[i + 1]) opts.out = path.resolve(argv[++i]);
    else if (arg === "--label-prefix" && argv[i + 1]) opts.labelPrefix = argv[++i];
  }
  return opts;
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

async function createSpace(base, adminKey) {
  const resp = await fetch(`${base}/api/resume-space`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminKey }),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || !data?.ok || !data?.space) {
    throw new Error(
      data?.message || `HTTP ${resp.status}: 创建 resume 空间失败`,
    );
  }
  return data.space;
}

async function main() {
  const opts = parseArgs(process.argv);
  if (!opts.adminKey) {
    console.error("缺少 adminKey。请传 --admin-key 或设置 RESUME_SPACE_ADMIN_KEY。");
    process.exit(1);
  }
  if (!Number.isFinite(opts.count) || opts.count < 1 || opts.count > 200) {
    console.error("count 需在 1-200 之间。");
    process.exit(1);
  }

  const rows = [["编号", "备注", "resumeId", "EditURL", "ViewURL"]];
  console.log(`正在向 ${opts.base} 创建 ${opts.count} 个独立空间…`);

  for (let i = 1; i <= opts.count; i++) {
    const space = await createSpace(opts.base, opts.adminKey);
    rows.push([
      String(i),
      `${opts.labelPrefix}${String(i).padStart(2, "0")}`,
      space.resumeId,
      space.editUrl,
      space.viewUrl,
    ]);
    console.log(`  [${i}/${opts.count}] ${space.resumeId}`);
  }

  const csv = `${rows.map((row) => row.map(csvEscape).join(",")).join("\n")}\n`;
  await fs.writeFile(opts.out, csv, "utf8");
  console.log(`\n已写入：${opts.out}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
