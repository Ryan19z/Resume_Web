import {
  isAllowedUploadExt,
  resolveExistingUploadFilePath,
  safeBaseName,
} from "@/lib/server/upload-asset-store";
import { createReadStream } from "fs";
import fs from "fs/promises";
import path from "path";
import { Readable } from "stream";
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
    case ".pps":
      return "application/vnd.ms-powerpoint";
    case ".ppsx":
      return "application/vnd.openxmlformats-officedocument.presentationml.slideshow";
    default:
      return "application/octet-stream";
  }
}

async function resolveUploadFileStat(safeName: string, ext: string) {
  if (!safeName || !isAllowedUploadExt(ext)) return null;
  const filePath = await resolveExistingUploadFilePath(safeName);
  if (!filePath) return null;
  const stat = await fs.stat(filePath);
  return { filePath, stat, ext };
}

export async function HEAD(
  request: NextRequest,
  context: { params: Promise<{ name: string }> },
) {
  const { name } = await context.params;
  const safeName = safeBaseName(name);
  const ext = path.extname(safeName).toLowerCase();
  try {
    const resolved = await resolveUploadFileStat(safeName, ext);
    if (!resolved) throw new Error("not_file");
    const { stat } = resolved;
    const headers = new Headers();
    headers.set("Content-Type", contentTypeForExt(ext));
    headers.set("Content-Length", String(stat.size));
    headers.set("Accept-Ranges", "bytes");
    headers.set("Cache-Control", "private, max-age=300");
    headers.set("X-Content-Type-Options", "nosniff");
    return new NextResponse(null, { status: 200, headers });
  } catch {
    return NextResponse.json(
      { ok: false, error: "not_found", message: "文件不存在。" },
      { status: 404 },
    );
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
    const resolved = await resolveUploadFileStat(safeName, ext);
    if (!resolved) throw new Error("not_file");
    const { filePath, stat } = resolved;
    const fileSize = stat.size;
    const range = request.headers.get("range");
    const isRangeRequest = typeof range === "string" && range.startsWith("bytes=");

    let start = 0;
    let end = fileSize - 1;
    let status = 200;

    if (isRangeRequest) {
      const match = /^bytes=(\d*)-(\d*)$/i.exec(range ?? "");
      if (!match) {
        return new NextResponse(null, {
          status: 416,
          headers: {
            "Content-Range": `bytes */${fileSize}`,
            "Accept-Ranges": "bytes",
          },
        });
      }

      const [, startRaw, endRaw] = match;
      if (startRaw) {
        start = Number(startRaw);
        end = endRaw ? Number(endRaw) : fileSize - 1;
      } else {
        const suffix = Number(endRaw || "0");
        if (!suffix || Number.isNaN(suffix)) {
          return new NextResponse(null, {
            status: 416,
            headers: {
              "Content-Range": `bytes */${fileSize}`,
              "Accept-Ranges": "bytes",
            },
          });
        }
        start = Math.max(fileSize - suffix, 0);
        end = fileSize - 1;
      }

      if (
        Number.isNaN(start) ||
        Number.isNaN(end) ||
        start < 0 ||
        end < start ||
        start >= fileSize
      ) {
        return new NextResponse(null, {
          status: 416,
          headers: {
            "Content-Range": `bytes */${fileSize}`,
            "Accept-Ranges": "bytes",
          },
        });
      }

      end = Math.min(end, fileSize - 1);
      status = 206;
    }

    const chunkSize = end - start + 1;
    const nodeStream = createReadStream(filePath, { start, end });
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;

    const headers = new Headers();
    headers.set("Content-Type", contentTypeForExt(ext));
    headers.set("Content-Length", String(chunkSize));
    headers.set("Accept-Ranges", "bytes");
    headers.set("Cache-Control", "private, max-age=300");
    headers.set("X-Content-Type-Options", "nosniff");
    if (status === 206) {
      headers.set("Content-Range", `bytes ${start}-${end}/${fileSize}`);
    }
    const download = request.nextUrl.searchParams.get("download") === "1";
    headers.set(
      "Content-Disposition",
      `${download ? "attachment" : "inline"}; filename="${encodeURIComponent(safeName)}"`,
    );

    return new NextResponse(webStream, { status, headers });
  } catch {
    return NextResponse.json(
      { ok: false, error: "not_found", message: "文件不存在。" },
      { status: 404 },
    );
  }
}

