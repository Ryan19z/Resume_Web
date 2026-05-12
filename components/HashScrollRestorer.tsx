"use client";

import { useEffect, useLayoutEffect } from "react";

/**
 * 整页为客户端树时，带 `#intro` 等 hash 的首次加载往往在 DOM 出现前就做过默认锚点滚动，
 * 导致刷新后仍停在页顶。水合后再滚一次；双 rAF 等一帧布局（顶栏占位、字体等）。
 */
function scrollToHash(): void {
  const id = decodeURIComponent(window.location.hash.replace(/^#/, ""));
  if (!id) return;
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ block: "start", behavior: "auto" });
}

export function HashScrollRestorer() {
  useLayoutEffect(() => {
    scrollToHash();
    let id2 = 0;
    const id1 = requestAnimationFrame(() => {
      id2 = requestAnimationFrame(() => scrollToHash());
    });
    return () => {
      cancelAnimationFrame(id1);
      cancelAnimationFrame(id2);
    };
  }, []);

  useEffect(() => {
    const onHash = () => scrollToHash();
    window.addEventListener("hashchange", onHash);
    const onPageShow = () => scrollToHash();
    window.addEventListener("pageshow", onPageShow);
    return () => {
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  return null;
}
