import { resolveCanEdit } from "@/lib/server/edit-auth";
import {
  checkRateLimit,
  rateLimitResponse,
} from "@/lib/server/rate-limit";
import { sanitizeResumeId, sanitizeResumeToken } from "@/lib/resume-scope";
import { canEditByToken } from "@/lib/server/resume-space-store";
import {
  ensureUploadDir,
  resolveUploadExtension,
  safeBaseName,
} from "@/lib/server/upload-asset-store";
import { randomUUID } from "crypto";
import fsPromises from "fs/promises";
import path from "path";
import { type NextRequest, NextResponse } from "next/server";

const MAX_UPLOAD_BYTES = 1024 * 1024 * 1024; // 1024MB

export async function POST(request: NextRequest) {
  const limited = checkRateLimit(
    request.headers,
    "upload-asset",
    40,
    15 * 60 * 1000,
  );
  if (!limited.ok) {
    return NextResponse.json(rateLimitResponse(limited.retryAfterSec), {
      status: 429,
      headers: { "Retry-After": String(limited.retryAfterSec) },
    });
  }

  const resumeId = sanitizeResumeId(request.nextUrl.searchParams.get("resumeId"));
  const editToken = sanitizeResumeToken(
    request.nextUrl.searchParams.get("editToken"),
  );

  if (resumeId) {
    const tokenOk = editToken ? await canEditByToken(resumeId, editToken) : false;
    if (!tokenOk) {
      return NextResponse.json(
        {
          ok: false,
          error: "forbidden",
          message: "无编辑权限，无法上传文件。",
          reason: "缺少或无效的 editToken。",
        },
        { status: 403 },
      );
    }
  } else {
    const auth = resolveCanEdit(request.headers);
    if (!auth.canEdit) {
      return NextResponse.json(
        {
          ok: false,
          error: "forbidden",
          message: "无编辑权限，无法上传文件。",
          reason: auth.reason,
        },
        { status: 403 },
      );
    }
  }

  try {
    const formData = await request.formData();
    const fileValue = formData.get("file");
    if (!(fileValue instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "bad_request", message: "缺少 file 字段。" },
        { status: 400 },
      );
    }

    if (fileValue.size <= 0 || fileValue.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        {
          ok: false,
          error: "file_too_large",
          message: `文件大小需在 0-${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB 之间。`,
        },
        { status: 413 },
      );
    }

    const ext = resolveUploadExtension(
      fileValue.name || "upload.bin",
      fileValue.type || "",
    );
    if (!ext) {
      return NextResponse.json(
        {
          ok: false,
          error: "unsupported_type",
          message: "仅支持图片、视频、PDF、Word、PPT 文件。",
        },
        { status: 415 },
      );
    }

    const uploadDir = await ensureUploadDir();

    const finalName = `${Date.now()}-${randomUUID()}${ext}`;
    const destPath = path.join(uploadDir, finalName);
    const reader = fileValue.stream().getReader();
    const handle = await fsPromises.open(destPath, "w");
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value && value.byteLength > 0) {
          await handle.write(Buffer.from(value));
        }
      }
    } finally {
      await handle.close();
      reader.releaseLock();
    }

    const cleanedName = safeBaseName(fileValue.name || `upload${ext}`);

    return NextResponse.json({
      ok: true as const,
      url: `/api/upload-asset/file/${encodeURIComponent(finalName)}`,
      fileName: cleanedName,
      size: fileValue.size,
    });
  } catch (e) {
    console.error("[api/upload-asset] POST", e);
    // 出错时尽量清理半截文件，避免磁盘残留损坏资源。
    // 路径仅在成功解析后才会创建，这里用 try/catch 保持兜底安全。
    if (
      e &&
      typeof e === "object" &&
      "path" in e &&
      typeof (e as { path?: unknown }).path === "string"
    ) {
      try {
        await fsPromises.unlink((e as { path: string }).path);
      } catch {
        // ignore cleanup errors
      }
    }
    return NextResponse.json(
      { ok: false, error: "write_failed", message: "上传失败，请检查目录权限。" },
      { status: 500 },
    );
  }
}

