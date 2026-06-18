"use client";

import { useLanguageMode } from "@/context/LanguageModeProvider";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";

type Props = {
  /** 与锚点 id 一致，用于 #resume / #portfolio 直达时立即加载 */
  sectionId: string;
  loader: () => Promise<{ default: ComponentType<Record<string, never>> }>;
  fallbackMinHeight?: string;
  placeholder?: ReactNode;
};

async function loadWithRetry<T>(
  loader: () => Promise<T>,
  maxAttempts = 3,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await loader();
    } catch (e) {
      lastError = e;
      if (attempt < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, 450 * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

/**
 * 视口内或锚点命中后再 dynamic import，避免首屏同步拉取全部 chunk；
 * 失败时自动重试，降低 dev 热更新导致的 ChunkLoadError 影响。
 */
export function LazyPageMount({
  sectionId,
  loader,
  fallbackMinHeight = "50vh",
  placeholder,
}: Props) {
  const { mode } = useLanguageMode();
  const [phase, setPhase] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  const [Page, setPage] = useState<ComponentType | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const triggerLoad = useCallback(() => {
    setPhase((p) => (p === "idle" ? "loading" : p));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const matchHash = () =>
      window.location.hash.replace(/^#/, "") === sectionId;

    if (matchHash()) triggerLoad();

    const onHash = () => {
      if (matchHash()) triggerLoad();
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [sectionId, triggerLoad]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || phase !== "idle") return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) triggerLoad();
      },
      { rootMargin: "280px 0px", threshold: 0.01 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [phase, triggerLoad]);

  useEffect(() => {
    if (phase !== "loading") return;
    let cancelled = false;
    void loadWithRetry(() => loaderRef.current())
      .then((mod) => {
        if (cancelled) return;
        setPage(() => mod.default);
        setPhase("ready");
      })
      .catch(() => {
        if (!cancelled) setPhase("error");
      });
    return () => {
      cancelled = true;
    };
  }, [phase]);

  const retry = () => {
    setPage(null);
    setPhase("loading");
  };

  if (phase === "ready" && Page) return <Page />;

  return (
    <div
      ref={sentinelRef}
      style={{
        minHeight: phase === "ready" ? undefined : fallbackMinHeight,
      }}
    >
      {phase === "loading" || phase === "idle" ? (
        placeholder ?? (
          <div className="flex min-h-[inherit] items-center justify-center px-6 py-16 text-sm text-ink-muted">
            <div className="flex items-center gap-2" aria-busy="true">
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-ink/60"
                aria-hidden
              />
              {mode === "zh" ? "内容加载中…" : "Loading section…"}
            </div>
          </div>
        )
      ) : null}
      {phase === "error" ? (
        <div className="flex min-h-[inherit] flex-col items-center justify-center gap-3 px-6 py-16 text-center text-sm text-ink-muted">
          <p>
            {mode === "zh"
              ? "区块加载失败，请刷新页面或点击重试。"
              : "Failed to load this section. Refresh or retry."}
          </p>
          <button
            type="button"
            className="rounded-full border border-line px-4 py-1.5 text-xs font-medium text-ink hover:border-ink/20"
            onClick={retry}
          >
            {mode === "zh" ? "重试" : "Retry"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
