"use client";

import { useLanguageMode } from "@/context/LanguageModeProvider";
import { ACCESS_PIN_FORMAT_HINT, ACCESS_PIN_MAX, ACCESS_PIN_MIN, normalizeAccessPin } from "@/lib/access-pin-format";
import { privacyNotice } from "@/lib/privacy-notices";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import {
  appendResumeScopeToPath,
  parseClientResumeScope,
} from "@/lib/resume-scope";
import { notifyAccessPinConfigChanged } from "@/lib/access-pin-client";
import { motion } from "framer-motion";
import { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function LinkSecurityModal({ open, onClose }: Props) {
  const { mode } = useLanguageMode();
  const scope = parseClientResumeScope();
  const scopeReady = Boolean(scope.resumeId && scope.editToken);
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pinEnabled, setPinEnabled] = useState(false);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => setMounted(true), []);
  useBodyScrollLock(open);

  const apiPath = useCallback(() => {
    const scope = parseClientResumeScope();
    return appendResumeScopeToPath("/api/access-pin", scope, {
      includeEditToken: true,
      includeViewToken: false,
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const r = await fetch(apiPath(), { cache: "no-store" });
      const data = (await r.json().catch(() => ({}))) as {
        ok?: boolean;
        pinEnabled?: boolean;
        message?: string;
      };
      if (!r.ok || !data.ok) {
        throw new Error(data.message ?? "加载失败");
      }
      setPinEnabled(Boolean(data.pinEnabled));
      setMessage(data.message ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [apiPath]);

  useEffect(() => {
    if (open && scopeReady) {
      setPin("");
      setConfirmPin("");
      void load();
    }
  }, [open, load, scopeReady]);

  const savePin = async () => {
    if (!scopeReady) return;
    const normalized = normalizeAccessPin(pin);
    if (!normalized || normalized !== normalizeAccessPin(confirmPin)) {
      setError(
        mode === "zh"
          ? "口令格式不正确或两次输入不一致，请检查。"
          : "Invalid PIN format or entries do not match.",
      );
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const r = await fetch(apiPath(), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, confirmPin }),
      });
      const data = (await r.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
      };
      if (!r.ok || !data.ok) {
        throw new Error(data.message ?? "保存失败");
      }
      setPinEnabled(true);
      setPin("");
      setConfirmPin("");
      setMessage(data.message ?? "已保存。");
      notifyAccessPinConfigChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const clearPin = async () => {
    if (
      !window.confirm(
        mode === "zh"
          ? "确定关闭访问口令？关闭后，任何人持链接均可直接打开。"
          : "Turn off access PIN? Anyone with the link can open the site.",
      )
    ) {
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const r = await fetch(apiPath(), { method: "DELETE" });
      const data = (await r.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
      };
      if (!r.ok || !data.ok) {
        throw new Error(data.message ?? "操作失败");
      }
      setPinEnabled(false);
      setMessage(data.message ?? "已关闭。");
      notifyAccessPinConfigChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败");
    } finally {
      setSaving(false);
    }
  };

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label={mode === "zh" ? "关闭" : "Close"}
        className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md rounded-t-2xl border border-line bg-surface p-6 shadow-xl sm:rounded-2xl"
      >
        <h2 id={titleId} className="text-lg font-semibold text-ink">
          {mode === "zh" ? "链接安全 · 编辑口令" : "Link security · Edit PIN"}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          {mode === "zh"
            ? "口令仅保护你的编辑链接（EditURL）。HR 使用的只读链接（ViewURL）无需口令，可直接浏览。"
            : "PIN protects your edit link only. HR view links open without a PIN."}
        </p>
        <p className="mt-2 rounded-xl border border-line/80 bg-paper/60 px-3 py-2 text-[11px] leading-relaxed text-ink-muted">
          {privacyNotice("editPin", mode)}
        </p>
        <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">
          {privacyNotice("editLinkCustody", mode)}
        </p>

        {!scopeReady ? (
          <p className="mt-6 text-sm leading-relaxed text-red-700">
            {mode === "zh"
              ? "当前页面不是完整的编辑链接（URL 须含 resumeId 与 editToken）。请从管理页复制 EditURL 打开后再设置口令。"
              : "This page is not a full edit link (resumeId and editToken required). Open your Edit URL first."}
          </p>
        ) : loading ? (
          <p className="mt-6 text-sm text-ink-muted">
            {mode === "zh" ? "加载中…" : "Loading…"}
          </p>
        ) : (
          <div className="mt-5 space-y-4">
            <p className="rounded-xl border border-line/80 bg-paper/60 px-3 py-2 text-[12px] text-ink-muted">
              {mode === "zh" ? "当前状态：" : "Status: "}
              <span className="font-medium text-ink">
                {pinEnabled
                  ? mode === "zh"
                    ? "已启用"
                    : "Enabled"
                  : mode === "zh"
                    ? "未启用"
                    : "Off"}
              </span>
            </p>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-ink">
                {pinEnabled
                  ? mode === "zh"
                    ? "新口令"
                    : "New PIN"
                  : mode === "zh"
                    ? "设置口令"
                    : "Set PIN"}
              </span>
              <input
                type="password"
                autoComplete="new-password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="rounded-xl border border-line bg-paper px-3 py-2"
                placeholder={ACCESS_PIN_FORMAT_HINT[mode]}
                minLength={ACCESS_PIN_MIN}
                maxLength={ACCESS_PIN_MAX}
              />
              <span className="text-[11px] text-ink-muted">
                {ACCESS_PIN_FORMAT_HINT[mode]}
              </span>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-ink">
                {mode === "zh" ? "再次输入" : "Confirm PIN"}
              </span>
              <input
                type="password"
                autoComplete="new-password"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                className="rounded-xl border border-line bg-paper px-3 py-2"
                minLength={ACCESS_PIN_MIN}
                maxLength={ACCESS_PIN_MAX}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void savePin()}
                disabled={
                  saving ||
                  !normalizeAccessPin(pin) ||
                  normalizeAccessPin(pin) !== normalizeAccessPin(confirmPin)
                }
                className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper disabled:opacity-50"
              >
                {saving
                  ? mode === "zh"
                    ? "保存中…"
                    : "Saving…"
                  : mode === "zh"
                    ? "保存口令"
                    : "Save PIN"}
              </button>
              {pinEnabled ? (
                <button
                  type="button"
                  onClick={() => void clearPin()}
                  disabled={saving}
                  className="rounded-full border border-line px-4 py-2 text-sm font-medium text-ink disabled:opacity-50"
                >
                  {mode === "zh" ? "关闭口令" : "Turn off"}
                </button>
              ) : null}
            </div>
          </div>
        )}

        {message ? (
          <p className="mt-4 text-sm text-emerald-800">{message}</p>
        ) : null}
        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-full border border-line py-2.5 text-sm font-medium text-ink"
        >
          {mode === "zh" ? "关闭" : "Close"}
        </button>
      </motion.div>
    </div>,
    document.body,
  );
}
