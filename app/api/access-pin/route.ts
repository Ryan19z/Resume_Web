import {
  clearAccessGateCookie,
  normalizeAccessPin,
} from "@/lib/server/access-gate";
import { requireFeature } from "@/lib/server/entitlements";
import { sanitizeResumeId, sanitizeResumeToken } from "@/lib/resume-scope";
import {
  canEditByToken,
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
  const editToken = sanitizeResumeToken(
    request.nextUrl.searchParams.get("editToken"),
  );
  if (!resumeId || !editToken) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "forbidden", message: "缺少编辑权限。" },
        { status: 403 },
      ),
    };
  }
  const tokenOk = await canEditByToken(resumeId, editToken);
  if (!tokenOk) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "forbidden", message: "编辑链接无效。" },
        { status: 403 },
      ),
    };
  }
  const ent = await requireFeature(resumeId, "editing");
  if (!ent.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: ent.code, message: ent.message },
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
      ? "已启用编辑口令，打开 EditURL 时需输入口令。"
      : "未设置编辑口令，EditURL 持链者可编辑；ViewURL 始终只读免口令。",
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
        message: "口令需 4–32 位，且两次输入一致。",
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
      "编辑口令已保存。此口令仅用于你本人的编辑链接，HR 只读链接不受影响。",
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
    message: "已关闭访问口令，持链接者可直接打开。",
  });
}
