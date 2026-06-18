import { isResumeParseExt } from "@/lib/resume-parse-formats";
import mammoth from "mammoth";

export { isResumeParseExt, resumeParseAcceptList } from "@/lib/resume-parse-formats";

function normalizeExtractedText(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[\t\f\v]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function extractFromPdf(buffer: Buffer): Promise<string> {
  // 动态导入，避免 Next 打包时拉取 pdf-parse 的测试文件
  const mod = await import("pdf-parse");
  const pdfParse = mod.default ?? mod;
  const result = await pdfParse(buffer);
  return typeof result.text === "string" ? result.text : "";
}

async function extractFromDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value ?? "";
}

function extractFromTxt(buffer: Buffer): string {
  const utf8 = buffer.toString("utf8");
  if (utf8.includes("\uFFFD") && buffer.length > 0) {
    return buffer.toString("latin1");
  }
  return utf8;
}

export async function extractResumeText(
  buffer: Buffer,
  ext: string,
): Promise<string> {
  const lower = ext.toLowerCase();
  let raw = "";

  if (lower === ".pdf") {
    raw = await extractFromPdf(buffer);
  } else if (lower === ".docx") {
    raw = await extractFromDocx(buffer);
  } else if (lower === ".doc") {
    // 旧版 .doc 二进制格式：尝试 docx 解析，失败则按文本读取
    try {
      raw = await extractFromDocx(buffer);
    } catch {
      raw = extractFromTxt(buffer);
    }
  } else if (lower === ".txt") {
    raw = extractFromTxt(buffer);
  } else {
    throw new Error("unsupported_format");
  }

  const text = normalizeExtractedText(raw);
  if (text.length < 20) {
    throw new Error("text_too_short");
  }
  return text;
}
