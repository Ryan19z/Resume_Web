import {
  buildAccessGateCookie,
  clearAccessGateCookie,
  isAccessGatePassed,
  normalizeAccessPin,
  shouldEnforceEditAccessPin,
  verifyAccessPin,
} from "@/lib/server/access-gate";
import { sanitizeResumeId, sanitizeResumeToken } from "@/lib/resume-scope";
import {
  canEditByToken,
  canViewByToken,
  readResumeSpaceMeta,
} from "@/lib/server/resume-space-store";
import { type NextRequest, NextResponse } from "next/server";

async function tokenAuthorized(
  resumeId: string,
  editToken?: string,
  viewToken?: string,
): Promise<boolean> {
  if (editToken && (await canEditByToken(resumeId, editToken))) return true;
  return canViewByToken(resumeId, viewToken, editToken);
}

export async function GET(request: NextRequest) {
  const resumeId = sanitizeResumeId(request.nextUrl.searchParams.get("resumeId"));
  if (!resumeId) {
    return NextResponse.json({
      ok: true,
      pinRequired: false,
      sessionValid: true,
    });
  }

  const editToken = sanitizeResumeToken(
    request.nextUrl.searchParams.get("editToken"),
  );
  const viewToken = sanitizeResumeToken(
    request.nextUrl.searchParams.get("viewToken"),
  );
  const tokenOk = await tokenAuthorized(resumeId, editToken, viewToken);
  if (!tokenOk) {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_token",
        message: "链接无效或已失效，请联系站点管理员。",
      },
      { status: 403 },
    );
  }

  const pinRequired =
    Boolean(editToken) && (await shouldEnforceEditAccessPin(resumeId, editToken));
  const sessionValid = pinRequired
    ? await isAccessGatePassed(request, resumeId)
    : true;

  return NextResponse.json({
    ok: true,
    pinRequired,
    sessionValid,
    message: !editToken
      ? "HR 只读链接无需口令，可直接浏览。"
      : pinRequired
        ? sessionValid
          ? "编辑口令已验证。"
          : "请输入编辑口令以继续。"
        : "未启用编辑口令。",
  });
}

type VerifyBody = {
  resumeId?: string;
  pin?: string;
  editToken?: string;
  viewToken?: string;
};

export async function POST(request: NextRequest) {
  let body: VerifyBody = {};
  try {
    body = (await request.json()) as VerifyBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "bad_request", message: "JSON 无效。" },
      { status: 400 },
    );
  }

  const resumeId = sanitizeResumeId(body.resumeId);
  const pin = normalizeAccessPin(body.pin ?? "");
  const editToken = sanitizeResumeToken(body.editToken);
  const viewToken = sanitizeResumeToken(body.viewToken);

  if (!resumeId || !pin) {
    return NextResponse.json(
      { ok: false, error: "bad_request", message: "缺少 resumeId 或口令。" },
      { status: 400 },
    );
  }

  if (!editToken) {
    return NextResponse.json(
      { ok: false, error: "forbidden", message: "仅编辑链接可验证口令。" },
      { status: 403 },
    );
  }

  const tokenOk = await tokenAuthorized(resumeId, editToken, viewToken);
  if (!tokenOk) {
    return NextResponse.json(
      { ok: false, error: "invalid_token", message: "链接无效。" },
      { status: 403 },
    );
  }

  const meta = await readResumeSpaceMeta(resumeId);
  if (!meta?.accessPin) {
    return NextResponse.json({
      ok: true,
      message: "该客户未启用访问口令。",
    });
  }

  if (!verifyAccessPin(resumeId, pin, meta.accessPin)) {
    return NextResponse.json(
      { ok: false, error: "wrong_pin", message: "口令错误，请重试。" },
      { status: 403 },
    );
  }

  const cookie = buildAccessGateCookie(resumeId);
  const res = NextResponse.json({ ok: true, message: "验证成功。" });
  res.cookies.set(cookie.name, cookie.value, cookie.options);
  return res;
}

export async function DELETE(request: NextRequest) {
  const resumeId = sanitizeResumeId(request.nextUrl.searchParams.get("resumeId"));
  if (!resumeId) {
    return NextResponse.json(
      { ok: false, error: "bad_request", message: "缺少 resumeId。" },
      { status: 400 },
    );
  }
  const cleared = clearAccessGateCookie();
  const res = NextResponse.json({ ok: true, message: "已退出访问验证。" });
  res.cookies.set(cleared.name, cleared.value, cleared.options);
  return res;
}
