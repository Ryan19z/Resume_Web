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
import {
  appendResumeScopeToPath,
  parseClientResumeScope,
} from "@/lib/resume-scope";
import {
  buildShareLink,
} from "@/lib/share-url";
import {
  getPublicSiteOrigin,
  hasScopedResumeInUrl,
  toPublicPageUrl,
} from "@/lib/public-site-url";
import { privacyNotice } from "@/lib/privacy-notices";
import { getHrShareCopy } from "@/lib/hr-share-copy";
import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type Sheet = "menu" | "email" | "qr";

const SHARE_EMAIL_BODY_KEY = "share-email-body-v1";
const SHARE_LOCK_LANG_KEY = "share-lock-lang-v1";

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

function isOnLocalDevHost(): boolean {
  if (typeof window === "undefined") return false;
  return isLocalDevPageUrl(window.location.href);
}

export function ShareResumeControl() {
  const { mode, langSwitchLocked } = useLanguageMode();
  const { site, canEdit, editPermissionLoaded, previewMode } = useSiteContent();
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
  const [lockLangOnShare, setLockLangOnShare] = useState(false);
  const menuTitleId = useId();
  const emailTitleId = useId();
  const qrTitleId = useId();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    try {
      setLockLangOnShare(window.localStorage.getItem(SHARE_LOCK_LANG_KEY) === "1");
    } catch {
      setLockLangOnShare(false);
    }
  }, []);

  const persistLockLangPref = useCallback((checked: boolean) => {
    setLockLangOnShare(checked);
    try {
      window.localStorage.setItem(SHARE_LOCK_LANG_KEY, checked ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

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
    const href = window.location.href;
    setPageUrl(hasScopedResumeInUrl(href) ? toPublicPageUrl(href) : "");
    setSheet("menu");
    setSendState("idle");
    setSendMsg("");
  }, [open]);

  const missingScopedResume =
    open && typeof window !== "undefined" && !hasScopedResumeInUrl(window.location.href);

  const isHrVisitor =
    editPermissionLoaded && !canEdit && !previewMode;
  const hrShare = getHrShareCopy(mode);

  const shareUrl = useMemo(() => {
    if (!pageUrl) return "";
    if (isHrVisitor) {
      return buildShareLink(pageUrl, {
        lang: mode,
        lockLang: langSwitchLocked,
        stripEditSecrets: false,
      });
    }
    return buildShareLink(pageUrl, {
      lang: mode,
      lockLang: lockLangOnShare,
      stripEditSecrets: editPermissionLoaded && canEdit,
    });
  }, [
    pageUrl,
    mode,
    lockLangOnShare,
    langSwitchLocked,
    editPermissionLoaded,
    canEdit,
    isHrVisitor,
  ]);

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
      const path = appendResumeScopeToPath("/api/share-email", parseClientResumeScope(), {
        includeEditToken: true,
        includeViewToken: false,
      });
      const r = await fetch(path, {
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
                  {isHrVisitor
                    ? hrShare.title
                    : mode === "zh"
                      ? "分享简历"
                      : "Share Resume"}
                </h2>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
                  {isHrVisitor
                    ? hrShare.subtitle
                    : mode === "zh"
                      ? "复制链接、发送到邮箱，或生成二维码用手机打开。"
                      : "Copy link, send by email, or scan a QR code on mobile."}
                </p>
              </div>
              <div className="px-5 py-4 sm:px-6">
                {missingScopedResume ? (
                  <div className="mb-4 rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-2.5 text-[11px] leading-relaxed text-amber-950/90">
                    <p className="font-semibold">
                      {mode === "zh"
                        ? "请用编辑链接打开后再分享"
                        : "Open with a customer Edit URL first"}
                    </p>
                    <p className="mt-1 text-amber-950/85">
                      {mode === "zh"
                        ? `分享链接必须带 resumeId，指向独立客户空间（默认模板「你的名字」）。当前页面无 resumeId，若直接分享 ${getPublicSiteOrigin()} 会打开站长全局站点，可能含个人草稿。`
                        : `Share links must include resumeId for an isolated customer space (default template). Without it, ${getPublicSiteOrigin()} shows the site owner's global draft.`}
                    </p>
                  </div>
                ) : !isHrVisitor && isOnLocalDevHost() && shareUrl ? (
                  <div className="mb-4 rounded-xl border border-line/80 bg-paper/80 px-3 py-2.5 text-[11px] leading-relaxed text-ink-muted">
                    <p className="font-medium text-ink">
                      {mode === "zh"
                        ? "链接域名说明"
                        : "Link domain note"}
                    </p>
                    <p className="mt-1">
                      {mode === "zh"
                        ? `当前分享链接使用 ${getPublicSiteOrigin()}。本地调试时请确保收件人也能访问该地址。`
                        : `Share link uses ${getPublicSiteOrigin()}. For local dev, ensure recipients can reach this host.`}
                    </p>
                  </div>
                ) : null}
                {!missingScopedResume && !isHrVisitor ? (
                  <div className="mb-4 rounded-xl border border-sky-200/70 bg-sky-50/50 px-3 py-2.5 text-[11px] leading-relaxed text-sky-950/90">
                    <p>{privacyNotice("publishedContent", mode)}</p>
                    <p className="mt-1.5">
                      {privacyNotice("shareViewLink", mode)}{" "}
                      <Link
                        href={`/privacy?lang=${mode}`}
                        className="font-semibold text-sky-900/80 underline-offset-2 hover:text-sky-950 hover:underline"
                      >
                        {mode === "zh" ? "隐私政策" : "Privacy policy"}
                      </Link>
                    </p>
                  </div>
                ) : null}
                {!isHrVisitor ? (
                  <>
                <p className="text-[11px] font-medium text-ink-muted">
                  {mode === "zh" ? "页面链接" : "Page URL"}
                </p>
                <p className="mt-1 text-[10px] leading-relaxed text-ink-muted/90">
                  {mode === "zh"
                    ? `链接已固定为中文版（?lang=zh）${lockLangOnShare ? "，且访客无法切换语言" : "。"}`
                    : `Link opens the English version (?lang=en)${
                        lockLangOnShare ? "; language switch hidden for visitors." : "."
                      }`}
                </p>
                <label className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-xl border border-line/80 bg-paper/60 px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={lockLangOnShare}
                    onChange={(e) => persistLockLangPref(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-line accent-[rgb(var(--selection))]"
                  />
                  <span className="min-w-0 text-[11px] leading-relaxed text-ink">
                    <span className="font-medium">
                      {mode === "zh"
                        ? "隐藏语言切换（推荐给 HR）"
                        : "Hide language switch (recommended for recruiters)"}
                    </span>
                    <span className="mt-0.5 block text-ink-muted">
                      {mode === "zh"
                        ? "访客只能看当前语言版本，避免误切到另一套简历。"
                        : "Visitors only see this language; they cannot switch to the other resume."}
                    </span>
                  </span>
                </label>
                  </>
                ) : null}
                <div className={`rounded-xl border border-line bg-paper/90 px-3 py-2.5 ${isHrVisitor ? "" : "mt-2"}`}>
                  <p className="break-all font-mono text-[11px] leading-relaxed text-ink/90">
                    {shareUrl || (mode === "zh" ? "加载中…" : "Loading...")}
                  </p>
                </div>
                <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
                  <button
                    type="button"
                    onClick={() => void copyLink()}
                    disabled={!shareUrl}
                    className="w-full rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40 sm:w-auto sm:min-w-[8rem]"
                  >
                    {copied
                      ? isHrVisitor
                        ? hrShare.copied
                        : mode === "zh"
                          ? "已复制"
                          : "Copied"
                      : isHrVisitor
                        ? hrShare.copyLink
                        : mode === "zh"
                          ? "复制链接"
                          : "Copy link"}
                  </button>
                  {editPermissionLoaded && canEdit ? (
                    <button
                      type="button"
                      onClick={() => setSheet("email")}
                      className="w-full rounded-full border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink hover:border-ink/20 sm:flex-1"
                    >
                      {mode === "zh" ? "发送到邮箱" : "Send via email"}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setSheet("qr")}
                    disabled={!shareUrl}
                    className="w-full rounded-full border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink hover:border-ink/20 disabled:opacity-40 sm:flex-1"
                  >
                    {isHrVisitor
                      ? hrShare.qr
                      : mode === "zh"
                        ? "扫码打开"
                        : "Open with QR"}
                  </button>
                </div>
              </div>
              <div className="border-t border-line px-5 py-3 sm:px-6">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-full rounded-full border border-line py-2.5 text-sm font-medium text-ink-muted hover:bg-ink/[0.04]"
                >
                  {isHrVisitor
                    ? hrShare.close
                    : mode === "zh"
                      ? "关闭"
                      : "Close"}
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
                  {isHrVisitor
                    ? hrShare.qrTitle
                    : mode === "zh"
                      ? "扫码打开"
                      : "Open with QR"}
                </h2>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
                  {isHrVisitor
                    ? hrShare.qrSubtitle
                    : mode === "zh"
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
        {isHrVisitor
          ? mode === "zh"
            ? "链接"
            : "Link"
          : mode === "zh"
            ? "分享"
            : "Share"}
      </button>
      {panel}
    </>
  );
}
