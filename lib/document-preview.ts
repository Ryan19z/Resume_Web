import { OFFICE_DOC_EXTS } from "@/lib/upload-mime";

const OFFICE_INLINE_EXTS = new Set([
  ".doc",
  ".docx",
  ".ppt",
  ".pptx",
  ".pptm",
  ".pps",
  ".ppsx",
]);

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

export type DocumentPreviewKind = "pdf" | "office" | "unsupported";

export function resolveDocumentPreview(
  url: string,
  options?: { fileName?: string; origin?: string },
): { kind: DocumentPreviewKind; embedSrc: string | null } {
  const trimmed = url.trim();
  if (!trimmed) return { kind: "unsupported", embedSrc: null };

  const ext = documentExtFromSource(trimmed, options?.fileName);
  if (ext === ".pdf") {
    return { kind: "pdf", embedSrc: trimmed };
  }

  if (OFFICE_INLINE_EXTS.has(ext)) {
    const origin =
      options?.origin ??
      (typeof window !== "undefined" ? window.location.origin : "");
    const absolute = trimmed.startsWith("http")
      ? trimmed
      : `${origin}${trimmed.startsWith("/") ? "" : "/"}${trimmed}`;
    return {
      kind: "office",
      embedSrc: `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(absolute)}`,
    };
  }

  return { kind: "unsupported", embedSrc: null };
}
