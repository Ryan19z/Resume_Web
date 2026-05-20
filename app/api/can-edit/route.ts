import { resolveCanEdit } from "@/lib/server/edit-auth";
import { type NextRequest, NextResponse } from "next/server";

/**
 * 使用请求头解析 IP（避免在 Route Handler 中调用 next/headers 引发兼容性问题）。
 */
export async function GET(request: NextRequest) {
  try {
    const { canEdit, ip, reason } = resolveCanEdit(request.headers);
    return NextResponse.json({ canEdit, ip, reason });
  } catch (e) {
    console.error("[api/can-edit]", e);
    const devFallback = process.env.NODE_ENV === "development";
    return NextResponse.json(
      {
        canEdit: devFallback,
        ip: "",
        reason: devFallback
          ? "服务端校验异常，开发环境已临时允许编辑。"
          : "服务端校验异常，已禁止编辑。",
      },
      { status: 200 },
    );
  }
}
