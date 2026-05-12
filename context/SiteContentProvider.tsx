"use client";

import { defaultSiteContent } from "@/lib/default-site-content";
import {
  buildBundleFromState,
  loadPersistedBundle,
  mergeInitialSite,
  savePersistedBundle,
} from "@/lib/persist-site";
import { newExperienceItem } from "@/lib/experience-factory";
import {
  hasCompletedSiteTour,
  SITE_TOUR_FINISHED_EVENT,
} from "@/lib/site-tour-state";
import type {
  EducationItem,
  ExperienceItem,
  HeroCopy,
  PersistedProfile,
  PortfolioCopy,
  PortfolioProject,
  ProfileSetupMeta,
  ResumeCopy,
  SiteContent,
} from "@/lib/types";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ResumeDetailTarget =
  | { kind: "experience"; id: string }
  | { kind: "education"; id: string };

type SiteContentContextValue = {
  site: SiteContent;
  profile: PersistedProfile;
  canEdit: boolean;
  editPermissionLoaded: boolean;
  editPermissionHint: string;
  previewMode: boolean;
  setPreviewMode: (v: boolean) => void;
  updateProfile: (
    name: string,
    tagline: string,
    heroPortraitSrc?: string,
    heroCopyPatch?: Partial<HeroCopy>,
    meta?: ProfileSetupMeta,
  ) => void;
  updateQuickHeroFields: (
    patch: Partial<
      Pick<
        SiteContent,
        | "name"
        | "tagline"
        | "targetRole"
        | "heroPreviewLines"
        | "contactEmail"
        | "contactExtra"
      >
    >,
  ) => void;
  addExperienceItem: () => string;
  updateResumeCopy: (patch: Partial<ResumeCopy>) => void;
  resumePageCopyModalOpen: boolean;
  openResumePageCopyModal: () => void;
  closeResumePageCopyModal: () => void;
  updatePortfolioCopy: (patch: Partial<PortfolioCopy>) => void;
  portfolioPageCopyModalOpen: boolean;
  openPortfolioPageCopyModal: () => void;
  closePortfolioPageCopyModal: () => void;
  setupModalOpen: boolean;
  openSetupModal: () => void;
  dismissSetupModal: () => void;
  resumeDetail: ResumeDetailTarget | null;
  openExperienceDetail: (id: string) => void;
  openEducationDetail: (id: string) => void;
  closeResumeDetail: () => void;
  updateExperienceItem: (id: string, item: ExperienceItem) => void;
  updateEducationItems: (items: EducationItem[]) => void;
  addPortfolioProject: (project: PortfolioProject) => void;
  removePortfolioProject: (id: string) => void;
};

const defaultProfile: PersistedProfile = {
  name: defaultSiteContent.name,
  tagline: defaultSiteContent.tagline,
  setupDismissed: false,
};

function mergeHeroCopy(
  current: HeroCopy,
  patch?: Partial<HeroCopy>,
): HeroCopy {
  if (!patch) return current;
  return { ...current, ...patch };
}

function mergeResumeCopy(
  current: ResumeCopy,
  patch: Partial<ResumeCopy>,
): ResumeCopy {
  return { ...current, ...patch };
}

function mergePortfolioCopy(
  current: PortfolioCopy,
  patch: Partial<PortfolioCopy>,
): PortfolioCopy {
  return { ...current, ...patch };
}

const SiteContentContext = createContext<SiteContentContextValue | null>(null);

