import { sanitizeResumeId, sanitizeResumeToken } from "@/lib/resume-scope";
import { canEditByToken, readResumeSpaceMeta } from "@/lib/server/resume-space-store";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import type { NextRequest, NextResponse } from "next/server";

export type AccessPinRecord = {
  salt: string;
  hash: string;
};

const GATE_COOKIE = "resume_gate";
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;

function gateSecret(): string {
  const secret =
    process.env.ACCESS_GATE_SECRET?.trim() ||
    process.env.RESUME_SPACE_ADMIN_KEY?.trim();
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("ACCESS_GATE_SECRET or RESUME_SPACE_ADMIN_KEY required");
    }
    return "dev-insecure-access-gate";
  }
  return secret;
}

function hashPin(resumeId: string, pin: string, salt: string): string {
  return createHmac("sha256", gateSecret())
    .update(`${resumeId}:${salt}:${pin}`)
    .digest("base64url");
}

export function normalizeAccessPin(pin: string): string | null {
  const v = pin.trim();
  if (v.length < 4 || v.length > 32) return null;
  if (!/^[0-9A-Za-z\u4e00-\u9fff\-_.]+$/.test(v)) return null;
  return v;
}

export function createAccessPinRecord(
  resumeId: string,
  pin: string,
): AccessPinRecord {
  const salt = randomBytes(16).toString("base64url");
  return { salt, hash: hashPin(resumeId, pin, salt) };
}

export function verifyAccessPin(
  resumeId: string,
  pin: string,
  record: AccessPinRecord,
): boolean {
  const computed = hashPin(resumeId, pin, record.salt);
  try {
    return timingSafeEqual(Buffer.from(computed), Buffer.from(record.hash));
  } catch {
    return false;
  }
}

function signSessionValue(resumeId: string, exp: number): string {
  const sig = createHmac("sha256", gateSecret())
    .update(`${resumeId}:${exp}`)
    .digest("base64url");
  return `${resumeId}|${exp}|${sig}`;
}

export function parseAccessGateCookie(
  cookieValue: string | undefined,
  resumeId: string,
): boolean {
  if (!cookieValue) return false;
  const parts = cookieValue.split("|");
  if (parts.length !== 3) return false;
  const [id, expStr, sig] = parts;
  if (id !== resumeId) return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const expected = createHmac("sha256", gateSecret())
    .update(`${resumeId}:${exp}`)
    .digest("base64url");
  try {
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function buildAccessGateCookie(resumeId: string): {
  name: string;
  value: string;
  options: {
    httpOnly: true;
    secure: boolean;
    sameSite: "lax";
    path: string;
    maxAge: number;
  };
} {
  const exp = Date.now() + SESSION_MS;
  return {
    name: GATE_COOKIE,
    value: signSessionValue(resumeId, exp),
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: Math.floor(SESSION_MS / 1000),
    },
  };
}

export function clearAccessGateCookie(): {
  name: string;
  value: string;
  options: { httpOnly: true; path: string; maxAge: 0 };
} {
  return {
    name: GATE_COOKIE,
    value: "",
    options: { httpOnly: true, path: "/", maxAge: 0 },
  };
}

export async function isAccessPinConfigured(resumeIdRaw: string): Promise<boolean> {
  const resumeId = sanitizeResumeId(resumeIdRaw);
  if (!resumeId) return false;
  const meta = await readResumeSpaceMeta(resumeId);
  return Boolean(meta?.accessPin);
}

/** @deprecated use isAccessPinConfigured */
export async function isAccessGateRequired(resumeIdRaw: string): Promise<boolean> {
  return isAccessPinConfigured(resumeIdRaw);
}

/** 口令仅保护 EditURL（含 editToken）；ViewURL 只读链接不要求口令 */
export async function shouldEnforceEditAccessPin(
  resumeIdRaw: string,
  editTokenRaw?: string,
): Promise<boolean> {
  const resumeId = sanitizeResumeId(resumeIdRaw);
  const editToken = sanitizeResumeToken(editTokenRaw);
  if (!resumeId || !editToken) return false;
  if (!(await canEditByToken(resumeId, editToken))) return false;
  return isAccessPinConfigured(resumeId);
}

export async function isAccessGatePassed(
  request: NextRequest,
  resumeIdRaw: string,
): Promise<boolean> {
  const resumeId = sanitizeResumeId(resumeIdRaw);
  if (!resumeId) return true;
  const meta = await readResumeSpaceMeta(resumeId);
  if (!meta?.accessPin) return true;
  return parseAccessGateCookie(request.cookies.get(GATE_COOKIE)?.value, resumeId);
}

/** API 路由：EditURL 未通过口令验证时返回 403；ViewURL 不校验口令 */
export async function enforceAccessGate(
  request: NextRequest,
  resumeIdRaw: string | undefined,
): Promise<NextResponse | null> {
  const resumeId = sanitizeResumeId(resumeIdRaw);
  if (!resumeId) return null;

  const editToken = sanitizeResumeToken(
    request.nextUrl.searchParams.get("editToken"),
  );
  if (!(await shouldEnforceEditAccessPin(resumeId, editToken))) return null;

  if (parseAccessGateCookie(request.cookies.get(GATE_COOKIE)?.value, resumeId)) {
    return null;
  }
  const { NextResponse: NR } = await import("next/server");
  return NR.json(
    {
      ok: false,
      error: "pin_required",
      message: "编辑链接已启用口令，请输入正确口令后继续编辑。",
    },
    { status: 403 },
  );
}
