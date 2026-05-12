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

export async function GET(request: NextRequest) {
  try {
    const ip = clientIpFromHeaders(request.headers);
    return NextResponse.json({ ip });
  } catch (e) {
    console.error("[api/my-ip]", e);
    return NextResponse.json({ ip: "" }, { status: 200 });
  }
}
