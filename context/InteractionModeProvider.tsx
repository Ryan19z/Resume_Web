"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const MICRO_INTERACTION_STORAGE_KEY = "resume-micro-interaction-v1";
const INDUSTRY_TEMPLATE_STORAGE_KEY = "resume-industry-template-v1";

export type IndustryTemplateId =
  | "photographer"
  | "softwareEngineer"
  | "dataAnalyst"
  | "designer";

type InteractionModeContextValue = {
  microInteractionEnabled: boolean;
  setMicroInteractionEnabled: (next: boolean) => void;
  industryTemplateId: IndustryTemplateId | null;
  setIndustryTemplateId: (next: IndustryTemplateId | null) => void;
};

const InteractionModeContext = createContext<InteractionModeContextValue | null>(
  null,
);

export function InteractionModeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [microInteractionEnabled, setMicroInteractionEnabledState] =
    useState(true);
  const [industryTemplateId, setIndustryTemplateIdState] =
    useState<IndustryTemplateId | null>(null);

  useEffect(() => {
    try {
      const savedMicro = window.localStorage.getItem(
        MICRO_INTERACTION_STORAGE_KEY,
      );
      if (savedMicro === "0") setMicroInteractionEnabledState(false);
      if (savedMicro === "1") setMicroInteractionEnabledState(true);
    } catch {
      // ignore
    }
    try {
      const savedIndustry = window.localStorage.getItem(
        INDUSTRY_TEMPLATE_STORAGE_KEY,
      );
      if (
        savedIndustry === "photographer" ||
        savedIndustry === "softwareEngineer" ||
        savedIndustry === "dataAnalyst" ||
        savedIndustry === "designer"
      ) {
        setIndustryTemplateIdState(savedIndustry);
      }
    } catch {
      // ignore
    }
  }, []);

  const setMicroInteractionEnabled = (next: boolean) => {
    setMicroInteractionEnabledState(next);
    try {
      window.localStorage.setItem(
        MICRO_INTERACTION_STORAGE_KEY,
        next ? "1" : "0",
      );
    } catch {
      // ignore
    }
  };

  const setIndustryTemplateId = (next: IndustryTemplateId | null) => {
    setIndustryTemplateIdState(next);
    try {
      if (next) {
        window.localStorage.setItem(INDUSTRY_TEMPLATE_STORAGE_KEY, next);
      } else {
        window.localStorage.removeItem(INDUSTRY_TEMPLATE_STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  };

  const value = useMemo(
    () => ({
      microInteractionEnabled,
      setMicroInteractionEnabled,
      industryTemplateId,
      setIndustryTemplateId,
    }),
    [microInteractionEnabled, industryTemplateId],
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

