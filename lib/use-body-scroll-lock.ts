"use client";

import { useLayoutEffect } from "react";

let lockCount = 0;
let savedOverflow = "";

/**
 * 多个弹层同时打开时引用计数，避免后关闭的层把 overflow 恢复错。
 */
export function useBodyScrollLock(locked: boolean): void {
  useLayoutEffect(() => {
    if (!locked) return;

    if (lockCount === 0) {
      savedOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    lockCount += 1;

    return () => {
      lockCount -= 1;
      if (lockCount <= 0) {
        lockCount = 0;
        document.body.style.overflow = savedOverflow;
      }
    };
  }, [locked]);
}
