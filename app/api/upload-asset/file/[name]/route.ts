import {
  isAllowedUploadExt,
  resolveExistingUploadFilePath,
  safeBaseName,
} from "@/lib/server/upload-asset-store";
import fs from "fs/promises";
import path from "path";
import { type NextRequest, NextResponse } from "next/server";

function contentTypeForExt(ext: string): string {
  switch (ext.toLowerCase()) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".mp4":
      return "video/mp4";
    case ".webm":
      return "video/webm";
    case ".mov":
      return "video/quicktime";
    case ".pdf":
      return "application/pdf";
    case ".doc":
      return "application/msword";
    case ".docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case ".ppt":
      return "application/vnd.ms-powerpoint";
    case ".pptx":
      return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    default:
      return "application/octet-stream";
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ name: string }> },
) {
  const { name } = await context.params;
  const safeName = safeBaseName(name);
  const ext = path.extname(safeName).toLowerCase();
  if (!safeName || !isAllowedUploadExt(ext)) {
    return NextResponse.json(
      { ok: false, error: "not_found", message: "文件不存在或类型不支持。" },
      { status: 404 },
    );
  }

  try {
    const filePath = await resolveExistingUploadFilePath(safeName);
    if (!filePath) throw new Error("not_file");
    const bytes = await fs.readFile(filePath);

    const headers = new Headers();
    headers.set("Content-Type", contentTypeForExt(ext));
    headers.set("Content-Length", String(bytes.byteLength));
    headers.set("Cache-Control", "private, max-age=300");
    headers.set("X-Content-Type-Options", "nosniff");
    const download = request.nextUrl.searchParams.get("download") === "1";
    headers.set(
      "Content-Disposition",
      `${download ? "attachment" : "inline"}; filename="${encodeURIComponent(safeName)}"`,
    );

    return new NextResponse(bytes, { status: 200, headers });
  } catch {
    return NextResponse.json(
      { ok: false, error: "not_found", message: "文件不存在。" },
      { status: 404 },
    );
  }
}

