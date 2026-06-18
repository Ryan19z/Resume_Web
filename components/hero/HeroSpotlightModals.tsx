"use client";

import type { ResolvedVideoPreview } from "@/lib/resolve-video-preview";
import type { SpotlightKind } from "@/lib/hero-page-utils";
import { useEffect, type RefObject } from "react";

export type SpotlightPreviewState =
  | { kind: "code"; code: string; language: string }
  | { kind: "document"; url: string; fileName: string }
  | { kind: "gallery"; urls: string[] }
  | { kind: Exclude<SpotlightKind, "code" | "document" | "gallery">; url: string };

type ModalsI18n = {
  qrLabel: string;
  qrZoomTitle: string;
  qrZoomClose: string;
  hdPreviewTitle: string;
  galleryPrev: string;
  galleryNext: string;
  galleryCount: (current: number, total: number) => string;
};

type Props = {
  mode: "zh" | "en";
  i18n: ModalsI18n;
  qrZoomItem: { src: string; caption: string } | null;
  onCloseQrZoom: () => void;
  spotlightHdPreviewOpen: boolean;
  onCloseHdPreview: () => void;
  onBeforeCloseHdPreview: () => void;
  portraitHdPreviewOpen?: boolean;
  onClosePortraitHdPreview?: () => void;
  portraitUrl?: string;
  portraitAlt?: string;
  portraitCaption?: string;
  spotlightPreview: SpotlightPreviewState;
  spotlightTitle: string;
  resolvedVideo: ResolvedVideoPreview | null;
  activeGalleryUrl: string;
  galleryUrls: string[];
  gallerySlideIndex: number;
  onGallerySlideChange: (updater: (idx: number) => number) => void;
  hdVideoRef: RefObject<HTMLVideoElement | null>;
};

