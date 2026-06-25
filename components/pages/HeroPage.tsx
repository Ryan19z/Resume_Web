"use client";

import { SITE_PAPER_SECTION_X } from "@/components/SitePaperFrame";
import { HeroSpotlightModals } from "@/components/hero/HeroSpotlightModals";
import { useLanguageMode } from "@/context/LanguageModeProvider";
import { useSiteContent } from "@/context/SiteContentProvider";
import {
  buildDefaultRoleFits,
  buildSkillTags,
  extractProofLines,
  formatContactEntryDisplay,
  parseContactEntries,
  resolveHeroAsideMode,
  resolveVisitorAside,
  resolveEffectiveAsidePanel,
  hasShowcaseContent,
  hasPortraitContent,
  sanitizeSpotlightMediaLinks,
  type ContactQrDraft,
  type RoleFitDraft,
  type SpotlightKind,
  type SpotlightMediaLinks,
  type VisitorAsideView,
} from "@/lib/hero-page-utils";
import type { HeroAsideMode, HeroSpotlight } from "@/lib/types";
import {
  applyVideoSnapshot,
  readVideoSnapshot,
} from "@/lib/hero-video-utils";
import { SEAMLESS_INPUT } from "@/lib/inline-edit-styles";
import { randomId } from "@/lib/random-id";
import { resolveVideoPreview } from "@/lib/resolve-video-preview";
import { appendResumeScopeToPath, parseClientResumeScope } from "@/lib/resume-scope";
import { ensureUploadFileName } from "@/lib/upload-asset-client";
import { documentAcceptList } from "@/lib/upload-mime";
import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const DEBOUNCE_MS = 550;
const UPLOAD_TIMEOUT_MS = 10 * 60 * 1000;

const EDITOR_ASIDE_TABS: HeroAsideMode[] = ["showcase", "portrait", "hidden"];

function buildSpotlightMediaLinksFromSite(
  sp: HeroSpotlight,
): SpotlightMediaLinks {
  const media = sp.media;
  const mediaUrl = media && "url" in media ? media.url : "";
  return sanitizeSpotlightMediaLinks({
    image:
      sp.mediaLinks?.image ?? (media?.kind === "image" ? mediaUrl : ""),
    gallery:
      sp.mediaLinks?.gallery ??
      (media?.kind === "gallery" ? media.urls : []) ??
      [],
    video:
      sp.mediaLinks?.video ?? (media?.kind === "video" ? mediaUrl : ""),
    link: sp.mediaLinks?.link ?? (media?.kind === "link" ? mediaUrl : ""),
    document:
      sp.mediaLinks?.document ??
      (media?.kind === "document" ? mediaUrl : ""),
  });
}

function parsePeriodStartScore(period?: string): number {
  const raw = (period ?? "").trim();
  if (!raw || raw === "起止时间") return -1;
  const m = raw.match(/(19|20)\d{2}(?:[.\-/年]\s*(\d{1,2}))?/);
  if (!m) return -1;
  const year = parseInt(m[0].slice(0, 4), 10);
  const month = m[2] ? Math.min(12, Math.max(1, parseInt(m[2], 10))) : 1;
  return year * 100 + month;
}

