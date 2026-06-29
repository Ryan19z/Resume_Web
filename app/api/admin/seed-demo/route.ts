import { verifyAdminKey } from "@/lib/server/admin-auth";
import { ensureDemoClassicSampleSpace } from "@/lib/server/demo-resume-seed";
import { type NextRequest, NextResponse } from "next/server";

type SeedDemoBody = { adminKey?: string };

/** 刷新固定演示 resume（r_demo_classic001），供线上 / 本地一键恢复对比样例 */
export async function POST(request: NextRequest) {
  let body: SeedDemoBody = {};
  try {
    body = (await request.json()) as SeedDemoBody;
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

  try {
    const result = await ensureDemoClassicSampleSpace();
    return NextResponse.json({
      ok: true,
      ...result,
      message: result.created
        ? "已创建演示 resume 空间。"
        : "已刷新演示 resume 内容（链接不变）。",
    });
  } catch (e) {
    console.error("[api/admin/seed-demo]", e);
    return NextResponse.json(
      { ok: false, error: "server_error", message: "演示样例写入失败，请检查目录权限。" },
      { status: 500 },
    );
  }
}
