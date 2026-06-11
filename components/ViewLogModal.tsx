"use client";

import { useLanguageMode } from "@/context/LanguageModeProvider";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import {
  appendResumeScopeToPath,
  parseClientResumeScope,
} from "@/lib/resume-scope";
import { motion } from "framer-motion";
import { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

type ViewLogEvent = {
  at: number;
  city?: string;
  region?: string;
  country?: string;
  device: "mobile" | "desktop" | "unknown";
};

type ViewLogVisitor = {
  visitorId: string;
  openCount: number;
  firstAt: number;
  lastAt: number;
  city?: string;
  region?: string;
  country?: string;
  device: ViewLogEvent["device"];
};

type Props = {
  open: boolean;
  onClose: () => void;
};

function formatLocation(
  e: Pick<ViewLogEvent, "city" | "region" | "country">,
  mode: "zh" | "en",
): string {
  const parts = [e.city, e.region, e.country].filter(Boolean);
  if (parts.length > 0) return parts.join(" · ");
  return mode === "zh" ? "未知地区" : "Unknown region";
}

function formatDevice(device: ViewLogEvent["device"], mode: "zh" | "en"): string {
  if (device === "mobile") return mode === "zh" ? "手机" : "Mobile";
  if (device === "desktop") return mode === "zh" ? "电脑" : "Desktop";
  return mode === "zh" ? "未知" : "Unknown";
}

function formatWhen(ts: number, mode: "zh" | "en"): string {
  return new Date(ts).toLocaleString(mode === "zh" ? "zh-CN" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ViewLogModal({ open, onClose }: Props) {
  const { mode } = useLanguageMode();
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [totalOpens, setTotalOpens] = useState(0);
  const [uniqueVisitors, setUniqueVisitors] = useState(0);
  const [visitors, setVisitors] = useState<ViewLogVisitor[]>([]);
  const [events, setEvents] = useState<ViewLogEvent[]>([]);
  const [tab, setTab] = useState<"visitors" | "timeline">("visitors");

  useEffect(() => setMounted(true), []);

  useBodyScrollLock(open);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const scope = parseClientResumeScope();
      const path = appendResumeScopeToPath("/api/view-log", scope, {
        includeEditToken: true,
        includeViewToken: false,
      });
      const r = await fetch(path, { cache: "no-store" });
      const data = (await r.json().catch(() => ({}))) as {
        ok?: boolean;
        totalOpens?: number;
        totalViews?: number;
        uniqueVisitors?: number;
        visitors?: ViewLogVisitor[];
        events?: ViewLogEvent[];
        message?: string;
      };
      if (!r.ok || !data.ok) {
        setError(
          typeof data.message === "string"
            ? data.message
            : mode === "zh"
              ? "加载失败"
              : "Failed to load",
        );
        return;
      }
      setTotalOpens(
        typeof data.totalOpens === "number"
          ? data.totalOpens
          : typeof data.totalViews === "number"
            ? data.totalViews
            : 0,
      );
      setUniqueVisitors(
        typeof data.uniqueVisitors === "number" ? data.uniqueVisitors : 0,
      );
      setVisitors(Array.isArray(data.visitors) ? data.visitors : []);
      setEvents(Array.isArray(data.events) ? data.events : []);
    } catch {
      setError(mode === "zh" ? "网络错误" : "Network error");
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const portalRoot = mounted && typeof document !== "undefined" ? document.body : null;

  if (!open || !portalRoot) return null;

  const empty = totalOpens === 0;

  return createPortal(
    <div className="pointer-events-auto fixed inset-0 z-[200010] flex items-end justify-center p-3 sm:items-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-ink/40 backdrop-blur-[1px]"
        aria-label={mode === "zh" ? "关闭" : "Close"}
        onClick={onClose}
      />
      <motion.div
        role="dialog"
        aria-modal
        aria-labelledby={titleId}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-[200011] flex max-h-[min(88dvh,600px)] w-full max-w-[min(100vw-1.5rem,440px)] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl sm:rounded-3xl"
      >
        <div className="border-b border-line px-5 py-4 sm:px-6">
          <h2 id={titleId} className="text-lg font-semibold text-ink">
            {mode === "zh" ? "链接访问记录" : "Link visit history"}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">
            {mode === "zh"
              ? "统计只读链接被打开的次数与独立访客。无法识别具体公司名或 HR 姓名，仅按网络与地区估算。"
              : "Counts read-only link opens and unique visitors. Cannot identify company names or people—network/region only."}
          </p>
          {!empty ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-line/80 bg-paper/60 px-3 py-2">
                <p className="text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                  {mode === "zh" ? "总打开次数" : "Total opens"}
                </p>
                <p className="mt-0.5 text-xl font-semibold text-ink">{totalOpens}</p>
              </div>
              <div className="rounded-xl border border-line/80 bg-paper/60 px-3 py-2">
                <p className="text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                  {mode === "zh" ? "独立访客" : "Unique visitors"}
                </p>
                <p className="mt-0.5 text-xl font-semibold text-ink">
                  {uniqueVisitors}
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {!empty ? (
          <div className="flex gap-1 border-b border-line px-5 pt-2 sm:px-6">
            <button
              type="button"
              onClick={() => setTab("visitors")}
              className={`rounded-t-lg px-3 py-2 text-[12px] font-medium ${
                tab === "visitors"
                  ? "border border-b-0 border-line bg-surface text-ink"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              {mode === "zh" ? "按访客" : "By visitor"}
            </button>
            <button
              type="button"
              onClick={() => setTab("timeline")}
              className={`rounded-t-lg px-3 py-2 text-[12px] font-medium ${
                tab === "timeline"
                  ? "border border-b-0 border-line bg-surface text-ink"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              {mode === "zh" ? "时间线" : "Timeline"}
            </button>
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3 sm:px-6">
          {loading ? (
            <p className="py-8 text-center text-sm text-ink-muted">
              {mode === "zh" ? "加载中…" : "Loading…"}
            </p>
          ) : error ? (
            <p className="py-8 text-center text-sm text-ink-muted">{error}</p>
          ) : empty ? (
            <p className="py-8 text-center text-sm text-ink-muted">
              {mode === "zh"
                ? "暂无访问记录。把只读链接发给 HR 后，对方打开即可出现在这里。"
                : "No visits yet. Share your read-only link with recruiters."}
            </p>
          ) : tab === "visitors" ? (
            <ul className="space-y-2">
              {visitors.map((v, i) => (
                <li
                  key={v.visitorId}
                  className="rounded-xl border border-line/80 bg-paper/60 px-3 py-2.5 text-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-ink">
                      {mode === "zh" ? `访客 ${i + 1}` : `Visitor ${i + 1}`}
                    </p>
                    <span className="shrink-0 rounded-full bg-ink/[0.06] px-2 py-0.5 text-[11px] font-semibold text-ink">
                      {mode === "zh"
                        ? `打开 ${v.openCount} 次`
                        : `${v.openCount} opens`}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[12px] text-ink-muted">
                    {formatLocation(v, mode)} · {formatDevice(v.device, mode)}
                  </p>
                  <p className="mt-1 text-[11px] text-ink-muted">
                    {mode === "zh" ? "最近：" : "Last: "}
                    {formatWhen(v.lastAt, mode)}
                    {v.openCount > 1
                      ? mode === "zh"
                        ? ` · 首次：${formatWhen(v.firstAt, mode)}`
                        : ` · First: ${formatWhen(v.firstAt, mode)}`
                      : null}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="space-y-2">
              {events.map((e, i) => (
                <li
                  key={`${e.at}-${i}`}
                  className="rounded-xl border border-line/80 bg-paper/60 px-3 py-2.5 text-sm"
                >
                  <p className="font-medium text-ink">
                    {formatWhen(e.at, mode)}
                  </p>
                  <p className="mt-0.5 text-[12px] text-ink-muted">
                    {formatLocation(e, mode)} · {formatDevice(e.device, mode)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex gap-2 border-t border-line px-5 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="rounded-full border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-ink/[0.04] disabled:opacity-40"
          >
            {mode === "zh" ? "刷新" : "Refresh"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            {mode === "zh" ? "关闭" : "Close"}
          </button>
        </div>
      </motion.div>
    </div>,
    portalRoot,
  );
}
