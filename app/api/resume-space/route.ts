import { createResumeSpace } from "@/lib/server/resume-space-store";
import { type NextRequest, NextResponse } from "next/server";

type CreateResumeSpaceRequest = {
  adminKey?: string;
};

function resolveOrigin(request: NextRequest): string {
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (host) return `${proto}://${host}`;
  return request.nextUrl.origin;
}

export async function POST(request: NextRequest) {
  const requiredAdminKey = process.env.RESUME_SPACE_ADMIN_KEY?.trim();
  if (!requiredAdminKey) {
    return NextResponse.json(
      {
        ok: false,
        error: "admin_key_not_configured",
        message: "服务器未配置 RESUME_SPACE_ADMIN_KEY。",
      },
      { status: 500 },
    );
  }

  let body: CreateResumeSpaceRequest = {};
  try {
    body = (await request.json()) as CreateResumeSpaceRequest;
  } catch {
    // ignore empty body
  }
  const provided = body.adminKey?.trim() ?? request.headers.get("x-admin-key")?.trim() ?? "";
  if (!provided || provided !== requiredAdminKey) {
    return NextResponse.json(
      { ok: false, error: "forbidden", message: "adminKey 无效。" },
      { status: 403 },
    );
  }

  const space = await createResumeSpace();
  const origin = resolveOrigin(request);
  const editUrl = `${origin}/?resumeId=${encodeURIComponent(space.resumeId)}&editToken=${encodeURIComponent(space.editToken)}&viewToken=${encodeURIComponent(space.viewToken)}`;
  const viewUrl = `${origin}/?resumeId=${encodeURIComponent(space.resumeId)}&viewToken=${encodeURIComponent(space.viewToken)}`;
  return NextResponse.json({
    ok: true,
    space: {
      resumeId: space.resumeId,
      editToken: space.editToken,
      viewToken: space.viewToken,
      createdAt: space.createdAt,
      editUrl,
      viewUrl,
    },
  });
}

