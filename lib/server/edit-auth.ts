/** 与 /api/can-edit 一致的编辑权限判断，供写接口复用 */

export function clientIpFromHeaders(h: Headers): string {
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

export type EditAuthResult = {
  canEdit: boolean;
  ip: string;
  reason: string;
};

export function resolveCanEdit(headers: Headers): EditAuthResult {
  const ip = clientIpFromHeaders(headers);
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
  let reason = "未配置 ALLOWED_EDIT_IPS，或当前访问 IP 不在白名单内。";

  if (devUnlock && (loopback || !ip)) {
    canEdit = true;
    reason = "开发环境已开启 ALLOW_EDIT_IN_DEV。";
  } else if (
    process.env.NODE_ENV === "development" &&
    allow.length === 0
  ) {
    canEdit = true;
    reason = "开发环境且未配置白名单：默认允许编辑。生产环境请务必设置 ALLOWED_EDIT_IPS。";
  } else if (allow.length > 0 && ip && allow.includes(ip)) {
    canEdit = true;
    reason = "IP 已授权。";
  } else if (allow.length > 0 && !ip) {
    reason = "无法解析客户端 IP（请检查反向代理是否传入 x-forwarded-for）。";
  }

  return { canEdit, ip, reason };
}
