"use client";

import { resolveDocumentPreview } from "@/lib/document-preview";

type DocumentEmbedPreviewProps = {
  url: string;
  fileName?: string;
  title?: string;
  className?: string;
  heightClassName?: string;
  locale?: "zh" | "en";
};

export function DocumentEmbedPreview({
  url,
  fileName,
  title,
  className = "",
  heightClassName = "h-[420px]",
  locale = "zh",
}: DocumentEmbedPreviewProps) {
  const preview = resolveDocumentPreview(url, { fileName });
  if (!preview.embedSrc) return null;

  return (
    <div
      className={`overflow-hidden rounded-lg border border-line/60 bg-surface/40 ${className}`}
    >
      <iframe
        src={preview.embedSrc}
        title={title || fileName || "document"}
        className={`w-full ${heightClassName}`}
      />
      {preview.kind === "office" ? (
        <p className="border-t border-line/50 px-3 py-2 text-[11px] text-ink-muted">
          {locale === "zh"
            ? "Word / PPT 通过 Microsoft 在线预览嵌入；若未显示，请使用下方按钮打开或下载。"
            : "Word/PPT preview uses Microsoft Office Online. If it does not load, open or download below."}
        </p>
      ) : null}
    </div>
  );
}
