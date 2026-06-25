"use client";

import { useSiteContent } from "@/context/SiteContentProvider";
import {
  isAccessPinErrorMessage,
  verifyEditAccessPin,
} from "@/lib/access-pin-client";
import { parseClientResumeScope } from "@/lib/resume-scope";
import { useCallback, useEffect, useState } from "react";

/** 编辑口令未验证时：顶栏下方提供口令输入（避免只弹错误条却找不到入口） */
export function AccessPinBanner() {
  const {
    accessGateRequired,
    accessGatePassed,
    editPermissionLoaded,
    persistError,
    dismissPersistError,
    refreshEntitlements,
  } = useSiteContent();
  const scope = parseClientResumeScope();
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pinBlocked =
    editPermissionLoaded &&
    Boolean(scope.editToken) &&
    accessGateRequired &&
    !accessGatePassed;

  const showFromPersist = isAccessPinErrorMessage(persistError);
  const visible = pinBlocked || showFromPersist;

  useEffect(() => {
    if (!visible) {
      setPin("");
      setError(null);
    }
  }, [visible]);

  const submit = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    const result = await verifyEditAccessPin(pin);
    if (!result.ok) {
      setError(result.message ?? "口令错误");
      setSubmitting(false);
      return;
    }
    setPin("");
    dismissPersistError();
    await refreshEntitlements();
    setSubmitting(false);
  }, [pin, dismissPersistError, refreshEntitlements]);

  if (!visible) return null;

  return (
    <div className="pointer-events-auto fixed left-0 right-0 top-[3.65rem] z-[66] flex justify-center px-4 pt-1 print:hidden sm:top-14">
      <div
        role="dialog"
        aria-label="编辑口令验证"
        className="w-full max-w-xl rounded-2xl border border-amber-300/90 bg-amber-50/95 px-4 py-3 text-amber-950 shadow-sm backdrop-blur-md"
      >
        <p className="text-[11px] leading-snug">
          此编辑链接已启用编辑口令。请输入口令后即可继续编辑并保存到服务器。
        </p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="password"
            autoComplete="off"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submit();
            }}
            placeholder="请输入编辑口令"
            className="min-w-0 flex-1 rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-amber-400"
          />
          <button
            type="button"
            onClick={() => void submit()}
            disabled={submitting || !pin.trim()}
            className="shrink-0 rounded-full bg-ink px-4 py-2 text-xs font-medium text-paper disabled:opacity-50"
          >
            {submitting ? "验证中…" : "验证并继续"}
          </button>
        </div>
        {error ? (
          <p className="mt-2 text-[11px] text-red-700">{error}</p>
        ) : showFromPersist && persistError ? (
          <p className="mt-2 text-[11px] text-amber-900/80">{persistError}</p>
        ) : null}
        <p className="mt-2 text-[10px] leading-relaxed text-amber-900/70">
          忘记口令？请联系管理员在后台「清除编辑口令」后，用编辑链接重新打开并设置新口令。
        </p>
      </div>
    </div>
  );
}
