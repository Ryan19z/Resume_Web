"use client";

import { useSiteContent } from "@/context/SiteContentProvider";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import type { HeroAsideMode, HeroCopy, HeroPortrait } from "@/lib/types";
import { resolveHeroAsideMode } from "@/lib/hero-page-utils";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useId, useState } from "react";

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
  const [contactPhone, setContactPhone] = useState(site.contactPhone ?? "");
  const [contactExtra, setContactExtra] = useState(site.contactExtra ?? "");
  const [heroCopy, setHeroCopy] = useState<HeroCopy>(site.heroCopy);
  const [heroAsideMode, setHeroAsideMode] = useState<HeroAsideMode>(() =>
    resolveHeroAsideMode(site.heroAsideMode),
  );
  const [portraitUrl, setPortraitUrl] = useState(site.heroPortrait?.url ?? "");
  const [portraitCaption, setPortraitCaption] = useState(
    site.heroPortrait?.caption ?? "",
  );
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
    setContactPhone(site.contactPhone ?? "");
    setContactExtra(site.contactExtra ?? "");
    setHeroCopy(site.heroCopy);
    setHeroAsideMode(resolveHeroAsideMode(site.heroAsideMode));
    setPortraitUrl(site.heroPortrait?.url ?? "");
    setPortraitCaption(site.heroPortrait?.caption ?? "");
  }, [
    setupModalOpen,
    site.name,
    site.tagline,
    site.targetRole,
    site.heroPreviewLines,
    site.contactEmail,
    site.contactPhone,
    site.contactExtra,
    site.heroCopy,
    site.heroAsideMode,
    site.heroPortrait,
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
                <label className="mb-3 flex flex-col gap-1.5 text-xs text-ink-muted">
                  <span className="font-medium text-ink">电话</span>
                  <input
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="rounded-lg border border-line bg-surface px-3 py-2 font-mono text-[12px] outline-none focus:border-ink/20"
                    placeholder="13800000000"
                    maxLength={40}
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs text-ink-muted">
                  <span className="font-medium text-ink">社媒账号（可选，多个用“|”或换行分隔）</span>
                  <textarea
                    value={contactExtra}
                    onChange={(e) => setContactExtra(e.target.value)}
                    rows={3}
                    className="resize-y rounded-lg border border-line bg-surface px-3 py-2 text-sm leading-relaxed outline-none focus:border-ink/20"
                    placeholder="Instagram: your_ins | LinkedIn: your_linkedin | 微信: your_wechat"
                    maxLength={260}
                  />
                </label>
              </div>
              <div className="rounded-xl border border-line bg-paper/60 p-4">
                <p className="mb-1 text-sm font-medium text-ink">首屏右侧展示</p>
                <p className="mb-3 text-xs leading-relaxed text-ink-muted">
                  可选择重点作品展示窗、个人证件照，或不展示。未上传内容时，访客不会看到空白区域。
                </p>
                <div className="mb-3 flex flex-wrap gap-2">
                  {(
                    [
                      ["showcase", "重点展示"],
                      ["portrait", "证件照"],
                      ["hidden", "不展示"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setHeroAsideMode(value)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                        heroAsideMode === value
                          ? "border-ink/25 bg-ink/[0.06] text-ink"
                          : "border-line bg-surface text-ink-muted hover:border-ink/20"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {heroAsideMode === "portrait" ? (
                  <div className="flex flex-col gap-2">
                    <input
                      value={portraitUrl}
                      onChange={(e) => setPortraitUrl(e.target.value)}
                      className="rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-ink/20"
                      placeholder="证件照图片链接"
                    />
                    <input
                      value={portraitCaption}
                      onChange={(e) => setPortraitCaption(e.target.value)}
                      className="rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-ink/20"
                      placeholder="照片说明（可选）"
                      maxLength={80}
                    />
                    <p className="text-[11px] text-ink-muted">
                      也可回到首页右侧区域上传本地照片并预览。
                    </p>
                  </div>
                ) : null}
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
                </div>
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
                  updateProfile(name, tagline, {
                    eyebrow: heroCopy.eyebrow.trim(),
                    swipeHint: heroCopy.swipeHint.trim(),
                  }, {
                    targetRole: targetRole.trim(),
                    heroPreviewLines: [hl0, hl1, hl2],
                    contactEmail: contactEmail.trim(),
                    contactPhone: contactPhone.trim(),
                    contactExtra: contactExtra.trim(),
                    heroAsideMode,
                    heroPortrait: {
                      url: portraitUrl.trim(),
                      caption: portraitCaption.trim() || undefined,
                    } satisfies HeroPortrait,
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
