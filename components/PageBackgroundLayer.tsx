"use client";

import { useSiteContent } from "@/context/SiteContentProvider";
import { useInteractionMode } from "@/context/InteractionModeProvider";
import { useEffect, useState } from "react";

/**
 * 整站底层：主题纸色 + 可选背景图（独立图层控制透明度，不冲淡正文）。
 */
export function PageBackgroundLayer() {
  const { site } = useSiteContent();
  const { microInteractionEnabled } = useInteractionMode();
  const src = site.pageBackgroundImageSrc?.trim();
  const opacityRaw = site.pageBackgroundImageOpacity;
  const opacity =
    typeof opacityRaw === "number" && Number.isFinite(opacityRaw)
      ? Math.min(1, Math.max(0, opacityRaw))
      : 0.18;
  const [parallax, setParallax] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!src || !microInteractionEnabled) {
      setParallax({ x: 0, y: 0 });
      return;
    }
    let raf = 0;
    const onMove = (e: MouseEvent) => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const nx = (e.clientX / window.innerWidth - 0.5) * 2;
        const ny = (e.clientY / window.innerHeight - 0.5) * 2;
        setParallax({
          x: Math.max(-1, Math.min(1, nx)),
          y: Math.max(-1, Math.min(1, ny)),
        });
      });
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
    };
  }, [src, microInteractionEnabled]);

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
            transform: `translate3d(${parallax.x * 6}px, ${parallax.y * 6}px, 0) scale(1.02)`,
            transition: "transform 220ms ease-out",
          }}
        />
      ) : null}
    </div>
  );
}
