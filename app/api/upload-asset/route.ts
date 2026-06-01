import { resolveCanEdit } from "@/lib/server/edit-auth";
import { sanitizeResumeId, sanitizeResumeToken } from "@/lib/resume-scope";
import { canEditByToken } from "@/lib/server/resume-space-store";
import {
  ensureUploadDir,
  isAllowedUploadExt,
  safeBaseName,
} from "@/lib/server/upload-asset-store";
import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import { type NextRequest, NextResponse } from "next/server";

const MAX_UPLOAD_BYTES = 30 * 1024 * 1024; // 30MB

export async function POST(request: NextRequest) {
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

    const cleanedName = safeBaseName(fileValue.name || "upload.bin");
    const ext = path.extname(cleanedName).toLowerCase();
    if (!isAllowedUploadExt(ext)) {
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
    const buf = Buffer.from(await fileValue.arrayBuffer());
    await fs.writeFile(destPath, buf);

    return NextResponse.json({
      ok: true as const,
      url: `/api/upload-asset/file/${encodeURIComponent(finalName)}`,
      fileName: cleanedName,
      size: fileValue.size,
    });
  } catch (e) {
    console.error("[api/upload-asset] POST", e);
    return NextResponse.json(
      { ok: false, error: "write_failed", message: "上传失败，请检查目录权限。" },
      { status: 500 },
    );
  }
}

