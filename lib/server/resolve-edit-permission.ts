import { enforceAccessGate } from "@/lib/server/access-gate";
import { requireFeature } from "@/lib/server/entitlements";
import { resolveCanEdit } from "@/lib/server/edit-auth";
import { sanitizeResumeId, sanitizeResumeToken } from "@/lib/resume-scope";
import { canEditByToken } from "@/lib/server/resume-space-store";
import type { NextRequest } from "next/server";

export async function resolveEditPermission(
  request: NextRequest,
): Promise<{ ok: boolean; message: string; code?: string }> {
  const resumeId = sanitizeResumeId(request.nextUrl.searchParams.get("resumeId"));
  const editToken = sanitizeResumeToken(
    request.nextUrl.searchParams.get("editToken"),
  );

  if (resumeId) {
    const gateBlock = await enforceAccessGate(request, resumeId);
    if (gateBlock) {
      const data = (await gateBlock.json()) as { message?: string; error?: string };
      return {
        ok: false,
        message: data.message ?? "需要访问口令。",
        code: data.error ?? "pin_required",
      };
    }

    const tokenOk = editToken
      ? await canEditByToken(resumeId, editToken)
      : false;
    if (!tokenOk) {
      return {
        ok: false,
        message: "缺少或无效的 editToken。",
        code: "invalid_token",
      };
    }
    const ent = await requireFeature(resumeId, "editing");
    if (!ent.ok) {
      return { ok: false, message: ent.message, code: ent.code };
    }
    return { ok: true, message: "编辑令牌已授权。" };
  }

  const auth = resolveCanEdit(request.headers);
  return { ok: auth.canEdit, message: auth.reason };
}
