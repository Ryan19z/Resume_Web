"use client";

import { useSiteContent } from "@/context/SiteContentProvider";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import type { HeroCopy } from "@/lib/types";
import { AnimatePresence, motion } from "framer-motion";
import type { ChangeEvent } from "react";
import { useEffect, useId, useState } from "react";

const MAX_FILE_BYTES = 650_000;
const MAX_PAGE_BG_BYTES = 900_000;

export function ProfileSetupModal() {
  const { setupModalOpen, dismissSetupModal, updateProfile, site } =
    useSiteContent();
  const [name, setName] = useState(site.name);
  const [tagline, setTagline] = useState(site.tagline);
  const [targetRole, setTargetRole] = useState(site.targetRole);
  const [hl0, setHl0] = useState(site.heroPreviewLines[0] ?? "");
  const [hl1, setHl1] = useState(site.heroPreviewLines[1] ?? "");
  const [hl2, setHl2] = useState(site.heroPreviewLines[2] ?? "");
  const [contactEmail, setContactEmail] = useState(site.contactEmail ?? "");
  const [contactExtra, setContactExtra] = useState(site.contactExtra ?? "");
  const [portraitUrl, setPortraitUrl] = useState(site.heroPortraitSrc ?? "");
  const [heroCopy, setHeroCopy] = useState<HeroCopy>(site.heroCopy);
  const [fileHint, setFileHint] = useState<string | null>(null);
  const [pageBgUrl, setPageBgUrl] = useState(
    () => site.pageBackgroundImageSrc?.trim() ?? "",
  );
  const [pageBgOpacity, setPageBgOpacity] = useState(() => {
    const o = site.pageBackgroundImageOpacity;
    return typeof o === "number" && Number.isFinite(o)
      ? Math.min(1, Math.max(0, o))
      : 0.18;
  });
  const [pageBgFileHint, setPageBgFileHint] = useState<string | null>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!setupModalOpen) return;
    setName(site.name);
    setTagline(site.tagline);
    setTargetRole(site.targetRole);
    setHl0(site.heroPreviewLines[0] ?? "");
    setHl1(site.heroPreviewLines[1] ?? "");
    setHl2(site.heroPreviewLines[2] ?? "");
    setContactEmail(site.contactEmail ?? "");
    setContactExtra(site.contactExtra ?? "");
    setPortraitUrl(site.heroPortraitSrc ?? "");
    setHeroCopy(site.heroCopy);
    setFileHint(null);
    setPageBgUrl(site.pageBackgroundImageSrc?.trim() ?? "");
    const op = site.pageBackgroundImageOpacity;
    setPageBgOpacity(
      typeof op === "number" && Number.isFinite(op)
        ? Math.min(1, Math.max(0, op))
        : 0.18,
    );
    setPageBgFileHint(null);
  }, [
    setupModalOpen,
    site.name,
    site.tagline,
    site.targetRole,
    site.heroPreviewLines,
    site.contactEmail,
    site.contactExtra,
    site.heroPortraitSrc,
    site.heroCopy,
    site.pageBackgroundImageSrc,
    site.pageBackgroundImageOpacity,
  ]);

  useBodyScrollLock(setupModalOpen);

  useEffect(() => {
    if (!setupModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismissSetupModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setupModalOpen, dismissSetupModal]);

  const onPickFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setFileHint("请选择图片文件");
      return;
    }
    if (f.size > MAX_FILE_BYTES) {
      setFileHint("图片过大，请压缩到约 600KB 以内或使用图床链接");
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => {
      setFileHint("读取图片失败，请换一张图片或改用图床链接");
    };
    reader.onload = () => {
      const r = reader.result;
      if (typeof r === "string") {
        setPortraitUrl(r);
        setFileHint("已读入本地预览（将存入浏览器，勿用超大图）");
      } else {
        setFileHint("读取图片失败，请重试");
      }
    };
    reader.readAsDataURL(f);
  };

  const onPickPageBgFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setPageBgFileHint("请选择图片文件");
      return;
    }
    if (f.size > MAX_PAGE_BG_BYTES) {
      setPageBgFileHint("背景图过大，请压缩到约 900KB 以内或使用图床链接");
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => {
      setPageBgFileHint("读取背景图失败，请换一张图片或改用图床链接");
    };
    reader.onload = () => {
      const r = reader.result;
      if (typeof r === "string") {
        setPageBgUrl(r);
        setPageBgFileHint("已读入本地预览（将存入浏览器）");
      } else {
        setPageBgFileHint("读取背景图失败，请重试");
      }
    };
    reader.readAsDataURL(f);
  };

  return (
    <AnimatePresence>
      {setupModalOpen ? (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end justify-center print:hidden sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          <button
            type="button"
            aria-label="关闭"
            className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]"
            onClick={dismissSetupModal}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
            initial={{ y: 48, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 32, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 32, mass: 0.85 }}
            className="relative z-[81] max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-line bg-surface p-8 shadow-[0_-8px_40px_rgba(0,0,0,0.08)] sm:max-h-[85vh] sm:rounded-3xl"
          >
            <p
              id={descId}
              className="mb-1 text-[13px] font-medium uppercase tracking-[0.2em] text-ink-muted"
            >
              自定义展示
            </p>
            <h2
              id={titleId}
              className="mb-6 text-2xl font-semibold tracking-[-0.03em]"
            >
              填写第一页信息
            </h2>
            <div className="flex flex-col gap-5">
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium text-ink">姓名</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-xl border border-line bg-paper px-4 py-3 text-base outline-none ring-0 transition-shadow focus:border-ink/25 focus:shadow-[0_0_0_3px_rgba(0,0,0,0.06)]"
                  placeholder="你的名字"
                  maxLength={40}
                  autoComplete="name"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium text-ink">正在做的事（一句话）</span>
                <textarea
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  rows={3}
                  className="resize-none rounded-xl border border-line bg-paper px-4 py-3 text-base leading-relaxed outline-none transition-shadow focus:border-ink/25 focus:shadow-[0_0_0_3px_rgba(0,0,0,0.06)]"
                  placeholder="例如：专注产品与前端体验的独立开发者。"
                  maxLength={160}
                />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium text-ink">意向岗位（首屏突出）</span>
                <input
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="rounded-xl border border-line bg-paper px-4 py-3 text-base outline-none transition-shadow focus:border-ink/25 focus:shadow-[0_0_0_3px_rgba(0,0,0,0.06)]"
                  placeholder="如：资深前端工程师 / 产品经理（实习）"
                  maxLength={80}
                />
              </label>
              <div className="rounded-xl border border-line bg-paper/60 p-4">
                <p className="mb-2 text-sm font-medium text-ink">整页背景图</p>
                <p className="mb-3 text-[11px] leading-relaxed text-ink-muted">
                  叠在主题纸色之上，可单独调透明度；留空并保存则仅保留素色背景。
                  现在会优先保留原图清晰度（不再强制放大），并自动叠加柔和渐变底层。
                  建议用<strong className="text-ink/80">横向宽幅</strong>图，例如约{" "}
                  <strong className="text-ink/80">1920×1080</strong> 或{" "}
                  <strong className="text-ink/80">2400×1350</strong>（16:9），
                  单张体积建议约 500KB～1MB（WebP/JPEG）以免拖慢滚动。
                </p>
                <label className="mb-3 flex flex-col gap-1.5 text-xs text-ink-muted">
                  <span className="font-medium text-ink">图片地址（HTTPS 或本地上传）</span>
                  <input
                    value={pageBgUrl}
                    onChange={(e) => setPageBgUrl(e.target.value)}
                    className="rounded-lg border border-line bg-surface px-3 py-2 font-mono text-[11px] text-ink outline-none focus:border-ink/20"
                    placeholder="https://... 或留空"
                  />
                </label>
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <label className="cursor-pointer rounded-full border border-line bg-surface px-4 py-2 text-xs font-medium text-ink-muted transition-colors hover:border-ink/15 hover:text-ink">
                    上传背景图
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={onPickPageBgFile}
                    />
                  </label>
                  {pageBgUrl ? (
                    <button
                      type="button"
                      className="text-xs text-ink-muted underline decoration-line hover:text-ink"
                      onClick={() => {
                        setPageBgUrl("");
                        setPageBgFileHint(null);
                      }}
                    >
                      清除背景图
                    </button>
                  ) : null}
                </div>
                {pageBgFileHint ? (
                  <p className="mb-3 text-[11px] text-ink-muted">{pageBgFileHint}</p>
                ) : null}
                <label className="flex flex-col gap-2 text-xs text-ink-muted">
                  <span className="font-medium text-ink">
                    背景图透明度：{Math.round(pageBgOpacity * 100)}%
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(pageBgOpacity * 100)}
                    onChange={(e) =>
                      setPageBgOpacity(
                        Math.min(1, Math.max(0, Number(e.target.value) / 100)),
                      )
                    }
                    className="w-full accent-ink"
                  />
                </label>
              </div>
              <div className="rounded-xl border border-line bg-paper/60 p-4">
                <p className="mb-3 text-sm font-medium text-ink">首屏三条要点</p>
                <div className="flex flex-col gap-2">
                  <input
                    value={hl0}
                    onChange={(e) => setHl0(e.target.value)}
                    className="rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-ink/20"
                    placeholder="要点一"
                    maxLength={120}
                  />
                  <input
                    value={hl1}
                    onChange={(e) => setHl1(e.target.value)}
                    className="rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-ink/20"
                    placeholder="要点二"
                    maxLength={120}
                  />
                  <input
                    value={hl2}
                    onChange={(e) => setHl2(e.target.value)}
                    className="rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-ink/20"
                    placeholder="要点三"
                    maxLength={120}
                  />
                </div>
              </div>
              <div className="rounded-xl border border-line bg-paper/60 p-4">
                <p className="mb-3 text-sm font-medium text-ink">页脚联系（展示在页面最底部）</p>
                <label className="mb-3 flex flex-col gap-1.5 text-xs text-ink-muted">
                  <span className="font-medium text-ink">邮箱</span>
                  <input
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="rounded-lg border border-line bg-surface px-3 py-2 font-mono text-[12px] outline-none focus:border-ink/20"
                    placeholder="hello@qq.com"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs text-ink-muted">
                  <span className="font-medium text-ink">其它（可选，一行）</span>
                  <input
                    value={contactExtra}
                    onChange={(e) => setContactExtra(e.target.value)}
                    className="rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-ink/20"
                    placeholder="如：微信 YourID · 仅作展示"
                    maxLength={120}
                  />
                </label>
              </div>
              <div className="rounded-xl border border-dashed border-line/90 bg-paper/50 p-4">
                <p className="mb-3 text-sm font-medium text-ink">首页其他文案</p>
                <div className="flex flex-col gap-3">
                  <label className="flex flex-col gap-1.5 text-xs text-ink-muted">
                    <span className="font-medium text-ink">左上角小标题</span>
                    <input
                      value={heroCopy.eyebrow}
                      onChange={(e) =>
                        setHeroCopy((h) => ({ ...h, eyebrow: e.target.value }))
                      }
                      className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-ink/20"
                      maxLength={40}
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 text-xs text-ink-muted">
                    <span className="font-medium text-ink">左下角滑动提示</span>
                    <input
                      value={heroCopy.swipeHint}
                      onChange={(e) =>
                        setHeroCopy((h) => ({ ...h, swipeHint: e.target.value }))
                      }
                      className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-ink/20"
                      maxLength={80}
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 text-xs text-ink-muted">
                    <span className="font-medium text-ink">形象照下方说明</span>
                    <input
                      value={heroCopy.portraitCaption}
                      onChange={(e) =>
                        setHeroCopy((h) => ({
                          ...h,
                          portraitCaption: e.target.value,
                        }))
                      }
                      className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-ink/20"
                      maxLength={80}
                    />
                  </label>
                </div>
              </div>
              <div className="rounded-xl border border-line bg-paper/80 p-4">
                <p className="mb-2 text-sm font-medium text-ink">右侧形象照</p>
                <label className="mb-3 flex flex-col gap-1.5 text-xs text-ink-muted">
                  <span className="font-medium text-ink">选图说明（给访客/自己的提醒，可长期修改）</span>
                  <textarea
                    value={heroCopy.portraitGuidance}
                    onChange={(e) =>
                      setHeroCopy((h) => ({
                        ...h,
                        portraitGuidance: e.target.value,
                      }))
                    }
                    rows={4}
                    className="resize-y rounded-lg border border-line bg-surface px-3 py-2 text-[11px] leading-relaxed outline-none focus:border-ink/20"
                  />
                </label>
                <label className="flex flex-col gap-2 text-xs text-ink-muted">
                  图片链接（推荐图床 HTTPS）
                  <input
                    value={portraitUrl}
                    onChange={(e) => setPortraitUrl(e.target.value)}
                    className="rounded-lg border border-line bg-surface px-3 py-2 font-mono text-[11px] text-ink outline-none focus:border-ink/20"
                    placeholder="https://..."
                  />
                </label>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <label className="cursor-pointer rounded-full border border-line bg-surface px-4 py-2 text-xs font-medium text-ink-muted transition-colors hover:border-ink/15 hover:text-ink">
                    上传小图
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={onPickFile}
                    />
                  </label>
                  {portraitUrl ? (
                    <button
                      type="button"
                      className="text-xs text-ink-muted underline decoration-line hover:text-ink"
                      onClick={() => setPortraitUrl("")}
                    >
                      清除形象照
                    </button>
                  ) : null}
                </div>
                {fileHint ? (
                  <p className="mt-2 text-[11px] text-ink-muted">{fileHint}</p>
                ) : null}
              </div>
            </div>
            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={dismissSetupModal}
                className="rounded-full px-5 py-3 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
              >
                稍后再说
              </button>
              <button
                type="button"
                onClick={() =>
                  updateProfile(name, tagline, portraitUrl, {
                    eyebrow: heroCopy.eyebrow.trim(),
                    swipeHint: heroCopy.swipeHint.trim(),
                    portraitCaption: heroCopy.portraitCaption.trim(),
                    portraitGuidance: heroCopy.portraitGuidance.trim(),
                  }, {
                    targetRole: targetRole.trim(),
                    heroPreviewLines: [hl0, hl1, hl2],
                    contactEmail: contactEmail.trim(),
                    contactExtra: contactExtra.trim(),
                    pageBackgroundImageSrc: pageBgUrl,
                    pageBackgroundImageOpacity: pageBgOpacity,
                  })
                }
                className="rounded-full bg-ink px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                保存并继续
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
