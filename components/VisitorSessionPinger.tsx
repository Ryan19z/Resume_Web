"use client";

import { useSiteContent } from "@/context/SiteContentProvider";
import { randomId } from "@/lib/random-id";
import { useEffect, useRef } from "react";

const STORAGE_KEY = "resume-visitor-session-id-v1";

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = window.sessionStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = randomId("");
      window.sessionStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    return `${Date.now()}`;
  }
}

/**
 * 非编辑访客（或预览模式）向前台上报「可见停留时长」，供编辑端 HR 停留提示轮询。
 */
export function VisitorSessionPinger() {
  const { canEdit, editPermissionLoaded, previewMode } = useSiteContent();
  const visibleMsRef = useRef(0);
  const lastTickRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!editPermissionLoaded) return;
    const shouldPing = !canEdit || previewMode;
    if (!shouldPing) return;

    const sessionId = getOrCreateSessionId();
    if (!sessionId) return;

    const tick = () => {
      if (typeof document === "undefined") return;
      if (document.visibilityState !== "visible") {
        lastTickRef.current = null;
        return;
      }
      const now = performance.now();
      if (lastTickRef.current != null) {
        visibleMsRef.current += Math.min(now - lastTickRef.current, 30_000);
      }
      lastTickRef.current = now;
    };

    const onVis = () => {
      if (document.visibilityState === "visible") {
        lastTickRef.current = performance.now();
      } else {
        lastTickRef.current = null;
      }
    };

    tick();
    lastTickRef.current = performance.now();
    const visListener = () => onVis();
    document.addEventListener("visibilitychange", visListener);

    const send = () => {
      tick();
      const path =
        typeof window !== "undefined"
          ? `${window.location.pathname}${window.location.search}`
          : "/";
      void fetch("/api/visitor-heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          path,
          visibleMs: Math.round(visibleMsRef.current),
        }),
        keepalive: true,
      }).catch(() => {});
    };

    send();
    intervalRef.current = window.setInterval(send, 18_000);

    return () => {
      document.removeEventListener("visibilitychange", visListener);
      if (intervalRef.current != null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      send();
    };
  }, [canEdit, editPermissionLoaded, previewMode]);

  return null;
}
