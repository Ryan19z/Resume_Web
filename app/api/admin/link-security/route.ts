import { verifyAdminKey } from "@/lib/server/admin-auth";
import { getResumeSpaceLinks } from "@/lib/server/resume-space-store";
import { rotateResumeTokens } from "@/lib/server/resume-space-store";
import { sanitizeResumeId } from "@/lib/resume-scope";
import { type NextRequest, NextResponse } from "next/server";

type Body = {
  adminKey?: string;
  resumeId?: string;
  action?: "rotateTokens";
};

/** 管理员仅保留「重置链接」；访问口令由客户在编辑页自行设置 */
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

  if (body.action !== "rotateTokens") {
    return NextResponse.json(
      { ok: false, error: "bad_request", message: "未知 action。" },
      { status: 400 },
    );
  }

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
