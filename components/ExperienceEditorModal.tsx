"use client";

import { RepresentativeProjectsFields } from "@/components/RepresentativeProjectsFields";
import { useSiteContent } from "@/context/SiteContentProvider";
import type { ExperienceItem } from "@/lib/types";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useId, useMemo, useState } from "react";

function cloneExp(e: ExperienceItem): ExperienceItem {
  return structuredClone(e);
}

type Props = {
  open: boolean;
  experienceId: string | null;
  onClose: () => void;
};

export function ExperienceEditorModal({
  open,
  experienceId,
  onClose,
}: Props) {
  const { site, updateExperienceItem, canEdit, editPermissionLoaded } =
    useSiteContent();

  useEffect(() => {
    if (editPermissionLoaded && !canEdit) onClose();
  }, [canEdit, editPermissionLoaded, onClose]);
  const titleId = useId();
  const [draft, setDraft] = useState<ExperienceItem | null>(null);

  const experienceList = Array.isArray(site.experience)
    ? site.experience
    : [];

  const source = useMemo(() => {
    if (!experienceId) return null;
    return experienceList.find((e) => e.id === experienceId) ?? null;
  }, [experienceId, experienceList]);

  useEffect(() => {
    if (!open || !source) {
      setDraft(null);
      return;
    }
    setDraft(cloneExp(source));
  }, [open, source]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!canEdit) return null;

  const save = () => {
    if (!draft || !experienceId) return;
    updateExperienceItem(experienceId, draft);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && draft ? (
        <motion.div
          className="fixed inset-0 z-[85] flex items-end justify-center print:hidden sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="关闭"
            className="absolute inset-0 bg-ink/35 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal
            aria-labelledby={titleId}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            className="relative z-[86] flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-line bg-surface shadow-2xl sm:max-h-[88vh] sm:rounded-3xl"
          >
            <div className="shrink-0 border-b border-line px-6 py-4">
              <h2
                id={titleId}
                className="text-lg font-semibold tracking-[-0.02em]"
              >
                编辑工作经历
              </h2>
              <p className="mt-1 text-xs text-ink-muted">
                保存后写入本机浏览器。代表项目可在履历详情中点击查看媒体。
              </p>
            </div>
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">职位</span>
                <input
                  value={draft.title}
                  onChange={(e) =>
                    setDraft({ ...draft, title: e.target.value })
                  }
                  className="rounded-xl border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink/20"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">工作时间</span>
                <input
                  value={draft.period}
                  onChange={(e) =>
                    setDraft({ ...draft, period: e.target.value })
                  }
                  className="rounded-xl border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink/20"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">公司 / 团队</span>
                <input
                  value={draft.subtitle}
                  onChange={(e) =>
                    setDraft({ ...draft, subtitle: e.target.value })
                  }
                  className="rounded-xl border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink/20"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">简介</span>
                <textarea
                  value={draft.summary ?? ""}
                  onChange={(e) =>
                    setDraft({ ...draft, summary: e.target.value })
                  }
                  rows={2}
                  className="resize-none rounded-xl border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink/20"
                />
              </label>
              <div>
                <p className="mb-2 text-sm font-medium">关键成果（每行一条）</p>
                <textarea
                  value={draft.keyResults.join("\n")}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      keyResults: e.target.value
                        .split("\n")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  rows={5}
                  className="w-full resize-none rounded-xl border border-line bg-paper px-3 py-2.5 font-mono text-[13px] outline-none focus:border-ink/20"
                />
              </div>
              <RepresentativeProjectsFields
                projects={draft.representativeProjects}
                onChange={(list) =>
                  setDraft({ ...draft, representativeProjects: list })
                }
              />
            </div>
            <div className="flex shrink-0 gap-2 border-t border-line bg-surface px-6 py-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-full border border-line py-3 text-sm font-medium text-ink-muted hover:bg-ink/[0.04]"
              >
                取消
              </button>
              <button
                type="button"
                onClick={save}
                className="flex-1 rounded-full bg-ink py-3 text-sm font-medium text-white hover:opacity-90"
              >
                保存
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
