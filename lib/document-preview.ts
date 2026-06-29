import { OFFICE_DOC_EXTS } from "@/lib/upload-mime";

const PPTX_INLINE_EXTS = new Set([".pptx", ".ppsx", ".pptm"]);
const LEGACY_OFFICE_EXTS = new Set([".doc", ".ppt", ".pps"]);

export function documentExtFromSource(url: string, fileName?: string): string {
  const sources = [fileName ?? "", url.split("?")[0] ?? ""];
  for (const raw of sources) {
    if (!raw) continue;
    try {
      const decoded = decodeURIComponent(raw);
      const match = decoded.match(/(\.[a-z0-9]{2,5})$/i);
      if (!match) continue;
      const ext = match[1].toLowerCase();
      if (OFFICE_DOC_EXTS.has(ext)) return ext;
    } catch {
      // ignore malformed URI
    }
  }
  return "";
}

export type DocumentPreviewKind =
  | "pdf"
  | "docx"
  | "pptx"
  | "legacy-office"
  | "unsupported";

export function classifyDocumentPreview(
  url: string,
  fileName?: string,
): DocumentPreviewKind {
  const ext = documentExtFromSource(url, fileName);
  if (ext === ".pdf") return "pdf";
  if (ext === ".docx") return "docx";
  if (PPTX_INLINE_EXTS.has(ext)) return "pptx";
  if (LEGACY_OFFICE_EXTS.has(ext)) return "legacy-office";
  return "unsupported";
}

/** 浏览器内嵌预览建议上限：超过则提示下载（PDF 可稍大） */
export const DOCUMENT_INLINE_PREVIEW_MAX_BYTES = 20 * 1024 * 1024;
export const DOCUMENT_PDF_INLINE_PREVIEW_MAX_BYTES = 50 * 1024 * 1024;

export function shouldSuggestDownloadOnly(
  sizeBytes: number | undefined,
  kind: DocumentPreviewKind,
): boolean {
  if (!sizeBytes || sizeBytes <= 0) return false;
  if (kind === "pdf") return sizeBytes > DOCUMENT_PDF_INLINE_PREVIEW_MAX_BYTES;
  if (kind === "legacy-office" || kind === "unsupported") return true;
  return sizeBytes > DOCUMENT_INLINE_PREVIEW_MAX_BYTES;
}

export function documentDownloadHref(url: string): string {
  return `${url}${url.includes("?") ? "&" : "?"}download=1`;
}

export async function fetchDocumentByteSize(url: string): Promise<number | undefined> {
  try {
    const resp = await fetch(url, { method: "HEAD", cache: "no-store" });
    if (!resp.ok) return undefined;
    const len = resp.headers.get("content-length");
    if (!len) return undefined;
    const n = Number(len);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  } catch {
    return undefined;
  }
}
