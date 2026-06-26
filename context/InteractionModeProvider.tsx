"use client";

import {
  HR_SPREAD_MODE_CHANGED_EVENT,
  readHrSpreadMode,
  writeHrSpreadMode,
} from "@/lib/hr-spread-mode-state";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type InteractionModeContextValue = {
  microInteractionEnabled: boolean;
  setMicroInteractionEnabled: (next: boolean) => void;
  hrSpreadMode: boolean;
  setHrSpreadMode: (next: boolean) => void;
  toggleHrSpreadMode: () => void;
  hrSpreadModeReady: boolean;
};

const InteractionModeContext = createContext<InteractionModeContextValue | null>(
  null,
);

export function InteractionModeProvider({ children }: { children: ReactNode }) {
  const [hrSpreadMode, setHrSpreadModeState] = useState(false);
  const [hrSpreadModeReady, setHrSpreadModeReady] = useState(false);

  useEffect(() => {
    setHrSpreadModeState(readHrSpreadMode());
    setHrSpreadModeReady(true);
  }, []);

  useEffect(() => {
    const onChanged = (event: Event) => {
      const enabled = (event as CustomEvent<{ enabled: boolean }>).detail
        ?.enabled;
      if (typeof enabled === "boolean") {
        setHrSpreadModeState(enabled);
      } else {
        setHrSpreadModeState(readHrSpreadMode());
      }
    };
    window.addEventListener(HR_SPREAD_MODE_CHANGED_EVENT, onChanged);
    return () =>
      window.removeEventListener(HR_SPREAD_MODE_CHANGED_EVENT, onChanged);
  }, []);

  const setHrSpreadMode = useCallback((next: boolean) => {
    setHrSpreadModeState(next);
    writeHrSpreadMode(next);
  }, []);

  const toggleHrSpreadMode = useCallback(() => {
    setHrSpreadMode(!hrSpreadMode);
  }, [hrSpreadMode, setHrSpreadMode]);

  const value = useMemo(
    () => ({
      microInteractionEnabled: true,
      setMicroInteractionEnabled: () => {},
      hrSpreadMode,
      setHrSpreadMode,
      toggleHrSpreadMode,
      hrSpreadModeReady,
    }),
    [hrSpreadMode, setHrSpreadMode, toggleHrSpreadMode, hrSpreadModeReady],
  );

  return (
    <InteractionModeContext.Provider value={value}>
      {children}
    </InteractionModeContext.Provider>
  );
}

export function useInteractionMode() {
  const ctx = useContext(InteractionModeContext);
  if (!ctx) {
    throw new Error(
      "useInteractionMode must be used inside InteractionModeProvider",
    );
  }
  return ctx;
}
