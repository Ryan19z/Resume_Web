import { resolveCanEdit } from "@/lib/server/edit-auth";
import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import { type NextRequest, NextResponse } from "next/server";

const MAX_UPLOAD_BYTES = 30 * 1024 * 1024; // 30MB
const ALLOWED_EXT = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".mp4",
  ".webm",
  ".mov",
  ".pdf",
  ".doc",
  ".docx",
  ".ppt",
  ".pptx",
]);

function safeBaseName(name: string): string {
  const base = path.basename(name).replace(/\s+/g, "-");
  return base.replace(/[^a-zA-Z0-9._-]/g, "");
}

async function resolveRuntimePublicDir(): Promise<string> {
  const cwd = process.cwd();
  // 生产部署常见目录：DEPLOY_PATH/release（Next standalone）；
  // 某些重启方式下 cwd 可能回到 DEPLOY_PATH 根目录，优先写入 release/public。
  const candidates = [
    path.join(cwd, "release", "public"),
    path.join(cwd, "public"),
  ];
  for (const dir of candidates) {
    try {
      await fs.access(dir);
      return dir;
    } catch {
      // try next
    }
  }
  // 开发环境或首次目录不存在时，默认落到 cwd/public
  return candidates[1];
}

export async function POST(request: NextRequest) {
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
    if (!ALLOWED_EXT.has(ext)) {
      return NextResponse.json(
        {
          ok: false,
          error: "unsupported_type",
          message: "仅支持图片、视频、PDF、Word、PPT 文件。",
        },
        { status: 415 },
      );
    }

    const publicDir = await resolveRuntimePublicDir();
    const uploadDir = path.join(publicDir, "uploads");
    await fs.mkdir(uploadDir, { recursive: true });

    const finalName = `${Date.now()}-${randomUUID()}${ext}`;
    const destPath = path.join(uploadDir, finalName);
    const buf = Buffer.from(await fileValue.arrayBuffer());
    await fs.writeFile(destPath, buf);

    return NextResponse.json({
      ok: true as const,
      url: `/uploads/${finalName}`,
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

