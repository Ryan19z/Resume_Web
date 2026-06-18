"use client";

import { useLanguageMode } from "@/context/LanguageModeProvider";
import { useEffect, useState } from "react";

const RECOVERY_KEY = "resume-css-recovery-v1";

function isTailwindStylesheetLoaded(): boolean {
  if (typeof document === "undefined") return true;
  const probe = document.createElement("div");
  probe.className = "hidden";
  probe.setAttribute("aria-hidden", "true");
  document.body.appendChild(probe);
  const display = window.getComputedStyle(probe).display;
  probe.remove();
  return display === "none";
}

/**
 * 检测 Tailwind 是否生效；dev 下 CSS chunk 丢失或内置浏览器忽略 stylesheet 时提示恢复。
 */
export function CssLoadRecovery() {
  const { mode } = useLanguageMode();
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    const check = () => {
      if (isTailwindStylesheetLoaded()) return;
      if (!sessionStorage.getItem(RECOVERY_KEY)) {
        sessionStorage.setItem(RECOVERY_KEY, "1");
        window.location.reload();
        return;
      }
      setBroken(true);
    };
    const id = window.requestAnimationFrame(check);
    return () => window.cancelAnimationFrame(id);
  }, []);

  if (!broken) return null;

  const zh = mode === "zh";

  return (
    <div
      role="alert"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        background: "rgba(15, 23, 42, 0.55)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        style={{
          maxWidth: "28rem",
          width: "100%",
          borderRadius: "1rem",
          border: "1px solid #e2e8f0",
          background: "#fff",
          padding: "1.25rem 1.5rem",
          boxShadow: "0 20px 48px rgba(0,0,0,0.18)",
          fontFamily: "system-ui, sans-serif",
          color: "#1d2226",
          lineHeight: 1.55,
        }}
      >
        <p style={{ margin: 0, fontWeight: 600, fontSize: "1rem" }}>
          {zh ? "页面样式未加载" : "Styles failed to load"}
        </p>
        <p style={{ margin: "0.75rem 0 0", fontSize: "0.875rem", color: "#646a73" }}>
          {zh
            ? "通常是 dev 缓存过期或当前内置浏览器未应用 CSS。请用 Chrome / Edge 打开下方地址，或在项目目录执行 npm run dev:fresh 后刷新。"
            : "Usually caused by stale dev cache or the embedded browser ignoring CSS. Open the URL in Chrome/Edge, or run npm run dev:fresh and refresh."}
        </p>
        <p
          style={{
            margin: "0.75rem 0 0",
            fontSize: "0.8125rem",
            wordBreak: "break-all",
            color: "#0a66c2",
          }}
        >
          {typeof window !== "undefined" ? window.location.href : ""}
        </p>
        <div style={{ marginTop: "1rem", display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          <button
            type="button"
            onClick={() => {
              sessionStorage.removeItem(RECOVERY_KEY);
              window.location.reload();
            }}
            style={{
              borderRadius: "9999px",
              border: "1px solid #0a66c2",
              background: "rgba(10,102,194,0.1)",
              color: "#0a66c2",
              padding: "0.45rem 1rem",
              fontSize: "0.8125rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {zh ? "重新加载" : "Reload"}
          </button>
          <button
            type="button"
            onClick={() => setBroken(false)}
            style={{
              borderRadius: "9999px",
              border: "1px solid #e2e8f0",
              background: "#fff",
              color: "#646a73",
              padding: "0.45rem 1rem",
              fontSize: "0.8125rem",
              cursor: "pointer",
            }}
          >
            {zh ? "暂时关闭" : "Dismiss"}
          </button>
        </div>
      </div>
    </div>
  );
}
