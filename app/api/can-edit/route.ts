import { type NextRequest, NextResponse } from "next/server";

function clientIpFromHeaders(h: Headers): string {
  const xff = h.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim() ?? "";
    return first.replace(/^::ffff:/i, "");
  }
  const real = h.get("x-real-ip")?.trim();
  if (real) return real.replace(/^::ffff:/i, "");
  return "";
}

function parseAllowList(): string[] {
  const raw = process.env.ALLOWED_EDIT_IPS ?? "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.replace(/^::ffff:/i, ""));
}

/**
 * 使用请求头解析 IP（避免在 Route Handler 中调用 next/headers 引发兼容性问题）。
 */
export async function GET(request: NextRequest) {
  try {
    const ip = clientIpFromHeaders(request.headers);
    const allow = parseAllowList();
    const devUnlock =
      process.env.NODE_ENV === "development" &&
      process.env.ALLOW_EDIT_IN_DEV === "true";
    const loopback =
      ip === "127.0.0.1" ||
      ip === "::1" ||
      ip === "localhost" ||
      ip.startsWith("127.");

    let canEdit = false;
    let reason =
      "未配置 ALLOWED_EDIT_IPS，或当前访问 IP 不在白名单内。";

    if (devUnlock && (loopback || !ip)) {
      canEdit = true;
      reason = "开发环境已开启 ALLOW_EDIT_IN_DEV。";
    } else if (
      process.env.NODE_ENV === "development" &&
      allow.length === 0
    ) {
      canEdit = true;
      reason =
        "开发环境且未配置白名单：默认允许编辑。生产环境请务必设置 ALLOWED_EDIT_IPS。";
    } else if (allow.length > 0 && ip && allow.includes(ip)) {
      canEdit = true;
      reason = "IP 已授权。";
    } else if (allow.length > 0 && !ip) {
      reason =
        "无法解析客户端 IP（请检查反向代理是否传入 x-forwarded-for）。";
    }

    return NextResponse.json({ canEdit, ip, reason });
  } catch (e) {
    console.error("[api/can-edit]", e);
    return NextResponse.json(
      {
        canEdit: true,
        ip: "",
        reason: "服务端校验异常，已默认允许编辑（仅兜底）。",
      },
      { status: 200 },
    );
  }
}
