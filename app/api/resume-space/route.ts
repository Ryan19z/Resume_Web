import { createResumeSpace } from "@/lib/server/resume-space-store";
import { getPublicSiteOrigin } from "@/lib/public-site-url";
import { type NextRequest, NextResponse } from "next/server";

type CreateResumeSpaceRequest = {
  adminKey?: string;
};

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
  const origin = getPublicSiteOrigin();
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

