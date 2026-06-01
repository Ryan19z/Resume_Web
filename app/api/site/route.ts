import { resolveCanEdit } from "@/lib/server/edit-auth";
import { sanitizeResumeId, sanitizeResumeToken } from "@/lib/resume-scope";
import {
  MAX_PUBLISH_BYTES,
  parsePersistedBundlePayload,
  readPublishedSite,
  writePublishedBundle,
} from "@/lib/server/published-site-store";
import {
  canEditByToken,
  canViewByToken,
} from "@/lib/server/resume-space-store";
import type { PersistedSiteBundle } from "@/lib/types";
import { type NextRequest, NextResponse } from "next/server";
type SiteLang = "zh" | "en";

function parseLang(request: NextRequest): SiteLang {
  const raw = request.nextUrl.searchParams.get("lang");
  return raw === "en" ? "en" : "zh";
}

/** 访客与站长读取已发布到服务器的简历快照 */
export async function GET(request: NextRequest) {
  const lang = parseLang(request);
  const resumeId = sanitizeResumeId(request.nextUrl.searchParams.get("resumeId"));
  const editToken = sanitizeResumeToken(
    request.nextUrl.searchParams.get("editToken"),
  );
  const viewToken = sanitizeResumeToken(
    request.nextUrl.searchParams.get("viewToken"),
  );
  if (resumeId) {
    const canView = await canViewByToken(resumeId, viewToken, editToken);
    if (!canView) {
      return NextResponse.json(
        {
          ok: false,
          published: false,
          error: "forbidden",
          message: "无查看权限，请检查 viewToken。",
        },
        { status: 403 },
      );
    }
  }
  const result = await readPublishedSite(lang, resumeId);
  if (result.status === "missing") {
    return NextResponse.json({
      ok: true as const,
      published: false,
      bundle: null,
      updatedAt: null,
    });
  }
  if (result.status === "ok") {
    return NextResponse.json({
      ok: true as const,
      published: true,
      bundle: result.bundle,
      updatedAt: result.updatedAt,
    });
  }
  return NextResponse.json(
    {
      ok: false as const,
      published: false,
      error: result.status,
      message: result.message,
    },
    { status: result.status === "corrupt" ? 200 : 500 },
  );
}

/** 仅 IP 白名单内可写：将当前编辑内容发布到服务器，供所有访客看到 */
export async function PUT(request: NextRequest) {
  const lang = parseLang(request);
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
          message: "无编辑权限，无法发布到服务器。",
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
          message: "无编辑权限，无法发布到服务器。",
          reason: auth.reason,
        },
        { status: 403 },
      );
    }
  }

  try {
    const rawText = await request.text();
    if (Buffer.byteLength(rawText, "utf8") > MAX_PUBLISH_BYTES) {
      return NextResponse.json(
        {
          ok: false,
          error: "payload_too_large",
          message: `发布内容超过 ${Math.round(MAX_PUBLISH_BYTES / 1024 / 1024)}MB，请缩小图片或改用图床链接。`,
        },
        { status: 413 },
      );
    }
    const body = JSON.parse(rawText) as unknown;
    const bundle = parsePersistedBundlePayload(body);
    if (!bundle) {
      return NextResponse.json(
        { ok: false, error: "invalid_bundle", message: "数据格式无效。" },
        { status: 400 },
      );
    }
    const savedAt = bundle.savedAt ?? Date.now();
    const toStore: PersistedSiteBundle = {
      version: 2,
      profile: bundle.profile,
      site: bundle.site,
      savedAt,
    };
    await writePublishedBundle(toStore, lang, resumeId);
    return NextResponse.json({
      ok: true as const,
      published: true,
      updatedAt: savedAt,
    });
  } catch (e) {
    if (e instanceof Error && e.message === "publish_payload_too_large") {
      return NextResponse.json(
        {
          ok: false,
          error: "payload_too_large",
          message: "发布内容过大，请缩小图片或改用图床链接。",
        },
        { status: 413 },
      );
    }
    console.error("[api/site] PUT", e);
    return NextResponse.json(
      { ok: false, error: "write_failed", message: "写入服务器失败，请检查目录权限。" },
      { status: 500 },
    );
  }
}
