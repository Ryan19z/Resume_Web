import { enforceAccessGate } from "@/lib/server/access-gate";
import { requireFeature } from "@/lib/server/entitlements";
import { resolveCanEdit } from "@/lib/server/edit-auth";
import { sanitizeResumeId, sanitizeResumeToken } from "@/lib/resume-scope";
import { canEditByToken } from "@/lib/server/resume-space-store";
import { readViewLogForOwner } from "@/lib/server/view-log-store";
import { type NextRequest, NextResponse } from "next/server";

/** 仅站长 / editToken 可查看访问记录（不向访客暴露） */
export async function GET(request: NextRequest) {
  try {
    const resumeId = sanitizeResumeId(request.nextUrl.searchParams.get("resumeId"));
    const editToken = sanitizeResumeToken(
      request.nextUrl.searchParams.get("editToken"),
    );

    if (resumeId) {
      const gateBlock = await enforceAccessGate(request, resumeId);
      if (gateBlock) return gateBlock;

      const tokenOk = editToken
        ? await canEditByToken(resumeId, editToken)
        : false;
      if (!tokenOk) {
        return NextResponse.json(
          { ok: false, error: "forbidden", message: "无权限查看访问记录。" },
          { status: 403 },
        );
      }
      const ent = await requireFeature(resumeId, "viewLog");
      if (!ent.ok) {
        return NextResponse.json(
          { ok: false, error: ent.code, message: ent.message },
          { status: 403 },
        );
      }
    } else {
      const auth = resolveCanEdit(request.headers);
      if (!auth.canEdit) {
        return NextResponse.json(
          { ok: false, error: "forbidden", message: "无权限查看访问记录。" },
          { status: 403 },
        );
      }
    }

    const { totalOpens, uniqueVisitors, visitors, events } =
      await readViewLogForOwner(resumeId);
    return NextResponse.json({
      ok: true,
      totalOpens,
      uniqueVisitors,
      totalViews: totalOpens,
      visitors: visitors.slice(0, 50),
      events: events.slice(0, 100),
    });
  } catch (e) {
    console.error("[api/view-log]", e);
    return NextResponse.json(
      { ok: false, error: "server_error", message: "读取访问记录失败。" },
      { status: 500 },
    );
  }
}
