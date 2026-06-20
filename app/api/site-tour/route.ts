import {
  hasIpSeenAutoTour,
  markIpAutoTourSeen,
} from "@/lib/server/site-tour-store";
import { sanitizeResumeId } from "@/lib/resume-scope";
import { type NextRequest, NextResponse } from "next/server";

function parseResumeId(request: NextRequest): string | undefined {
  return sanitizeResumeId(request.nextUrl.searchParams.get("resumeId"));
}

/** 查询当前 IP 是否应自动播放新手引导 */
export async function GET(request: NextRequest) {
  try {
    const resumeId = parseResumeId(request);
    const seen = await hasIpSeenAutoTour(request.headers, resumeId);
    return NextResponse.json({
      ok: true,
      shouldAutoPlay: !seen,
    });
  } catch (e) {
    console.error("[api/site-tour] GET", e);
    return NextResponse.json(
      { ok: false, error: "server_error", shouldAutoPlay: true },
      { status: 500 },
    );
  }
}

/** 标记当前 IP 已展示过自动新手引导（刷新后不再自动播放） */
export async function POST(request: NextRequest) {
  try {
    const resumeId = parseResumeId(request);
    await markIpAutoTourSeen(request.headers, resumeId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/site-tour] POST", e);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 },
    );
  }
}
