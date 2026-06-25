import { normalizeAccessPin } from "@/lib/access-pin-format";
import {
  clearAccessGateCookie,
} from "@/lib/server/access-gate";
import { resolveEditPermission } from "@/lib/server/resolve-edit-permission";
import { sanitizeResumeId } from "@/lib/resume-scope";
import {
  clearResumeAccessPin,
  readResumeSpaceMeta,
  setResumeAccessPin,
} from "@/lib/server/resume-space-store";
import { type NextRequest, NextResponse } from "next/server";

async function assertEditor(
  request: NextRequest,
): Promise<
  | { ok: true; resumeId: string }
  | { ok: false; response: NextResponse }
> {
  const resumeId = sanitizeResumeId(request.nextUrl.searchParams.get("resumeId"));
  const editToken = request.nextUrl.searchParams.get("editToken");

  if (resumeId && !editToken?.trim()) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          error: "forbidden",
          message:
            "请使用完整的编辑链接设置口令；本地调试请从管理页复制编辑链接打开。",
        },
        { status: 403 },
      ),
    };
  }

  const perm = await resolveEditPermission(request);
  if (!perm.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "forbidden", message: perm.message },
        { status: 403 },
      ),
    };
  }

  if (!resumeId) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          error: "forbidden",
          message:
            "编辑口令仅适用于客户专属编辑链接。请从管理页复制编辑链接后设置。",
        },
        { status: 403 },
      ),
    };
  }

  return { ok: true, resumeId };
}

export async function GET(request: NextRequest) {
  const auth = await assertEditor(request);
  if (!auth.ok) return auth.response;

  const meta = await readResumeSpaceMeta(auth.resumeId);
  return NextResponse.json({
    ok: true,
    pinEnabled: Boolean(meta?.accessPin),
    message: meta?.accessPin
      ? "已启用编辑口令，打开编辑链接时需输入口令。"
      : "未设置编辑口令，持编辑链接者可编辑；只读链接始终免口令。",
  });
}

type PinBody = { pin?: string; confirmPin?: string };

export async function PUT(request: NextRequest) {
  const auth = await assertEditor(request);
  if (!auth.ok) return auth.response;

  let body: PinBody = {};
  try {
    body = (await request.json()) as PinBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "bad_request", message: "JSON 无效。" },
      { status: 400 },
    );
  }

  const pin = normalizeAccessPin(body.pin ?? "");
  const confirm = normalizeAccessPin(body.confirmPin ?? "");
  if (!pin || pin !== confirm) {
    return NextResponse.json(
      {
        ok: false,
        error: "bad_request",
        message:
          "口令需 4–32 位，仅支持数字、英文字母、中文及 -_. ，且两次输入一致。",
      },
      { status: 400 },
    );
  }

  const meta = await setResumeAccessPin(auth.resumeId, pin);
  if (!meta) {
    return NextResponse.json(
      { ok: false, error: "not_found", message: "站点不存在。" },
      { status: 404 },
    );
  }

  const res = NextResponse.json({
    ok: true,
    pinEnabled: true,
    message:
      "编辑口令已保存。此口令仅用于你本人的编辑链接，HR 只读链接不受影响。请妥善保管，系统不保存明文，忘记后需联系管理员清除后重设。",
  });
  res.cookies.set(clearAccessGateCookie().name, "", clearAccessGateCookie().options);
  return res;
}

export async function DELETE(request: NextRequest) {
  const auth = await assertEditor(request);
  if (!auth.ok) return auth.response;

  const meta = await clearResumeAccessPin(auth.resumeId);
  if (!meta) {
    return NextResponse.json(
      { ok: false, error: "not_found", message: "站点不存在。" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    pinEnabled: false,
    message: "已关闭访问口令，持编辑链接者可直接打开。",
  });
}
