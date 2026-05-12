"use client";

import { RepresentativeProjectsFields } from "@/components/RepresentativeProjectsFields";
import type { AchievementBlock, EducationItem } from "@/lib/types";
import { useCallback, useEffect, useState } from "react";

function clone(items: EducationItem[]) {
  return structuredClone(items);
}

function emptyBlock(): AchievementBlock {
  return { heading: "新分组", bullets: [""] };
}

type Props = {
  open: boolean;
  items: EducationItem[];
  onSave: (next: EducationItem[]) => void;
  onClose: () => void;
};

export function EducationEditorPanel({
  open,
  items,
  onSave,
  onClose,
}: Props) {
  const [draft, setDraft] = useState<EducationItem[]>(() => clone(items));

  useEffect(() => {
    if (open) setDraft(clone(items));
  }, [open, items]);

  const reset = useCallback(() => {
    setDraft(clone(items));
  }, [items]);

  if (!open) return null;

  const updateEdu = (index: number, patch: Partial<EducationItem>) => {
    setDraft((d) => {
      const next = [...d];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const updateBlock = (
    ei: number,
    bi: number,
    patch: Partial<AchievementBlock>,
  ) => {
    setDraft((d) => {
      const next = clone(d);
      const blocks = [...next[ei].campusHighlights];
      blocks[bi] = { ...blocks[bi], ...patch };
      next[ei] = { ...next[ei], campusHighlights: blocks };
      return next;
    });
  };

  const addBlock = (ei: number) => {
    setDraft((d) => {
      const next = clone(d);
      next[ei] = {
        ...next[ei],
        campusHighlights: [...next[ei].campusHighlights, emptyBlock()],
      };
      return next;
    });
  };

  const removeBlock = (ei: number, bi: number) => {
    setDraft((d) => {
      const next = clone(d);
      next[ei] = {
        ...next[ei],
        campusHighlights: next[ei].campusHighlights.filter((_, i) => i !== bi),
      };
      return next;
    });
  };

  return (
    <div className="mb-14 rounded-3xl border border-line bg-surface/80 p-6 shadow-[0_1px_0_rgba(0,0,0,0.04)] print:hidden">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold tracking-[-0.02em]">
          编辑教育背景
        </h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              reset();
              onClose();
            }}
            className="rounded-full border border-line px-4 py-2 text-xs font-medium text-ink-muted hover:bg-ink/[0.04]"
          >
            取消
          </button>
          <button
            type="button"
              onClick={() => {
              const cleaned = draft.map((e) => ({
                ...e,
                summary: e.summary?.trim() || undefined,
                campusHighlights: e.campusHighlights
                  .map((b) => ({
                    heading: b.heading.trim(),
                    bullets: b.bullets.map((x) => x.trim()).filter(Boolean),
                  }))
                  .filter((b) => b.heading || b.bullets.length),
                representativeProjects: e.representativeProjects.filter((rp) =>
                  rp.title.trim(),
                ),
              }));
              onSave(cleaned);
              onClose();
            }}
            className="rounded-full bg-ink px-4 py-2 text-xs font-medium text-white hover:opacity-90"
          >
            保存
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-10">
        {draft.map((edu, ei) => (
          <div
            key={edu.id}
            className="rounded-2xl border border-line/80 bg-paper/60 p-4 sm:p-5"
          >
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              条目 {ei + 1}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs sm:col-span-2">
                <span className="font-medium text-ink">学历 / 专业（主标题）</span>
                <input
                  value={edu.title}
                  onChange={(e) => updateEdu(ei, { title: e.target.value })}
                  className="rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-ink/20"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-medium text-ink">大学</span>
                <input
                  value={edu.subtitle}
                  onChange={(e) => updateEdu(ei, { subtitle: e.target.value })}
                  className="rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-ink/20"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-medium text-ink">在校时间</span>
                <input
                  value={edu.period}
                  onChange={(e) => updateEdu(ei, { period: e.target.value })}
                  className="rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-ink/20"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs sm:col-span-2">
                <span className="font-medium text-ink">
                  详情页顶部介绍（可选）
                </span>
                <textarea
                  value={edu.summary ?? ""}
                  onChange={(e) =>
                    updateEdu(ei, { summary: e.target.value || undefined })
                  }
                  rows={2}
                  placeholder="进入「校园成果」详情时显示在分组要点上方"
                  className="resize-y rounded-xl border border-line bg-surface px-3 py-2 text-sm leading-relaxed outline-none focus:border-ink/20"
                />
              </label>
            </div>
            <div className="mt-6">
              <RepresentativeProjectsFields
                sectionTitle="校园成果展示（图片 / 视频 / 代码）"
                projects={edu.representativeProjects}
                onChange={(list) =>
                  updateEdu(ei, { representativeProjects: list })
                }
              />
            </div>
            <div className="mt-5 border-t border-line/80 pt-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-ink-muted">
                  校园成果分组
                </span>
                <button
                  type="button"
                  onClick={() => addBlock(ei)}
                  className="text-xs font-medium text-ink-muted hover:text-ink"
                >
                  + 分组
                </button>
              </div>
              <div className="flex flex-col gap-4">
                {edu.campusHighlights.map((block, bi) => (
                  <div
                    key={`${ei}-${bi}-${block.heading}`}
                    className="rounded-xl border border-line bg-surface p-3"
                  >
                    <div className="mb-2 flex justify-between gap-2">
                      <input
                        value={block.heading}
                        onChange={(e) =>
                          updateBlock(ei, bi, { heading: e.target.value })
                        }
                        className="flex-1 rounded-lg border border-line px-2 py-1.5 text-sm font-medium outline-none"
                        placeholder="分组标题"
                      />
                      <button
                        type="button"
                        className="text-xs text-red-600/80 hover:text-red-600"
                        onClick={() => removeBlock(ei, bi)}
                      >
                        删分组
                      </button>
                    </div>
                    <label className="flex flex-col gap-1 text-xs text-ink-muted">
                      要点（每行一条）
                      <textarea
                        value={block.bullets.join("\n")}
                        onChange={(e) =>
                          updateBlock(ei, bi, {
                            bullets: e.target.value.split("\n"),
                          })
                        }
                        rows={4}
                        className="resize-y rounded-lg border border-line bg-paper px-2 py-1.5 font-mono text-[12px] leading-relaxed outline-none"
                      />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
