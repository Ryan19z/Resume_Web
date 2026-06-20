import { verifyAdminKey } from "@/lib/server/admin-auth";
import { SUBSCRIPTION_PLANS } from "@/lib/subscription-plans";
import type { SubscriptionTier } from "@/lib/subscription-types";
import {
  createResumeSpace,
  getResumeSpaceLinks,
} from "@/lib/server/resume-space-store";
import { upsertSubscription } from "@/lib/server/subscription-store";
import { type NextRequest, NextResponse } from "next/server";

type ProvisionBody = {
  adminKey?: string;
  tier?: SubscriptionTier;
  note?: string;
  extendDays?: number;
};

function isTier(value: unknown): value is SubscriptionTier {
  return typeof value === "string" && value in SUBSCRIPTION_PLANS;
}

/**
 * 新客户开户：创建 resume 空间 + 写入套餐 + 返回 EditURL / ViewURL。
 * 链接长期有效；功能由 subscription.json 控制，续费/升级无需换链接。
 */
export async function POST(request: NextRequest) {
  let body: ProvisionBody = {};
  try {
    body = (await request.json()) as ProvisionBody;
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

  const tier = isTier(body.tier) ? body.tier : "monthly";
  const plan = SUBSCRIPTION_PLANS[tier];
  const extendDays =
    typeof body.extendDays === "number" && body.extendDays > 0
      ? body.extendDays
      : plan.durationDays ?? 30;

  try {
    const space = await createResumeSpace({ initTrial: false });
    const subscription = await upsertSubscription({
      resumeId: space.resumeId,
      tier,
      status: "active",
      extendDays,
      extendFromNow: true,
      note: body.note?.trim() || `开通 ${plan.labelZh}`,
    });
    const links = await getResumeSpaceLinks(space.resumeId);

    return NextResponse.json({
      ok: true,
      resumeId: space.resumeId,
      tier,
      tierLabelZh: plan.labelZh,
      editUrl: links?.editUrl ?? "",
      viewUrl: links?.viewUrl ?? "",
      subscription,
      message: `已开通「${plan.labelZh}」并生成链接，可直接发给客户。`,
    });
  } catch (e) {
    console.error("[api/admin/provision]", e);
    return NextResponse.json(
      { ok: false, error: "server_error", message: "开户失败，请检查目录权限。" },
      { status: 500 },
    );
  }
}
