"use client";

import { useSiteContent } from "@/context/SiteContentProvider";
import { useLanguageMode } from "@/context/LanguageModeProvider";
import { useEffect, useState } from "react";

export function SiteFooter() {
  const { site, canEdit, editPermissionLoaded, previewMode } = useSiteContent();
  const { mode } = useLanguageMode();
  const [qrZoomItem, setQrZoomItem] = useState<{
    src: string;
    caption: string;
  } | null>(null);
  const email = site.contactEmail?.trim();
  const phone = site.contactPhone?.trim();
  const footerQrs = Array.isArray(site.heroContactQrs)
    ? site.heroContactQrs
        .map((item) => ({
          src: String(item.src ?? "").trim(),
          caption: String(item.caption ?? "").trim(),
        }))
        .filter((item) => item.src)
        .slice(0, 4)
    : [];

  useEffect(() => {
    if (!qrZoomItem) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setQrZoomItem(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [qrZoomItem]);

  const showPrivacyNote =
    editPermissionLoaded && !canEdit && !previewMode;
  const readonlyVisitor = showPrivacyNote;
  const hasContact = Boolean(email || phone || footerQrs.length > 0);

  if (!hasContact && !showPrivacyNote) return null;

  return (
    <footer
      className={`border-t border-line/70 bg-paper text-left ${
        readonlyVisitor
          ? "px-6 sm:px-12"
          : "px-6 py-8 sm:px-12"
      }`}
    >
      {hasContact ? (
      <div
        className={`flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between ${
          readonlyVisitor ? "pt-5" : ""
        }`}
      >
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-ink-muted">
            {mode === "zh" ? "联系入口" : "Contact"}
          </p>
          <div className="mt-4 flex flex-col items-start gap-2.5 text-sm text-ink">
            {email ? (
              <span className="micro-card inline-flex items-center gap-2 rounded-full border border-line bg-surface/85 px-4 py-2 font-medium">
                <span
                  className="inline-flex h-4 w-4 items-center justify-center text-ink-muted"
                  aria-label={mode === "zh" ? "邮件" : "Email"}
                  title={mode === "zh" ? "邮件" : "Email"}
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none" aria-hidden="true">
                    <path
                      d="M4 7h16v10H4z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="m5 8 7 6 7-6"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span>{email}</span>
              </span>
            ) : null}
            {phone ? (
              <span className="micro-card inline-flex items-center gap-2 rounded-full border border-line bg-surface/85 px-4 py-2 font-medium">
                <span
                  className="inline-flex h-4 w-4 items-center justify-center text-ink-muted"
                  aria-label={mode === "zh" ? "电话" : "Phone"}
                  title={mode === "zh" ? "电话" : "Phone"}
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none" aria-hidden="true">
                    <path
                      d="M6.7 3.8h2.2l1.2 3.8-1.6 1.2a13 13 0 0 0 6.7 6.7l1.2-1.6 3.8 1.2v2.2c0 .8-.7 1.5-1.5 1.5C9.9 19.8 4.2 14.1 4.2 7.3c0-.8.7-1.5 1.5-1.5Z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span>{phone}</span>
              </span>
            ) : null}
            <a
              className="inline-flex items-center rounded-full border border-line bg-surface/72 px-3 py-2 text-xs text-ink-muted transition-colors hover:border-ink/20 hover:text-ink"
              href="#intro"
            >
              {mode === "zh" ? "查看首屏完整联系方式" : "See full contacts on top"}
            </a>
          </div>
        </div>
        {footerQrs.length > 0 ? (
          <div className="flex w-full justify-start sm:w-auto sm:justify-end">
            <div className="flex flex-wrap justify-end gap-3">
              {footerQrs.map((item, idx) => (
                <button
                  key={`${item.src}-${idx}`}
                  type="button"
                  onDoubleClick={() =>
                    setQrZoomItem({ src: item.src, caption: item.caption })
                  }
                  className="cursor-zoom-in"
                  title={mode === "zh" ? "双击放大二维码" : "Double-click to zoom QR"}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.src}
                    alt={item.caption || (mode === "zh" ? "联系二维码" : "Contact QR")}
                    className="h-24 w-24 object-contain"
                    loading="lazy"
                    decoding="async"
                  />
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
      ) : null}
      {showPrivacyNote ? (
        <p
          className={`text-[11px] leading-snug text-ink-muted/80 ${
            hasContact
              ? readonlyVisitor
                ? "mt-3 border-t border-line/40 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]"
                : "mt-6 border-t border-line/50 pt-4"
              : readonlyVisitor
                ? "px-0 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]"
                : ""
          }`}
        >
          {mode === "zh"
            ? "本页会匿名记录是否被打开及大致地区，帮助候选人确认简历已送达；不保存访问者 IP 明文，也无法识别具体身份。"
            : "This page anonymously logs opens and approximate region so the candidate knows the resume was seen. No raw IP or personal identity is stored."}
        </p>
      ) : null}
      {qrZoomItem ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center px-4 py-8">
          <button
            type="button"
            aria-label={mode === "zh" ? "关闭" : "Close"}
            className="absolute inset-0 bg-ink/55 backdrop-blur-[2px]"
            onClick={() => setQrZoomItem(null)}
          />
          <div className="relative z-[1] w-full max-w-sm rounded-2xl border border-line bg-surface p-4 shadow-[0_20px_48px_rgba(0,0,0,0.35)]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-ink">
                {mode === "zh" ? "二维码放大预览" : "Zoomed QR preview"}
              </p>
              <button
                type="button"
                className="rounded-full border border-line px-3 py-1 text-xs text-ink-muted transition-colors hover:border-ink/20 hover:text-ink"
                onClick={() => setQrZoomItem(null)}
              >
                {mode === "zh" ? "关闭" : "Close"}
              </button>
            </div>
            <div className="overflow-hidden rounded-xl border border-line/70 bg-paper/70">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrZoomItem.src}
                alt={mode === "zh" ? "联系二维码" : "Contact QR"}
                className="mx-auto block h-auto w-full max-w-[320px] object-contain p-2"
                loading="eager"
                decoding="async"
              />
            </div>
            {qrZoomItem.caption ? (
              <p className="mt-2 text-center text-xs leading-relaxed text-ink-muted">
                {qrZoomItem.caption}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </footer>
  );
}
