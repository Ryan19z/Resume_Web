"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type LanguageMode = "zh" | "en";

type LanguageModeContextValue = {
  mode: LanguageMode;
  setMode: (next: LanguageMode) => void;
  toggleMode: () => void;
};

const STORAGE_KEY = "resume-language-mode-v1";

const LanguageModeContext = createContext<LanguageModeContextValue | null>(null);

function readStoredMode(): LanguageMode | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === "en" || raw === "zh" ? raw : null;
  } catch {
    return null;
  }
}

export function LanguageModeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mode, setModeState] = useState<LanguageMode>("zh");

  useEffect(() => {
    const stored = readStoredMode();
    if (stored) setModeState(stored);
  }, []);

  const setMode = (next: LanguageMode) => {
    setModeState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore storage errors
    }
  };

  const toggleMode = () => setMode(mode === "zh" ? "en" : "zh");

  const value = useMemo(
    () => ({
      mode,
      setMode,
      toggleMode,
    }),
    [mode],
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

