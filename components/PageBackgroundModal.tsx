"use client";

import { useSiteContent } from "@/context/SiteContentProvider";
import { useLanguageMode } from "@/context/LanguageModeProvider";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import {
  DEFAULT_PAGE_BACKGROUND_IMAGE,
  defaultPageBackground,
} from "@/lib/page-background";
import type { PageBackgroundKind, PageBackgroundSettings } from "@/lib/types";
import { uploadAssetFile } from "@/lib/upload-asset-client";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useId, useRef, useState } from "react";

const MODE_OPTIONS: Array<{
  kind: PageBackgroundKind;
  zh: { title: string; desc: string };
  en: { title: string; desc: string };
}> = [
  {
    kind: "theme",
    zh: { title: "跟随主题", desc: "纯色纸面背景，与左下角主题色一致" },
    en: { title: "Follow theme", desc: "Solid paper background matching your theme" },
  },
  {
    kind: "image",
    zh: { title: "自定义图片", desc: "完整展示整张图片（不裁剪），建议 1920×1080 横图" },
    en: { title: "Custom image", desc: "Shows the full image without cropping; 1920×1080 wide recommended" },
  },
  {
    kind: "mesh",
    zh: { title: "轻柔流光", desc: "浅色缓慢渐变氛围，克制专业，无需上传" },
    en: { title: "Soft gradient", desc: "Subtle professional motion, no upload needed" },
  },
];

function cloneBg(bg: PageBackgroundSettings): PageBackgroundSettings {
  return structuredClone(bg);
}

