"use client";

import { useSiteContent } from "@/context/SiteContentProvider";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

type Sheet = "menu" | "email" | "qr";

function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

function isLocalDevPageUrl(href: string): boolean {
  try {
    const u = new URL(href);
    return u.hostname === "localhost" || u.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

export function ShareResumeControl() {
  const { site } = useSiteContent();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [sheet, setSheet] = useState<Sheet>("menu");
  const [pageUrl, setPageUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [sendState, setSendState] = useState<"idle" | "sending" | "ok" | "err">(
    "idle",
  );
  const [sendMsg, setSendMsg] = useState("");
  const menuTitleId = useId();
  const emailTitleId = useId();
  const qrTitleId = useId();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    setPageUrl(typeof window !== "undefined" ? window.location.href : "");
    setSheet("menu");
    setSendState("idle");
    setSendMsg("");
  }, [open]);

  const shareUrl = pageUrl;

  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const copyLink = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [shareUrl]);

  const openMailtoSelf = useCallback(() => {
    if (!shareUrl || !isValidEmail(emailTo)) return;
    const to = emailTo.trim();
    const subject = `${site.name || "在线简历"} · 链接`;
    const body = `你好，\n\n这是我的在线简历页面：\n${shareUrl}\n\n（由网页「分享」生成）`;
    const href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = href;
  }, [shareUrl, site.name, emailTo]);

  const sendEmail = useCallback(async () => {
    if (!shareUrl || !isValidEmail(emailTo)) return;
    setSendState("sending");
    setSendMsg("");
    try {
      const r = await fetch("/api/share-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: emailTo.trim(), link: shareUrl }),
      });
      const data = (await r.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        message?: string;
      };
      if (r.ok && data.ok) {
        setSendState("ok");
        setSendMsg("发送成功，请查看收件箱与垃圾邮件箱。");
        return;
      }
      /** 本地 / 未配置 Resend 时接口返回 501：自动打开系统邮件，避免用户误以为「坏了」 */
      if (r.status === 501 && data.error === "email_not_configured") {
        setSendState("ok");
        setSendMsg(
          "当前未配置服务器代发，已为您打开系统邮件应用，请在本机邮箱中发送（若未弹出，可点「用本机邮件应用发送」）。部署到公网后可在 .env 中配置 RESEND_API_KEY 以支持一键发送。",
        );
        window.setTimeout(() => openMailtoSelf(), 400);
        return;
      }
      setSendState("err");
      setSendMsg(data.message || "发送失败，请稍后重试或使用「用本机邮件应用发送」。");
    } catch {
      setSendState("err");
      setSendMsg("网络错误，请稍后重试。");
    }
  }, [emailTo, shareUrl, openMailtoSelf]);

  const portalRoot = mounted && typeof document !== "undefined" ? document.body : null;

  const panel =
    open &&
    portalRoot &&
    createPortal(
      <div className="pointer-events-auto fixed inset-0 z-[200000] flex flex-col justify-end p-3 sm:justify-center sm:p-6">
        <button
          type="button"
          className="absolute inset-0 bg-ink/40 backdrop-blur-[1px]"
          aria-label="关闭分享"
          onClick={() => setOpen(false)}
        />
        <motion.div
          role="dialog"
          aria-modal
          aria-labelledby={
            sheet === "menu"
              ? menuTitleId
              : sheet === "email"
                ? emailTitleId
                : qrTitleId
          }
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 34 }}
          className="relative z-[200001] mx-auto w-full max-w-[min(100vw-1.5rem,440px)] overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl sm:rounded-3xl"
        >
          {sheet === "menu" ? (
            <>
              <div className="border-b border-line px-5 py-4 sm:px-6">
                <h2
                  id={menuTitleId}
                  className="text-lg font-semibold tracking-[-0.02em] text-ink"
                >
                  分享简历
                </h2>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
                  复制链接、发送到邮箱，或生成二维码用手机打开。
                </p>
              </div>
              <div className="px-5 py-4 sm:px-6">
                {shareUrl && isLocalDevPageUrl(shareUrl) ? (
                  <div className="mb-4 rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-2.5 text-[11px] leading-relaxed text-amber-950/90">
                    <p className="font-semibold">发给朋友时请用外网链接</p>
                    <p className="mt-1 text-amber-950/85">
                      当前是 localhost，对方打不开。临时分享可在项目根目录运行{" "}
                      <span className="rounded bg-amber-100/90 px-1 font-mono">
                        npm run dev:share
                      </span>{" "}
                      ，把终端里 localtunnel 的 https 发给对方。若要长期使用「xxx.com」并在手机浏览器打开，需购买域名并部署到公网（详见右上角「使用说明」→ 七、自定义 .com 域名）。
                    </p>
                  </div>
                ) : null}
                <p className="text-[11px] font-medium text-ink-muted">页面链接</p>
                <div className="mt-1.5 rounded-xl border border-line bg-paper/90 px-3 py-2.5">
                  <p className="break-all font-mono text-[11px] leading-relaxed text-ink/90">
                    {shareUrl || "加载中…"}
                  </p>
                </div>
                <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
                  <button
                    type="button"
                    onClick={() => void copyLink()}
                    className="w-full rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 sm:w-auto sm:min-w-[8rem]"
                  >
                    {copied ? "已复制" : "复制链接"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSheet("email")}
                    className="w-full rounded-full border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink hover:border-ink/20 sm:flex-1"
                  >
                    发送到邮箱
                  </button>
                  <button
                    type="button"
                    onClick={() => setSheet("qr")}
                    className="w-full rounded-full border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink hover:border-ink/20 sm:flex-1"
                  >
                    扫码打开
                  </button>
                </div>
              </div>
              <div className="border-t border-line px-5 py-3 sm:px-6">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-full rounded-full border border-line py-2.5 text-sm font-medium text-ink-muted hover:bg-ink/[0.04]"
                >
                  关闭
                </button>
              </div>
            </>
          ) : sheet === "email" ? (
            <>
              <div className="border-b border-line px-5 py-4 sm:px-6">
                <button
                  type="button"
                  onClick={() => {
                    setSheet("menu");
                    setSendState("idle");
                    setSendMsg("");
                  }}
                  className="mb-2 text-[11px] font-semibold text-ink-muted hover:text-ink"
                >
                  ← 返回
                </button>
                <h2
                  id={emailTitleId}
                  className="text-lg font-semibold tracking-[-0.02em] text-ink"
                >
                  发送到邮箱
                </h2>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
                  填写您的邮箱。若服务器已配置 Resend（RESEND_API_KEY），将代发投递；未配置时点击「发送」会改为打开您电脑上的邮件客户端，由本机发出。
                </p>
              </div>
              <div className="px-5 py-4 sm:px-6">
                <label
                  className="block text-[11px] font-medium text-ink-muted"
                  htmlFor="share-email-input"
                >
                  收件邮箱
                </label>
                <input
                  id="share-email-input"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="you@qq.com"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm text-ink outline-none transition-shadow focus:border-ink/25 focus:shadow-[0_0_0_3px_rgb(0_0_0/0.06)]"
                />
                {sendMsg ? (
                  <p
                    className={`mt-2 text-xs leading-relaxed ${
                      sendState === "ok" ? "font-medium text-ink" : "text-ink-muted"
                    }`}
                  >
                    {sendMsg}
                  </p>
                ) : null}
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    disabled={!isValidEmail(emailTo) || sendState === "sending"}
                    onClick={() => void sendEmail()}
                    className="rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
                  >
                    {sendState === "sending" ? "发送中…" : "发送"}
                  </button>
                  <button
                    type="button"
                    disabled={!isValidEmail(emailTo)}
                    onClick={() => openMailtoSelf()}
                    className="rounded-full border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink hover:border-ink/20 disabled:opacity-40"
                  >
                    用本机邮件应用发送
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="border-b border-line px-5 py-4 sm:px-6">
                <button
                  type="button"
                  onClick={() => setSheet("menu")}
                  className="mb-2 text-[11px] font-semibold text-ink-muted hover:text-ink"
                >
                  ← 返回
                </button>
                <h2
                  id={qrTitleId}
                  className="text-lg font-semibold tracking-[-0.02em] text-ink"
                >
                  扫码打开
                </h2>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
                  使用手机相机或微信扫一扫打开当前页面。
                </p>
              </div>
              <div className="flex flex-col items-center gap-3 px-5 py-6 sm:px-6">
                {shareUrl ? (
                  <QRCodeSVG
                    value={shareUrl}
                    size={240}
                    level="M"
                    includeMargin
                    className="max-w-full rounded-xl border border-line bg-white p-2"
                    aria-label="当前页面链接二维码"
                  />
                ) : (
                  <p className="text-sm text-ink-muted">生成中…</p>
                )}
                <p className="max-w-xs text-center text-[10px] leading-relaxed text-ink-muted/85">
                  二维码在浏览器内本地生成，不依赖外网图床。
                </p>
              </div>
            </>
          )}
        </motion.div>
      </div>,
      portalRoot,
    );

  return (
    <>
      <button
        type="button"
        id="tour-share-resume"
        onClick={() => setOpen(true)}
        className="shrink-0 rounded-full border border-line bg-surface/95 px-3 py-1.5 text-[11px] font-semibold text-ink shadow-sm backdrop-blur-md transition-colors hover:border-ink/20 hover:bg-surface sm:px-3.5 sm:text-xs"
      >
        分享
      </button>
      {panel}
    </>
  );
}
