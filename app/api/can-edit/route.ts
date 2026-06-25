import {
  entitlementsPayload,
  resolveEntitlements,
} from "@/lib/server/entitlements";
import { enforceAccessGate, isAccessGatePassed, shouldEnforceEditAccessPin } from "@/lib/server/access-gate";
import { resolveCanEdit } from "@/lib/server/edit-auth";
import { sanitizeResumeId, sanitizeResumeToken } from "@/lib/resume-scope";
import { canEditByToken } from "@/lib/server/resume-space-store";
import { type NextRequest, NextResponse } from "next/server";

/**
 * 使用请求头解析 IP（避免在 Route Handler 中调用 next/headers 引发兼容性问题）。
 */
export async function GET(request: NextRequest) {
  try {
    const resumeId = sanitizeResumeId(request.nextUrl.searchParams.get("resumeId"));
    const editToken = sanitizeResumeToken(
      request.nextUrl.searchParams.get("editToken"),
    );
    if (resumeId) {
      const gateBlock = await enforceAccessGate(request, resumeId);
      if (gateBlock) {
        const gateData = (await gateBlock.json()) as { message?: string };
        return NextResponse.json({
          canEdit: false,
          tokenAuthorized: false,
          subscriptionActive: false,
          accessGateRequired: true,
          accessGatePassed: false,
          entitlements: entitlementsPayload(await resolveEntitlements(resumeId)),
          ip: "",
          reason: gateData.message ?? "需要访问口令。",
        });
      }

      const tokenOk = editToken
        ? await canEditByToken(resumeId, editToken)
        : false;
      const entitlements = await resolveEntitlements(resumeId);
      const pinRequired = await shouldEnforceEditAccessPin(resumeId, editToken);
      const accessGatePassed = pinRequired
        ? await isAccessGatePassed(request, resumeId)
        : true;
      const canEdit =
        tokenOk && entitlements.features.editing && (!pinRequired || accessGatePassed);
      return NextResponse.json({
        canEdit,
        tokenAuthorized: tokenOk,
        subscriptionActive: entitlements.active,
        accessGateRequired: pinRequired,
        accessGatePassed,
        entitlements: entitlementsPayload(entitlements),
        ip: "",
        reason: canEdit
          ? "编辑令牌已授权。"
          : !tokenOk
            ? "缺少或无效的 editToken，当前链接仅可只读浏览。"
            : !entitlements.active
              ? "套餐已到期，编辑与发布已暂停，请联系管理员续费。"
              : "当前套餐未包含在线编辑，请升级套餐。",
      });
    }
    const { canEdit, ip, reason } = resolveCanEdit(request.headers);
    const entitlements = await resolveEntitlements(undefined);
    return NextResponse.json({
      canEdit,
      tokenAuthorized: canEdit,
      subscriptionActive: true,
      entitlements: entitlementsPayload(entitlements),
      ip,
      reason,
    });
  } catch (e) {
    console.error("[api/can-edit]", e);
    const devFallback = process.env.NODE_ENV === "development";
    return NextResponse.json(
      {
        canEdit: devFallback,
        tokenAuthorized: devFallback,
        subscriptionActive: devFallback,
        entitlements: null,
        ip: "",
        reason: devFallback
          ? "服务端校验异常，开发环境已临时允许编辑。"
          : "服务端校验异常，已禁止编辑。",
      },
      { status: 200 },
    );
  }
}
