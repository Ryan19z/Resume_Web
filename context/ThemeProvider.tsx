"use client";

import {
  THEME_STORAGE_KEY,
  type SiteThemeId,
  isSiteThemeId,
} from "@/lib/site-themes";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ThemeContextValue = {
  theme: SiteThemeId;
  setTheme: (id: SiteThemeId) => void;
  /** 首次写入 document 前为 false，避免 SSR 与客户端不一致时闪烁逻辑误用 */
  themeReady: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredTheme(): SiteThemeId {
  if (typeof window === "undefined") return "paper";
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (isSiteThemeId(raw)) return raw;
  } catch {
    /* ignore */
  }
  return "paper";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<SiteThemeId>("paper");
  const [themeReady, setThemeReady] = useState(false);

  useEffect(() => {
    const initial = readStoredTheme();
    setThemeState(initial);
    document.documentElement.setAttribute("data-theme", initial);
    setThemeReady(true);
  }, []);

  const setTheme = useCallback((id: SiteThemeId) => {
    setThemeState(id);
    document.documentElement.setAttribute("data-theme", id);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, id);
    } catch {
      /* quota */
    }
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, themeReady }),
    [theme, setTheme, themeReady],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
