import { NextResponse } from "next/server";

/** 用于确认 Node 路由是否正常工作（不读请求头、不依赖环境变量） */
export function GET() {
  return NextResponse.json({ ok: true });
}
