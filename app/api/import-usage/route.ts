import { resolveEditPermission } from "@/lib/server/resolve-edit-permission";
import { sanitizeResumeId } from "@/lib/resume-scope";
import { incrementUsage } from "@/lib/server/subscription-store";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/** 用户确认「应用到站点」后再扣减智能导入 / AI 解析配额 */
export async function POST(request: NextRequest) {
  const perm = await resolveEditPermission(request);
  if (!perm.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: perm.code ?? "forbidden",
        message: perm.message || "无编辑权限。",
      },
      { status: 403 },
    );
  }

  const resumeId = sanitizeResumeId(request.nextUrl.searchParams.get("resumeId"));
  if (!resumeId) {
    return NextResponse.json({ ok: true as const, skipped: true });
  }

  let body: { aiUsed?: boolean } = {};
  try {
    body = (await request.json()) as { aiUsed?: boolean };
  } catch {
    body = {};
  }

  await incrementUsage(resumeId, "smartImport");
  if (body.aiUsed) {
    await incrementUsage(resumeId, "aiParse");
  }

  return NextResponse.json({ ok: true as const });
}
