"use client";

import { useLanguageMode } from "@/context/LanguageModeProvider";
import { useSiteContent } from "@/context/SiteContentProvider";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import {
  composeShareEmailText,
  defaultShareEmailMessage,
} from "@/lib/share-email-compose";
import { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

type Sheet = "menu" | "email" | "qr";

const SHARE_EMAIL_BODY_KEY = "share-email-body-v1";

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
  const { mode } = useLanguageMode();
  const { site } = useSiteContent();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [sheet, setSheet] = useState<Sheet>("menu");
  const [pageUrl, setPageUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [sendState, setSendState] = useState<"idle" | "sending" | "ok" | "err">(
    "idle",
  );
  const [sendMsg, setSendMsg] = useState("");
  const menuTitleId = useId();
  const emailTitleId = useId();
  const qrTitleId = useId();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = `${SHARE_EMAIL_BODY_KEY}-${mode}`;
    try {
      const saved = window.localStorage.getItem(key);
      setEmailBody(
        saved != null ? saved : defaultShareEmailMessage(mode, site.name),
      );
    } catch {
      setEmailBody(defaultShareEmailMessage(mode, site.name));
    }
  }, [mode, site.name]);

  const persistEmailBody = useCallback(
    (value: string) => {
      if (typeof window === "undefined") return;
      const key = `${SHARE_EMAIL_BODY_KEY}-${mode}`;
      try {
        window.localStorage.setItem(key, value);
      } catch {
        /* 存储满时忽略 */
      }
    },
    [mode],
  );

  useEffect(() => {
    if (!open) return;
    setPageUrl(typeof window !== "undefined" ? window.location.href : "");
    setSheet("menu");
    setSendState("idle");
    setSendMsg("");
  }, [open]);

  const shareUrl = (() => {
    if (!pageUrl) return "";
    try {
      const u = new URL(pageUrl);
      const resumeId = u.searchParams.get("resumeId");
      const viewToken = u.searchParams.get("viewToken");
      if (!resumeId || !viewToken) return pageUrl;
      const view = new URL(u.origin + u.pathname);
      view.searchParams.set("resumeId", resumeId);
      view.searchParams.set("viewToken", viewToken);
      if (u.hash) view.hash = u.hash;
      return view.toString();
    } catch {
      return pageUrl;
    }
  })();

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
    const subject = `${site.name || (mode === "zh" ? "在线简历" : "Online resume")} · ${mode === "zh" ? "链接" : "Link"}`;
    const body = composeShareEmailText(emailBody, shareUrl, mode, site.name);
    const href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = href;
  }, [shareUrl, site.name, emailTo, emailBody, mode]);

  const sendEmail = useCallback(async () => {
    if (!shareUrl || !isValidEmail(emailTo)) return;
    setSendState("sending");
    setSendMsg("");
    try {
      const r = await fetch("/api/share-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: emailTo.trim(),
          link: shareUrl,
          message: emailBody,
          lang: mode,
        }),
      });
      const data = (await r.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        message?: string;
      };
      if (r.ok && data.ok) {
        setSendState("ok");
        setSendMsg(
          mode === "zh"
            ? "发送成功，请查看收件箱与垃圾邮件箱。"
            : "Sent successfully. Please check inbox and spam folder.",
        );
        return;
      }
      /** 本地 / 未配置 Resend 时接口返回 501：自动打开系统邮件，避免用户误以为「坏了」 */
      if (r.status === 501 && data.error === "email_not_configured") {
        setSendState("ok");
        setSendMsg(
          mode === "zh"
            ? "当前未配置服务器代发，已为您打开系统邮件应用，请在本机邮箱中发送（若未弹出，可点「用本机邮件应用发送」）。部署到公网后可在 .env 中配置 RESEND_API_KEY 以支持一键发送。"
            : "Server email is not configured. Your local mail app has been opened instead. After public deployment, set RESEND_API_KEY in .env for one-click sending.",
        );
        window.setTimeout(() => openMailtoSelf(), 400);
        return;
      }
      setSendState("err");
      setSendMsg(
        data.message ||
          (mode === "zh"
            ? "发送失败，请稍后重试或使用「用本机邮件应用发送」。"
            : "Send failed. Please retry or use local mail app."),
      );
    } catch {
      setSendState("err");
      setSendMsg(mode === "zh" ? "网络错误，请稍后重试。" : "Network error. Please try again.");
    }
  }, [emailTo, emailBody, shareUrl, openMailtoSelf, mode]);

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
          className="relative z-[200001] mx-auto max-h-[min(92dvh,720px)] w-full max-w-[min(100vw-1.5rem,440px)] overflow-y-auto rounded-2xl border border-line bg-surface shadow-2xl sm:rounded-3xl"
        >
          {sheet === "menu" ? (
            <>
              <div className="border-b border-line px-5 py-4 sm:px-6">
                <h2
                  id={menuTitleId}
                  className="text-lg font-semibold tracking-[-0.02em] text-ink"
                >
                  {mode === "zh" ? "分享简历" : "Share Resume"}
                </h2>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
                  {mode === "zh"
                    ? "复制链接、发送到邮箱，或生成二维码用手机打开。"
                    : "Copy link, send by email, or scan a QR code on mobile."}
                </p>
              </div>
              <div className="px-5 py-4 sm:px-6">
                {shareUrl && isLocalDevPageUrl(shareUrl) ? (
                  <div className="mb-4 rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-2.5 text-[11px] leading-relaxed text-amber-950/90">
                    <p className="font-semibold">
                      {mode === "zh"
                        ? "发给朋友时请用外网链接"
                        : "Use a public URL when sharing with others"}
                    </p>
                    <p className="mt-1 text-amber-950/85">
                      {mode === "zh" ? (
                        <>
                          当前是 localhost，对方打不开。临时分享可在项目根目录运行{" "}
                          <span className="rounded bg-amber-100/90 px-1 font-mono">
                            npm run dev:share
                          </span>{" "}
                          ，把终端里 localtunnel 的 https 发给对方。
                        </>
                      ) : (
                        <>
                          This is localhost and not reachable by others. For temporary
                          sharing, run{" "}
                          <span className="rounded bg-amber-100/90 px-1 font-mono">
                            npm run dev:share
                          </span>{" "}
                          and send the generated localtunnel https URL.
                        </>
                      )}
                    </p>
                  </div>
                ) : null}
                <p className="text-[11px] font-medium text-ink-muted">
                  {mode === "zh" ? "页面链接" : "Page URL"}
                </p>
                <div className="mt-1.5 rounded-xl border border-line bg-paper/90 px-3 py-2.5">
                  <p className="break-all font-mono text-[11px] leading-relaxed text-ink/90">
                    {shareUrl || (mode === "zh" ? "加载中…" : "Loading...")}
                  </p>
                </div>
                <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
                  <button
                    type="button"
                    onClick={() => void copyLink()}
                    className="w-full rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 sm:w-auto sm:min-w-[8rem]"
                  >
                    {copied
                      ? mode === "zh"
                        ? "已复制"
                        : "Copied"
                      : mode === "zh"
                        ? "复制链接"
                        : "Copy link"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSheet("email")}
                    className="w-full rounded-full border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink hover:border-ink/20 sm:flex-1"
                  >
                    {mode === "zh" ? "发送到邮箱" : "Send via email"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSheet("qr")}
                    className="w-full rounded-full border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink hover:border-ink/20 sm:flex-1"
                  >
                    {mode === "zh" ? "扫码打开" : "Open with QR"}
                  </button>
                </div>
              </div>
              <div className="border-t border-line px-5 py-3 sm:px-6">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-full rounded-full border border-line py-2.5 text-sm font-medium text-ink-muted hover:bg-ink/[0.04]"
                >
                  {mode === "zh" ? "关闭" : "Close"}
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
                  {mode === "zh" ? "← 返回" : "← Back"}
                </button>
                <h2
                  id={emailTitleId}
                  className="text-lg font-semibold tracking-[-0.02em] text-ink"
                >
                  {mode === "zh" ? "发送到邮箱" : "Send via email"}
                </h2>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
                  {mode === "zh"
                    ? "填写收件邮箱与邮件正文；发送时会在正文末尾自动附上简历链接。"
                    : "Enter recipient email and message body; the resume link is appended when sending."}
                </p>
              </div>
              <div className="px-5 py-4 sm:px-6">
                <label
                  className="block text-[11px] font-medium text-ink-muted"
                  htmlFor="share-email-input"
                >
                  {mode === "zh" ? "收件邮箱" : "Recipient email"}
                </label>
                <input
                  id="share-email-input"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder={mode === "zh" ? "you@qq.com" : "you@example.com"}
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm text-ink outline-none transition-shadow focus:border-ink/25 focus:shadow-[0_0_0_3px_rgb(0_0_0/0.06)]"
                />
                <label
                  className="mt-4 block text-[11px] font-medium text-ink-muted"
                  htmlFor="share-email-body"
                >
                  {mode === "zh" ? "邮件正文" : "Email message"}
                </label>
                <textarea
                  id="share-email-body"
                  rows={6}
                  maxLength={2000}
                  value={emailBody}
                  onChange={(e) => {
                    const value = e.target.value;
                    setEmailBody(value);
                    persistEmailBody(value);
                  }}
                  placeholder={
                    mode === "zh"
                      ? "您好，\n\n感谢查看我的在线简历……"
                      : "Hi,\n\nThank you for viewing my resume……"
                  }
                  className="mt-1.5 w-full resize-y rounded-xl border border-line bg-paper px-3 py-2.5 text-sm leading-relaxed text-ink outline-none transition-shadow focus:border-ink/25 focus:shadow-[0_0_0_3px_rgb(0_0_0/0.06)]"
                />
                <p className="mt-1.5 text-[11px] leading-relaxed text-ink-muted">
                  {mode === "zh"
                    ? "正文会原样发给对方；简历链接自动加在末尾。内容会保存在本浏览器，下次打开仍保留。"
                    : "Your text is sent as-is; the resume link is added at the end. Saved in this browser for next time."}
                </p>
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
                    {sendState === "sending"
                      ? mode === "zh"
                        ? "发送中…"
                        : "Sending..."
                      : mode === "zh"
                        ? "发送"
                        : "Send"}
                  </button>
                  <button
                    type="button"
                    disabled={!isValidEmail(emailTo)}
                    onClick={() => openMailtoSelf()}
                    className="rounded-full border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink hover:border-ink/20 disabled:opacity-40"
                  >
                    {mode === "zh"
                      ? "用本机邮件应用发送"
                      : "Send with local mail app"}
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
                  {mode === "zh" ? "← 返回" : "← Back"}
                </button>
                <h2
                  id={qrTitleId}
                  className="text-lg font-semibold tracking-[-0.02em] text-ink"
                >
                  {mode === "zh" ? "扫码打开" : "Open with QR"}
                </h2>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
                  {mode === "zh"
                    ? "使用手机相机或微信扫一扫打开当前页面。"
                    : "Scan with mobile camera to open this page."}
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
                  <p className="text-sm text-ink-muted">
                    {mode === "zh" ? "生成中…" : "Generating..."}
                  </p>
                )}
                <p className="max-w-xs text-center text-[10px] leading-relaxed text-ink-muted/85">
                  {mode === "zh"
                    ? "二维码在浏览器内本地生成，不依赖外网图床。"
                    : "QR code is generated locally in browser."}
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
        {mode === "zh" ? "分享" : "Share"}
      </button>
      {panel}
    </>
  );
}
