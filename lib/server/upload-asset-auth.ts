import { enforceAccessGate } from "@/lib/server/access-gate";
import { resolveCanEdit } from "@/lib/server/edit-auth";
import { sanitizeResumeId, sanitizeResumeToken } from "@/lib/resume-scope";
import { canViewByToken } from "@/lib/server/resume-space-store";
import { type NextRequest, NextResponse } from "next/server";

export async function authorizeUploadAssetDownload(
  request: NextRequest,
): Promise<NextResponse | null> {
  const resumeId = sanitizeResumeId(request.nextUrl.searchParams.get("resumeId"));
  const editToken = sanitizeResumeToken(
    request.nextUrl.searchParams.get("editToken"),
  );
  const viewToken = sanitizeResumeToken(
    request.nextUrl.searchParams.get("viewToken"),
  );

  if (resumeId) {
    const gateBlock = await enforceAccessGate(request, resumeId);
    if (gateBlock) return gateBlock;

    const allowed = await canViewByToken(resumeId, viewToken, editToken);
    if (!allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: "forbidden",
          message: "无查看权限，请通过有效分享链接访问。",
        },
        { status: 403 },
      );
    }
    return null;
  }

  const auth = resolveCanEdit(request.headers);
  if (!auth.canEdit) {
    return NextResponse.json(
      {
        ok: false,
        error: "forbidden",
        message: "需要授权才能访问此文件。",
      },
      { status: 403 },
    );
  }
  return null;
}
