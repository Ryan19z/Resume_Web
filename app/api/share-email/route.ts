import { isReasonableHttpUrl } from "@/lib/is-reasonable-http-url";
import {
  checkRateLimit,
  rateLimitResponse,
} from "@/lib/server/rate-limit";
import { requireFeature } from "@/lib/server/entitlements";
import { resolveEditPermission } from "@/lib/server/resolve-edit-permission";
import { sanitizeResumeId } from "@/lib/resume-scope";
import {
  composeShareEmailText,
  normalizeShareEmailMessageInput,
} from "@/lib/share-email-compose";
import { type NextRequest, NextResponse } from "next/server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 供前端判断是否需要展示「将走本机邮件」等说明 */
export async function GET() {
  const configured = Boolean(process.env.RESEND_API_KEY?.trim());
  return NextResponse.json({ configured });
}

/**
 * POST JSON: `{ "to": "user@mail.com", "link": "https://...", "message": "可选正文" }`
 * 若配置 `RESEND_API_KEY`（及可选 `RESEND_FROM`），通过 Resend 投递邮件；
 * 否则返回 501，前端可改用 mailto 兜底。
 */
export async function POST(request: NextRequest) {
  try {
    const limited = checkRateLimit(
      request.headers,
      "share-email",
      8,
      60 * 60 * 1000,
    );
    if (!limited.ok) {
      return NextResponse.json(rateLimitResponse(limited.retryAfterSec), {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      });
    }

    const perm = await resolveEditPermission(request);
    if (!perm.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: perm.code ?? "forbidden",
          message: perm.message || "仅站点主人可代发分享邮件。",
        },
        { status: 403 },
      );
    }

    const resumeId = sanitizeResumeId(request.nextUrl.searchParams.get("resumeId"));
    const shareEnt = await requireFeature(resumeId || undefined, "shareEmail");
    if (!shareEnt.ok) {
      return NextResponse.json(
        { ok: false, error: shareEnt.code, message: shareEnt.message },
        { status: 403 },
      );
    }

    const body = (await request.json()) as {
      to?: unknown;
      link?: unknown;
      message?: unknown;
      lang?: unknown;
    };
    const to = typeof body.to === "string" ? body.to.trim() : "";
    const link = typeof body.link === "string" ? body.link.trim() : "";
    const message = normalizeShareEmailMessageInput(body.message);
    const lang = body.lang === "en" ? "en" : "zh";
    if (!EMAIL_RE.test(to)) {
      return NextResponse.json(
        { ok: false, error: "invalid_email", message: "邮箱格式不正确。" },
        { status: 400 },
      );
    }
    if (!isReasonableHttpUrl(link)) {
      return NextResponse.json(
        { ok: false, error: "invalid_link", message: "链接无效。" },
        { status: 400 },
      );
    }

    const apiKey = process.env.RESEND_API_KEY?.trim();
    const from =
      process.env.RESEND_FROM?.trim() || "Resume <onboarding@resend.dev>";

    if (!apiKey) {
      return NextResponse.json(
        {
          ok: false,
          error: "email_not_configured",
          message:
            "服务器未配置 RESEND_API_KEY，无法代发邮件。请使用页面上的「用本机邮件应用发送」。",
        },
        { status: 501 },
      );
    }

    const subject =
      lang === "en" ? "Your online resume link" : "你的在线简历链接";
    const text = composeShareEmailText(message, link, lang);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        text,
      }),
    });

    if (!res.ok) {
      const raw = await res.text().catch(() => "");
      let providerMessage = "发信服务返回错误，请稍后重试或使用本机邮件发送。";
      try {
        const j = JSON.parse(raw) as { message?: string };
        if (typeof j.message === "string" && j.message.trim()) {
          providerMessage = j.message.trim();
        }
      } catch {
        /* 非 JSON 时保留默认文案 */
      }
      return NextResponse.json(
        {
          ok: false,
          error: "provider_error",
          message: providerMessage,
          detail: raw.slice(0, 500),
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/share-email]", e);
    return NextResponse.json(
      { ok: false, error: "server_error", message: "请求处理失败。" },
      { status: 500 },
    );
  }
}
