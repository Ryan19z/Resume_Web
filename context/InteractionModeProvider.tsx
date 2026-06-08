"use client";

import {
  createContext,
  useContext,
  useMemo,
} from "react";

type InteractionModeContextValue = {
  microInteractionEnabled: boolean;
  setMicroInteractionEnabled: (next: boolean) => void;
};

const InteractionModeContext = createContext<InteractionModeContextValue | null>(
  null,
);

export function InteractionModeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const microInteractionEnabled = true;
  const setMicroInteractionEnabled = () => {};

  const value = useMemo(
    () => ({
      microInteractionEnabled,
      setMicroInteractionEnabled,
    }),
    [],
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
