"use client";

/**
 * 整站底层：统一主题纸色，避免分区出现不一致背景观感。
 */
export function PageBackgroundLayer() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      <div className="pointer-events-none absolute inset-0 bg-paper" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgb(var(--color-paper)/0.98)_0%,rgb(var(--color-paper)/1)_100%)]" />
    </div>
  );
}
