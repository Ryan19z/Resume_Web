"use client";

import { useSiteContent } from "@/context/SiteContentProvider";
import { useLanguageMode } from "@/context/LanguageModeProvider";
import { SEAMLESS_INPUT } from "@/lib/inline-edit-styles";
import { randomId } from "@/lib/random-id";
import { appendResumeScopeToPath, parseClientResumeScope } from "@/lib/resume-scope";
import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

const DEBOUNCE_MS = 550;
const DEFAULT_ROLE_FITS_ZH = [
  {
    title: "摄影",
    fit: "具备视觉叙事与成片交付能力，能围绕业务目标输出可传播画面。",
  },
  {
    title: "设计",
    fit: "能把抽象需求转成信息结构与界面细节，兼顾审美与可用性。",
  },
  {
    title: "软件工程",
    fit: "可独立推进从需求拆解、实现到上线的完整交付闭环。",
  },
  {
    title: "数据工程",
    fit: "善于把业务问题量化，搭建指标与分析链路支持决策。",
  },
  {
    title: "销售",
    fit: "擅长提炼价值卖点，用案例与结果驱动客户沟通和转化。",
  },
] as const;

const DEFAULT_ROLE_FITS_EN = [
  {
    title: "Photography",
    fit: "Strong in visual storytelling and delivery, producing assets that support business goals.",
  },
  {
    title: "Design",
    fit: "Able to turn abstract requirements into clear information architecture and UI details.",
  },
  {
    title: "Software Engineering",
    fit: "Capable of driving the full lifecycle from requirement breakdown to production delivery.",
  },
  {
    title: "Data Engineering",
    fit: "Comfortable quantifying business questions and building metrics pipelines for decisions.",
  },
  {
    title: "Sales",
    fit: "Skilled at converting product value into client language and outcome-focused communication.",
  },
] as const;

function extractProofLines(lines: string[], mode: "zh" | "en"): string[] {
  const cleaned = lines.map((x) => x.trim()).filter(Boolean);
  if (cleaned.length === 0) {
    return [
      mode === "zh"
        ? "可基于你的项目经历补充可量化结果。"
        : "Add measurable outcomes from your real project work.",
    ];
  }
  return cleaned;
}

function buildSkillTags(targetRole: string): string[] {
  const fromRole = targetRole
    .split(/[、,，/|·\s]+/)
    .map((x) => x.trim())
    .filter((x) => x.length >= 2 && x.length <= 10);
  const base = [
    "结果导向",
    "跨团队协作",
    "结构化表达",
    "方案落地",
    "数据复盘",
    "用户洞察",
  ];
  return Array.from(new Set([...fromRole, ...base])).slice(0, 8);
}

function buildDefaultRoleFits(
  mode: "zh" | "en",
  proofs: string[],
): RoleFitDraft[] {
  const roleBase = mode === "zh" ? DEFAULT_ROLE_FITS_ZH : DEFAULT_ROLE_FITS_EN;
  return roleBase.map((item, i) => ({
    id: `rf-${mode}-${i + 1}`,
    title: item.title,
    fit: item.fit,
    proof: proofs[i % proofs.length],
  }));
}

type ResolvedVideoPreview =
  | { mode: "direct"; src: string }
  | { mode: "embed"; src: string }
  | { mode: "unknown"; src: string };

type SpotlightKind = "image" | "video" | "code" | "link" | "document";

type SpotlightMediaLinks = {
  image: string;
  video: string;
  link: string;
  document: string;
};

type RoleFitDraft = {
  id: string;
  title: string;
  fit: string;
  proof?: string;
};

function extractYouTubeId(url: URL): string | null {
  const host = url.hostname.toLowerCase();
  const pathParts = url.pathname.split("/").filter(Boolean);
  if (host === "youtu.be") return pathParts[0] ?? null;
  if (!host.includes("youtube.com")) return null;
  if (url.pathname.startsWith("/watch")) return url.searchParams.get("v");
  if (url.pathname.startsWith("/shorts/")) return pathParts[1] ?? null;
  if (url.pathname.startsWith("/embed/")) return pathParts[1] ?? null;
  return null;
}