export function HeroPage() {
  const {
    site,
    canEdit,
    editPermissionLoaded,
    previewMode,
    updateQuickHeroFields,
  } = useSiteContent();
  const { mode } = useLanguageMode();
  const canInline = editPermissionLoaded && canEdit && !previewMode;

  const hp = Array.isArray(site.heroPreviewLines)
    ? site.heroPreviewLines.filter((x) => String(x ?? "").trim().length > 0)
    : [];
  const experiences = Array.isArray(site.experience) ? site.experience : [];
  const heroCopy = site.heroCopy ?? {
    eyebrow: "",
    swipeHint: "",
  };

  const [name, setName] = useState(site.name ?? "");
  const [targetRole, setTargetRole] = useState(site.targetRole ?? "");
  const [tagline, setTagline] = useState(site.tagline ?? "");
  const [contactEmail, setContactEmail] = useState(site.contactEmail ?? "");
  const [contactPhone, setContactPhone] = useState(site.contactPhone ?? "");
  const [contactExtra, setContactExtra] = useState(site.contactExtra ?? "");
  const [heroContactQrs, setHeroContactQrs] = useState<ContactQrDraft[]>(() => {
    const fromList = Array.isArray(site.heroContactQrs)
      ? site.heroContactQrs
          .map((x, i) => ({
            id: x.id || `qr-${i + 1}`,
            src: String(x.src ?? "").trim(),
            caption: String(x.caption ?? "").trim(),
          }))
          .filter((x) => x.src || x.caption)
      : [];
    if (fromList.length > 0) return fromList;
    const legacySrc = String(site.heroContactQrSrc ?? "").trim();
    const legacyCaption = String(site.heroContactQrCaption ?? "").trim();
    if (legacySrc || legacyCaption) {
      return [{ id: randomId("qr-"), src: legacySrc, caption: legacyCaption }];
    }
    return [{ id: randomId("qr-"), src: "", caption: "" }];
  });
  const [highlights, setHighlights] = useState<string[]>(hp);
  const [skills, setSkills] = useState<string[]>(() =>
    Array.isArray(site.transferableSkills)
      ? site.transferableSkills
      : buildSkillTags(site.targetRole ?? ""),
  );
  const [newHighlight, setNewHighlight] = useState("");
  const [newSkill, setNewSkill] = useState("");
  const heroProofDefaults = extractProofLines(
    experiences
      .flatMap((e) => e.keyResults)
      .map((x) => String(x ?? ""))
      .slice(0, 5),
    mode,
  );
  const [roleFits, setRoleFits] = useState<RoleFitDraft[]>(
    Array.isArray(site.roleFitEntries) && site.roleFitEntries.length > 0
      ? site.roleFitEntries
      : buildDefaultRoleFits(mode, heroProofDefaults),
  );
  const [newRoleTitle, setNewRoleTitle] = useState("");
  const [newRoleFit, setNewRoleFit] = useState("");
  const [newRoleProof, setNewRoleProof] = useState("");
  const fallbackSpotlight = {
    title:
      mode === "zh"
        ? "个人核心优势展示窗"
        : "Core strength showcase",
    summary:
      mode === "zh"
        ? "可展示代码、摄影作品（支持多图）、Vlog、广告、小程序或网址。"
        : "Show your best proof: code, photo gallery, vlog, ads, mini-program or links.",
    media: { kind: "image" as const, url: "" },
  };
  const [spotlightTitle, setSpotlightTitle] = useState(
    site.heroSpotlight?.title ?? fallbackSpotlight.title,
  );
  const [spotlightSummary, setSpotlightSummary] = useState(
    site.heroSpotlight?.summary ?? fallbackSpotlight.summary,
  );
  const [spotlightKind, setSpotlightKind] = useState<SpotlightKind>(
    (site.heroSpotlight?.media?.kind as SpotlightKind | undefined) ?? "image",
  );
  const [spotlightMediaLinks, setSpotlightMediaLinks] = useState<SpotlightMediaLinks>(
    () => buildSpotlightMediaLinksFromSite(site.heroSpotlight ?? fallbackSpotlight),
  );
  const [spotlightCode, setSpotlightCode] = useState(
    site.heroSpotlight?.media?.kind === "code"
      ? site.heroSpotlight.media.code
      : "",
  );
  const [spotlightCodeLang, setSpotlightCodeLang] = useState(
    site.heroSpotlight?.media?.kind === "code"
      ? (site.heroSpotlight.media.language ?? "")
      : "",
  );
  const [visitorPreviewKind, setVisitorPreviewKind] = useState<SpotlightKind | null>(null);
  const [visitorAsideView, setVisitorAsideView] = useState<VisitorAsideView | null>(
    null,
  );
  const [spotlightDocName, setSpotlightDocName] = useState(
    site.heroSpotlight?.documentName ??
      (site.heroSpotlight?.media?.kind === "document"
        ? (site.heroSpotlight.media.fileName ?? "")
        : ""),
  );
  const [spotlightUploadBusy, setSpotlightUploadBusy] = useState(false);
  const [spotlightUploadMessage, setSpotlightUploadMessage] = useState("");
  const [spotlightHdPreviewOpen, setSpotlightHdPreviewOpen] = useState(false);
  const [portraitHdPreviewOpen, setPortraitHdPreviewOpen] = useState(false);
  const [heroAsideMode, setHeroAsideMode] = useState<HeroAsideMode>(() =>
    resolveHeroAsideMode(site.heroAsideMode),
  );
  const [portraitUrl, setPortraitUrl] = useState(site.heroPortrait?.url ?? "");
  const [portraitCaption, setPortraitCaption] = useState(
    site.heroPortrait?.caption ?? "",
  );
  const [portraitUploadBusy, setPortraitUploadBusy] = useState(false);
  const [portraitUploadMessage, setPortraitUploadMessage] = useState("");
  const [gallerySlideIndex, setGallerySlideIndex] = useState(0);
  const inlineVideoRef = useRef<HTMLVideoElement | null>(null);
  const hdVideoRef = useRef<HTMLVideoElement | null>(null);
  const videoResumeSnapshotRef = useRef<{
    currentTime: number;
    volume: number;
    muted: boolean;
    playbackRate: number;
    shouldPlay: boolean;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const portraitInputRef = useRef<HTMLInputElement | null>(null);
  const contactQrInputRef = useRef<HTMLInputElement | null>(null);
  const [contactQrUploadTargetId, setContactQrUploadTargetId] = useState<string>("");
  const [contactQrUploadBusy, setContactQrUploadBusy] = useState(false);
  const [contactQrUploadMessage, setContactQrUploadMessage] = useState("");
  const [qrZoomItem, setQrZoomItem] = useState<{ src: string; caption: string } | null>(null);

  const siteSnap = `${site.name}|${site.targetRole}|${site.tagline}|${site.contactEmail ?? ""}|${site.contactPhone ?? ""}|${site.contactExtra ?? ""}|${JSON.stringify(site.heroContactQrs ?? [])}|${site.heroContactQrSrc ?? ""}|${site.heroContactQrCaption ?? ""}|${JSON.stringify(
    hp,
  )}|${JSON.stringify(site.transferableSkills ?? [])}|${JSON.stringify(
    site.roleFitEntries ?? [],
  )}|${JSON.stringify(
    site.heroSpotlight ?? null,
  )}|${site.heroAsideMode ?? "showcase"}|${JSON.stringify(site.heroPortrait ?? null)}`;
  const siteRef = useRef(site);
  siteRef.current = site;

  useEffect(() => {
    skipAutoSaveRef.current = true;
    const s = siteRef.current;
    const lines = Array.isArray(s.heroPreviewLines)
      ? s.heroPreviewLines
      : ["", "", ""];
    setName(s.name ?? "");
    setTargetRole(s.targetRole ?? "");
    setTagline(s.tagline ?? "");
    setContactEmail(s.contactEmail ?? "");
    setContactPhone(s.contactPhone ?? "");
    setContactExtra(s.contactExtra ?? "");
    const qrsFromList = Array.isArray(s.heroContactQrs)
      ? s.heroContactQrs
          .map((x, i) => ({
            id: x.id || `qr-${i + 1}`,
            src: String(x.src ?? "").trim(),
            caption: String(x.caption ?? "").trim(),
          }))
          .filter((x) => x.src || x.caption)
      : [];
    if (qrsFromList.length > 0) {
      setHeroContactQrs(qrsFromList.slice(0, 8));
    } else {
      const legacySrc = String(s.heroContactQrSrc ?? "").trim();
      const legacyCaption = String(s.heroContactQrCaption ?? "").trim();
      setHeroContactQrs([
        {
          id: randomId("qr-"),
          src: legacySrc,
          caption: legacyCaption,
        },
      ]);
    }
    const cleanLines = lines.map((x) => String(x ?? "").trim()).filter(Boolean);
    setHighlights(cleanLines);
    const nextSkills = Array.isArray(s.transferableSkills)
      ? s.transferableSkills
      : buildSkillTags(s.targetRole ?? "");
    setSkills(nextSkills);
    const proofs = extractProofLines(
      (Array.isArray(s.experience) ? s.experience : [])
        .flatMap((e) => e.keyResults)
        .map((x) => String(x ?? ""))
        .slice(0, 5),
      mode,
    );
    setRoleFits(
      Array.isArray(s.roleFitEntries) && s.roleFitEntries.length > 0
        ? s.roleFitEntries
        : buildDefaultRoleFits(mode, proofs),
    );
    setNewRoleTitle("");
    setNewRoleFit("");
    setNewRoleProof("");
    const sp = s.heroSpotlight ?? fallbackSpotlight;
    setSpotlightTitle(sp.title ?? fallbackSpotlight.title);
    setSpotlightSummary(sp.summary ?? fallbackSpotlight.summary);
    setSpotlightKind(
      (sp.media?.kind as SpotlightKind | undefined) ??
        "image",
    );
    setSpotlightMediaLinks(buildSpotlightMediaLinksFromSite(sp));
    setGallerySlideIndex(0);
    setSpotlightCode(sp.media?.kind === "code" ? sp.media.code : "");
    setSpotlightCodeLang(sp.media?.kind === "code" ? (sp.media.language ?? "") : "");
    setSpotlightDocName(
      sp.documentName ??
        (sp.media?.kind === "document" ? (sp.media.fileName ?? "") : ""),
    );
    setVisitorPreviewKind(null);
    setSpotlightUploadMessage("");
    setHeroAsideMode(resolveHeroAsideMode(s.heroAsideMode));
    setPortraitUrl(s.heroPortrait?.url ?? "");
    setPortraitCaption(s.heroPortrait?.caption ?? "");
    setPortraitUploadMessage("");
    setContactQrUploadTargetId("");
    setContactQrUploadMessage("");
  }, [siteSnap]);

  const saveRef = useRef(updateQuickHeroFields);
  saveRef.current = updateQuickHeroFields;
  const skipAutoSaveRef = useRef(true);

  useEffect(() => {
    if (!canInline) {
      skipAutoSaveRef.current = true;
      return;
    }
    if (skipAutoSaveRef.current) {
      skipAutoSaveRef.current = false;
      return;
    }
    const t = window.setTimeout(() => {
      saveRef.current({
        name,
        tagline,
        targetRole,
        contactEmail,
        contactPhone,
        contactExtra,
        heroContactQrs,
        heroPreviewLines: highlights,
        transferableSkills: skills,
        roleFitEntries: roleFits,
        heroSpotlight: {
          title: spotlightTitle.trim() || fallbackSpotlight.title,
          summary: spotlightSummary.trim() || fallbackSpotlight.summary,
          media:
            spotlightKind === "code"
              ? {
                  kind: "code",
                  code: spotlightCode.trim() || "// your best code here",
                  language: spotlightCodeLang.trim() || undefined,
                }
              : spotlightKind === "document"
                ? {
                    kind: "document",
                    url: spotlightMediaLinks.document.trim(),
                    fileName: spotlightDocName.trim() || undefined,
                  }
                : spotlightKind === "gallery"
                  ? {
                      kind: "gallery",
                      urls: spotlightMediaLinks.gallery
                        .map((u) => u.trim())
                        .filter(Boolean),
                    }
                  : {
                      kind: spotlightKind,
                      url: spotlightMediaLinks[spotlightKind].trim(),
                    },
          mediaLinks: {
            image: spotlightMediaLinks.image.trim(),
            gallery: spotlightMediaLinks.gallery
              .map((u) => u.trim())
              .filter(Boolean),
            video: spotlightMediaLinks.video.trim(),
            link: spotlightMediaLinks.link.trim(),
            document: spotlightMediaLinks.document.trim(),
          },
          documentName: spotlightDocName.trim() || undefined,
        },
        heroAsideMode,
        heroPortrait: {
          url: portraitUrl.trim(),
          caption: portraitCaption.trim() || undefined,
        },
      });
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [
    name,
    tagline,
    targetRole,
    contactEmail,
    contactPhone,
    contactExtra,
    heroContactQrs,
    highlights,
    skills,
    roleFits,
    spotlightTitle,
    spotlightSummary,
    spotlightKind,
    spotlightMediaLinks,
    spotlightCode,
    spotlightCodeLang,
    spotlightDocName,
    heroAsideMode,
    portraitUrl,
    portraitCaption,
    canInline,
  ]);

  const visitorLines = highlights;
  const recentExperiences = useMemo(() => {
    return [...experiences]
      .sort(
        (a, b) =>
          parsePeriodStartScore(b.period) - parsePeriodStartScore(a.period),
      )
      .slice(0, 3);
  }, [experiences]);
  const roleCards =
    roleFits.length > 0 ? roleFits : buildDefaultRoleFits(mode, heroProofDefaults);
  const skillTags = skills;
  const highlightsForCards = useMemo(
    () => (highlights.length > 0 ? highlights : ["", "", ""]).slice(0, 10),
    [highlights],
  );
  const i18n = {
    highlights:
      mode === "zh"
        ? "核心亮点"
        : "Core highlights",
    highlightPlaceholder:
      mode === "zh"
        ? "例如：推动转化率提升 18%"
        : "e.g. improved conversion by 18%",
    pending:
      mode === "zh" ? "待补充可量化成果" : "Add a measurable result",
    skillTags: mode === "zh" ? "通用能力标签" : "Transferable skills",
    expRecent: mode === "zh" ? "近期经历" : "Recent experience",
    roleFit:
      mode === "zh"
        ? "岗位适配说明"
        : "Role-fit summary",
    roleTitlePlaceholder: mode === "zh" ? "岗位名（如：产品经理）" : "Role title",
    roleFitPlaceholder:
      mode === "zh" ? "为什么你适配这个岗位" : "Why you fit this role",
    roleProofPlaceholder:
      mode === "zh" ? "证据示例（可选）" : "Evidence (optional)",
    roleAdd: mode === "zh" ? "添加岗位" : "Add role",
    roleRemove: mode === "zh" ? "删除岗位" : "Remove role",
    evidencePrefix: mode === "zh" ? "证据示例：" : "Evidence:",
    swipeHintFallback:
      mode === "zh"
        ? "向下滚动 · 浏览履历与作品集"
        : "Scroll down to view resume and portfolio",
    highlightAdd: mode === "zh" ? "添加亮点" : "Add highlight",
    highlightRemove: mode === "zh" ? "删除亮点" : "Remove",
    skillAdd: mode === "zh" ? "添加标签" : "Add skill",
    skillRemove: mode === "zh" ? "删除标签" : "Remove",
    highlightWord: mode === "zh" ? "亮点" : "Highlight",
    profileInfo: mode === "zh" ? "个人信息速览" : "Profile quick info",
    emailLabel: mode === "zh" ? "邮箱" : "Email",
    phoneLabel: mode === "zh" ? "电话" : "Phone",
    socialLabel: mode === "zh" ? "社媒 / 联系方式" : "Social / Contacts",
    socialHint:
      mode === "zh"
        ? "格式：Instagram: your_id | LinkedIn: your_id"
        : "Format: Instagram: your_id | LinkedIn: your_id",
    qrLabel: mode === "zh" ? "联系二维码" : "Contact QR",
    qrHint:
      mode === "zh"
        ? "可上传微信/WhatsApp/Telegram 等二维码"
        : "Upload your WeChat/WhatsApp/Telegram QR",
    qrCaptionLabel: mode === "zh" ? "二维码说明" : "QR caption",
    qrCaptionHint:
      mode === "zh"
        ? "例如：扫码添加我，备注应聘岗位"
        : "e.g. Scan to connect, mention job title",
    qrUpload: mode === "zh" ? "上传二维码" : "Upload QR",
    qrReplace: mode === "zh" ? "替换二维码" : "Replace QR",
    qrRemove: mode === "zh" ? "移除二维码" : "Remove QR",
    qrAdd: mode === "zh" ? "新增二维码" : "Add QR",
    qrZoomHint:
      mode === "zh" ? "双击二维码放大" : "Double-click QR to zoom",
    qrZoomTitle: mode === "zh" ? "二维码放大预览" : "Zoomed QR preview",
    qrZoomClose: mode === "zh" ? "关闭" : "Close",
    noContact:
      mode === "zh"
        ? "可补充 Instagram / LinkedIn / 微信等，方便 HR 直接联系。"
        : "Add Instagram / LinkedIn / WeChat to help recruiters reach you quickly.",
    previewSwitch:
      mode === "zh" ? "可选预览内容" : "Preview options",
    spotlightTitle: mode === "zh" ? "个人重点展示" : "Showcase",
    spotlightType: mode === "zh" ? "展示类型" : "Type",
    spotlightMediaSource:
      mode === "zh" ? "媒体链接 / 网址" : "Media URL / Link",
    spotlightCode: mode === "zh" ? "代码内容" : "Code snippet",
    spotlightCodeLang: mode === "zh" ? "代码语言" : "Language",
    spotlightDocumentName: mode === "zh" ? "文件名（可选）" : "Document name (optional)",
    spotlightOpenLink: mode === "zh" ? "打开链接" : "Open link",
    mediaImage: mode === "zh" ? "图片（单张）" : "Image (single)",
    mediaGallery: mode === "zh" ? "图片组（摄影）" : "Photo gallery",
    mediaVideo: mode === "zh" ? "视频" : "Video",
    mediaCode: mode === "zh" ? "代码" : "Code",
    mediaLink: mode === "zh" ? "网址 / 小程序" : "Link / Mini-program",
    mediaDocument: mode === "zh" ? "文档 (PDF/Word/PPT)" : "Document (PDF/Word/PPT)",
    uploadAsset: mode === "zh" ? "上传本地文件" : "Upload local file",
    uploading: mode === "zh" ? "上传中..." : "Uploading...",
    uploadDone: mode === "zh" ? "上传成功，已填入链接。" : "Uploaded and URL filled.",
    uploadFail: mode === "zh" ? "上传失败，请重试。" : "Upload failed, please retry.",
    videoUploadLimitHint:
      mode === "zh"
        ? "视频上传支持 0-1024MB；超大 4K 文件建议用云盘/对象存储直链。"
        : "Video upload supports 0-1024MB; for larger 4K files, use cloud/object-storage links.",
    openDocument: mode === "zh" ? "打开文档" : "Open document",
    downloadDocument: mode === "zh" ? "下载文件" : "Download file",
    videoUnsupported:
      mode === "zh"
        ? "当前链接不是可直接播放的视频流。B站/YouTube 网页链接会自动嵌入，其它请使用 .mp4/.webm 直链。"
        : "This URL is not a direct playable stream. Bilibili/YouTube pages are auto-embedded, otherwise use a direct .mp4/.webm URL.",
    openInNewTab: mode === "zh" ? "新窗口打开" : "Open in new tab",
    hdPreview: mode === "zh" ? "高清预览" : "HD preview",
    hdPreviewTitle: mode === "zh" ? "高清内容预览" : "HD content preview",
    hdPreviewHint:
      mode === "zh" ? "点击可全屏查看细节" : "Open full-screen detail view",
    galleryUploadHint:
      mode === "zh"
        ? "可一次选择多张照片，支持多次追加与删除。"
        : "Select multiple photos at once; add more or remove anytime.",
    galleryRemove: mode === "zh" ? "移除" : "Remove",
    galleryPrev: mode === "zh" ? "上一张" : "Previous",
    galleryNext: mode === "zh" ? "下一张" : "Next",
    galleryCount: (current: number, total: number) =>
      mode === "zh" ? `第 ${current} / ${total} 张` : `${current} / ${total}`,
    asideModeLabel: mode === "zh" ? "右侧展示" : "Right panel",
    asideModeShowcase: mode === "zh" ? "重点展示" : "Showcase",
    asideModePortrait: mode === "zh" ? "证件照" : "Portrait",
    asideModeHidden: mode === "zh" ? "不展示" : "Hidden",
    asideHiddenHint:
      mode === "zh"
        ? "访客与预览模式下不会显示右侧区域。可随时切回「重点展示」或「证件照」。"
        : "Hidden from visitors and preview. Switch back anytime.",
    portraitTitle: mode === "zh" ? "个人形象照" : "Portrait photo",
    portraitCaptionLabel: mode === "zh" ? "照片说明（可选）" : "Caption (optional)",
    portraitCaptionPlaceholder:
      mode === "zh" ? "例如：正式证件照 · 2025" : "e.g. Professional headshot · 2025",
    portraitUpload: mode === "zh" ? "上传证件照" : "Upload portrait",
    portraitUrlPlaceholder: mode === "zh" ? "图片链接或上传本地照片" : "Image URL or upload",
    portraitEmptyHint:
      mode === "zh"
        ? "上传证件照后，访客将在首屏右侧看到你的形象照。"
        : "Upload a portrait to show it on the right side of your hero section.",
    portraitAlt: mode === "zh" ? "个人形象照" : "Portrait photo",
    asideViewSwitch: mode === "zh" ? "查看内容" : "View content",
    asideDualContentHint:
      mode === "zh"
        ? "预览与分享时，若两项均有内容，访客可在「重点展示 / 证件照」间切换。"
        : "When both sections have content, visitors can switch between them in preview and shared links.",
  };
  const visitorAside = useMemo(
    () =>
      resolveVisitorAside({
        mode: heroAsideMode,
        spotlightTitle,
        spotlightSummary,
        mediaLinks: spotlightMediaLinks,
        spotlightCode,
        portraitUrl,
      }),
    [
      heroAsideMode,
      spotlightTitle,
      spotlightSummary,
      spotlightMediaLinks,
      spotlightCode,
      portraitUrl,
    ],
  );
  const showAside = useMemo(
    () => (canInline ? true : visitorAside.show),
    [canInline, visitorAside.show],
  );
  const effectiveAsidePanel = useMemo(
    (): HeroAsideMode =>
      resolveEffectiveAsidePanel({
        canInline,
        heroAsideMode,
        visitorAside,
        visitorAsideView,
      }),
    [canInline, heroAsideMode, visitorAside, visitorAsideView],
  );
  const asideEyebrow =
    effectiveAsidePanel === "portrait"
      ? i18n.portraitTitle
      : effectiveAsidePanel === "hidden"
        ? i18n.asideModeHidden
        : i18n.spotlightTitle;
  useEffect(() => {
    if (canInline) {
      setVisitorAsideView(null);
      return;
    }
    setVisitorAsideView((prev) => {
      if (prev && visitorAside.views.includes(prev)) return prev;
      return null;
    });
  }, [canInline, visitorAside.views, visitorAside.defaultView]);

  const availablePreviewKinds = useMemo(() => {
    const kinds: SpotlightKind[] = [];
    if (spotlightMediaLinks.image.trim()) kinds.push("image");
    if (spotlightMediaLinks.gallery.length > 0) kinds.push("gallery");
    if (spotlightMediaLinks.video.trim()) kinds.push("video");
    if (spotlightMediaLinks.link.trim()) kinds.push("link");
    if (spotlightMediaLinks.document.trim()) kinds.push("document");
    if (spotlightCode.trim()) kinds.push("code");
    // 兜底：如果当前 kind 有值但不在 links 中，也允许展示当前 kind
    if (!kinds.includes(spotlightKind)) {
      if (spotlightKind === "code" && spotlightCode.trim()) {
        kinds.push(spotlightKind);
      } else if (spotlightKind === "gallery" && spotlightMediaLinks.gallery.length > 0) {
        kinds.push(spotlightKind);
      } else if (
        spotlightKind !== "code" &&
        spotlightKind !== "gallery" &&
        spotlightMediaLinks[spotlightKind]?.trim()
      ) {
        kinds.push(spotlightKind);
      }
    }
    return kinds;
  }, [spotlightCode, spotlightKind, spotlightMediaLinks]);

  const activePreviewKind: SpotlightKind = (() => {
    if (canInline) return spotlightKind;
    if (
      visitorPreviewKind &&
      availablePreviewKinds.includes(visitorPreviewKind)
    ) {
      return visitorPreviewKind;
    }
    if (availablePreviewKinds.includes(spotlightKind)) return spotlightKind;
    return availablePreviewKinds[0] ?? spotlightKind;
  })();

  const spotlightPreview = (() => {
    if (activePreviewKind === "code") {
      return {
        kind: "code" as const,
        code: spotlightCode.trim(),
        language: spotlightCodeLang.trim(),
      };
    }
    if (activePreviewKind === "document") {
      return {
        kind: "document" as const,
        url: spotlightMediaLinks.document.trim(),
        fileName: spotlightDocName.trim(),
      };
    }
    if (activePreviewKind === "gallery") {
      return {
        kind: "gallery" as const,
        urls: spotlightMediaLinks.gallery.map((u) => u.trim()).filter(Boolean),
      };
    }
    return {
      kind: activePreviewKind,
      url: spotlightMediaLinks[activePreviewKind].trim(),
    };
  })();
  const galleryUrls =
    spotlightPreview.kind === "gallery" ? spotlightPreview.urls : [];
  const activeGalleryUrl =
    galleryUrls.length > 0
      ? galleryUrls[Math.min(gallerySlideIndex, galleryUrls.length - 1)]
      : "";
  const resolvedVideo =
    spotlightPreview.kind === "video"
      ? resolveVideoPreview(spotlightPreview.url)
      : null;
  const mediaAccept =
    spotlightKind === "image" || spotlightKind === "gallery"
      ? "image/*"
      : spotlightKind === "video"
        ? "video/*"
        : documentAcceptList();
  const contactEntries = useMemo(
    () => parseContactEntries(contactExtra),
    [contactExtra],
  );
  const displayContactQrs = useMemo(() => {
    if (canInline) return heroContactQrs;
    return heroContactQrs.filter((item) => item.src || item.caption);
  }, [heroContactQrs, canInline]);
  const visitorContactQrs = useMemo(
    () => displayContactQrs.filter((item) => item.src),
    [displayContactQrs],
  );

  const readVideoSnapshotFn = useCallback(
    (video: HTMLVideoElement) => readVideoSnapshot(video),
    [],
  );

  const applyVideoSnapshotFn = useCallback(
    (
      video: HTMLVideoElement,
      snap: NonNullable<typeof videoResumeSnapshotRef.current>,
    ) => applyVideoSnapshot(video, snap),
    [],
  );

  useEffect(() => {
    if (galleryUrls.length === 0) {
      setGallerySlideIndex(0);
      return;
    }
    setGallerySlideIndex((idx) => Math.min(idx, galleryUrls.length - 1));
  }, [galleryUrls.length]);

  useEffect(() => {
    if (!spotlightHdPreviewOpen || resolvedVideo?.mode !== "direct") return;
    const snap = videoResumeSnapshotRef.current;
    const hd = hdVideoRef.current;
    if (!snap || !hd) return;
    return applyVideoSnapshotFn(hd, snap);
  }, [spotlightHdPreviewOpen, resolvedVideo?.mode, applyVideoSnapshotFn]);

  useEffect(() => {
    if (spotlightHdPreviewOpen || resolvedVideo?.mode !== "direct") return;
    const snap = videoResumeSnapshotRef.current;
    const inline = inlineVideoRef.current;
    if (!snap || !inline) return;
    videoResumeSnapshotRef.current = null;
    return applyVideoSnapshotFn(inline, snap);
  }, [spotlightHdPreviewOpen, resolvedVideo?.mode, applyVideoSnapshotFn]);

  const onCloseQrZoom = useCallback(() => setQrZoomItem(null), []);
  const onCloseHdPreview = useCallback(() => setSpotlightHdPreviewOpen(false), []);
  const onClosePortraitHdPreview = useCallback(
    () => setPortraitHdPreviewOpen(false),
    [],
  );
  const onBeforeCloseHdPreview = useCallback(() => {
    if (resolvedVideo?.mode === "direct" && hdVideoRef.current) {
      videoResumeSnapshotRef.current = readVideoSnapshotFn(hdVideoRef.current);
    }
  }, [resolvedVideo?.mode, readVideoSnapshotFn]);

  async function parseUploadResponse(resp: Response): Promise<{
    ok?: boolean;
    url?: string;
    fileName?: string;
    message?: string;
  }> {
    const text = await resp.text();
    let data: { ok?: boolean; url?: string; fileName?: string; message?: string } = {};
    try {
      data = JSON.parse(text) as typeof data;
    } catch {
      data = {};
    }

    if (resp.ok && data.ok && data.url) return data;

    if (data.message) {
      throw new Error(data.message);
    }

    if (resp.status === 413) {
      throw new Error(
        mode === "zh"
          ? "上传失败：文件超过网关限制（通常是 Nginx client_max_body_size）。请把服务器限制调大到 1024m。"
          : "Upload failed: payload exceeds gateway limit (usually Nginx client_max_body_size). Please raise it to 1024m.",
      );
    }

    if (text.includes("<html") || text.includes("<!DOCTYPE html")) {
      throw new Error(
        mode === "zh"
          ? "上传失败：服务器网关返回了 HTML 错误页（可能是 413/502/504）。请检查 Nginx 上传大小与超时配置。"
          : "Upload failed: gateway returned an HTML error page (possibly 413/502/504). Please check Nginx body-size and timeout settings.",
      );
    }

    throw new Error(i18n.uploadFail);
  }

  async function uploadFileWithTimeout(
    uploadUrl: string,
    form: FormData,
  ): Promise<{
    ok?: boolean;
    url?: string;
    fileName?: string;
    message?: string;
  }> {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
    try {
      const resp = await fetch(uploadUrl, {
        method: "POST",
        body: form,
        signal: controller.signal,
      });
      return await parseUploadResponse(resp);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        throw new Error(
          mode === "zh"
            ? "上传超时：网络或服务器处理过慢，请稍后重试；若多次出现，请检查 Nginx 超时与反向代理配置。"
            : "Upload timeout: network or server is too slow. Please retry and check Nginx/proxy timeout settings.",
        );
      }
      throw e;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  async function onUploadContactQr(file: File) {
    if (!canInline) return;
    setContactQrUploadBusy(true);
    setContactQrUploadMessage("");
    try {
      const form = new FormData();
      form.append("file", ensureUploadFileName(file));
      const clientScope = parseClientResumeScope();
      const uploadUrl = appendResumeScopeToPath(
        "/api/upload-asset",
        clientScope,
        { includeEditToken: true, includeViewToken: false },
      );
      const data = await uploadFileWithTimeout(uploadUrl, form);
      setHeroContactQrs((prev) =>
        prev.map((item) =>
          item.id === contactQrUploadTargetId ? { ...item, src: data.url ?? "" } : item,
        ),
      );
      setContactQrUploadMessage(i18n.uploadDone);
    } catch (e) {
      setContactQrUploadMessage(
        e instanceof Error && e.message ? e.message : i18n.uploadFail,
      );
    } finally {
      setContactQrUploadBusy(false);
      if (contactQrInputRef.current) contactQrInputRef.current.value = "";
    }
  }

  async function onUploadSpotlightFile(file: File) {
    if (!canInline) return;
    setSpotlightUploadBusy(true);
    setSpotlightUploadMessage("");
    try {
      const form = new FormData();
      form.append("file", ensureUploadFileName(file));
      const clientScope = parseClientResumeScope();
      const uploadUrl = appendResumeScopeToPath(
        "/api/upload-asset",
        clientScope,
        { includeEditToken: true, includeViewToken: false },
      );
      const data = await uploadFileWithTimeout(uploadUrl, form);

      if (spotlightKind === "document") {
        setSpotlightMediaLinks((prev) => ({ ...prev, document: data.url ?? "" }));
        setSpotlightDocName(data.fileName ?? file.name);
      } else if (spotlightKind === "image") {
        setSpotlightMediaLinks((prev) => ({ ...prev, image: data.url ?? "" }));
      } else if (spotlightKind === "gallery") {
        if (data.url) {
          setSpotlightMediaLinks((prev) => ({
            ...prev,
            gallery: [...prev.gallery, data.url ?? ""],
          }));
        }
      } else if (spotlightKind === "video") {
        setSpotlightMediaLinks((prev) => ({ ...prev, video: data.url ?? "" }));
      } else if (spotlightKind === "link") {
        setSpotlightMediaLinks((prev) => ({ ...prev, link: data.url ?? "" }));
      }
      setSpotlightUploadMessage(i18n.uploadDone);
    } catch (e) {
      setSpotlightUploadMessage(
        e instanceof Error && e.message ? e.message : i18n.uploadFail,
      );
    } finally {
      setSpotlightUploadBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function onUploadSpotlightGalleryFiles(files: FileList | File[]) {
    if (!canInline || spotlightKind !== "gallery") return;
    const list = Array.from(files);
    if (list.length === 0) return;
    setSpotlightUploadBusy(true);
    setSpotlightUploadMessage("");
    try {
      const clientScope = parseClientResumeScope();
      const uploadUrl = appendResumeScopeToPath(
        "/api/upload-asset",
        clientScope,
        { includeEditToken: true, includeViewToken: false },
      );
      const uploaded: string[] = [];
      for (const file of list) {
        const form = new FormData();
        form.append("file", ensureUploadFileName(file));
        const data = await uploadFileWithTimeout(uploadUrl, form);
        if (data.url) uploaded.push(data.url);
      }
      if (uploaded.length > 0) {
        setSpotlightMediaLinks((prev) => ({
          ...prev,
          gallery: [...prev.gallery, ...uploaded],
        }));
      }
      setSpotlightUploadMessage(i18n.uploadDone);
    } catch (e) {
      setSpotlightUploadMessage(
        e instanceof Error && e.message ? e.message : i18n.uploadFail,
      );
    } finally {
      setSpotlightUploadBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function onUploadPortraitFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    setPortraitUploadBusy(true);
    setPortraitUploadMessage("");
    try {
      const scope = parseClientResumeScope();
      const form = new FormData();
      form.append("file", ensureUploadFileName(file));
      const resp = await fetch(appendResumeScopeToPath("/api/upload-asset", scope), {
        method: "POST",
        body: form,
        signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
      });
      const data = await parseUploadResponse(resp);
      if (!data.ok || !data.url) {
        throw new Error(data.message || "upload failed");
      }
      setPortraitUrl(data.url);
      setPortraitUploadMessage(i18n.uploadDone);
    } catch {
      setPortraitUploadMessage(i18n.uploadFail);
    } finally {
      setPortraitUploadBusy(false);
      if (portraitInputRef.current) portraitInputRef.current.value = "";
    }
  }

  return (
    <div className={`relative ${SITE_PAPER_SECTION_X} pt-8 pb-10 sm:pt-10 sm:pb-12 md:pt-12 md:pb-14`}>
      <div
        className={`mx-auto grid w-full grid-cols-1 gap-10 ${
          showAside ? "lg:grid-cols-12 lg:items-start lg:gap-x-16 lg:gap-y-10" : ""
        }`}
      >
        <div className={`flex min-w-0 flex-col ${showAside ? "lg:col-span-7" : ""}`}>
          <motion.div
            id="tour-hero-edit"
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 30,
              mass: 0.9,
            }}
          >
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted sm:mb-2.5">
              {heroCopy.eyebrow}
            </p>

            {canInline ? (
              <input
                type="text"
                name="hero-name"
                title="点击修改，停顿后自动保存"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                autoComplete="name"
                className={`${SEAMLESS_INPUT} text-[clamp(2rem,4.2vw,3.2rem)] font-bold leading-[1.08] tracking-[-0.03em] text-ink`}
              />
            ) : (
              <h1 className="text-[clamp(2rem,4.2vw,3.2rem)] font-bold leading-[1.08] tracking-[-0.03em]">
                {site.name}
              </h1>
            )}

            {canInline ? (
              <input
                type="text"
                name="hero-role"
                title="点击修改，停顿后自动保存"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                maxLength={80}
                className={`${SEAMLESS_INPUT} mt-3 text-base font-semibold text-ink/90 sm:text-lg`}
              />
            ) : (
              <p className="mt-3 text-base font-semibold text-ink/90 sm:text-lg">
                {site.targetRole}
              </p>
            )}

            {canInline ? (
              <textarea
                name="hero-tagline"
                title="点击修改，停顿后自动保存"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                maxLength={200}
                rows={3}
                className={`${SEAMLESS_INPUT} mt-5 max-w-xl resize-y text-base leading-relaxed text-ink-muted sm:text-lg`}
              />
            ) : (
              <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-muted sm:text-lg">
                {site.tagline}
              </p>
            )}

            <div className="mt-5">
              <div className="flex w-fit max-w-full flex-wrap items-start gap-4 sm:gap-5">
                <div className="space-y-3">
              <div className="grid max-w-[560px] grid-cols-1 gap-1 sm:grid-cols-[86px_minmax(0,1fr)] sm:items-center sm:gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                  {i18n.emailLabel}
                </p>
            {canInline ? (
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="h-9 w-full rounded-lg border border-line/80 bg-surface/70 px-3 text-sm text-ink outline-none focus:border-ink/20"
                    placeholder="you@example.com"
                  />
                ) : contactEmail ? (
                  <p className="break-all text-sm text-ink">{contactEmail}</p>
                ) : (
                  <p className="text-sm text-ink-muted">—</p>
                )}
              </div>

              <div className="grid max-w-[560px] grid-cols-1 gap-1 sm:grid-cols-[86px_minmax(0,1fr)] sm:items-center sm:gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                  {i18n.phoneLabel}
                </p>
                {canInline ? (
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    maxLength={40}
                    className="h-9 w-full rounded-lg border border-line/80 bg-surface/70 px-3 text-sm text-ink outline-none focus:border-ink/20"
                    placeholder="13800000000"
                  />
                ) : contactPhone ? (
                  <p className="break-all text-sm text-ink">{contactPhone}</p>
                ) : (
                  <p className="text-sm text-ink-muted">—</p>
                )}
              </div>

              <div className="grid max-w-[560px] grid-cols-1 gap-1 sm:grid-cols-[86px_minmax(0,1fr)] sm:items-center sm:gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                  {i18n.socialLabel}
                </p>
                {canInline ? (
                  <input
                    value={contactExtra}
                    onChange={(e) => setContactExtra(e.target.value)}
                    maxLength={260}
                    className="h-9 w-full rounded-lg border border-line/80 bg-surface/70 px-3 text-sm text-ink outline-none focus:border-ink/20"
                    placeholder={i18n.socialHint}
                  />
                ) : contactEntries.length > 0 ? (
                  <p className="break-all text-sm text-ink">
                    {contactEntries.map(formatContactEntryDisplay).join(" | ")}
                  </p>
                ) : (
                  <p className="text-sm text-ink-muted">—</p>
                )}
              </div>
                </div>

                {!canInline && visitorContactQrs.length > 0 ? (
                  <div className="flex shrink-0 flex-wrap items-start gap-3 self-center sm:self-start sm:pt-1">
                    {visitorContactQrs.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="cursor-zoom-in"
                        title={i18n.qrZoomHint}
                        onDoubleClick={() =>
                          setQrZoomItem({
                            src: item.src,
                            caption: item.caption || "",
                          })
                        }
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.src}
                          alt={item.caption || i18n.qrLabel}
                          className="h-24 w-24 object-contain"
                          loading="lazy"
                          decoding="async"
                        />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              {canInline ? (
              <div className="micro-card mt-4 inline-block w-fit max-w-full rounded-2xl border border-line/80 bg-surface/76 p-3 shadow-[0_2px_10px_-8px_rgba(0,0,0,0.25)]">
                <input
                  ref={contactQrInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    void onUploadContactQr(f);
                  }}
                />
                <div className="flex w-fit max-w-full flex-wrap gap-3">
                  {displayContactQrs.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-line/75 bg-surface/72 p-2"
                    >
                      <div
                        className="h-20 w-20 overflow-hidden rounded-lg border border-line/70 bg-paper/70"
                      >
                        {item.src ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={item.src}
                              alt={i18n.qrLabel}
                              className="h-full w-full object-contain p-1"
                              loading="lazy"
                              decoding="async"
                            />
                          </>
                        ) : (
                          <div className="flex h-full items-center justify-center p-2 text-center text-[10px] leading-relaxed text-ink-muted">
                            {i18n.qrHint}
                          </div>
                        )}
                      </div>

                        <div className="w-20 mt-2 space-y-1.5">
                          <input
                            value={item.src}
                            onChange={(e) =>
                              setHeroContactQrs((prev) =>
                                prev.map((x) =>
                                  x.id === item.id ? { ...x, src: e.target.value } : x,
                                ),
                              )
                            }
                            className="w-full rounded-md border border-line/80 bg-surface/72 px-2 py-1 text-[11px] text-ink outline-none focus:border-ink/20"
                            placeholder="https://"
                          />
                          <input
                            value={item.caption}
                            onChange={(e) =>
                              setHeroContactQrs((prev) =>
                                prev.map((x) =>
                                  x.id === item.id ? { ...x, caption: e.target.value } : x,
                                ),
                              )
                            }
                            maxLength={80}
                            className="w-full rounded-md border border-line/80 bg-surface/72 px-2 py-1 text-[11px] text-ink outline-none focus:border-ink/20"
                            placeholder={i18n.qrCaptionHint}
                          />
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setContactQrUploadTargetId(item.id);
                                contactQrInputRef.current?.click();
                              }}
                              disabled={contactQrUploadBusy}
                              className="flex-1 rounded-full border border-line px-2 py-1 text-[11px] text-ink-muted transition-colors hover:border-ink/20 hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {contactQrUploadBusy && contactQrUploadTargetId === item.id
                                ? i18n.uploading
                                : item.src
                                  ? i18n.qrReplace
                                  : i18n.qrUpload}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setHeroContactQrs((prev) =>
                                  prev.filter((x) => x.id !== item.id),
                                )
                              }
                              className="rounded-full border border-line px-2 py-1 text-[11px] text-ink-muted transition-colors hover:border-ink/20 hover:text-ink"
                            >
                              {i18n.qrRemove}
                            </button>
                          </div>
                        </div>
                    </div>
                  ))}
                </div>
                {canInline ? (
                  <button
                    type="button"
                    onClick={() =>
                      setHeroContactQrs((prev) => [
                        ...prev,
                        { id: randomId("qr-"), src: "", caption: "" },
                      ].slice(0, 8))
                    }
                    className="mt-3 rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-ink/20 hover:text-ink"
                  >
                    {i18n.qrAdd}
                  </button>
                ) : null}
                {contactQrUploadMessage ? (
                  <p className="mt-2 text-xs text-ink-muted">{contactQrUploadMessage}</p>
                ) : null}
              </div>
              ) : null}
            </div>

            <div className="mt-6">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                {i18n.highlights}
              </p>
              <div className="grid gap-2 sm:grid-cols-3">
                {highlightsForCards.map((line, idx) => (
                  <div
                    key={`hl-${idx}`}
                    className="micro-card rounded-xl border border-line/80 bg-surface/55 p-3"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                      {`${i18n.highlightWord} ${String(idx + 1).padStart(2, "0")}`}
                    </p>
                    {canInline ? (
                      <div className="mt-1 space-y-2">
                  <input
                    type="text"
                    title="点击修改，停顿后自动保存"
                          value={line}
                          onChange={(e) => {
                            const v = e.target.value;
                            setHighlights((prev) => {
                              const next = [...prev];
                              next[idx] = v;
                              return next;
                            });
                          }}
                          placeholder={i18n.highlightPlaceholder}
                    maxLength={120}
                          className={`${SEAMLESS_INPUT} text-sm leading-relaxed`}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setHighlights((prev) =>
                              prev.filter((_, i) => i !== idx),
                            )
                          }
                          className="rounded-full border border-line px-2.5 py-1 text-[11px] text-ink-muted transition-colors hover:border-ink/20 hover:text-ink"
                        >
                          {i18n.highlightRemove}
                        </button>
                      </div>
                    ) : (
                      <p className="mt-1 text-sm leading-relaxed text-ink/90">
                        {line.trim() || i18n.pending}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              {canInline ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={newHighlight}
                    onChange={(e) => setNewHighlight(e.target.value)}
                    maxLength={120}
                    placeholder={i18n.highlightPlaceholder}
                    className="min-w-[220px] flex-1 rounded-xl border border-line bg-surface/70 px-3 py-2 text-sm outline-none focus:border-ink/20"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const v = newHighlight.trim();
                      if (!v) return;
                      setHighlights((prev) =>
                        [...prev, v].map((x) => x.trim()).filter(Boolean).slice(0, 10),
                      );
                      setNewHighlight("");
                    }}
                    className="rounded-full border border-line bg-surface/90 px-3 py-2 text-xs font-medium text-ink-muted transition-colors hover:border-ink/20 hover:text-ink"
                  >
                    {i18n.highlightAdd}
                  </button>
                </div>
              ) : null}
            </div>

            {visitorLines.length > 0 && !canInline ? (
              <ul className="mt-4 max-w-xl space-y-2 border-l-2 border-line pl-4 text-sm leading-relaxed text-ink/90 sm:text-[15px]">
                {visitorLines.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            ) : null}

            <div className="mt-6">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                {i18n.skillTags}
              </p>
              <div className="flex flex-wrap gap-2">
                {skillTags.map((tag, idx) =>
                  canInline ? (
                    <span
                      key={`${tag}-${idx}`}
                      className="inline-flex items-center gap-1 rounded-full border border-line/80 bg-surface/65 px-2.5 py-1 text-xs text-ink/90"
                    >
                      {tag}
                      <button
                        type="button"
                        aria-label={i18n.skillRemove}
                        onClick={() =>
                          setSkills((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="rounded-full px-1 text-[10px] text-ink-muted hover:bg-ink/10 hover:text-ink"
                      >
                        ×
                      </button>
                    </span>
                  ) : (
                    <span
                      key={`${tag}-${idx}`}
                      className="rounded-full border border-line/80 bg-surface/65 px-2.5 py-1 text-xs text-ink/90"
                    >
                      {tag}
                    </span>
                  ),
                )}
              </div>
              {canInline ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    maxLength={24}
                    placeholder={mode === "zh" ? "输入新标签" : "Type a new tag"}
                    className="min-w-[180px] rounded-xl border border-line bg-surface/70 px-3 py-2 text-sm outline-none focus:border-ink/20"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const v = newSkill.trim();
                      if (!v) return;
                      setSkills((prev) =>
                        Array.from(new Set([...prev, v])).slice(0, 12),
                      );
                      setNewSkill("");
                    }}
                    className="rounded-full border border-line bg-surface/90 px-3 py-2 text-xs font-medium text-ink-muted transition-colors hover:border-ink/20 hover:text-ink"
                  >
                    {i18n.skillAdd}
                  </button>
                </div>
              ) : null}
            </div>
          </motion.div>

          {recentExperiences.length > 0 ? (
            <div className="mt-8 border-t border-line/60 pt-6">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                {i18n.expRecent}
              </p>
              <ul className="space-y-2">
                {recentExperiences.map((e) => (
                  <li key={e.id}>
                    <a
                      href="#resume"
                      className="block rounded-xl border border-line/80 bg-surface/50 px-3 py-2.5 text-left transition-colors hover:border-ink/15 hover:bg-surface"
                    >
                      <span className="block text-sm font-semibold text-ink">
                        {e.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-ink-muted">
                        {e.subtitle} · {e.period}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-8 border-t border-line/60 pt-6">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              {i18n.roleFit}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {roleCards.map((role) => (
                <article
                  key={role.id}
                  className="micro-card rounded-xl border border-line/80 bg-surface/50 p-3"
                >
                  {canInline ? (
                    <div className="space-y-2">
                      <input
                        value={role.title}
                        onChange={(e) =>
                          setRoleFits((prev) =>
                            prev.map((x) =>
                              x.id === role.id ? { ...x, title: e.target.value } : x,
                            ),
                          )
                        }
                        maxLength={40}
                        placeholder={i18n.roleTitlePlaceholder}
                        className={`${SEAMLESS_INPUT} text-sm font-semibold`}
                      />
                      <textarea
                        value={role.fit}
                        onChange={(e) =>
                          setRoleFits((prev) =>
                            prev.map((x) =>
                              x.id === role.id ? { ...x, fit: e.target.value } : x,
                            ),
                          )
                        }
                        rows={2}
                        maxLength={180}
                        placeholder={i18n.roleFitPlaceholder}
                        className={`${SEAMLESS_INPUT} w-full resize-y text-xs leading-relaxed text-ink/90`}
                      />
                      <input
                        value={role.proof ?? ""}
                        onChange={(e) =>
                          setRoleFits((prev) =>
                            prev.map((x) =>
                              x.id === role.id
                                ? { ...x, proof: e.target.value || undefined }
                                : x,
                            ),
                          )
                        }
                        maxLength={180}
                        placeholder={i18n.roleProofPlaceholder}
                        className={`${SEAMLESS_INPUT} text-[11px] text-ink-muted`}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setRoleFits((prev) => prev.filter((x) => x.id !== role.id))
                        }
                        className="rounded-full border border-line px-2.5 py-1 text-[11px] text-ink-muted transition-colors hover:border-ink/20 hover:text-ink"
                      >
                        {i18n.roleRemove}
                      </button>
                    </div>
                  ) : (
                    <>
                      <h3 className="text-sm font-semibold text-ink">{role.title}</h3>
                      <p className="mt-1 text-xs leading-relaxed text-ink/90">
                        {role.fit}
                      </p>
                      {role.proof ? (
                        <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">
                          {i18n.evidencePrefix} {role.proof}
                        </p>
                      ) : null}
                    </>
                  )}
                </article>
              ))}
            </div>
            {canInline ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-4">
                <input
                  value={newRoleTitle}
                  onChange={(e) => setNewRoleTitle(e.target.value)}
                  maxLength={40}
                  placeholder={i18n.roleTitlePlaceholder}
                  className="rounded-xl border border-line bg-surface/70 px-3 py-2 text-sm outline-none focus:border-ink/20 sm:col-span-1"
                />
                <input
                  value={newRoleFit}
                  onChange={(e) => setNewRoleFit(e.target.value)}
                  maxLength={180}
                  placeholder={i18n.roleFitPlaceholder}
                  className="rounded-xl border border-line bg-surface/70 px-3 py-2 text-sm outline-none focus:border-ink/20 sm:col-span-2"
                />
                <div className="flex gap-2 sm:col-span-1">
                  <button
                    type="button"
                    onClick={() => {
                      const title = newRoleTitle.trim();
                      const fit = newRoleFit.trim();
                      const proof = newRoleProof.trim();
                      if (!title && !fit && !proof) return;
                      setRoleFits((prev) =>
                        [
                          ...prev,
                          {
                            id: randomId("rf-"),
                            title,
                            fit,
                            proof: proof || undefined,
                          },
                        ].slice(0, 12),
                      );
                      setNewRoleTitle("");
                      setNewRoleFit("");
                      setNewRoleProof("");
                    }}
                    className="flex-1 rounded-full border border-line bg-surface/90 px-3 py-2 text-xs font-medium text-ink-muted transition-colors hover:border-ink/20 hover:text-ink"
                  >
                    {i18n.roleAdd}
                  </button>
                </div>
                <input
                  value={newRoleProof}
                  onChange={(e) => setNewRoleProof(e.target.value)}
                  maxLength={180}
                  placeholder={i18n.roleProofPlaceholder}
                  className="rounded-xl border border-line bg-surface/70 px-3 py-2 text-sm outline-none focus:border-ink/20 sm:col-span-4"
                />
              </div>
            ) : null}
          </div>

          <motion.p
            className="mt-10 text-xs text-ink-muted/85 sm:mt-12"
            initial={false}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            {heroCopy.swipeHint || i18n.swipeHintFallback}
          </motion.p>
        </div>

        {showAside ? (
        <motion.aside
          className="min-w-0 lg:col-span-5 lg:pt-0"
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            type: "spring",
            stiffness: 220,
            damping: 28,
            delay: 0.05,
          }}
        >
          <div className="rounded-2xl border border-line bg-surface p-4 shadow-[0_1px_2px_rgba(0,0,0,0.08),0_12px_24px_-20px_rgba(0,0,0,0.28)]">
            {canInline ? (
              <div className="mb-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                  {i18n.asideModeLabel}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {EDITOR_ASIDE_TABS.map((value) => {
                    const label =
                      value === "showcase"
                        ? i18n.asideModeShowcase
                        : value === "portrait"
                          ? i18n.asideModePortrait
                          : i18n.asideModeHidden;
                    const active = heroAsideMode === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setHeroAsideMode(value)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                          active
                            ? "border-[rgb(var(--selection)/0.35)] bg-[rgb(var(--selection)/0.12)] text-[rgb(var(--selection))]"
                            : "border-line bg-surface text-ink-muted hover:border-ink/20 hover:text-ink"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                {heroAsideMode !== "hidden" &&
                hasShowcaseContent(
                  spotlightTitle,
                  spotlightSummary,
                  spotlightMediaLinks,
                  spotlightCode,
                ) &&
                hasPortraitContent(portraitUrl) ? (
                  <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">
                    {i18n.asideDualContentHint}
                  </p>
                ) : null}
              </div>
            ) : visitorAside.views.length > 1 ? (
              <div className="mb-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                  {i18n.asideViewSwitch}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {visitorAside.views.map((view) => {
                    const active = effectiveAsidePanel === view;
                    const label =
                      view === "showcase"
                        ? i18n.asideModeShowcase
                        : i18n.asideModePortrait;
                    return (
                      <button
                        key={`visitor-aside-${view}`}
                        type="button"
                        onClick={() => setVisitorAsideView(view)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                          active
                            ? "border-[rgb(var(--selection)/0.35)] bg-[rgb(var(--selection)/0.12)] text-[rgb(var(--selection))]"
                            : "border-line bg-surface text-ink-muted hover:border-ink/20 hover:text-ink"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                {asideEyebrow}
              </p>
            )}

            {heroAsideMode === "hidden" && canInline ? (
              <p className="mt-3 rounded-xl border border-dashed border-line/80 bg-paper/50 px-4 py-5 text-sm leading-relaxed text-ink-muted">
                {i18n.asideHiddenHint}
              </p>
            ) : null}

            {effectiveAsidePanel === "portrait" ? (
              <div className={canInline ? "mt-3" : "mt-2"}>
                {canInline ? (
                  <>
                    <input
                      type="text"
                      value={portraitUrl}
                      onChange={(e) => setPortraitUrl(e.target.value)}
                      placeholder={i18n.portraitUrlPlaceholder}
                      className="w-full rounded-xl border border-line bg-surface/70 px-3 py-2 text-sm outline-none focus:border-ink/20"
                    />
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={portraitUploadBusy}
                        onClick={() => portraitInputRef.current?.click()}
                        className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-ink/20 disabled:opacity-60"
                      >
                        {portraitUploadBusy ? i18n.uploading : i18n.portraitUpload}
                      </button>
                      <input
                        ref={portraitInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void onUploadPortraitFile(file);
                        }}
                      />
                    </div>
                    {portraitUploadMessage ? (
                      <p className="mt-2 text-xs text-ink-muted">{portraitUploadMessage}</p>
                    ) : null}
                    <input
                      type="text"
                      value={portraitCaption}
                      onChange={(e) => setPortraitCaption(e.target.value)}
                      maxLength={80}
                      placeholder={i18n.portraitCaptionPlaceholder}
                      className={`${SEAMLESS_INPUT} mt-3 text-sm text-ink-muted`}
                    />
                  </>
                ) : null}
                {portraitUrl.trim() ? (
                  <div
                    className={`mx-auto w-full max-w-[300px] overflow-hidden rounded-xl border border-line/90 bg-paper/55 p-2 ${canInline ? "mt-4" : "mt-2"}`}
                  >
                    <button
                      type="button"
                      onClick={() => setPortraitHdPreviewOpen(true)}
                      className="group block w-full overflow-hidden rounded-lg text-left"
                      title={i18n.hdPreviewHint}
                    >
                      <img
                        src={portraitUrl.trim()}
                        alt={portraitCaption.trim() || i18n.portraitAlt}
                        className="aspect-[3/4] max-h-[400px] w-full object-cover object-top transition-opacity group-hover:opacity-95"
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                      />
                    </button>
                    {portraitCaption.trim() ? (
                      <p className="mt-2 px-1 text-center text-sm text-ink-muted">
                        {portraitCaption.trim()}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setPortraitHdPreviewOpen(true)}
                      className="mt-2 w-full rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-ink/20"
                      title={i18n.hdPreviewHint}
                    >
                      {i18n.hdPreview}
                    </button>
                  </div>
                ) : canInline ? (
                  <div className="mt-4 rounded-xl border border-dashed border-line/80 bg-paper/50 px-4 py-8 text-center text-sm text-ink-muted">
                    {i18n.portraitEmptyHint}
                  </div>
                ) : null}
              </div>
            ) : effectiveAsidePanel === "showcase" ? (
              <>
            {canInline ? (
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                {i18n.spotlightTitle}
              </p>
            ) : null}
            {canInline ? (
              <>
                <input
                  type="text"
                  value={spotlightTitle}
                  onChange={(e) => setSpotlightTitle(e.target.value)}
                  maxLength={64}
                  className={`${SEAMLESS_INPUT} mt-2 text-lg font-semibold tracking-[-0.02em]`}
                  placeholder={mode === "zh" ? "例如：最强项目案例" : "e.g. Signature case"}
                />
                <textarea
                  value={spotlightSummary}
                  onChange={(e) => setSpotlightSummary(e.target.value)}
                  rows={3}
                  maxLength={220}
                  className={`${SEAMLESS_INPUT} mt-2 w-full resize-y text-sm leading-relaxed text-ink-muted`}
                  placeholder={
                    mode === "zh"
                      ? "描述该优势的业务价值、规模和结果"
                      : "Describe impact, scope and outcomes"
                  }
                />
              </>
            ) : (
              <>
                <h3 className="mt-2 text-lg font-semibold tracking-[-0.02em]">
                  {spotlightTitle}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                  {spotlightSummary}
                </p>
              </>
            )}

            {!canInline && availablePreviewKinds.length > 1 ? (
              <div className="mt-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                  {i18n.previewSwitch}
                </p>
                <div className="flex flex-wrap gap-2">
                  {availablePreviewKinds.map((kind) => {
                    const label =
                      kind === "image"
                        ? i18n.mediaImage
                        : kind === "gallery"
                          ? i18n.mediaGallery
                          : kind === "video"
                            ? i18n.mediaVideo
                            : kind === "code"
                              ? i18n.mediaCode
                              : kind === "document"
                                ? i18n.mediaDocument
                                : i18n.mediaLink;
                    const active = activePreviewKind === kind;
                    return (
                      <button
                        key={`visitor-preview-${kind}`}
                        type="button"
                        onClick={() => setVisitorPreviewKind(kind)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                          active
                            ? "border-[rgb(var(--selection)/0.35)] bg-[rgb(var(--selection)/0.12)] text-[rgb(var(--selection))]"
                            : "border-line bg-surface text-ink-muted hover:border-ink/20 hover:text-ink"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="mt-4 rounded-xl border border-line/90 bg-paper/55 p-3">
              {canInline ? (
                <div className="mb-3 grid gap-2 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-xs text-ink-muted">
                    <span>{i18n.spotlightType}</span>
                    <select
                      value={spotlightKind}
                      onChange={(e) =>
                        setSpotlightKind(e.target.value as SpotlightKind)
                      }
                      className="rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-ink outline-none focus:border-ink/20"
                    >
                      <option value="image">{i18n.mediaImage}</option>
                      <option value="gallery">{i18n.mediaGallery}</option>
                      <option value="video">{i18n.mediaVideo}</option>
                      <option value="code">{i18n.mediaCode}</option>
                      <option value="link">{i18n.mediaLink}</option>
                      <option value="document">{i18n.mediaDocument}</option>
                    </select>
                  </label>
                  {spotlightKind === "code" ? (
                    <label className="flex flex-col gap-1 text-xs text-ink-muted">
                      <span>{i18n.spotlightCodeLang}</span>
                      <input
                        value={spotlightCodeLang}
                        onChange={(e) => setSpotlightCodeLang(e.target.value)}
                        maxLength={24}
                        className="rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-ink outline-none focus:border-ink/20"
                        placeholder="ts / js / py ..."
                      />
                    </label>
                  ) : spotlightKind === "document" ? (
                    <label className="flex flex-col gap-1 text-xs text-ink-muted">
                      <span>{i18n.spotlightDocumentName}</span>
                      <input
                        value={spotlightDocName}
                        onChange={(e) => setSpotlightDocName(e.target.value)}
                        maxLength={80}
                        className="rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-ink outline-none focus:border-ink/20"
                        placeholder={mode === "zh" ? "如：项目方案.pdf" : "e.g. Proposal.pdf"}
                      />
                    </label>
                  ) : spotlightKind === "gallery" ? (
                    <div className="flex flex-col gap-1 text-xs text-ink-muted">
                      <span>
                        {mode === "zh"
                          ? `已添加 ${spotlightMediaLinks.gallery.length} 张`
                          : `${spotlightMediaLinks.gallery.length} photo(s) added`}
                      </span>
                      {spotlightMediaLinks.gallery.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {spotlightMediaLinks.gallery.map((url, idx) => (
                            <div
                              key={`gallery-thumb-${idx}-${url}`}
                              className="group relative h-16 w-16 overflow-hidden rounded-md border border-line/80 bg-surface"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={url}
                                alt=""
                                className="h-full w-full object-cover"
                                loading="lazy"
                                decoding="async"
                                referrerPolicy="no-referrer"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setSpotlightMediaLinks((prev) => ({
                                    ...prev,
                                    gallery: prev.gallery.filter((_, i) => i !== idx),
                                  }))
                                }
                                className="absolute inset-x-0 bottom-0 bg-ink/70 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100"
                              >
                                {i18n.galleryRemove}
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-ink-muted/90">
                          {i18n.galleryUploadHint}
                        </p>
                      )}
                    </div>
                  ) : (
                    <label className="flex flex-col gap-1 text-xs text-ink-muted">
                      <span>{i18n.spotlightMediaSource}</span>
                      <input
                        value={spotlightMediaLinks[spotlightKind]}
                        onChange={(e) =>
                          setSpotlightMediaLinks((prev) => ({
                            ...prev,
                            [spotlightKind]: e.target.value,
                          }))
                        }
                        className="rounded-lg border border-line bg-surface px-2.5 py-2 text-xs text-ink outline-none focus:border-ink/20"
                        placeholder="https://..."
                      />
                    </label>
                  )}
                  {spotlightKind === "document" ? (
                    <label className="sm:col-span-2 flex flex-col gap-1 text-xs text-ink-muted">
                      <span>{i18n.spotlightMediaSource}</span>
                      <input
                        value={spotlightMediaLinks.document}
                        onChange={(e) =>
                          setSpotlightMediaLinks((prev) => ({
                            ...prev,
                            document: e.target.value,
                          }))
                        }
                        className="rounded-lg border border-line bg-surface px-2.5 py-2 text-xs text-ink outline-none focus:border-ink/20"
                        placeholder="/uploads/your-file.pdf"
                      />
                    </label>
                  ) : null}
                  {spotlightKind === "code" ? (
                    <label className="sm:col-span-2 flex flex-col gap-1 text-xs text-ink-muted">
                      <span>{i18n.spotlightCode}</span>
                      <textarea
                        value={spotlightCode}
                        onChange={(e) => setSpotlightCode(e.target.value)}
                        rows={8}
                        className="rounded-lg border border-line bg-surface px-2.5 py-2 font-mono text-xs text-ink outline-none focus:border-ink/20"
                        placeholder={
                          mode === "zh"
                            ? "贴一段最能体现你实力的代码"
                            : "Paste your most representative code snippet"
                        }
                      />
                    </label>
                  ) : null}
                  {spotlightKind !== "code" && spotlightKind !== "link" ? (
                    <div className="sm:col-span-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={mediaAccept}
                        multiple={spotlightKind === "gallery"}
                        className="hidden"
                        onChange={(e) => {
                          const files = e.target.files;
                          if (!files?.length) return;
                          if (spotlightKind === "gallery") {
                            void onUploadSpotlightGalleryFiles(files);
                          } else {
                            void onUploadSpotlightFile(files[0]);
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={spotlightUploadBusy}
                        className="rounded-full border border-line bg-surface/90 px-3 py-2 text-xs font-medium text-ink-muted transition-colors hover:border-ink/20 hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {spotlightUploadBusy ? i18n.uploading : i18n.uploadAsset}
                      </button>
                      {spotlightUploadMessage ? (
                        <p className="mt-2 text-xs text-ink-muted">{spotlightUploadMessage}</p>
                      ) : null}
                      {spotlightKind === "video" ? (
                        <p className="mt-1 text-xs text-ink-muted/90">
                          {i18n.videoUploadLimitHint}
                        </p>
                      ) : spotlightKind === "gallery" ? (
                        <p className="mt-1 text-xs text-ink-muted/90">
                          {i18n.galleryUploadHint}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {spotlightPreview.kind === "gallery" && galleryUrls.length > 0 ? (
                <div className="max-h-[420px] overflow-hidden rounded-lg border border-line/60 bg-[#0b0f19]/5 p-1">
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={activeGalleryUrl}
                      alt={spotlightTitle}
                      className="h-auto max-h-[360px] w-full rounded-md object-contain"
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                    />
                    {galleryUrls.length > 1 ? (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setGallerySlideIndex(
                              (idx) =>
                                (idx - 1 + galleryUrls.length) % galleryUrls.length,
                            )
                          }
                          className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full border border-line/70 bg-surface/90 px-2.5 py-1 text-xs font-medium text-ink shadow-sm transition-colors hover:border-ink/20"
                          aria-label={i18n.galleryPrev}
                        >
                          ‹
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setGallerySlideIndex(
                              (idx) => (idx + 1) % galleryUrls.length,
                            )
                          }
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-line/70 bg-surface/90 px-2.5 py-1 text-xs font-medium text-ink shadow-sm transition-colors hover:border-ink/20"
                          aria-label={i18n.galleryNext}
                        >
                          ›
                        </button>
                      </>
                    ) : null}
                  </div>
                  {galleryUrls.length > 1 ? (
                    <div className="mt-2 flex items-center justify-between gap-2 px-1">
                      <p className="text-xs text-ink-muted">
                        {i18n.galleryCount(gallerySlideIndex + 1, galleryUrls.length)}
                      </p>
                      <div className="flex flex-wrap justify-end gap-1">
                        {galleryUrls.map((_, idx) => (
                          <button
                            key={`gallery-dot-${idx}`}
                            type="button"
                            onClick={() => setGallerySlideIndex(idx)}
                            className={`h-1.5 w-1.5 rounded-full transition-colors ${
                              idx === gallerySlideIndex
                                ? "bg-[rgb(var(--selection))]"
                                : "bg-line hover:bg-ink/30"
                            }`}
                            aria-label={i18n.galleryCount(idx + 1, galleryUrls.length)}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setSpotlightHdPreviewOpen(true)}
                    className="mt-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-ink/20"
                    title={i18n.hdPreviewHint}
                  >
                    {i18n.hdPreview}
                  </button>
                </div>
              ) : null}
              {spotlightPreview.kind === "image" && spotlightPreview.url ? (
                <div className="max-h-[420px] overflow-auto rounded-lg border border-line/60 bg-[#0b0f19]/5 p-1">
                  <img
                    src={spotlightPreview.url}
                    alt={spotlightTitle}
                    className="h-auto w-full rounded-md object-contain"
                    loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                />
                  <button
                    type="button"
                    onClick={() => setSpotlightHdPreviewOpen(true)}
                    className="mt-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-ink/20"
                    title={i18n.hdPreviewHint}
                  >
                    {i18n.hdPreview}
                  </button>
                </div>
              ) : null}
              {spotlightPreview.kind === "video" &&
              spotlightPreview.url &&
              resolvedVideo?.mode === "embed" ? (
                <div className="overflow-hidden rounded-lg border border-line/60 bg-black/80">
                  <div className="aspect-video w-full">
                    <iframe
                      src={resolvedVideo.src}
                      title={spotlightTitle || "embedded video"}
                      className="h-full w-full"
                      loading="lazy"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                      allowFullScreen
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setSpotlightHdPreviewOpen(true)}
                    className="m-2 rounded-full border border-line/70 bg-surface/90 px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-ink/20"
                    title={i18n.hdPreviewHint}
                  >
                    {i18n.hdPreview}
                  </button>
                </div>
              ) : null}
              {spotlightPreview.kind === "video" &&
              spotlightPreview.url &&
              resolvedVideo?.mode === "direct" ? (
                <div className="max-h-[420px] overflow-auto rounded-lg border border-line/60 bg-black/80 p-1">
                  <video
                    ref={inlineVideoRef}
                    src={resolvedVideo.src}
                    controls
                    preload="metadata"
                    playsInline
                    className="h-auto max-h-[410px] w-full rounded-md object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (inlineVideoRef.current) {
                        videoResumeSnapshotRef.current = readVideoSnapshotFn(inlineVideoRef.current);
                        inlineVideoRef.current.pause();
                      }
                      setSpotlightHdPreviewOpen(true);
                    }}
                    className="mt-2 rounded-full border border-line/70 bg-surface/90 px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-ink/20"
                    title={i18n.hdPreviewHint}
                  >
                    {i18n.hdPreview}
                  </button>
                </div>
              ) : null}
              {spotlightPreview.kind === "video" &&
              spotlightPreview.url &&
              resolvedVideo?.mode === "unknown" ? (
                <div className="rounded-lg border border-dashed border-line/80 bg-surface px-4 py-6 text-center text-sm text-ink-muted">
                  <p>{i18n.videoUnsupported}</p>
                  <a
                    href={spotlightPreview.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-block rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-ink/20"
                  >
                    {i18n.openInNewTab}
                  </a>
                </div>
              ) : null}
              {spotlightPreview.kind === "code" ? (
                <pre className="max-h-[220px] overflow-auto rounded-lg bg-[#0f172a] p-3 font-mono text-xs leading-relaxed text-[#e2e8f0]">
{spotlightPreview.code || (mode === "zh" ? "// 在这里展示你的代表代码" : "// show your representative code here")}
                </pre>
              ) : null}
              {spotlightPreview.kind === "link" && spotlightPreview.url ? (
                <a
                  href={spotlightPreview.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-lg border border-dashed border-line/80 bg-surface px-4 py-6 text-center text-sm font-medium text-ink transition-colors hover:border-ink/20"
                >
                  {i18n.spotlightOpenLink}
                  <span className="mt-1 block break-all text-xs text-ink-muted">
                    {spotlightPreview.url}
                  </span>
                </a>
              ) : null}
              {spotlightPreview.kind === "document" && spotlightPreview.url ? (
                <div className="space-y-3">
                  <DocumentEmbedPreview
                    url={spotlightPreview.url}
                    fileName={spotlightPreview.fileName}
                    title={spotlightPreview.fileName || spotlightTitle || "document"}
                    locale={mode}
                  />
                  <div className="rounded-lg border border-dashed border-line/80 bg-surface px-4 py-4 text-sm text-ink">
                    <p className="font-medium">
                      {spotlightPreview.fileName || spotlightPreview.url.split("/").pop()}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a
                        href={spotlightPreview.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-ink/20"
                      >
                        {i18n.openDocument}
                      </a>
                      <a
                        href={`${spotlightPreview.url}${
                          spotlightPreview.url.includes("?") ? "&" : "?"
                        }download=1`}
                        download={spotlightPreview.fileName || true}
                        className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-ink/20"
                      >
                        {i18n.downloadDocument}
                      </a>
                </div>
            </div>
                </div>
              ) : null}
              {spotlightPreview.kind !== "code" &&
              canInline &&
              !(
                (spotlightPreview.kind === "gallery" &&
                  spotlightPreview.urls.length > 0) ||
                ("url" in spotlightPreview && spotlightPreview.url)
              ) ? (
                <div className="rounded-lg border border-dashed border-line/80 bg-surface px-4 py-10 text-center text-sm text-ink-muted">
                  {mode === "zh"
                    ? "请填写媒体链接后在此预览"
                    : "Enter a media URL to preview here"}
                </div>
              ) : null}
            </div>
              </>
            ) : null}
          </div>
        </motion.aside>
        ) : null}
      </div>

      <HeroSpotlightModals
        mode={mode}
        i18n={{
          qrLabel: i18n.qrLabel,
          qrZoomTitle: i18n.qrZoomTitle,
          qrZoomClose: i18n.qrZoomClose,
          hdPreviewTitle: i18n.hdPreviewTitle,
          galleryPrev: i18n.galleryPrev,
          galleryNext: i18n.galleryNext,
          galleryCount: i18n.galleryCount,
        }}
        qrZoomItem={qrZoomItem}
        onCloseQrZoom={onCloseQrZoom}
        spotlightHdPreviewOpen={spotlightHdPreviewOpen}
        onCloseHdPreview={onCloseHdPreview}
        onBeforeCloseHdPreview={onBeforeCloseHdPreview}
        portraitHdPreviewOpen={portraitHdPreviewOpen}
        onClosePortraitHdPreview={onClosePortraitHdPreview}
        portraitUrl={portraitUrl}
        portraitAlt={portraitCaption.trim() || i18n.portraitAlt}
        portraitCaption={portraitCaption}
        spotlightPreview={spotlightPreview}
        spotlightTitle={spotlightTitle}
        resolvedVideo={resolvedVideo}
        activeGalleryUrl={activeGalleryUrl}
        galleryUrls={galleryUrls}
        gallerySlideIndex={gallerySlideIndex}
        onGallerySlideChange={setGallerySlideIndex}
        hdVideoRef={hdVideoRef}
      />
    </div>
  );
}
