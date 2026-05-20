import { isReasonableHttpUrl } from "@/lib/is-reasonable-http-url";
import { type NextRequest, NextResponse } from "next/server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 供前端判断是否需要展示「将走本机邮件」等说明 */
export async function GET() {
  const configured = Boolean(process.env.RESEND_API_KEY?.trim());
  return NextResponse.json({ configured });
}

/**
 * POST JSON: `{ "to": "user@mail.com", "link": "https://..." }`
 * 若配置 `RESEND_API_KEY`（及可选 `RESEND_FROM`），通过 Resend 投递邮件；
 * 否则返回 501，前端可改用 mailto 兜底。
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { to?: unknown; link?: unknown };
    const to = typeof body.to === "string" ? body.to.trim() : "";
    const link = typeof body.link === "string" ? body.link.trim() : "";
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

    const subject = "你的在线简历链接";
    const text = `你好，\n\n这是你要保存的在线简历页面链接：\n${link}\n\n（由网站「分享」功能发出）\n`;

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