function resolveVideoPreview(urlText: string): ResolvedVideoPreview {
  const src = urlText.trim();
  if (!src) return { mode: "unknown", src: "" };
  if (/\.(mp4|webm|ogg|mov|m3u8)(\?.*)?$/i.test(src)) {
    return { mode: "direct", src };
  }
  try {
    const url = new URL(src);
    const host = url.hostname.toLowerCase();

    const youtubeId = extractYouTubeId(url);
    if (youtubeId) {
      return { mode: "embed", src: `https://www.youtube.com/embed/${youtubeId}` };
    }

    if (host.includes("bilibili.com")) {
      const path = url.pathname;
      const bvMatch = path.match(/\/video\/(BV[0-9A-Za-z]+)/i);
      if (bvMatch) {
        return {
          mode: "embed",
          src: `https://player.bilibili.com/player.html?bvid=${bvMatch[1]}&page=1`,
        };
      }
      const avMatch = path.match(/\/video\/av(\d+)/i);
      if (avMatch) {
        return {
          mode: "embed",
          src: `https://player.bilibili.com/player.html?aid=${avMatch[1]}&page=1`,
        };
      }
      if (host.includes("player.bilibili.com")) {
        return { mode: "embed", src };
      }
    }
  } catch {
    // ignore invalid URL and fall through
  }
  return { mode: "unknown", src };
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
    portraitCaption: "",
    portraitGuidance: "",
  };

  const [name, setName] = useState(site.name ?? "");
  const [targetRole, setTargetRole] = useState(site.targetRole ?? "");
  const [tagline, setTagline] = useState(site.tagline ?? "");
  const [highlights, setHighlights] = useState<string[]>(hp);
  const [skills, setSkills] = useState<string[]>(
    Array.isArray(site.transferableSkills) && site.transferableSkills.length > 0
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
        ? "可展示代码、摄影作品、Vlog、广告、小程序或网址。"
        : "Show your best proof: code, photography, vlog, ads, mini-program or links.",
    media: { kind: "image" as const, url: "" },
  };
  const [spotlightTitle, setSpotlightTitle] = useState(
    site.heroSpotlight?.title ?? fallbackSpotlight.title,
  );
  const [spotlightSummary, setSpotlightSummary] = useState(
    site.heroSpotlight?.summary ?? fallbackSpotlight.summary,
  );
  const [spotlightKind, setSpotlightKind] = useState<SpotlightKind>(
    (site.heroSpotlight?.media?.kind as
      | "image"
      | "video"
      | "code"
      | "link"
      | "document"
      | undefined) ?? "image",
  );
  const [spotlightMediaLinks, setSpotlightMediaLinks] = useState<SpotlightMediaLinks>(() => {
    const media = site.heroSpotlight?.media;
    const mediaUrl = media && "url" in media ? media.url : "";
    return {
      image:
        site.heroSpotlight?.mediaLinks?.image ??
        (media?.kind === "image" ? mediaUrl : ""),
      video:
        site.heroSpotlight?.mediaLinks?.video ??
        (media?.kind === "video" ? mediaUrl : ""),
      link:
        site.heroSpotlight?.mediaLinks?.link ??
        (media?.kind === "link" ? mediaUrl : ""),
      document:
        site.heroSpotlight?.mediaLinks?.document ??
        (media?.kind === "document" ? mediaUrl : ""),
    };
  });
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
  const [spotlightDocName, setSpotlightDocName] = useState(
    site.heroSpotlight?.documentName ??
      (site.heroSpotlight?.media?.kind === "document"
        ? (site.heroSpotlight.media.fileName ?? "")
        : ""),
  );
  const [spotlightUploadBusy, setSpotlightUploadBusy] = useState(false);
  const [spotlightUploadMessage, setSpotlightUploadMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const siteSnap = `${site.name}|${site.targetRole}|${site.tagline}|${JSON.stringify(
    hp,
  )}|${JSON.stringify(site.transferableSkills ?? [])}|${JSON.stringify(
    site.roleFitEntries ?? [],
  )}|${JSON.stringify(
    site.heroSpotlight ?? null,
  )}`;
  const siteRef = useRef(site);
  siteRef.current = site;

  useEffect(() => {
    const s = siteRef.current;
    const lines = Array.isArray(s.heroPreviewLines)
      ? s.heroPreviewLines
      : ["", "", ""];
    setName(s.name ?? "");
    setTargetRole(s.targetRole ?? "");
    setTagline(s.tagline ?? "");
    const cleanLines = lines.map((x) => String(x ?? "").trim()).filter(Boolean);
    setHighlights(cleanLines);
    const nextSkills =
      Array.isArray(s.transferableSkills) && s.transferableSkills.length > 0
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
    const media = sp.media;
    const mediaUrl = media && "url" in media ? media.url : "";
    setSpotlightMediaLinks({
      image:
        sp.mediaLinks?.image ??
        (media?.kind === "image" ? mediaUrl : ""),
      video:
        sp.mediaLinks?.video ??
        (media?.kind === "video" ? mediaUrl : ""),
      link:
        sp.mediaLinks?.link ??
        (media?.kind === "link" ? mediaUrl : ""),
      document:
        sp.mediaLinks?.document ??
        (media?.kind === "document" ? mediaUrl : ""),
    });
    setSpotlightCode(sp.media?.kind === "code" ? sp.media.code : "");
    setSpotlightCodeLang(sp.media?.kind === "code" ? (sp.media.language ?? "") : "");
    setSpotlightDocName(
      sp.documentName ??
        (sp.media?.kind === "document" ? (sp.media.fileName ?? "") : ""),
    );
    setSpotlightUploadMessage("");
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
              : {
                  kind: spotlightKind,
                  url: spotlightMediaLinks[spotlightKind].trim(),
                },
          mediaLinks: {
            image: spotlightMediaLinks.image.trim(),
            video: spotlightMediaLinks.video.trim(),
            link: spotlightMediaLinks.link.trim(),
            document: spotlightMediaLinks.document.trim(),
          },
          documentName: spotlightDocName.trim() || undefined,
        },
      });
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [
    name,
    tagline,
    targetRole,
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
    canInline,
  ]);

  const visitorLines = highlights;
  const roleCards =
    roleFits.length > 0 ? roleFits : buildDefaultRoleFits(mode, heroProofDefaults);
  const skillTags = skills.length > 0 ? skills : buildSkillTags(site.targetRole ?? "");
  const highlightsForCards = useMemo(
    () => (highlights.length > 0 ? highlights : ["", "", ""]).slice(0, 10),
    [highlights],
  );
  const i18n = {
    scanHint:
      mode === "zh"
        ? "HR 快速扫描区：把最能证明价值的信息放在首屏"
        : "HR quick scan: put your strongest proof on the first screen",
    highlights:
      mode === "zh"
        ? "核心亮点（建议尽量量化）"
        : "Core highlights (quantify whenever possible)",
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
        ? "岗位适配说明（面向不同岗位投递）"
        : "Role-fit matrix (for different applications)",
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
    spotlightTitle: mode === "zh" ? "个人重点展示" : "Showcase",
    spotlightType: mode === "zh" ? "展示类型" : "Type",
    spotlightMediaSource:
      mode === "zh" ? "媒体链接 / 网址" : "Media URL / Link",
    spotlightCode: mode === "zh" ? "代码内容" : "Code snippet",
    spotlightCodeLang: mode === "zh" ? "代码语言" : "Language",
    spotlightDocumentName: mode === "zh" ? "文件名（可选）" : "Document name (optional)",
    spotlightOpenLink: mode === "zh" ? "打开链接" : "Open link",
    mediaImage: mode === "zh" ? "图片" : "Image",
    mediaVideo: mode === "zh" ? "视频" : "Video",
    mediaCode: mode === "zh" ? "代码" : "Code",
    mediaLink: mode === "zh" ? "网址 / 小程序" : "Link / Mini-program",
    mediaDocument: mode === "zh" ? "文档 (PDF/Word/PPT)" : "Document (PDF/Word/PPT)",
    uploadAsset: mode === "zh" ? "上传本地文件" : "Upload local file",
    uploading: mode === "zh" ? "上传中..." : "Uploading...",
    uploadDone: mode === "zh" ? "上传成功，已填入链接。" : "Uploaded and URL filled.",
    uploadFail: mode === "zh" ? "上传失败，请重试。" : "Upload failed, please retry.",
    openDocument: mode === "zh" ? "打开文档" : "Open document",
    downloadDocument: mode === "zh" ? "下载文件" : "Download file",
    videoUnsupported:
      mode === "zh"
        ? "当前链接不是可直接播放的视频流。B站/YouTube 网页链接会自动嵌入，其它请使用 .mp4/.webm 直链。"
        : "This URL is not a direct playable stream. Bilibili/YouTube pages are auto-embedded, otherwise use a direct .mp4/.webm URL.",
    openInNewTab: mode === "zh" ? "新窗口打开" : "Open in new tab",
  };
  const spotlightPreview = (() => {
    if (spotlightKind === "code") {
      return {
        kind: "code" as const,
        code: spotlightCode.trim(),
        language: spotlightCodeLang.trim(),
      };
    }
    if (spotlightKind === "document") {
      return {
        kind: "document" as const,
        url: spotlightMediaLinks.document.trim(),
        fileName: spotlightDocName.trim(),
      };
    }
    return {
      kind: spotlightKind,
      url: spotlightMediaLinks[spotlightKind].trim(),
    };
  })();
  const resolvedVideo =
    spotlightPreview.kind === "video"
      ? resolveVideoPreview(spotlightPreview.url)
      : null;
  const mediaAccept =
    spotlightKind === "image"
      ? "image/*"
      : spotlightKind === "video"
        ? "video/*"
        : ".pdf,.doc,.docx,.ppt,.pptx";

  async function onUploadSpotlightFile(file: File) {
    if (!canInline) return;
    setSpotlightUploadBusy(true);
    setSpotlightUploadMessage("");
    try {
      const form = new FormData();
      form.append("file", file);
      const clientScope = parseClientResumeScope();
      const uploadUrl = appendResumeScopeToPath(
        "/api/upload-asset",
        clientScope,
        { includeEditToken: true, includeViewToken: false },
      );
      const resp = await fetch(uploadUrl, {
        method: "POST",
        body: form,
      });
      const data = (await resp.json()) as {
        ok?: boolean;
        url?: string;
        fileName?: string;
        message?: string;
      };
      if (!resp.ok || !data.ok || !data.url) {
        throw new Error(data.message || i18n.uploadFail);
      }

      if (spotlightKind === "document") {
        setSpotlightMediaLinks((prev) => ({ ...prev, document: data.url ?? "" }));
        setSpotlightDocName(data.fileName ?? file.name);
      } else if (spotlightKind === "image") {
        setSpotlightMediaLinks((prev) => ({ ...prev, image: data.url ?? "" }));
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

  return (
    <div className="relative min-h-[min(100svh,880px)] px-6 py-16 sm:px-10 sm:py-20 md:px-14 lg:px-16">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 lg:grid-cols-12 lg:items-start lg:gap-10">
        <div className="flex min-w-0 flex-col lg:col-span-7">
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
            <p className="mb-3 text-[12px] font-medium uppercase tracking-[0.2em] text-ink-muted sm:mb-4">
              {heroCopy.eyebrow}
            </p>

            <div className="mb-4 inline-flex items-center rounded-full border border-line/80 bg-surface/65 px-3 py-1 text-[11px] text-ink-muted">
              {i18n.scanHint}
            </div>

            {canInline ? (
              <input
                type="text"
                name="hero-name"
                title="点击修改，停顿后自动保存"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                autoComplete="name"
                className={`${SEAMLESS_INPUT} text-[clamp(1.85rem,4.2vw,3rem)] font-semibold leading-[1.08] tracking-[-0.03em] text-ink`}
              />
            ) : (
              <h1 className="text-[clamp(1.85rem,4.2vw,3rem)] font-semibold leading-[1.08] tracking-[-0.03em]">
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

          {experiences.length > 0 ? (
            <div className="mt-8 border-t border-line/60 pt-6">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                {i18n.expRecent}
              </p>
              <ul className="space-y-2">
                {experiences.slice(0, 3).map((e) => (
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

        <motion.aside
          className="min-w-0 lg:col-span-5 lg:pt-2"
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            type: "spring",
            stiffness: 220,
            damping: 28,
            delay: 0.05,
          }}
        >
          <div className="rounded-2xl border border-line/80 bg-surface/65 p-4 shadow-[0_16px_45px_-28px_rgba(0,0,0,0.45)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              {i18n.spotlightTitle}
            </p>
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

            <div className="mt-4 rounded-xl border border-line/70 bg-paper/40 p-3">
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
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          void onUploadSpotlightFile(f);
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
                    </div>
                  ) : null}
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
                </div>
              ) : null}
              {spotlightPreview.kind === "video" &&
              spotlightPreview.url &&
              resolvedVideo?.mode === "direct" ? (
                <div className="max-h-[420px] overflow-auto rounded-lg border border-line/60 bg-black/80 p-1">
                  <video
                    src={resolvedVideo.src}
                    controls
                    className="h-auto max-h-[410px] w-full rounded-md object-contain"
                  />
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
                  {spotlightPreview.url.toLowerCase().endsWith(".pdf") ? (
                    <div className="overflow-hidden rounded-lg border border-line/60 bg-surface/40">
                      <iframe
                        src={spotlightPreview.url}
                        title={spotlightPreview.fileName || spotlightTitle || "document"}
                        className="h-[420px] w-full"
                      />
                    </div>
                  ) : null}
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
              !("url" in spotlightPreview && spotlightPreview.url) ? (
                <div className="rounded-lg border border-dashed border-line/80 bg-surface px-4 py-10 text-center text-sm text-ink-muted">
                  {mode === "zh"
                    ? "请填写媒体链接后在此预览"
                    : "Enter a media URL to preview here"}
                </div>
              ) : null}
            </div>
          </div>
        </motion.aside>
      </div>
    </div>
  );
}
