"use client";

import { parseClientResumeScope } from "@/lib/resume-scope";
import { useCallback, useEffect, useState } from "react";

type GateState =
  | { phase: "loading" }
  | { phase: "open" }
  | { phase: "locked"; message: string }
  | { phase: "denied"; message: string };

export function LinkAccessGate({ children }: { children: React.ReactNode }) {
  const scope = parseClientResumeScope();
  const [gate, setGate] = useState<GateState>(
    scope.resumeId ? { phase: "loading" } : { phase: "open" },
  );
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkGate = useCallback(async () => {
    if (!scope.resumeId) {
      setGate({ phase: "open" });
      return;
    }
    /** ViewURL（仅 viewToken）直接打开，不要求口令 */
    if (!scope.editToken) {
      setGate({ phase: "open" });
      return;
    }
    const params = new URLSearchParams();
    params.set("resumeId", scope.resumeId);
    if (scope.editToken) params.set("editToken", scope.editToken);
    if (scope.viewToken) params.set("viewToken", scope.viewToken);
    try {
      const r = await fetch(`/api/access-gate?${params}`, { cache: "no-store" });
      const d = (await r.json()) as {
        ok?: boolean;
        pinRequired?: boolean;
        sessionValid?: boolean;
        message?: string;
      };
      if (!r.ok || !d.ok) {
        setGate({
          phase: "denied",
          message: d.message ?? "链接无效或已失效，请联系站点管理员。",
        });
        return;
      }
      if (d.pinRequired && !d.sessionValid) {
        setGate({
          phase: "locked",
          message:
            d.message ??
            "该编辑链接已启用口令。即使链接泄露，没有口令也无法进入编辑。",
        });
        return;
      }
      setGate({ phase: "open" });
    } catch {
      setGate({
        phase: "denied",
        message: "无法验证访问权限，请检查网络后刷新重试。",
      });
    }
  }, [scope.editToken, scope.resumeId, scope.viewToken]);

  useEffect(() => {
    void checkGate();
  }, [checkGate]);

  const submitPin = async () => {
    if (!scope.resumeId || !pin.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch("/api/access-gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeId: scope.resumeId,
          pin: pin.trim(),
          editToken: scope.editToken,
          viewToken: scope.viewToken,
        }),
      });
      const d = (await r.json()) as { ok?: boolean; message?: string };
      if (!r.ok || !d.ok) {
        setError(d.message ?? "口令错误");
        return;
      }
      setPin("");
      setGate({ phase: "open" });
    } catch {
      setError("验证失败，请重试。");
    } finally {
      setSubmitting(false);
    }
  };

  if (gate.phase === "open") {
    return <>{children}</>;
  }

  if (gate.phase === "loading") {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-paper text-sm text-ink-muted">
        正在验证访问权限…
      </div>
    );
  }

  if (gate.phase === "denied") {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-paper px-6">
        <div className="max-w-md rounded-2xl border border-line bg-surface p-8 text-center shadow-sm">
          <p className="text-base font-medium text-ink">无法打开此链接</p>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">{gate.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-paper px-6">
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-8 shadow-sm">
        <h1 className="text-lg font-semibold text-ink">编辑验证</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">{gate.message}</p>
        <p className="mt-3 text-[12px] text-ink-muted">
          此口令仅用于保护编辑链接；HR 只读链接无需口令，可直接打开。
        </p>
        <label className="mt-6 flex flex-col gap-2 text-sm">
          <span className="font-medium text-ink">编辑口令</span>
          <input
            type="password"
            autoComplete="off"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submitPin();
            }}
            className="rounded-xl border border-line bg-paper px-3 py-2.5"
            placeholder="请输入口令"
          />
        </label>
        {error ? (
          <p className="mt-3 text-sm text-red-700">{error}</p>
        ) : null}
        <button
          type="button"
          onClick={() => void submitPin()}
          disabled={submitting || !pin.trim()}
          className="mt-5 w-full rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-paper disabled:opacity-50"
        >
          {submitting ? "验证中…" : "确认进入"}
        </button>
      </div>
    </div>
  );
}
