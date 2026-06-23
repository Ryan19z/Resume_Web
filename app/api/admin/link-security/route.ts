import { verifyAdminKey } from "@/lib/server/admin-auth";
import {
  clearResumeAccessPin,
  getResumeSpaceLinks,
  readResumeSpaceMeta,
  rotateResumeTokens,
} from "@/lib/server/resume-space-store";
import { sanitizeResumeId } from "@/lib/resume-scope";
import { type NextRequest, NextResponse } from "next/server";

type Body = {
  adminKey?: string;
  resumeId?: string;
  action?: "rotateTokens" | "clearAccessPin";
};

/** 管理员：查看口令是否启用（不可查看明文）、重置链接、客户忘记口令时清除口令 */
export async function GET(request: NextRequest) {
  if (!verifyAdminKey(request)) {
    return NextResponse.json(
      { ok: false, error: "forbidden", message: "adminKey 无效或未配置。" },
      { status: 403 },
    );
  }

  const resumeId = sanitizeResumeId(request.nextUrl.searchParams.get("resumeId"));
  if (!resumeId) {
    return NextResponse.json(
      { ok: false, error: "bad_request", message: "缺少 resumeId。" },
      { status: 400 },
    );
  }

  const meta = await readResumeSpaceMeta(resumeId);
  if (!meta) {
    return NextResponse.json(
      { ok: false, error: "not_found", message: "未找到该 resumeId。" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    pinEnabled: Boolean(meta.accessPin),
    message: meta.accessPin
      ? "客户已启用编辑口令（系统仅存哈希，管理员无法查看明文）。"
      : "客户未设置编辑口令。",
  });
}

export async function POST(request: NextRequest) {
  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, error: "bad_request", message: "JSON 无效。" },
      { status: 400 },
    );
  }

  if (!verifyAdminKey(request, body.adminKey)) {
    return NextResponse.json(
      { ok: false, error: "forbidden", message: "adminKey 无效或未配置。" },
      { status: 403 },
    );
  }

  const resumeId = sanitizeResumeId(body.resumeId);
  if (!resumeId) {
    return NextResponse.json(
      { ok: false, error: "bad_request", message: "缺少 resumeId。" },
      { status: 400 },
    );
  }

  if (body.action === "clearAccessPin") {
    const meta = await clearResumeAccessPin(resumeId);
    if (!meta) {
      return NextResponse.json(
        { ok: false, error: "not_found", message: "未找到该 resumeId。" },
        { status: 404 },
      );
    }
    return NextResponse.json({
      ok: true,
      pinEnabled: false,
      message:
        "已清除该客户的编辑口令。请通知客户用 EditURL 重新打开并自行设置新口令（你无法查看或代设口令）。",
    });
  }

  if (body.action === "rotateTokens") {
    const meta = await rotateResumeTokens(resumeId);
    if (!meta) {
      return NextResponse.json(
        { ok: false, error: "not_found", message: "未找到该 resumeId。" },
        { status: 404 },
      );
    }
    const links = await getResumeSpaceLinks(resumeId);
    return NextResponse.json({
      ok: true,
      message: "已重置链接令牌，旧 EditURL / ViewURL 全部失效，请重新复制发给客户。",
      editUrl: links?.editUrl ?? "",
      viewUrl: links?.viewUrl ?? "",
    });
  }

  return NextResponse.json(
    { ok: false, error: "bad_request", message: "未知 action。" },
    { status: 400 },
  );
}
