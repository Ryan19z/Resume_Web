/**
 * 生成与在线演示站一致的传统纸质简历 PDF（中英文各一份）。
 * 版式参考国内常见单栏简历模板：居中抬头 + 右侧证件照 + 分区标题下划线。
 *
 * 用法：npm run demo:pdf
 */
import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import PDFDocument from "pdfkit";
import { buildClassicPaperResume } from "../lib/demo-classic-sample-content";

const projectRoot = path.resolve(import.meta.dirname ?? __dirname, "..");
const outDir = path.join(projectRoot, "public", "demo");

const PAGE = {
  marginX: 46,
  marginTop: 42,
  marginBottom: 42,
  width: 595.28,
  height: 841.89,
};

const COLORS = {
  ink: "#1a1a1a",
  muted: "#555555",
  line: "#222222",
};

/** 纸质简历常用行首标记（中文字体可正常显示） */
const BULLET = "·";

function resolveCjkFontPath(): string | null {
  const candidates =
    process.platform === "win32"
      ? [
          "C:/Windows/Fonts/simhei.ttf",
          "C:/Windows/Fonts/msyh.ttf",
          "C:/Windows/Fonts/simsun.ttf",
        ]
      : [
          "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
          "/System/Library/Fonts/STHeiti Light.ttc",
        ];
  return candidates.find((p) => fs.existsSync(p)) ?? null;
}

type Paper = ReturnType<typeof buildClassicPaperResume>;

function label(lang: "zh" | "en", zh: string, en: string): string {
  return lang === "zh" ? zh : en;
}

async function downloadPortrait(url: string, dest: string): Promise<string | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const buf = Buffer.from(await resp.arrayBuffer());
    await fsPromises.mkdir(path.dirname(dest), { recursive: true });
    await fsPromises.writeFile(dest, buf);
    return dest;
  } catch {
    return null;
  }
}

type PdfFonts = { regular: string; bold: string };

function createLayout(doc: PDFKit.PDFDocument, fonts: PdfFonts, contentWidth: number) {
  let y = PAGE.marginTop;

  const ensureSpace = (need: number) => {
    if (y + need <= PAGE.height - PAGE.marginBottom) return;
    doc.addPage();
    y = PAGE.marginTop;
  };

  const sectionTitle = (title: string) => {
    ensureSpace(28);
    doc
      .font(fonts.bold)
      .fontSize(12)
      .fillColor(COLORS.ink)
      .text(title, PAGE.marginX, y, { width: contentWidth });
    y += 16;
    doc
      .strokeColor(COLORS.line)
      .lineWidth(0.9)
      .moveTo(PAGE.marginX, y)
      .lineTo(PAGE.marginX + contentWidth, y)
      .stroke();
    y += 10;
  };

  const rowHeadline = (left: string, right: string) => {
    ensureSpace(20);
    const rightWidth = 118;
    doc
      .font(fonts.bold)
      .fontSize(10.5)
      .fillColor(COLORS.ink)
      .text(left, PAGE.marginX, y, { width: contentWidth - rightWidth - 8 });
    doc
      .font(fonts.regular)
      .fontSize(10)
      .fillColor(COLORS.muted)
      .text(right, PAGE.marginX, y, { width: contentWidth, align: "right" });
    y += 16;
  };

  const paragraph = (text: string, opts?: { size?: number; gap?: number }) => {
    const size = opts?.size ?? 10;
    const gap = opts?.gap ?? 4;
    doc.font(fonts.regular).fontSize(size).fillColor(COLORS.ink);
    const h = doc.heightOfString(text, {
      width: contentWidth,
      lineGap: gap,
    });
    ensureSpace(h + 4);
    doc.text(text, PAGE.marginX, y, { width: contentWidth, lineGap: gap });
    y += h + 8;
  };

  const bullets = (items: string[]) => {
    const bulletIndent = 14;
    for (const item of items) {
      doc.font(fonts.regular).fontSize(10).fillColor(COLORS.ink);
      const line = `${BULLET} ${item}`;
      const h = doc.heightOfString(line, {
        width: contentWidth,
        indent: bulletIndent,
        lineGap: 2,
      });
      ensureSpace(h + 2);
      doc.text(line, PAGE.marginX, y, {
        width: contentWidth,
        indent: bulletIndent,
        lineGap: 2,
      });
      y += h + 3;
    }
    y += 4;
  };

  return {
    get y() {
      return y;
    },
    set y(v: number) {
      y = v;
    },
    ensureSpace,
    sectionTitle,
    rowHeadline,
    paragraph,
    bullets,
  };
}

