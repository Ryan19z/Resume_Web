"use client";

import {
  isLangSwitchLocked,
  parseLangFromSearchParams,
  type ShareSiteLang,
} from "@/lib/share-url";
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";

export type LanguageMode = ShareSiteLang;

type LanguageModeContextValue = {
  mode: LanguageMode;
  setMode: (next: LanguageMode) => void;
  toggleMode: () => void;
  /** 分享链接带 lockLang=1 时为 true，访客不可切换语言 */
  langSwitchLocked: boolean;
  /** 当前语言是否由 URL ?lang= 固定（分享链） */
  urlLangPinned: boolean;
};

const STORAGE_KEY = "resume-language-mode-v1";

const LanguageModeContext = createContext<LanguageModeContextValue | null>(
  null,
);

function readStoredMode(): LanguageMode | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === "en" || raw === "zh" ? raw : null;
  } catch {
    return null;
  }
}

function readUrlLanguageState(): {
  mode: LanguageMode;
  langSwitchLocked: boolean;
  urlLangPinned: boolean;
} {
  if (typeof window === "undefined") {
    return { mode: "zh", langSwitchLocked: false, urlLangPinned: false };
  }
  const params = new URLSearchParams(window.location.search);
  const urlLang = parseLangFromSearchParams(params);
  const locked = isLangSwitchLocked(params);
  if (urlLang) {
    return { mode: urlLang, langSwitchLocked: locked, urlLangPinned: true };
  }
  return {
    mode: readStoredMode() ?? "zh",
    langSwitchLocked: locked,
    urlLangPinned: false,
  };
}

export function LanguageModeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mode, setModeState] = useState<LanguageMode>("zh");
  const [langSwitchLocked, setLangSwitchLocked] = useState(false);
  const [urlLangPinned, setUrlLangPinned] = useState(false);

  useLayoutEffect(() => {
    const sync = () => {
      const next = readUrlLanguageState();
      setModeState(next.mode);
      setLangSwitchLocked(next.langSwitchLocked);
      setUrlLangPinned(next.urlLangPinned);
    };
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const setMode = useCallback((next: LanguageMode) => {
    setModeState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore storage errors
    }
  }, []);

  const toggleMode = useCallback(() => {
    setMode(mode === "zh" ? "en" : "zh");
  }, [mode, setMode]);

  const value = useMemo(
    () => ({
      mode,
      setMode,
      toggleMode,
      langSwitchLocked,
      urlLangPinned,
    }),
    [mode, setMode, toggleMode, langSwitchLocked, urlLangPinned],
  );

  return (
    <LanguageModeContext.Provider value={value}>
      {children}
    </LanguageModeContext.Provider>
  );
}

export function useLanguageMode() {
  const ctx = useContext(LanguageModeContext);
  if (!ctx) {
    throw new Error("useLanguageMode must be used inside LanguageModeProvider");
  }
  return ctx;
}
