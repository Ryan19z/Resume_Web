"use client";

import {
  classifyDocumentPreview,
  type DocumentPreviewKind,
} from "@/lib/document-preview";
import {
  clampPreviewZoom,
  computeFitZoom,
  zoomFromWheel,
} from "@/lib/zoomable-preview";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type WheelEvent,
} from "react";

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
  const viewportRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const pptxViewerRef = useRef<{ destroy: () => void } | null>(null);
  const userZoomedRef = useRef(false);
  const fitZoomRef = useRef(1);

  const [status, setStatus] = useState<PreviewStatus>(
    kind === "pdf" || kind === "legacy-office" || kind === "unsupported"
      ? "idle"
      : "loading",
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [zoom, setZoom] = useState(1);

  const applyFitZoom = useCallback(() => {
    const viewport = viewportRef.current;
    const stage = stageRef.current;
    if (!viewport || !stage) return;

    const contentWidth = stage.scrollWidth || stage.offsetWidth;
    const nextFit = computeFitZoom(viewport.clientWidth, contentWidth);
    fitZoomRef.current = nextFit;

    if (!userZoomedRef.current) {
      setZoom(nextFit);
    }
  }, []);

  const handleWheel = useCallback((event: WheelEvent<HTMLDivElement>) => {
    if (status !== "ready") return;
    event.preventDefault();
    event.stopPropagation();
    userZoomedRef.current = true;
    setZoom((current) => zoomFromWheel(event.deltaY, current));
  }, [status]);

  useEffect(() => {
    userZoomedRef.current = false;
    fitZoomRef.current = 1;
    setZoom(1);
  }, [url, fileName, kind]);

  useEffect(() => {
    if (kind !== "docx" && kind !== "pptx") return;

    const contentHost = contentRef.current;
    if (!contentHost) return;

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
        const host = contentRef.current;
        const viewport = viewportRef.current;
        if (cancelled || !host || !viewport) return;

        host.innerHTML = "";
        const viewportWidth = Math.max(viewport.clientWidth || 320, 280);

        if (kind === "docx") {
          const { renderAsync } = await import("docx-preview");
          await renderAsync(buffer, host, host, {
            className: "docx-preview-root",
            inWrapper: true,
            ignoreWidth: true,
            breakPages: true,
          });
        } else {
          const { init } = await import("pptx-preview");
          pptxViewerRef.current?.destroy();
          const width = viewportWidth;
          const height = Math.round((width * 9) / 16);
          const viewer = init(host, { width, height });
          pptxViewerRef.current = viewer;
          await viewer.preview(buffer);
        }

        if (cancelled) return;

        requestAnimationFrame(() => {
          if (cancelled) return;
          applyFitZoom();
          setStatus("ready");
        });
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
      contentHost.innerHTML = "";
    };
  }, [url, fileName, kind, locale, applyFitZoom]);

  useEffect(() => {
    if (status !== "ready") return;
    const viewport = viewportRef.current;
    if (!viewport || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => {
      applyFitZoom();
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [status, applyFitZoom]);

  if (kind === "unsupported") return null;

  const legacyHint = statusMessage(kind, locale);
  const zoomPercent = Math.round(zoom * 100);

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
      <div className="flex items-center justify-between gap-2 border-b border-line/50 px-3 py-1.5 text-[11px] text-ink-muted">
        <span>
          {locale === "zh"
            ? "滚轮缩放 · 拖拽滚动条平移"
            : "Wheel to zoom · scrollbars to pan"}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={locale === "zh" ? "缩小" : "Zoom out"}
            className="rounded border border-line px-1.5 py-0.5 text-[10px] hover:border-ink/20"
            onClick={() => {
              userZoomedRef.current = true;
              setZoom((current) => clampPreviewZoom(current - 0.12));
            }}
          >
            −
          </button>
          <span className="min-w-[3rem] text-center tabular-nums">{zoomPercent}%</span>
          <button
            type="button"
            aria-label={locale === "zh" ? "放大" : "Zoom in"}
            className="rounded border border-line px-1.5 py-0.5 text-[10px] hover:border-ink/20"
            onClick={() => {
              userZoomedRef.current = true;
              setZoom((current) => clampPreviewZoom(current + 0.12));
            }}
          >
            +
          </button>
          <button
            type="button"
            className="rounded border border-line px-1.5 py-0.5 text-[10px] hover:border-ink/20"
            onClick={() => {
              userZoomedRef.current = false;
              setZoom(fitZoomRef.current);
            }}
          >
            {locale === "zh" ? "适应" : "Fit"}
          </button>
        </div>
      </div>

      <div
        ref={viewportRef}
        className={`preview-viewport relative w-full overflow-auto bg-surface/80 ${heightClassName}`}
        onWheel={handleWheel}
      >
        {status === "loading" ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-surface/90 text-ink-muted">
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
          className={`preview-stage-wrap min-h-full w-full px-2 py-3 ${
            status === "error" ? "hidden" : ""
          }`}
        >
          <div
            ref={stageRef}
            className="preview-stage mx-auto"
            style={{
              zoom,
              width: "100%",
              maxWidth: "100%",
            }}
          >
            <div ref={contentRef} className="docx-pptx-preview-host w-full" />
          </div>
        </div>
      </div>

      <p className="border-t border-line/50 px-3 py-2 text-[11px] text-ink-muted">
        {kind === "pptx"
          ? locale === "zh"
            ? "PPT 已按预览区宽度自适应显示，滚轮可放大查看细节，预览区内按钮可翻页。"
            : "PPT fits the preview width. Use the wheel to zoom and in-preview controls to change slides."
          : locale === "zh"
            ? "Word 已按预览区宽度自适应显示，滚轮可放大查看细节。"
            : "Word fits the preview width. Use the wheel to zoom in for details."}
      </p>
    </div>
  );
}
