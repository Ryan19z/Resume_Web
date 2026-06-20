import type { NextRequest } from "next/server";

export function verifyAdminKey(
  request: NextRequest,
  bodyKey?: string,
): boolean {
  const required = process.env.RESUME_SPACE_ADMIN_KEY?.trim();
  if (!required) return false;
  const provided =
    bodyKey?.trim() ??
    request.headers.get("x-admin-key")?.trim() ??
    request.nextUrl.searchParams.get("adminKey")?.trim() ??
    "";
  return provided === required;
}
