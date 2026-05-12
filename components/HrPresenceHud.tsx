"use client";

import { useSiteContent } from "@/context/SiteContentProvider";
import { useEffect, useState } from "react";

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m <= 0) return `${r} 秒`;
  if (m < 60) return `${m} 分 ${r.toString().padStart(2, "0")} 秒`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h} 小时 ${mm} 分`;
}

type ActiveRow = { id: string; path: string; visibleMs: number; lastPing: number };

/**
 * 仅「可编辑且非预览」时展示：根据访客心跳提示当前访客在本页累计停留约多久。
 */
export function HrPresenceHud() {
  const { canEdit, editPermissionLoaded, previewMode } = useSiteContent();
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    if (!editPermissionLoaded || !canEdit || previewMode) {
      setText(null);
      return;
    }

    let cancelled = false;
    const poll = async () => {
      try {
        const r = await fetch("/api/visitor-heartbeat", { cache: "no-store" });
        if (!r.ok) return;
        const data = (await r.json()) as { active?: ActiveRow[] };
        const active = Array.isArray(data.active) ? data.active : [];
        if (cancelled) return;
        if (active.length === 0) {
          setText("暂无访客心跳（对方打开页面约半分钟后会显示）");
          return;
        }
        const top = active[0]!;
        const n = active.length;
        const dur = formatDuration(top.visibleMs);
        setText(
          n > 1
            ? `约 ${n} 位访客在线 · 最长停留 ${dur}`
            : `访客浏览中 · 已停留约 ${dur}`,
        );
      } catch {
        if (!cancelled) setText(null);
      }
    };

    void poll();
    const t = window.setInterval(poll, 12_000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [canEdit, editPermissionLoaded, previewMode]);

  if (!editPermissionLoaded || !canEdit || previewMode || !text) return null;

  return (
    <div
      className="pointer-events-none fixed left-1/2 top-[calc(3.35rem+env(safe-area-inset-top,0px))] z-[63] max-w-[min(92vw,420px)] -translate-x-1/2 print:hidden"
      aria-live="polite"
    >
      <p className="rounded-full border border-line/80 bg-surface/95 px-4 py-1.5 text-center text-[11px] font-medium leading-snug text-ink shadow-sm backdrop-blur-md">
        <span className="text-ink-muted">HR 停留</span>
        <span className="mx-1.5 text-ink-muted/40" aria-hidden>
          ·
        </span>
        <span className="text-ink">{text}</span>
      </p>
    </div>
  );
}
