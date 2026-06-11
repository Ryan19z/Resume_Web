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