export function PageBackgroundModal() {
  const {
    site,
    updatePageBackground,
    pageBackgroundModalOpen,
    closePageBackgroundModal,
    canEdit,
    editPermissionLoaded,
  } = useSiteContent();
  const { mode } = useLanguageMode();
  const titleId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<PageBackgroundSettings>(
    site.pageBackground ?? defaultPageBackground,
  );
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");

  useEffect(() => {
    if (pageBackgroundModalOpen) {
      setDraft(cloneBg(site.pageBackground ?? defaultPageBackground));
      setUploadMessage("");
    }
  }, [pageBackgroundModalOpen, site.pageBackground]);

  useEffect(() => {
    if (editPermissionLoaded && !canEdit) closePageBackgroundModal();
  }, [canEdit, editPermissionLoaded, closePageBackgroundModal]);

  useBodyScrollLock(pageBackgroundModalOpen);

  useEffect(() => {
    if (!pageBackgroundModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePageBackgroundModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pageBackgroundModalOpen, closePageBackgroundModal]);

  if (!canEdit) return null;

  const i18n = {
    title: mode === "zh" ? "页面背景" : "Page background",
    subtitle:
      mode === "zh"
        ? "固定铺满浏览器窗口，滚动首页/履历/作品时背景保持一致。"
        : "Fixed to the viewport so the backdrop stays consistent while scrolling.",
    imageUrl: mode === "zh" ? "图片地址" : "Image URL",
    upload: mode === "zh" ? "从本地上传" : "Upload from device",
    uploading: mode === "zh" ? "上传中…" : "Uploading…",
    strength: mode === "zh" ? "背景明显度" : "Background visibility",
    strengthHint:
      mode === "zh"
        ? "数值越大背景图越清晰；建议 25–45 以保证文字可读。"
        : "Higher values show more of the image; 25–45 keeps text readable.",
    cancel: mode === "zh" ? "取消" : "Cancel",
    save: mode === "zh" ? "保存" : "Save",
  };

  const setKind = (kind: PageBackgroundKind) => {
    if (kind === "theme") {
      setDraft({ kind: "theme" });
      return;
    }
    if (kind === "mesh") {
      setDraft({ kind: "mesh" });
      return;
    }
    setDraft({
      kind: "image",
      imageUrl: draft.kind === "image" && draft.imageUrl
        ? draft.imageUrl
        : DEFAULT_PAGE_BACKGROUND_IMAGE,
      imageStrength:
        draft.kind === "image" && draft.imageStrength != null
          ? draft.imageStrength
          : 32,
    });
  };

  const onUpload = async (file: File) => {
    setUploadBusy(true);
    setUploadMessage("");
    try {
      const data = await uploadAssetFile(file, { locale: mode });
      setDraft({
        kind: "image",
        imageUrl: data.url ?? "",
        imageStrength:
          draft.kind === "image" && draft.imageStrength != null
            ? draft.imageStrength
            : 32,
      });
      setUploadMessage(mode === "zh" ? "上传成功" : "Upload complete");
    } catch (e) {
      setUploadMessage(
        e instanceof Error && e.message
          ? e.message
          : mode === "zh"
            ? "上传失败，请稍后重试。"
            : "Upload failed. Please retry.",
      );
    } finally {
      setUploadBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const save = () => {
    updatePageBackground(draft);
    closePageBackgroundModal();
  };

  return (
    <AnimatePresence>
      {pageBackgroundModalOpen ? (
        <motion.div
          className="fixed inset-0 z-[88] flex items-end justify-center print:hidden sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label={mode === "zh" ? "关闭" : "Close"}
            className="absolute inset-0 bg-ink/35 backdrop-blur-[2px]"
            onClick={closePageBackgroundModal}
          />
          <motion.div
            role="dialog"
            aria-modal
            aria-labelledby={titleId}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            className="relative z-[89] flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-line bg-surface shadow-2xl sm:max-h-[88vh] sm:rounded-3xl"
          >
            <div className="shrink-0 border-b border-line px-6 py-4">
              <h2
                id={titleId}
                className="text-lg font-semibold tracking-[-0.02em]"
              >
                {i18n.title}
              </h2>
              <p className="mt-1 text-xs text-ink-muted">{i18n.subtitle}</p>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
              <div className="flex flex-col gap-2">
                {MODE_OPTIONS.map((opt) => {
                  const copy = opt[mode];
                  const selected = draft.kind === opt.kind;
                  return (
                    <button
                      key={opt.kind}
                      type="button"
                      onClick={() => setKind(opt.kind)}
                      className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
                        selected
                          ? "border-[rgb(var(--selection)/0.35)] bg-[rgb(var(--selection)/0.08)]"
                          : "border-line bg-paper/70 hover:border-ink/15"
                      }`}
                    >
                      <p className="text-sm font-medium text-ink">{copy.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
                        {copy.desc}
                      </p>
                    </button>
                  );
                })}
              </div>

              {draft.kind === "image" ? (
                <div className="space-y-3 rounded-2xl border border-line bg-paper/80 p-4">
                  <label className="flex flex-col gap-1.5 text-sm">
                    <span className="font-medium">{i18n.imageUrl}</span>
                    <input
                      value={draft.imageUrl ?? ""}
                      onChange={(e) =>
                        setDraft({
                          kind: "image",
                          imageUrl: e.target.value,
                          imageStrength: draft.imageStrength ?? 32,
                        })
                      }
                      className="rounded-xl border border-line bg-surface px-3 py-2.5 font-mono text-[12px] outline-none focus:border-ink/20"
                    />
                  </label>
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        void onUpload(f);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadBusy}
                      className="rounded-full border border-line bg-surface/90 px-3 py-2 text-xs font-medium text-ink-muted transition-colors hover:border-ink/20 hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {uploadBusy ? i18n.uploading : i18n.upload}
                    </button>
                    {uploadMessage ? (
                      <p className="mt-2 text-xs text-ink-muted">{uploadMessage}</p>
                    ) : null}
                  </div>
                  <label className="flex flex-col gap-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{i18n.strength}</span>
                      <span className="tabular-nums text-xs text-ink-muted">
                        {draft.imageStrength ?? 32}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={100}
                      value={draft.imageStrength ?? 32}
                      onChange={(e) =>
                        setDraft({
                          kind: "image",
                          imageUrl: draft.imageUrl ?? DEFAULT_PAGE_BACKGROUND_IMAGE,
                          imageStrength: Number(e.target.value),
                        })
                      }
                      className="w-full accent-[rgb(var(--selection))]"
                    />
                    <p className="text-xs text-ink-muted">{i18n.strengthHint}</p>
                  </label>
                </div>
              ) : null}
            </div>

            <div className="flex shrink-0 gap-2 border-t border-line bg-surface px-6 py-4">
              <button
                type="button"
                onClick={closePageBackgroundModal}
                className="flex-1 rounded-full border border-line py-3 text-sm font-medium text-ink-muted hover:bg-ink/[0.04]"
              >
                {i18n.cancel}
              </button>
              <button
                type="button"
                onClick={save}
                className="flex-1 rounded-full bg-ink py-3 text-sm font-medium text-white hover:opacity-90"
              >
                {i18n.save}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