export function SiteContentProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [profile, setProfile] = useState<PersistedProfile>(defaultProfile);
  const [site, setSite] = useState<SiteContent>(() => ({
    ...defaultSiteContent,
  }));
  const [setupModalOpen, setSetupModalOpen] = useState(false);
  const [resumeDetail, setResumeDetail] = useState<ResumeDetailTarget | null>(
    null,
  );
  const [canEdit, setCanEdit] = useState(false);
  const [editPermissionLoaded, setEditPermissionLoaded] = useState(false);
  const [editPermissionHint, setEditPermissionHint] = useState("");
  const [resumePageCopyModalOpen, setResumePageCopyModalOpen] =
    useState(false);
  const [portfolioPageCopyModalOpen, setPortfolioPageCopyModalOpen] =
    useState(false);
  const [previewMode, setPreviewModeState] = useState(false);

  const profileRef = useRef(profile);
  const siteRef = useRef(site);
  const editPermissionLoadedRef = useRef(editPermissionLoaded);
  const canEditRef = useRef(canEdit);
  profileRef.current = profile;
  siteRef.current = site;
  editPermissionLoadedRef.current = editPermissionLoaded;
  canEditRef.current = canEdit;

  const commitAll = useCallback((p: PersistedProfile, s: SiteContent) => {
    setProfile(p);
    setSite(s);
    savePersistedBundle(buildBundleFromState(p, s));
  }, []);

  useEffect(() => {
    const bundle = loadPersistedBundle();
    if (bundle) {
      setProfile(bundle.profile);
      setSite(mergeInitialSite(bundle));
    }
    setHydrated(true);
  }, []);

  /**
   * 首屏资料弹窗：仅在「新手引导已结束」后再自动打开。
   * 未完成引导时由 SiteTourDriver 在引导 destroy 后派发 SITE_TOUR_FINISHED_EVENT，
   * 避免与 driver.js 遮罩叠在同一时刻（背景被糊住还要点 6 步）。
   */
  useEffect(() => {
    if (!hydrated || !editPermissionLoaded) return;
    if (!canEdit || profile.setupDismissed) return;
    if (!hasCompletedSiteTour()) return;
    setSetupModalOpen(true);
  }, [hydrated, editPermissionLoaded, profile.setupDismissed, canEdit]);

  useEffect(() => {
    const onTourFinished = () => {
      if (profileRef.current.setupDismissed) return;
      if (!editPermissionLoadedRef.current || !canEditRef.current) return;
      setSetupModalOpen(true);
    };
    window.addEventListener(SITE_TOUR_FINISHED_EVENT, onTourFinished);
    return () =>
      window.removeEventListener(SITE_TOUR_FINISHED_EVENT, onTourFinished);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/api/can-edit`
        : "/api/can-edit";
    fetch(url, { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<{
          canEdit?: boolean;
          reason?: string;
        }>;
      })
      .then((d) => {
        if (cancelled) return;
        setCanEdit(Boolean(d.canEdit));
        setEditPermissionHint(
          typeof d.reason === "string" ? d.reason : "",
        );
        setEditPermissionLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setCanEdit(true);
        setEditPermissionHint(
          "接口不可用，已默认允许本机编辑（部署到生产环境后请检查 /api/can-edit）。",
        );
        setEditPermissionLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setPreviewMode = useCallback((v: boolean) => {
    setPreviewModeState(v);
  }, []);

  const updateProfile = useCallback(
    (
      name: string,
      tagline: string,
      portraitInput?: string,
      heroCopyPatch?: Partial<HeroCopy>,
      meta?: ProfileSetupMeta,
    ) => {
      const p: PersistedProfile = {
        name: name.trim() || defaultSiteContent.name,
        tagline: tagline.trim() || defaultSiteContent.tagline,
        setupDismissed: true,
      };
      const cur = siteRef.current;
      const s: SiteContent = {
        ...cur,
        name: p.name,
        tagline: p.tagline,
        heroCopy: mergeHeroCopy(cur.heroCopy, heroCopyPatch),
      };
      if (portraitInput !== undefined) {
        const t = portraitInput.trim();
        s.heroPortraitSrc = t.length ? t : undefined;
      }
      if (meta?.targetRole !== undefined) {
        const tr = meta.targetRole.trim();
        s.targetRole = tr.length ? tr : cur.targetRole;
      }
      if (meta?.heroPreviewLines !== undefined) {
        const lines = [...meta.heroPreviewLines];
        while (lines.length < 3) lines.push("");
        s.heroPreviewLines = lines.slice(0, 3);
      }
      if (meta?.contactEmail !== undefined) {
        const e = meta.contactEmail.trim();
        s.contactEmail = e.length ? e : undefined;
      }
      if (meta?.contactExtra !== undefined) {
        const x = meta.contactExtra.trim();
        s.contactExtra = x.length ? x : undefined;
      }
      if (meta?.pageBackgroundImageSrc !== undefined) {
        const bg = meta.pageBackgroundImageSrc.trim();
        s.pageBackgroundImageSrc = bg.length > 0 ? bg : "";
      }
      if (meta?.pageBackgroundImageOpacity !== undefined) {
        const o = meta.pageBackgroundImageOpacity;
        s.pageBackgroundImageOpacity =
          typeof o === "number" && Number.isFinite(o)
            ? Math.min(1, Math.max(0, o))
            : cur.pageBackgroundImageOpacity;
      }
      commitAll(p, s);
      setSetupModalOpen(false);
    },
    [commitAll],
  );

  const updateQuickHeroFields = useCallback(
    (
      patch: Partial<
        Pick<
          SiteContent,
          | "name"
          | "tagline"
          | "targetRole"
          | "heroPreviewLines"
          | "contactEmail"
          | "contactExtra"
        >
      >,
    ) => {
      const cur = siteRef.current;
      const p = profileRef.current;
      const s: SiteContent = { ...cur };
      if (patch.name !== undefined) {
        s.name = patch.name.trim() || cur.name;
      }
      if (patch.tagline !== undefined) {
        s.tagline = patch.tagline.trim() || cur.tagline;
      }
      if (patch.targetRole !== undefined) {
        s.targetRole = patch.targetRole.trim() || cur.targetRole;
      }
      if (patch.heroPreviewLines !== undefined) {
        const lines = [...patch.heroPreviewLines];
        while (lines.length < 3) lines.push("");
        s.heroPreviewLines = lines.slice(0, 3);
      }
      if (patch.contactEmail !== undefined) {
        const e = patch.contactEmail.trim();
        s.contactEmail = e.length ? e : undefined;
      }
      if (patch.contactExtra !== undefined) {
        const x = patch.contactExtra.trim();
        s.contactExtra = x.length ? x : undefined;
      }
      const nextProfile: PersistedProfile = {
        ...p,
        name: s.name,
        tagline: s.tagline,
      };
      commitAll(nextProfile, s);
    },
    [commitAll],
  );

  const addExperienceItem = useCallback(() => {
    const s = siteRef.current;
    const item = newExperienceItem();
    commitAll(profileRef.current, {
      ...s,
      experience: [item, ...s.experience],
    });
    return item.id;
  }, [commitAll]);

  const updateResumeCopy = useCallback(
    (patch: Partial<ResumeCopy>) => {
      const cur = siteRef.current;
      commitAll(profileRef.current, {
        ...cur,
        resumeCopy: mergeResumeCopy(cur.resumeCopy, patch),
      });
    },
    [commitAll],
  );

  const openResumePageCopyModal = useCallback(() => {
    if (!canEdit) return;
    setResumePageCopyModalOpen(true);
  }, [canEdit]);

  const closeResumePageCopyModal = useCallback(() => {
    setResumePageCopyModalOpen(false);
  }, []);

  const updatePortfolioCopy = useCallback(
    (patch: Partial<PortfolioCopy>) => {
      const cur = siteRef.current;
      const basePc =
        cur.portfolioCopy ?? defaultSiteContent.portfolioCopy;
      commitAll(profileRef.current, {
        ...cur,
        portfolioCopy: mergePortfolioCopy(basePc, patch),
      });
    },
    [commitAll],
  );

  const openPortfolioPageCopyModal = useCallback(() => {
    if (!canEdit) return;
    setPortfolioPageCopyModalOpen(true);
  }, [canEdit]);

  const closePortfolioPageCopyModal = useCallback(() => {
    setPortfolioPageCopyModalOpen(false);
  }, []);

  const openSetupModal = useCallback(() => {
    if (!canEdit) return;
    setSetupModalOpen(true);
  }, [canEdit]);

  const dismissSetupModal = useCallback(() => {
    setSetupModalOpen(false);
    const p: PersistedProfile = {
      ...profileRef.current,
      name: siteRef.current.name,
      tagline: siteRef.current.tagline,
      setupDismissed: true,
    };
    commitAll(p, siteRef.current);
  }, [commitAll]);

  const openExperienceDetail = useCallback((id: string) => {
    setResumeDetail({ kind: "experience", id });
  }, []);

  const openEducationDetail = useCallback((id: string) => {
    setResumeDetail({ kind: "education", id });
  }, []);

  const closeResumeDetail = useCallback(() => setResumeDetail(null), []);

  const updateExperienceItem = useCallback(
    (id: string, item: ExperienceItem) => {
      const s = siteRef.current;
      const next: SiteContent = {
        ...s,
        experience: s.experience.map((e) => (e.id === id ? item : e)),
      };
      commitAll(profileRef.current, next);
    },
    [commitAll],
  );

  const updateEducationItems = useCallback(
    (items: EducationItem[]) => {
      const s = siteRef.current;
      commitAll(profileRef.current, { ...s, education: items });
    },
    [commitAll],
  );

  const addPortfolioProject = useCallback(
    (project: PortfolioProject) => {
      const s = siteRef.current;
      commitAll(profileRef.current, {
        ...s,
        projects: [project, ...s.projects],
      });
    },
    [commitAll],
  );

  const removePortfolioProject = useCallback(
    (id: string) => {
      const s = siteRef.current;
      commitAll(profileRef.current, {
        ...s,
        projects: s.projects.filter((p) => p.id !== id),
      });
    },
    [commitAll],
  );

  const value = useMemo(
    () => ({
      site,
      profile,
      canEdit,
      editPermissionLoaded,
      editPermissionHint,
      previewMode,
      setPreviewMode,
      updateProfile,
      updateQuickHeroFields,
      addExperienceItem,
      updateResumeCopy,
      resumePageCopyModalOpen,
      openResumePageCopyModal,
      closeResumePageCopyModal,
      updatePortfolioCopy,
      portfolioPageCopyModalOpen,
      openPortfolioPageCopyModal,
      closePortfolioPageCopyModal,
      setupModalOpen,
      openSetupModal,
      dismissSetupModal,
      resumeDetail,
      openExperienceDetail,
      openEducationDetail,
      closeResumeDetail,
      updateExperienceItem,
      updateEducationItems,
      addPortfolioProject,
      removePortfolioProject,
    }),
    [
      site,
      profile,
      canEdit,
      editPermissionLoaded,
      editPermissionHint,
      previewMode,
      setPreviewMode,
      updateProfile,
      updateQuickHeroFields,
      addExperienceItem,
      updateResumeCopy,
      resumePageCopyModalOpen,
      openResumePageCopyModal,
      closeResumePageCopyModal,
      updatePortfolioCopy,
      portfolioPageCopyModalOpen,
      openPortfolioPageCopyModal,
      closePortfolioPageCopyModal,
      setupModalOpen,
      openSetupModal,
      dismissSetupModal,
      resumeDetail,
      openExperienceDetail,
      openEducationDetail,
      closeResumeDetail,
      updateExperienceItem,
      updateEducationItems,
      addPortfolioProject,
      removePortfolioProject,
    ],
  );

  return (
    <SiteContentContext.Provider value={value}>
      {children}
    </SiteContentContext.Provider>
  );
}

export function useSiteContent() {
  const ctx = useContext(SiteContentContext);
  if (!ctx)
    throw new Error("useSiteContent must be used within SiteContentProvider");
  return ctx;
}
