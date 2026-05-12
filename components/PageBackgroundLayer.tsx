"use client";

import { useSiteContent } from "@/context/SiteContentProvider";

/**
 * 整站底层：主题纸色 + 可选背景图（独立图层控制透明度，不冲淡正文）。
 */
export function PageBackgroundLayer() {
  const { site } = useSiteContent();
  const src = site.pageBackgroundImageSrc?.trim();
  const opacityRaw = site.pageBackgroundImageOpacity;
  const opacity =
    typeof opacityRaw === "number" && Number.isFinite(opacityRaw)
      ? Math.min(1, Math.max(0, opacityRaw))
      : 0.18;

  /**
   * 父级须为 `position: relative`（见 VerticalScrollLayout），且与正文兄弟层叠：本层 `z-0`，
   * 正文外包一层 `z-10`，避免 `-z-index` 在部分环境下被绘到 stacking context 之下导致「背景/内容异常」。
   * 子层一律 `pointer-events-none`，避免截获点击。
   */
  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      <div className="pointer-events-none absolute inset-0 bg-paper" />
      {src ? (
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat print:hidden"
          style={{
            backgroundImage: `url(${JSON.stringify(src)})`,
            opacity,
          }}
        />
      ) : null}
    </div>
  );
}