export function HeroSpotlightModals({
  i18n,
  qrZoomItem,
  onCloseQrZoom,
  spotlightHdPreviewOpen,
  onCloseHdPreview,
  onBeforeCloseHdPreview,
  portraitHdPreviewOpen = false,
  onClosePortraitHdPreview,
  portraitUrl = "",
  portraitAlt = "",
  portraitCaption = "",
  spotlightPreview,
  spotlightTitle,
  resolvedVideo,
  activeGalleryUrl,
  galleryUrls,
  gallerySlideIndex,
  onGallerySlideChange,
  hdVideoRef,
}: Props) {
  useEffect(() => {
    if (!qrZoomItem) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseQrZoom();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [qrZoomItem, onCloseQrZoom]);

  useEffect(() => {
    if (!spotlightHdPreviewOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onBeforeCloseHdPreview();
        onCloseHdPreview();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    spotlightHdPreviewOpen,
    onBeforeCloseHdPreview,
    onCloseHdPreview,
  ]);

  useEffect(() => {
    if (!portraitHdPreviewOpen || !onClosePortraitHdPreview) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClosePortraitHdPreview();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [portraitHdPreviewOpen, onClosePortraitHdPreview]);

  return (
    <>
      {qrZoomItem ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center px-4 py-8">
          <button
            type="button"
            aria-label={i18n.qrZoomClose}
            className="absolute inset-0 bg-ink/55 backdrop-blur-[2px]"
            onClick={onCloseQrZoom}
          />
          <div className="relative z-[1] w-full max-w-sm rounded-2xl border border-line bg-surface p-4 shadow-[0_20px_48px_rgba(0,0,0,0.35)]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-ink">{i18n.qrZoomTitle}</p>
              <button
                type="button"
                className="rounded-full border border-line px-3 py-1 text-xs text-ink-muted transition-colors hover:border-ink/20 hover:text-ink"
                onClick={onCloseQrZoom}
              >
                {i18n.qrZoomClose}
              </button>
            </div>
            <div className="overflow-hidden rounded-xl border border-line/70 bg-paper/70">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrZoomItem.src}
                alt={i18n.qrLabel}
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

      {spotlightHdPreviewOpen &&
      (spotlightPreview.kind === "image" ||
        spotlightPreview.kind === "gallery" ||
        spotlightPreview.kind === "video") ? (
        <div className="fixed inset-0 z-[91] flex items-center justify-center px-3 py-6">
          <button
            type="button"
            aria-label={i18n.qrZoomClose}
            className="absolute inset-0 bg-ink/70 backdrop-blur-[2px]"
            onClick={() => {
              onBeforeCloseHdPreview();
              onCloseHdPreview();
            }}
          />
          <div className="relative z-[1] w-full max-w-6xl rounded-2xl border border-line bg-surface p-3 shadow-[0_20px_48px_rgba(0,0,0,0.35)]">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-ink">{i18n.hdPreviewTitle}</p>
              <button
                type="button"
                className="rounded-full border border-line px-3 py-1 text-xs text-ink-muted transition-colors hover:border-ink/20 hover:text-ink"
                onClick={() => {
                  onBeforeCloseHdPreview();
                  onCloseHdPreview();
                }}
              >
                {i18n.qrZoomClose}
              </button>
            </div>
            {spotlightPreview.kind === "image" ? (
              <div className="flex max-h-[82vh] min-h-[42vh] items-center justify-center overflow-auto rounded-xl border border-line/70 bg-black/70 p-1">
                <img
                  src={spotlightPreview.url}
                  alt={spotlightTitle}
                  className="h-auto max-h-[80vh] w-auto max-w-[95vw] object-contain"
                  loading="eager"
                  decoding="async"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : spotlightPreview.kind === "gallery" && activeGalleryUrl ? (
              <div className="relative flex max-h-[82vh] min-h-[42vh] items-center justify-center overflow-auto rounded-xl border border-line/70 bg-black/70 p-1">
                <img
                  src={activeGalleryUrl}
                  alt={spotlightTitle}
                  className="h-auto max-h-[80vh] w-auto max-w-[95vw] object-contain"
                  loading="eager"
                  decoding="async"
                  referrerPolicy="no-referrer"
                />
                {galleryUrls.length > 1 ? (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        onGallerySlideChange(
                          (idx) =>
                            (idx - 1 + galleryUrls.length) % galleryUrls.length,
                        )
                      }
                      className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-line/70 bg-surface/95 px-3 py-1.5 text-sm font-medium text-ink shadow-sm transition-colors hover:border-ink/20"
                      aria-label={i18n.galleryPrev}
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onGallerySlideChange(
                          (idx) => (idx + 1) % galleryUrls.length,
                        )
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-line/70 bg-surface/95 px-3 py-1.5 text-sm font-medium text-ink shadow-sm transition-colors hover:border-ink/20"
                      aria-label={i18n.galleryNext}
                    >
                      ›
                    </button>
                    <p className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-ink/60 px-3 py-1 text-xs text-white">
                      {i18n.galleryCount(gallerySlideIndex + 1, galleryUrls.length)}
                    </p>
                  </>
                ) : null}
              </div>
            ) : resolvedVideo?.mode === "embed" ? (
              <div className="overflow-hidden rounded-xl border border-line/70 bg-black/85">
                <div className="aspect-video w-full">
                  <iframe
                    src={resolvedVideo.src}
                    title={spotlightTitle || "embedded video hd"}
                    className="h-full w-full"
                    loading="eager"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                    allowFullScreen
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
            ) : (
              <div className="flex max-h-[82vh] min-h-[42vh] items-center justify-center rounded-xl border border-line/70 bg-black/85 p-1">
                <video
                  ref={hdVideoRef}
                  src={
                    resolvedVideo?.src ??
                    (spotlightPreview.kind === "video"
                      ? spotlightPreview.url
                      : "")
                  }
                  controls
                  preload="metadata"
                  playsInline
                  className="h-auto max-h-[80vh] w-auto max-w-[95vw] object-contain"
                />
              </div>
            )}
          </div>
        </div>
      ) : null}

      {portraitHdPreviewOpen && portraitUrl.trim() && onClosePortraitHdPreview ? (
        <div className="fixed inset-0 z-[91] flex items-center justify-center px-3 py-6">
          <button
            type="button"
            aria-label={i18n.qrZoomClose}
            className="absolute inset-0 bg-ink/70 backdrop-blur-[2px]"
            onClick={onClosePortraitHdPreview}
          />
          <div className="relative z-[1] w-full max-w-3xl rounded-2xl border border-line bg-surface p-3 shadow-[0_20px_48px_rgba(0,0,0,0.35)]">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-ink">{i18n.hdPreviewTitle}</p>
              <button
                type="button"
                className="rounded-full border border-line px-3 py-1 text-xs text-ink-muted transition-colors hover:border-ink/20 hover:text-ink"
                onClick={onClosePortraitHdPreview}
              >
                {i18n.qrZoomClose}
              </button>
            </div>
            <div className="flex max-h-[82vh] min-h-[42vh] items-center justify-center overflow-auto rounded-xl border border-line/70 bg-black/70 p-1">
              <img
                src={portraitUrl.trim()}
                alt={portraitAlt || portraitCaption || "portrait"}
                className="h-auto max-h-[80vh] w-auto max-w-[95vw] object-contain"
                loading="eager"
                decoding="async"
                referrerPolicy="no-referrer"
              />
            </div>
            {portraitCaption.trim() ? (
              <p className="mt-2 text-center text-sm leading-relaxed text-ink-muted">
                {portraitCaption.trim()}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
