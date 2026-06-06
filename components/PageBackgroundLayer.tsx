"use client";

import { useSiteContent } from "@/context/SiteContentProvider";
import {
  DEFAULT_PAGE_BACKGROUND_IMAGE,
  defaultPageBackground,
  normalizePageBackground,
} from "@/lib/page-background";
import { imageOverlayOpacity } from "@/lib/page-background-display";

/**
 * 整站视口固定背景（随滚动内容移动时底图保持连贯，避免只出现在某一屏）。
 */
export function PageBackgroundLayer() {
  const { site } = useSiteContent();
  const bg = normalizePageBackground(
    site.pageBackground,
    defaultPageBackground,
  );

  const shellClass =
    "pointer-events-none fixed inset-0 z-0 overflow-hidden print:hidden";

  if (bg.kind === "image") {
    const imageUrl = bg.imageUrl?.trim() || DEFAULT_PAGE_BACKGROUND_IMAGE;
    const strength = bg.imageStrength ?? 32;
    const overlayOpacity = imageOverlayOpacity(strength);

    return (
      <div className={shellClass} aria-hidden>
        <div className="absolute inset-0 bg-paper" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-contain object-center"
        />
        <div
          className="absolute inset-0 bg-paper"
          style={{ opacity: overlayOpacity }}
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgb(var(--color-paper)/0.05)_0%,rgb(var(--color-paper)/0.42)_50%,rgb(var(--color-paper)/0.72)_100%)]" />
      </div>
    );
  }

  if (bg.kind === "mesh") {
    return (
      <div className={shellClass} aria-hidden>
        <div className="page-mesh-base absolute inset-0" />
        <div className="page-mesh-layer absolute inset-0">
          <span className="page-mesh-blob page-mesh-blob--1" />
          <span className="page-mesh-blob page-mesh-blob--2" />
          <span className="page-mesh-blob page-mesh-blob--3" />
        </div>
        <div className="absolute inset-0 bg-paper/72" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgb(var(--color-paper)/0.05)_0%,rgb(var(--color-paper)/0.45)_55%,rgb(var(--color-paper)/0.78)_100%)]" />
      </div>
    );
  }

  return (
    <div className={shellClass} aria-hidden>
      <div className="pointer-events-none absolute inset-0 bg-paper" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgb(var(--color-paper)/0.99)_0%,rgb(var(--color-paper)/1)_100%)]" />
    </div>
  );
}
