"use client";

import {
  classifyDocumentPreview,
  type DocumentPreviewKind,
} from "@/lib/document-preview";
import { useEffect, useRef, useState } from "react";

type DocumentEmbedPreviewProps = {
  url: string;
  fileName?: string;
  title?: string;
  className?: string;
  heightClassName?: string;
  locale?: "zh" | "en";
};

type PreviewStatus = "idle" | "loading" | "ready" | "error";

function statusMessage(
  kind: DocumentPreviewKind,
  locale: "zh" | "en",
): string | null {
  if (kind === "legacy-office") {
    return locale === "zh"
      ? "旧版 .doc / .ppt 格式暂不支持页面内预览，请使用下方按钮打开或下载；建议另存为 .docx / .pptx 后重新上传。"
      : "Legacy .doc / .ppt files cannot be previewed inline. Open or download below, or re-upload as .docx / .pptx.";
  }
  return null;
}

export function DocumentEmbedPreview({
  url,
  fileName,
  title,
  className = "",
  heightClassName = "h-[420px]",
  locale = "zh",
}: DocumentEmbedPreviewProps) {
  const kind = classifyDocumentPreview(url, fileName);
  const containerRef = useRef<HTMLDivElement>(null);
  const pptxViewerRef = useRef<{ destroy: () => void } | null>(null);
  const [status, setStatus] = useState<PreviewStatus>(
    kind === "pdf" || kind === "legacy-office" || kind === "unsupported"
      ? "idle"
      : "loading",
  );
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (kind !== "docx" && kind !== "pptx") return;

    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;

    async function renderOfficePreview() {
      setStatus("loading");
      setErrorMessage("");

      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(
            locale === "zh"
              ? `读取文档失败（HTTP ${response.status}）`
              : `Failed to load document (HTTP ${response.status})`,
          );
        }

        const buffer = await response.arrayBuffer();
        const host = containerRef.current;
        if (cancelled || !host) return;

        host.innerHTML = "";

        if (kind === "docx") {
          const { renderAsync } = await import("docx-preview");
          await renderAsync(buffer, host, host, {
            className: "docx-preview-root",
            inWrapper: true,
            ignoreWidth: false,
            breakPages: true,
          });
        } else {
          const { init } = await import("pptx-preview");
          pptxViewerRef.current?.destroy();
          const width = Math.max(host.clientWidth || 640, 320);
          const height = Math.round((width * 9) / 16);
          const viewer = init(host, { width, height });
          pptxViewerRef.current = viewer;
          await viewer.preview(buffer);
        }

        if (!cancelled) setStatus("ready");
      } catch (error) {
        if (cancelled) return;
        setStatus("error");
        setErrorMessage(
          error instanceof Error && error.message
            ? error.message
            : locale === "zh"
              ? "文档预览失败，请尝试下载后本地打开。"
              : "Preview failed. Please download and open locally.",
        );
      }
    }

    void renderOfficePreview();

    return () => {
      cancelled = true;
      pptxViewerRef.current?.destroy();
      pptxViewerRef.current = null;
      container.innerHTML = "";
    };
  }, [url, fileName, kind, locale]);

  if (kind === "unsupported") return null;

  const legacyHint = statusMessage(kind, locale);

  if (kind === "pdf") {
    return (
      <div
        className={`overflow-hidden rounded-lg border border-line/60 bg-surface/40 ${className}`}
      >
        <iframe
          src={url}
          title={title || fileName || "document"}
          className={`w-full ${heightClassName}`}
        />
      </div>
    );
  }

  if (kind === "legacy-office") {
    return legacyHint ? (
      <div
        className={`rounded-lg border border-dashed border-line/80 bg-surface/70 px-4 py-4 text-sm text-ink-muted ${className}`}
      >
        {legacyHint}
      </div>
    ) : null;
  }

  return (
    <div
      className={`overflow-hidden rounded-lg border border-line/60 bg-surface/40 ${className}`}
    >
      <div
        className={`relative w-full overflow-auto bg-surface/80 ${heightClassName}`}
      >
        {status === "loading" ? (
          <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-3 text-ink-muted">
            <div
              className="h-7 w-7 animate-spin rounded-full border-2 border-line border-t-ink/70"
              aria-hidden
            />
            <p className="text-xs">
              {locale === "zh" ? "正在渲染文档…" : "Rendering document…"}
            </p>
          </div>
        ) : null}
        {status === "error" ? (
          <div className="flex h-full min-h-[240px] items-center justify-center px-4 text-center text-sm text-ink-muted">
            {errorMessage}
          </div>
        ) : null}
        <div
          ref={containerRef}
          className={`docx-pptx-preview-host min-h-[240px] w-full ${
            status === "ready" ? "" : "hidden"
          }`}
        />
      </div>
      <p className="border-t border-line/50 px-3 py-2 text-[11px] text-ink-muted">
        {kind === "pptx"
          ? locale === "zh"
            ? "PPT 在浏览器本地渲染，可使用预览区内的翻页按钮切换幻灯片。"
            : "PPT is rendered locally in your browser. Use the slide controls in the preview."
          : locale === "zh"
            ? "Word 在浏览器本地渲染，无需依赖外网预览服务。"
            : "Word is rendered locally in your browser without external preview services."}
      </p>
    </div>
  );
}
