import { listRecentVisitorSessions, upsertVisitorSession } from "@/lib/visitor-session-store";
import { type NextRequest, NextResponse } from "next/server";

const STALE_MS = 90_000;

/** 编辑端轮询：当前「活跃访客」及停留时长（仅进程内有效，见 lib/visitor-session-store） */
export async function GET() {
  const active = listRecentVisitorSessions(STALE_MS);
  return NextResponse.json({ ok: true as const, active });
}

/**
 * 访客端心跳：累计「标签页处于前台」的毫秒数。
 * POST JSON `{ "sessionId": "uuid", "path": "/", "visibleMs": 12345 }`
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      sessionId?: unknown;
      path?: unknown;
      visibleMs?: unknown;
    };
    const sessionId =
      typeof body.sessionId === "string" ? body.sessionId.trim() : "";
    const path = typeof body.path === "string" ? body.path : "/";
    const visibleMs =
      typeof body.visibleMs === "number" && Number.isFinite(body.visibleMs)
        ? Math.max(0, Math.min(body.visibleMs, 86_400_000))
        : 0;
    if (!sessionId || sessionId.length > 64) {
      return NextResponse.json(
        { ok: false, error: "invalid_session" },
        { status: 400 },
      );
    }
    upsertVisitorSession(sessionId, path, visibleMs);
    return NextResponse.json({ ok: true as const });
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }
}