async function renderPdf(paper: Paper, outPath: string): Promise<void> {
  const tmpPath = `${outPath}.tmp-${process.pid}`;
  const cjkFont = paper.lang === "zh" ? resolveCjkFontPath() : null;
  const fonts: PdfFonts = {
    regular: cjkFont ?? "Helvetica",
    bold: cjkFont ?? "Helvetica-Bold",
  };

  const portraitCache = path.join(outDir, ".portrait-cache.jpg");
  const portraitPath = await downloadPortrait(paper.portraitUrl, portraitCache);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: PAGE.marginTop, bottom: PAGE.marginBottom, left: PAGE.marginX, right: PAGE.marginX },
      info: {
        Title:
          paper.lang === "zh"
            ? `${paper.name} - 简历样例`
            : `${paper.name} - Sample Résumé`,
        Author: "Linkola Demo",
        Subject: paper.disclaimer,
      },
    });
    const stream = fs.createWriteStream(tmpPath);
    doc.pipe(stream);

    const contentWidth = PAGE.width - PAGE.marginX * 2;
    const photoW = 86;
    const photoH = 108;
    const photoX = PAGE.marginX + contentWidth - photoW;
    const headerCenterWidth = contentWidth - photoW - 14;

    if (portraitPath && fs.existsSync(portraitPath)) {
      doc
        .roundedRect(photoX - 1, PAGE.marginTop - 1, photoW + 2, photoH + 2, 4)
        .strokeColor("#dddddd")
        .lineWidth(0.8)
        .stroke();
      doc.image(portraitPath, photoX, PAGE.marginTop, {
        fit: [photoW, photoH],
        align: "center",
        valign: "center",
      });
    }

    let hy = PAGE.marginTop + 4;
    doc
      .font(fonts.bold)
      .fontSize(24)
      .fillColor(COLORS.ink)
      .text(paper.name, PAGE.marginX, hy, {
        width: headerCenterWidth,
        align: "center",
      });
    hy += 34;
    doc
      .font(fonts.regular)
      .fontSize(10)
      .fillColor(COLORS.ink)
      .text(paper.intentLine, PAGE.marginX, hy, {
        width: headerCenterWidth,
        align: "center",
      });
    hy += 16;
    doc.text(paper.personalLine, PAGE.marginX, hy, {
      width: headerCenterWidth,
      align: "center",
    });
    hy += 16;
    doc.text(`${paper.contact.phone} | ${paper.contact.email}`, PAGE.marginX, hy, {
      width: headerCenterWidth,
      align: "center",
    });

    const layout = createLayout(doc, fonts, contentWidth);
    layout.y = Math.max(hy + 24, PAGE.marginTop + photoH + 12);

    layout.sectionTitle(label(paper.lang, "教育背景", "Education"));
    for (const edu of paper.education) {
      layout.rowHeadline(`${edu.school} - ${edu.degree}`, edu.period);
      if (edu.detail) layout.paragraph(edu.detail, { gap: 3 });
      if (edu.bullets.length) layout.bullets(edu.bullets);
    }

    layout.sectionTitle(label(paper.lang, "工作经历", "Experience"));
    for (const job of paper.experience) {
      layout.rowHeadline(`${job.company} - ${job.title}`, job.period);
      if (job.summary) layout.paragraph(job.summary, { size: 10, gap: 2 });
      layout.bullets(job.bullets);
    }
    for (const proj of paper.projects) {
      layout.rowHeadline(`${proj.org} - ${proj.title}`, proj.period);
      if (proj.summary) layout.paragraph(proj.summary, { size: 10, gap: 2 });
      layout.bullets(proj.bullets);
    }

    layout.sectionTitle(label(paper.lang, "技能特长", "Skills"));
    for (const note of paper.skillNotes) layout.paragraph(note, { gap: 3 });
    layout.paragraph(
      (paper.lang === "zh" ? "熟练掌握：" : "Proficient in: ") +
        paper.skills.join(" · "),
      { gap: 2 },
    );

    layout.sectionTitle(label(paper.lang, "荣誉证书", "Honors & Certificates"));
    layout.bullets(paper.honors);

    layout.sectionTitle(label(paper.lang, "自我评价", "Summary"));
    layout.paragraph(paper.selfEvaluation, { gap: 4 });

    layout.ensureSpace(20);
    doc
      .font(fonts.regular)
      .fontSize(8)
      .fillColor("#888888")
      .text(paper.disclaimer, PAGE.marginX, layout.y, {
        width: contentWidth,
        align: "center",
      });

    doc.end();
    stream.on("finish", async () => {
      try {
        await fsPromises.rename(tmpPath, outPath);
      } catch {
        try {
          await fsPromises.copyFile(tmpPath, outPath);
          await fsPromises.unlink(tmpPath).catch(() => {});
        } catch {
          const stamp = new Date().toISOString().replace(/[:.]/g, "-");
          const fallback = outPath.replace(
            /\.pdf$/i,
            `.${stamp}.pdf`,
          );
          await fsPromises.copyFile(tmpPath, fallback);
          await fsPromises.unlink(tmpPath).catch(() => {});
          console.warn(
            `目标 PDF 被占用，已写入 ${path.relative(projectRoot, fallback)}（请关闭旧 PDF 后重跑 demo:pdf）`,
          );
        }
      }
      resolve();
    });
    stream.on("error", reject);
  });
}

