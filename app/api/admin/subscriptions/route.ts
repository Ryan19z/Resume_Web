import { verifyAdminKey } from "@/lib/server/admin-auth";
import {
  deleteResumeSpace,
  getResumeSpaceLinks,
} from "@/lib/server/resume-space-store";
import {
  listResumeSpacesWithSubscription,
  upsertSubscription,
} from "@/lib/server/subscription-store";
import { MANAGED_TIERS, SUBSCRIPTION_PLANS } from "@/lib/subscription-plans";
import type { SubscriptionStatus, SubscriptionTier } from "@/lib/subscription-types";
import { sanitizeResumeId } from "@/lib/resume-scope";
import { type NextRequest, NextResponse } from "next/server";

type UpdateBody = {
  adminKey?: string;
  resumeId?: string;
  tier?: SubscriptionTier;
  status?: SubscriptionStatus;
  expiresAt?: number | null;
  extendDays?: number;
  note?: string;
};

function isTier(value: unknown): value is SubscriptionTier {
  return typeof value === "string" && value in SUBSCRIPTION_PLANS;
}

function isStatus(value: unknown): value is SubscriptionStatus {
  return value === "active" || value === "expired" || value === "cancelled";
}

async function attachLinks<T extends { resumeId: string }>(
  item: T,
): Promise<T & { editUrl: string; viewUrl: string }> {
  const links = await getResumeSpaceLinks(item.resumeId);
  return {
    ...item,
    editUrl: links?.editUrl ?? "",
    viewUrl: links?.viewUrl ?? "",
  };
}

export async function GET(request: NextRequest) {
  if (!verifyAdminKey(request)) {
    return NextResponse.json(
      { ok: false, error: "forbidden", message: "adminKey 无效或未配置。" },
      { status: 403 },
    );
  }

  const resumeId = sanitizeResumeId(request.nextUrl.searchParams.get("resumeId"));
  const rawItems = await listResumeSpacesWithSubscription();
  const items = await Promise.all(rawItems.map((item) => attachLinks(item)));
  const plans = MANAGED_TIERS.map((tier) => ({
    tier,
    labelZh: SUBSCRIPTION_PLANS[tier].labelZh,
    labelEn: SUBSCRIPTION_PLANS[tier].labelEn,
    durationDays: SUBSCRIPTION_PLANS[tier].durationDays,
    features: SUBSCRIPTION_PLANS[tier].features,
    quotas: SUBSCRIPTION_PLANS[tier].quotas,
  }));

  if (resumeId) {
    const item = items.find((x) => x.resumeId === resumeId);
    if (!item) {
      return NextResponse.json(
        { ok: false, error: "not_found", message: "未找到该 resumeId。" },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, item, plans });
  }

  return NextResponse.json({ ok: true, items, plans });
}

export async function PUT(request: NextRequest) {
  let body: UpdateBody = {};
  try {
    body = (await request.json()) as UpdateBody;
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

  const tier = isTier(body.tier) ? body.tier : "monthly";
  const status = isStatus(body.status) ? body.status : undefined;

  try {
    const subscription = await upsertSubscription({
      resumeId,
      tier,
      status,
      expiresAt: body.expiresAt,
      extendDays: body.extendDays,
      note: body.note,
    });
    const links = await getResumeSpaceLinks(resumeId);
    return NextResponse.json({
      ok: true,
      subscription,
      editUrl: links?.editUrl ?? "",
      viewUrl: links?.viewUrl ?? "",
      tierLabelZh: SUBSCRIPTION_PLANS[tier].labelZh,
    });
  } catch (e) {
    console.error("[api/admin/subscriptions] PUT", e);
    return NextResponse.json(
      { ok: false, error: "server_error", message: "更新订阅失败。" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
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

  try {
    const removed = await deleteResumeSpace(resumeId);
    if (!removed) {
      return NextResponse.json(
        { ok: false, error: "not_found", message: "未找到该 resumeId。" },
        { status: 404 },
      );
    }
    return NextResponse.json({
      ok: true,
      message: `已删除 ${resumeId}，链接已失效。`,
    });
  } catch (e) {
    console.error("[api/admin/subscriptions] DELETE", e);
    return NextResponse.json(
      { ok: false, error: "server_error", message: "删除失败。" },
      { status: 500 },
    );
  }
}
