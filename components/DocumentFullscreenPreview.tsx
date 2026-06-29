"use client";

import { DocumentEmbedPreview } from "@/components/DocumentEmbedPreview";
import {
  classifyDocumentPreview,
  documentDownloadHref,
  fetchDocumentByteSize,
  shouldSuggestDownloadOnly,
} from "@/lib/document-preview";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type DocumentFullscreenPreviewProps = {
  open: boolean;
  onClose: () => void;
  url: string;
  fileName?: string;
  title?: string;
  fileSizeBytes?: number;
  locale?: "zh" | "en";
};

function formatFileSize(bytes: number, locale: "zh" | "en"): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    return locale === "zh"
      ? `${(bytes / 1024).toFixed(1)} KB`
      : `${(bytes / 1024).toFixed(1)} KB`;
  }
  return locale === "zh"
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentFullscreenPreview({
  open,
  onClose,
  url,
  fileName,
  title,
  fileSizeBytes,
  locale = "zh",
}: DocumentFullscreenPreviewProps) {
  const [resolvedSize, setResolvedSize] = useState<number | undefined>(fileSizeBytes);
  const [sizeLoading, setSizeLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useBodyScrollLock(open);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setResolvedSize(fileSizeBytes);
  }, [fileSizeBytes, url]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || fileSizeBytes || !url.trim()) return;
    let cancelled = false;
    setSizeLoading(true);
    void fetchDocumentByteSize(url).then((size) => {
      if (cancelled) return;
      if (size) setResolvedSize(size);
      setSizeLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, url, fileSizeBytes]);

  if (!open || !url.trim() || !mounted) return null;

  const portalRoot = typeof document !== "undefined" ? document.body : null;
  if (!portalRoot) return null;

  const kind = classifyDocumentPreview(url, fileName);
  const downloadOnly = shouldSuggestDownloadOnly(resolvedSize, kind);
  const displayName = fileName?.trim() || url.split("/").pop() || title || "document";
  const closeLabel = locale === "zh" ? "关闭" : "Close";
  const viewTitle = locale === "zh" ? "查看文件" : "View document";
  const downloadLabel = locale === "zh" ? "下载文件" : "Download";
  const openLabel = locale === "zh" ? "新窗口打开" : "Open in new tab";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={viewTitle}
      className="pointer-events-auto fixed inset-0 z-[200000] flex flex-col bg-ink/70 backdrop-blur-[2px] print:hidden"
    >
      <button
        type="button"
        aria-label={closeLabel}
        className="absolute inset-0"
        onClick={onClose}
      />
      <div className="relative z-[200001] mx-auto flex h-full w-full max-w-6xl flex-col px-3 pb-4 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] sm:py-6">
        <div
          className="mb-3 flex shrink-0 items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{viewTitle}</p>
            <p className="truncate text-xs text-ink-muted">{displayName}</p>
            {resolvedSize ? (
              <p className="text-[11px] text-ink-muted/90">
                {formatFileSize(resolvedSize, locale)}
              </p>
            ) : sizeLoading ? (
              <p className="text-[11px] text-ink-muted/90">
                {locale === "zh" ? "正在读取文件大小…" : "Reading file size…"}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-ink/20"
              onClick={(e) => e.stopPropagation()}
            >
              {openLabel}
            </a>
            <a
              href={documentDownloadHref(url)}
              download={fileName || true}
              className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-ink/20"
              onClick={(e) => e.stopPropagation()}
            >
              {downloadLabel}
            </a>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="relative z-[1] rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-ink/20 hover:text-ink"
            >
              {closeLabel}
            </button>
          </div>
        </div>

        <div
          className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-line bg-surface shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          {downloadOnly ? (
            <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center">
              <p className="max-w-md text-sm leading-relaxed text-ink-muted">
                {locale === "zh"
                  ? kind === "legacy-office"
                    ? "旧版 .doc / .ppt 暂不支持页面内预览，请下载后在本地打开。"
                    : kind === "unsupported"
                      ? "该格式暂不支持页面内预览，请下载后在本地打开。"
                      : `文件较大（${resolvedSize ? formatFileSize(resolvedSize, locale) : ""}），浏览器内预览可能卡顿，建议下载后查看。`
                  : kind === "legacy-office"
                    ? "Legacy .doc / .ppt cannot be previewed inline. Please download and open locally."
                    : kind === "unsupported"
                      ? "This format cannot be previewed inline. Please download and open locally."
                      : `This file is large${resolvedSize ? ` (${formatFileSize(resolvedSize, locale)})` : ""}. Download is recommended for smoother reading.`}
              </p>
              <a
                href={documentDownloadHref(url)}
                download={fileName || true}
                className="rounded-full border border-ink/20 bg-ink px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                {downloadLabel}
              </a>
            </div>
          ) : (
            <DocumentEmbedPreview
              url={url}
              fileName={fileName}
              title={title || displayName}
              locale={locale}
              heightClassName="h-[calc(100vh-9rem)] min-h-[420px]"
              className="h-full rounded-2xl border-0"
            />
          )}
        </div>
      </div>
    </div>,
    portalRoot,
  );
}