function renderHtml(paper: Paper): string {
  const esc = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const section = (title: string, inner: string) =>
    `<section class="block"><h2>${esc(title)}</h2><div class="rule"></div>${inner}</section>`;

  const row = (left: string, right: string) =>
    `<div class="row-head"><span class="row-left">${esc(left)}</span><span class="row-right">${esc(right)}</span></div>`;

  const listItems = (items: string[]) =>
    `<ul class="plain-list">${items.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>`;

  const expHtml = [...paper.experience, ...paper.projects]
    .map((e) => {
      const org = "company" in e ? e.company : e.org;
      return `${row(`${org} - ${e.title}`, e.period)}${e.summary ? `<p class="muted">${esc(e.summary)}</p>` : ""}${listItems(e.bullets)}`;
    })
    .join("");

  const eduHtml = paper.education
    .map(
      (e) =>
        `${row(`${e.school} - ${e.degree}`, e.period)}${e.detail ? `<p>${esc(e.detail)}</p>` : ""}${listItems(e.bullets)}`,
    )
    .join("");

  const skillsHtml = `${paper.skillNotes.map((n) => `<p class="skill-note">${esc(n)}</p>`).join("")}<p class="skill-note">${esc((paper.lang === "zh" ? "熟练掌握：" : "Proficient in: ") + paper.skills.join(" · "))}</p>`;

  return `<!DOCTYPE html>
<html lang="${paper.lang === "zh" ? "zh-CN" : "en"}">
<head>
  <meta charset="utf-8" />
  <title>${esc(paper.name)} — ${paper.lang === "zh" ? "传统简历样例" : "Classic résumé sample"}</title>
  <style>
    @page { size: A4; margin: 14mm 13mm; }
    * { box-sizing: border-box; }
    body { font-family: "Microsoft YaHei", "PingFang SC", "Segoe UI", sans-serif; color: #1a1a1a; font-size: 10.5pt; line-height: 1.5; margin: 0; }
    .page { max-width: 210mm; margin: 0 auto; padding: 8mm 0 10mm; }
    .header { position: relative; text-align: center; padding-right: 96px; min-height: 112px; margin-bottom: 10px; }
    .header h1 { font-size: 24pt; margin: 0 0 8px; letter-spacing: 0.08em; }
    .header p { margin: 4px 0; font-size: 10pt; }
    .photo { position: absolute; top: 0; right: 0; width: 86px; height: 108px; object-fit: cover; border: 1px solid #ddd; border-radius: 4px; }
    .block { margin-top: 14px; }
    .block h2 { font-size: 12pt; margin: 0 0 6px; font-weight: 700; }
    .rule { height: 0; border-top: 1px solid #222; margin-bottom: 10px; }
    .row-head { display: flex; justify-content: space-between; gap: 12px; font-weight: 700; margin: 2px 0 4px; }
    .row-right { font-weight: 400; color: #555; white-space: nowrap; }
    .muted { color: #555; margin: 0 0 4px; }
    .plain-list { margin: 0 0 8px; padding-left: 0; list-style: none; }
    .plain-list li { margin: 2px 0; padding-left: 1.1em; text-indent: -1.1em; }
    .plain-list li::before { content: "· "; }
    .skill-note { margin: 0 0 6px; }
    .disclaimer { margin-top: 18px; font-size: 8pt; color: #888; text-align: center; }
    @media print { .page { padding: 0; } }
  </style>
</head>
<body>
  <div class="page">
    <header class="header">
      <img class="photo" src="${esc(paper.portraitUrl)}" alt="" />
      <h1>${esc(paper.name)}</h1>
      <p>${esc(paper.intentLine)}</p>
      <p>${esc(paper.personalLine)}</p>
      <p>${esc(paper.contact.phone)} | ${esc(paper.contact.email)}</p>
    </header>
    ${section(paper.lang === "zh" ? "教育背景" : "Education", eduHtml)}
    ${section(paper.lang === "zh" ? "工作经历" : "Experience", expHtml)}
    ${section(paper.lang === "zh" ? "技能特长" : "Skills", skillsHtml)}
    ${section(paper.lang === "zh" ? "荣誉证书" : "Honors & Certificates", listItems(paper.honors))}
    ${section(paper.lang === "zh" ? "自我评价" : "Summary", `<p>${esc(paper.selfEvaluation)}</p>`)}
    <p class="disclaimer">${esc(paper.disclaimer)}</p>
  </div>
</body>
</html>`;
}

async function main() {
  await fsPromises.mkdir(outDir, { recursive: true });

  for (const lang of ["zh", "en"] as const) {
    const paper = buildClassicPaperResume(lang);
    const suffix = lang === "zh" ? "zh" : "en";
    const pdfPath = path.join(outDir, `classic-sample-resume-${suffix}.pdf`);
    const htmlPath = path.join(outDir, `classic-sample-resume-${suffix}.html`);
    await renderPdf(paper, pdfPath);
    await fsPromises.writeFile(htmlPath, renderHtml(paper), "utf8");
    console.log(`Wrote ${path.relative(projectRoot, pdfPath)}`);
    console.log(`Wrote ${path.relative(projectRoot, htmlPath)}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
