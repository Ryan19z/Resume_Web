export const OFFICE_DOC_EXTS = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".ppt",
  ".pptx",
  ".pps",
  ".ppsx",
  ".pptm",
]);

export const ALLOWED_UPLOAD_EXTS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".mp4",
  ".webm",
  ".mov",
  ...OFFICE_DOC_EXTS,
]);

export const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    ".docx",
  "application/vnd.ms-powerpoint": ".ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    ".pptx",
  "application/vnd.openxmlformats-officedocument.presentationml.slideshow":
    ".ppsx",
  "application/vnd.ms-powerpoint.presentation.macroenabled.12": ".pptm",
  "application/powerpoint": ".ppt",
  "application/x-mspowerpoint": ".ppt",
};

/** Office 压缩包格式常被浏览器误报为 zip */
const ZIP_LIKE_OFFICE_EXTS = new Set([".docx", ".pptx", ".ppsx"]);

export function isAllowedUploadExt(ext: string): boolean {
  return ALLOWED_UPLOAD_EXTS.has(ext.toLowerCase());
}

export function extFromFileName(fileName: string): string {
  const base = fileName.split(/[/\\]/).pop() ?? "";
  const dot = base.lastIndexOf(".");
  if (dot <= 0 || dot >= base.length - 1) return "";
  const ext = base.slice(dot).toLowerCase();
  return isAllowedUploadExt(ext) ? ext : "";
}

function extFromRawFileName(fileName: string): string {
  const base = fileName.split(/[/\\]/).pop() ?? "";
  const dot = base.lastIndexOf(".");
  if (dot <= 0 || dot >= base.length - 1) return "";
  return base.slice(dot).toLowerCase();
}

export function resolveExtFromNameAndMime(
  fileName: string,
  mimeType = "",
): string | null {
  const fromName = extFromFileName(fileName);
  if (fromName) return fromName;

  const mime = mimeType.toLowerCase().split(";")[0]?.trim() ?? "";
  const fromMime = MIME_TO_EXT[mime];
  if (fromMime && isAllowedUploadExt(fromMime)) return fromMime;

  if (
    mime === "application/zip" ||
    mime === "application/x-zip-compressed" ||
    mime === "application/octet-stream"
  ) {
    const rawExt = extFromRawFileName(fileName);
    if (rawExt && isAllowedUploadExt(rawExt)) return rawExt;
  }

  return null;
}

export function documentAcceptList(): string {
  return ".pdf,.doc,.docx,.ppt,.pptx,.pps,.ppsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.openxmlformats-officedocument.presentationml.slideshow";
}
