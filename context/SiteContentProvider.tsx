"use client";

import { defaultSiteContent } from "@/lib/default-site-content";
import { useLanguageMode } from "@/context/LanguageModeProvider";
import {
  buildBundleFromState,
  loadPersistedBundle,
  mergeInitialSite,
  PERSIST_SAVE_FAILED_MESSAGE,
  savePersistedBundle,
  SERVER_PUBLISH_FAILED_MESSAGE,
  stampBundleForSave,
} from "@/lib/persist-site";
import {
  fetchPublishedSite,
  publishBundleToServer,
  type FetchPublishedResult,
} from "@/lib/publish-site-client";
import {
  auditPublishPayload,
  shouldShowAssetHint,
} from "@/lib/publish-payload-audit";
import { parseClientResumeScope } from "@/lib/resume-scope";
import {
  applyMappedImportToSite,
  type MappedResumeImport,
} from "@/lib/resume-parse-mapper";
import { DEFAULT_CLIENT_ENTITLEMENTS } from "@/lib/client-entitlements";
import type { ClientEntitlements } from "@/lib/subscription-types";
import { newExperienceItem } from "@/lib/experience-factory";
import { newEducationItem } from "@/lib/education-factory";
import {
  defaultPageBackground,
  normalizePageBackground,
} from "@/lib/page-background";
import {
  hasCompletedSiteTour,
  SITE_TOUR_FINISHED_EVENT,
} from "@/lib/site-tour-state";
import type {
  EducationItem,
  ExperienceItem,
  HeroCopy,
  PersistedProfile,
  PersistedSiteBundle,
  PageBackgroundSettings,
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

type SiteLang = "zh" | "en";

function buildFallbackSite(lang: SiteLang): SiteContent {
  return {
    ...defaultSiteContent,
    heroCopy:
      lang === "en"
        ? {
            ...defaultSiteContent.heroCopy,
            eyebrow: "Portfolio",
            swipeHint: "Scroll down to resume and portfolio",
          }
        : defaultSiteContent.heroCopy,
    resumeCopy:
      lang === "en"
        ? {
            ...defaultSiteContent.resumeCopy,
            pageEyebrow: "Resume",
            pageTitle: "Resume",
            pageIntro:
              "Open each card to view details, evidence and representative work.",
            experienceSectionEyebrow: "Experience",
            projectExperienceSectionEyebrow: "Projects",
            educationSectionEyebrow: "Education",
            experienceCardCta: "View outcomes →",
            educationCardCta: "View highlights →",
            detailWorkEyebrow: "Work Outcomes",
            detailCampusEyebrow: "Academic Highlights",
            keyResultsHeading: "Key Results",
            repProjectsHeading: "Representative Projects",
          }
        : defaultSiteContent.resumeCopy,
    portfolioCopy:
      lang === "en"
        ? {
            ...defaultSiteContent.portfolioCopy,
            pageEyebrow: "Work",
            pageTitle: "Portfolio",
            pageIntro:
              "Selected projects with direct links and preview assets.",
            openLinkLabel: "Open",
            posterThumbTitle: "Poster / Preview",
            posterThumbCaption:
              "Use this area to highlight context and contribution.",
          }
        : defaultSiteContent.portfolioCopy,
  };
}

function hydrateFromLocalStorage(lang: SiteLang): PersistedSiteBundle {
  const scope = parseClientResumeScope();
  const local = loadPersistedBundle(lang, scope);
  if (local) return local;
  return stampBundleForSave(
    buildBundleFromState(defaultProfile, buildFallbackSite(lang)),
  );
}

export type ResumeDetailTarget =
  | { kind: "experience"; id: string }
  | { kind: "education"; id: string };

type SiteContentContextValue = {
  site: SiteContent;
  profile: PersistedProfile;
  canEdit: boolean;
  editPermissionLoaded: boolean;
  editPermissionHint: string;
  tokenAuthorized: boolean;
  subscriptionActive: boolean;
  resumeScopeActive: boolean;
  entitlements: ClientEntitlements;
  refreshEntitlements: () => Promise<void>;
  bumpImportUsage: (aiUsed: boolean) => void;
  previewMode: boolean;
  setPreviewMode: (v: boolean) => void;
  updateProfile: (
    name: string,
    tagline: string,
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
        | "transferableSkills"
        | "roleFitEntries"
        | "heroSpotlight"
        | "heroAsideMode"
        | "heroPortrait"
        | "contactEmail"
        | "contactPhone"
        | "contactExtra"
        | "heroContactQrs"
        | "heroContactQrSrc"
        | "heroContactQrCaption"
      >
    >,
  ) => void;
  addExperienceItem: () => string;
  removeExperienceItem: (id: string) => void;
  addProjectExperienceItem: () => string;
  removeProjectExperienceItem: (id: string) => void;
  addEducationItem: () => string;
  removeEducationItem: (id: string) => void;
  updateResumeCopy: (patch: Partial<ResumeCopy>) => void;
  resumePageCopyModalOpen: boolean;
  openResumePageCopyModal: () => void;
  closeResumePageCopyModal: () => void;
  updatePortfolioCopy: (patch: Partial<PortfolioCopy>) => void;
  portfolioPageCopyModalOpen: boolean;
  openPortfolioPageCopyModal: () => void;
  closePortfolioPageCopyModal: () => void;
  updatePageBackground: (next: PageBackgroundSettings) => void;
  pageBackgroundModalOpen: boolean;
  openPageBackgroundModal: () => void;
  closePageBackgroundModal: () => void;
  setupModalOpen: boolean;
  openSetupModal: () => void;
  dismissSetupModal: () => void;
  resumeDetail: ResumeDetailTarget | null;
  openExperienceDetail: (id: string) => void;
  openEducationDetail: (id: string) => void;
  closeResumeDetail: () => void;
  updateExperienceItem: (id: string, item: ExperienceItem) => void;
  updateProjectExperienceItem: (id: string, item: ExperienceItem) => void;
  updateEducationItems: (items: EducationItem[]) => void;
  addPortfolioProject: (project: PortfolioProject) => void;
  removePortfolioProject: (id: string) => void;
  persistError: string | null;
  dismissPersistError: () => void;
  /** 内嵌图片 / 发布体积提示（仅编辑权限下展示） */
  assetHint: string | null;
  dismissAssetHint: () => void;
  /** 首屏数据（本机 + 服务器）加载完成前为 false，用于避免闪默认示例站 */
  contentReady: boolean;
  /** 读取服务器发布文件失败或损坏时的提示（访客可见） */
  siteLoadWarning: string | null;
  dismissSiteLoadWarning: () => void;
  resumeImportModalOpen: boolean;
  openResumeImportModal: () => void;
  closeResumeImportModal: () => void;
  applyImportedResume: (mapped: MappedResumeImport) => void;
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
  const { mode } = useLanguageMode();
  const [contentReady, setContentReady] = useState(true);
  const [siteLoadWarning, setSiteLoadWarning] = useState<string | null>(null);
  const publishedMetaRef = useRef<{ updatedAt: number } | null>(null);
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
  const [tokenAuthorized, setTokenAuthorized] = useState(false);
  const [subscriptionActive, setSubscriptionActive] = useState(true);
  const [entitlements, setEntitlements] = useState<ClientEntitlements>(
    DEFAULT_CLIENT_ENTITLEMENTS,
  );
  const resumeScopeRef = useRef(parseClientResumeScope());
  resumeScopeRef.current = parseClientResumeScope();
  const resumeScopeActive = Boolean(resumeScopeRef.current.resumeId);
  const [resumePageCopyModalOpen, setResumePageCopyModalOpen] =
    useState(false);
  const [portfolioPageCopyModalOpen, setPortfolioPageCopyModalOpen] =
    useState(false);
  const [pageBackgroundModalOpen, setPageBackgroundModalOpen] =
    useState(false);
  const [resumeImportModalOpen, setResumeImportModalOpen] = useState(false);
  const [previewMode, setPreviewModeState] = useState(false);
  const [persistError, setPersistError] = useState<string | null>(null);
  const [assetHint, setAssetHint] = useState<string | null>(null);
  const persistErrorTimerRef = useRef<number | null>(null);

  const profileRef = useRef(profile);
  const siteRef = useRef(site);
  const editPermissionLoadedRef = useRef(editPermissionLoaded);
  const canEditRef = useRef(canEdit);
  profileRef.current = profile;
  siteRef.current = site;
  editPermissionLoadedRef.current = editPermissionLoaded;
  canEditRef.current = canEdit;

  const showPersistError = useCallback((message: string) => {
    setPersistError(message);
    if (persistErrorTimerRef.current != null) {
      window.clearTimeout(persistErrorTimerRef.current);
    }
    persistErrorTimerRef.current = window.setTimeout(() => {
      setPersistError(null);
      persistErrorTimerRef.current = null;
    }, 12_000);
  }, []);

  const dismissPersistError = useCallback(() => {
    setPersistError(null);
    if (persistErrorTimerRef.current != null) {
      window.clearTimeout(persistErrorTimerRef.current);
      persistErrorTimerRef.current = null;
    }
  }, []);

  const dismissAssetHint = useCallback(() => {
    setAssetHint(null);
  }, []);

  const applyPublishAudit = useCallback(
    (stamped: PersistedSiteBundle): boolean => {
      const audit = auditPublishPayload(stamped);
      if (shouldShowAssetHint(audit)) {
        setAssetHint(mode === "zh" ? audit.summaryZh : audit.summaryEn);
      } else {
        setAssetHint(null);
      }
      if (audit.exceedsPublishLimit) {
        showPersistError(
          mode === "zh"
            ? audit.summaryZh
            : audit.summaryEn,
        );
        return false;
      }
      return true;
    },
    [mode, showPersistError],
  );

  const applyBundle = useCallback((bundle: PersistedSiteBundle) => {
    setProfile(bundle.profile);
    setSite(mergeInitialSite(bundle));
  }, []);

  const dismissSiteLoadWarning = useCallback(() => {
    setSiteLoadWarning(null);
  }, []);

  const commitAll = useCallback(
    (p: PersistedProfile, s: SiteContent) => {
      setProfile(p);
      setSite(s);
      const stamped = stampBundleForSave(buildBundleFromState(p, s));
      const localOk = savePersistedBundle(stamped, mode, resumeScopeRef.current);

      if (!localOk) {
        showPersistError(PERSIST_SAVE_FAILED_MESSAGE);
      }

      if (!canEditRef.current) {
        if (localOk) dismissPersistError();
        return;
      }

      if (!applyPublishAudit(stamped)) return;

      void publishBundleToServer(stamped, mode, resumeScopeRef.current).then((res) => {
        if (!res.ok) {
          showPersistError(res.message ?? SERVER_PUBLISH_FAILED_MESSAGE);
          return;
        }
        publishedMetaRef.current = { updatedAt: stamped.savedAt ?? Date.now() };
        if (localOk) dismissPersistError();
      });
    },
    [dismissPersistError, showPersistError, mode, applyPublishAudit],
  );

  useEffect(
    () => () => {
      if (persistErrorTimerRef.current != null) {
        window.clearTimeout(persistErrorTimerRef.current);
      }
    },
    [],
  );

  /** 读本机草稿；不阻塞首屏渲染（避免 SSR/水合失败时长期停在加载页） */
  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      try {
        if (cancelled) return;
        applyBundle(hydrateFromLocalStorage(mode));
      } catch (e) {
        console.error("[SiteContentProvider] 读本机草稿失败，已回退默认内容", e);
        if (!cancelled) {
          applyBundle(
            stampBundleForSave(
              buildBundleFromState(defaultProfile, buildFallbackSite(mode)),
            ),
          );
        }
      }
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [applyBundle, mode]);

  /** 后台拉取服务器发布版，不阻塞首屏 */
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const publishedResult = await Promise.race([
          fetchPublishedSite(mode, resumeScopeRef.current),
          new Promise<FetchPublishedResult>((resolve) => {
            window.setTimeout(
              () =>
                resolve({
                  status: "error",
                  code: "read_failed",
                  message: "读取服务器发布数据超时，已使用本机草稿。",
                }),
              10_000,
            );
          }),
        ]);
        if (cancelled) return;

        if (publishedResult.status === "error") {
          setSiteLoadWarning(publishedResult.message);
          publishedMetaRef.current = null;
          return;
        }
        if (publishedResult.status === "empty") {
          publishedMetaRef.current = null;
          return;
        }

        publishedMetaRef.current = { updatedAt: publishedResult.updatedAt };
        const localDraft = loadPersistedBundle(mode, resumeScopeRef.current);
        const localAt = localDraft?.savedAt ?? 0;
        if (localDraft && localAt > publishedResult.updatedAt) {
          return;
        }
        applyBundle(publishedResult.bundle);
        savePersistedBundle(
          publishedResult.bundle,
          mode,
          resumeScopeRef.current,
        );
      } catch (e) {
        console.error("[SiteContentProvider] 后台同步发布数据失败", e);
        if (!cancelled) {
          setSiteLoadWarning("加载远端数据失败，已使用本机草稿。");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyBundle, mode]);

  /**
   * 站长：若本机草稿比服务器新，恢复本机并自动重发发布（解决「发布失败 + 刷新丢稿」）。
   */
  useEffect(() => {
    if (!contentReady || !editPermissionLoaded || !canEdit) return;

    const local = loadPersistedBundle(mode, resumeScopeRef.current);
    if (!local) return;

    const localAt = local.savedAt ?? 0;
    const pubAt = publishedMetaRef.current?.updatedAt ?? -1;
    const serverHadPublish = publishedMetaRef.current !== null;

    if (serverHadPublish && localAt <= pubAt) return;

    applyBundle(local);
    const stamped = stampBundleForSave(
      buildBundleFromState(local.profile, mergeInitialSite(local)),
    );
    savePersistedBundle(stamped, mode, resumeScopeRef.current);

    if (!applyPublishAudit(stamped)) return;

    void publishBundleToServer(stamped, mode, resumeScopeRef.current).then((res) => {
      if (!res.ok) {
        showPersistError(res.message ?? SERVER_PUBLISH_FAILED_MESSAGE);
        return;
      }
      publishedMetaRef.current = { updatedAt: stamped.savedAt ?? Date.now() };
    });
  }, [
    contentReady,
    editPermissionLoaded,
    canEdit,
    applyBundle,
    showPersistError,
    mode,
    applyPublishAudit,
  ]);

  /**
   * 首屏资料弹窗：仅在「新手引导已结束」后再自动打开。
   * 未完成引导时由 SiteTourDriver 在引导 destroy 后派发 SITE_TOUR_FINISHED_EVENT，
   * 避免与 driver.js 遮罩叠在同一时刻（背景被糊住还要点 6 步）。
   */
  useEffect(() => {
    if (!contentReady || !editPermissionLoaded) return;
    if (!canEdit || profile.setupDismissed) return;
    if (!hasCompletedSiteTour()) return;
    setSetupModalOpen(true);
  }, [contentReady, editPermissionLoaded, profile.setupDismissed, canEdit]);

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

  const refreshEntitlements = useCallback(async () => {
    const params = new URLSearchParams();
    const scope = resumeScopeRef.current;
    if (scope.resumeId) params.set("resumeId", scope.resumeId);
    if (scope.editToken) params.set("editToken", scope.editToken);
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/api/can-edit${params.toString() ? `?${params}` : ""}`
        : "/api/can-edit";
    try {
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = (await r.json()) as {
        canEdit?: boolean;
        tokenAuthorized?: boolean;
        subscriptionActive?: boolean;
        entitlements?: ClientEntitlements;
        reason?: string;
      };
      setCanEdit(Boolean(d.canEdit));
      setTokenAuthorized(Boolean(d.tokenAuthorized ?? d.canEdit));
      setSubscriptionActive(Boolean(d.subscriptionActive ?? true));
      if (d.entitlements && typeof d.entitlements === "object") {
        setEntitlements(d.entitlements);
      }
      setEditPermissionHint(typeof d.reason === "string" ? d.reason : "");
      setEditPermissionLoaded(true);
    } catch {
      const devFallback = process.env.NODE_ENV === "development";
      setCanEdit(devFallback);
      setEditPermissionHint(
        devFallback
          ? "接口不可用，开发环境已临时允许编辑（生产环境请检查 /api/can-edit）。"
          : "无法校验编辑权限，已禁止在线编辑。请检查网络或联系站点管理员。",
      );
      setEditPermissionLoaded(true);
    }
  }, []);

  const bumpImportUsage = useCallback((aiUsed: boolean) => {
    setEntitlements((prev) => ({
      ...prev,
      usage: {
        smartImportUsed: prev.usage.smartImportUsed + 1,
        aiParseUsed: aiUsed
          ? prev.usage.aiParseUsed + 1
          : prev.usage.aiParseUsed,
      },
    }));
  }, []);

  useEffect(() => {
    void refreshEntitlements();
  }, [refreshEntitlements]);

  const setPreviewMode = useCallback((v: boolean) => {
    setPreviewModeState(v);
  }, []);

  const updateProfile = useCallback(
    (
      name: string,
      tagline: string,
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
      if (meta?.targetRole !== undefined) {
        const tr = meta.targetRole.trim();
        s.targetRole = tr.length ? tr : cur.targetRole;
      }
      if (meta?.heroPreviewLines !== undefined) {
        s.heroPreviewLines = meta.heroPreviewLines
          .map((x) => String(x ?? "").trim())
          .filter(Boolean)
          .slice(0, 10);
      }
      if (meta?.contactEmail !== undefined) {
        const e = meta.contactEmail.trim();
        s.contactEmail = e.length ? e : undefined;
      }
      if (meta?.contactPhone !== undefined) {
        const phone = meta.contactPhone.trim();
        s.contactPhone = phone.length ? phone : undefined;
      }
      if (meta?.contactExtra !== undefined) {
        const x = meta.contactExtra.trim();
        s.contactExtra = x.length ? x : undefined;
      }
      if (meta?.heroAsideMode !== undefined) {
        s.heroAsideMode = meta.heroAsideMode;
      }
      if (meta?.heroPortrait !== undefined) {
        s.heroPortrait = {
          url: meta.heroPortrait.url.trim(),
          caption: meta.heroPortrait.caption?.trim() || undefined,
        };
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
          | "transferableSkills"
          | "roleFitEntries"
          | "heroSpotlight"
          | "heroAsideMode"
          | "heroPortrait"
          | "contactEmail"
          | "contactPhone"
          | "contactExtra"
          | "heroContactQrs"
          | "heroContactQrSrc"
          | "heroContactQrCaption"
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
        s.heroPreviewLines = patch.heroPreviewLines
          .map((x) => String(x ?? "").trim())
          .filter(Boolean)
          .slice(0, 10);
      }
      if (patch.transferableSkills !== undefined) {
        s.transferableSkills = patch.transferableSkills
          .map((x) => String(x ?? "").trim())
          .filter(Boolean)
          .slice(0, 12);
      }
      if (patch.roleFitEntries !== undefined) {
        s.roleFitEntries = patch.roleFitEntries
          .map((x) => ({
            id: String(x.id ?? "").trim(),
            title: String(x.title ?? "").trim(),
            fit: String(x.fit ?? "").trim(),
            proof: String(x.proof ?? "").trim() || undefined,
          }))
          .filter((x) => x.id && (x.title || x.fit || x.proof))
          .slice(0, 12);
      }
      if (patch.heroSpotlight !== undefined) {
        s.heroSpotlight = patch.heroSpotlight;
      }
      if (patch.heroAsideMode !== undefined) {
        s.heroAsideMode = patch.heroAsideMode;
      }
      if (patch.heroPortrait !== undefined) {
        s.heroPortrait = {
          url: patch.heroPortrait.url.trim(),
          caption: patch.heroPortrait.caption?.trim() || undefined,
        };
      }
      if (patch.contactEmail !== undefined) {
        const e = patch.contactEmail.trim();
        s.contactEmail = e.length ? e : undefined;
      }
      if (patch.contactPhone !== undefined) {
        const phone = patch.contactPhone.trim();
        s.contactPhone = phone.length ? phone : undefined;
      }
      if (patch.contactExtra !== undefined) {
        const x = patch.contactExtra.trim();
        s.contactExtra = x.length ? x : undefined;
      }
      if (patch.heroContactQrs !== undefined) {
        s.heroContactQrs = patch.heroContactQrs
          .map((x, i) => ({
            id: String(x.id ?? "").trim() || `qr-${i + 1}`,
            src: String(x.src ?? "").trim(),
            caption: String(x.caption ?? "").trim() || undefined,
          }))
          .filter((x) => x.src || x.caption)
          .slice(0, 8);
      }
      if (patch.heroContactQrSrc !== undefined) {
        const qr = patch.heroContactQrSrc.trim();
        s.heroContactQrSrc = qr.length ? qr : undefined;
      }
      if (patch.heroContactQrCaption !== undefined) {
        const qrCap = patch.heroContactQrCaption.trim();
        s.heroContactQrCaption = qrCap.length ? qrCap : undefined;
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

  const removeExperienceItem = useCallback(
    (id: string) => {
      const s = siteRef.current;
      commitAll(profileRef.current, {
        ...s,
        experience: s.experience.filter((e) => e.id !== id),
      });
    },
    [commitAll],
  );

  const addProjectExperienceItem = useCallback(() => {
    const s = siteRef.current;
    const item = newExperienceItem();
    commitAll(profileRef.current, {
      ...s,
      projectExperience: [item, ...(s.projectExperience ?? [])],
    });
    return item.id;
  }, [commitAll]);

  const removeProjectExperienceItem = useCallback(
    (id: string) => {
      const s = siteRef.current;
      commitAll(profileRef.current, {
        ...s,
        projectExperience: (s.projectExperience ?? []).filter((e) => e.id !== id),
      });
    },
    [commitAll],
  );

  const addEducationItem = useCallback(() => {
    const s = siteRef.current;
    const item = newEducationItem();
    commitAll(profileRef.current, {
      ...s,
      education: [item, ...s.education],
    });
    return item.id;
  }, [commitAll]);

  const removeEducationItem = useCallback(
    (id: string) => {
      const s = siteRef.current;
      commitAll(profileRef.current, {
        ...s,
        education: s.education.filter((e) => e.id !== id),
      });
    },
    [commitAll],
  );

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

  const updatePageBackground = useCallback(
    (next: PageBackgroundSettings) => {
      const cur = siteRef.current;
      commitAll(profileRef.current, {
        ...cur,
        pageBackground: normalizePageBackground(
          next,
          cur.pageBackground ?? defaultPageBackground,
        ),
      });
    },
    [commitAll],
  );

  const openPageBackgroundModal = useCallback(() => {
    if (!canEdit) return;
    setPageBackgroundModalOpen(true);
  }, [canEdit]);

  const closePageBackgroundModal = useCallback(() => {
    setPageBackgroundModalOpen(false);
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

  const updateProjectExperienceItem = useCallback(
    (id: string, item: ExperienceItem) => {
      const s = siteRef.current;
      const next: SiteContent = {
        ...s,
        projectExperience: (s.projectExperience ?? []).map((e) =>
          e.id === id ? item : e,
        ),
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

  const openResumeImportModal = useCallback(() => {
    if (!canEdit) return;
    setResumeImportModalOpen(true);
  }, [canEdit]);

  const closeResumeImportModal = useCallback(() => {
    setResumeImportModalOpen(false);
  }, []);

  const applyImportedResume = useCallback(
    (mapped: MappedResumeImport) => {
      const cur = siteRef.current;
      const nextSite = applyMappedImportToSite(cur, mapped);
      const p: PersistedProfile = {
        ...profileRef.current,
        name: mapped.profilePatch.name,
        tagline: mapped.profilePatch.tagline,
        setupDismissed: true,
      };
      commitAll(p, nextSite);
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
      tokenAuthorized,
      subscriptionActive,
      resumeScopeActive,
      entitlements,
      refreshEntitlements,
      bumpImportUsage,
      previewMode,
      setPreviewMode,
      updateProfile,
      updateQuickHeroFields,
      addExperienceItem,
      removeExperienceItem,
      addProjectExperienceItem,
      removeProjectExperienceItem,
      addEducationItem,
      removeEducationItem,
      updateResumeCopy,
      resumePageCopyModalOpen,
      openResumePageCopyModal,
      closeResumePageCopyModal,
      updatePortfolioCopy,
      portfolioPageCopyModalOpen,
      openPortfolioPageCopyModal,
      closePortfolioPageCopyModal,
      updatePageBackground,
      pageBackgroundModalOpen,
      openPageBackgroundModal,
      closePageBackgroundModal,
      setupModalOpen,
      openSetupModal,
      dismissSetupModal,
      resumeDetail,
      openExperienceDetail,
      openEducationDetail,
      closeResumeDetail,
      updateExperienceItem,
      updateProjectExperienceItem,
      updateEducationItems,
      addPortfolioProject,
      removePortfolioProject,
      persistError,
      dismissPersistError,
      assetHint,
      dismissAssetHint,
      contentReady,
      siteLoadWarning,
      dismissSiteLoadWarning,
      resumeImportModalOpen,
      openResumeImportModal,
      closeResumeImportModal,
      applyImportedResume,
    }),
    [
      site,
      profile,
      canEdit,
      editPermissionLoaded,
      editPermissionHint,
      tokenAuthorized,
      subscriptionActive,
      resumeScopeActive,
      entitlements,
      refreshEntitlements,
      bumpImportUsage,
      previewMode,
      setPreviewMode,
      updateProfile,
      updateQuickHeroFields,
      addExperienceItem,
      removeExperienceItem,
      addProjectExperienceItem,
      removeProjectExperienceItem,
      addEducationItem,
      removeEducationItem,
      updateResumeCopy,
      resumePageCopyModalOpen,
      openResumePageCopyModal,
      closeResumePageCopyModal,
      updatePortfolioCopy,
      portfolioPageCopyModalOpen,
      openPortfolioPageCopyModal,
      closePortfolioPageCopyModal,
      updatePageBackground,
      pageBackgroundModalOpen,
      openPageBackgroundModal,
      closePageBackgroundModal,
      setupModalOpen,
      openSetupModal,
      dismissSetupModal,
      resumeDetail,
      openExperienceDetail,
      openEducationDetail,
      closeResumeDetail,
      updateExperienceItem,
      updateProjectExperienceItem,
      updateEducationItems,
      addPortfolioProject,
      removePortfolioProject,
      persistError,
      dismissPersistError,
      assetHint,
      dismissAssetHint,
      contentReady,
      siteLoadWarning,
      dismissSiteLoadWarning,
      resumeImportModalOpen,
      openResumeImportModal,
      closeResumeImportModal,
      applyImportedResume,
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
