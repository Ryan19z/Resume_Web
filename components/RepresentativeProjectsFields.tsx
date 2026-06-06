"use client";

import {
  DEMO_SAMPLE_VIDEO_MP4,
  PLACEHOLDER_IMAGES,
} from "@/lib/media-defaults";
import { newRepresentativeProject } from "@/lib/rep-project";
import type {
  RepresentativeProject,
  RepresentativeProjectMedia,
} from "@/lib/types";

type Props = {
  projects: RepresentativeProject[];
  onChange: (next: RepresentativeProject[]) => void;
  sectionTitle?: string;
};

export function RepresentativeProjectsFields({
  projects,
  onChange,
  sectionTitle = "代表项目",
}: Props) {
  const setMedia = (idx: number, media: RepresentativeProjectMedia) => {
    const list = [...projects];
    list[idx] = { ...list[idx], media };
    onChange(list);
  };

  return (
    <div className="border-t border-line pt-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{sectionTitle}</p>
        <button
          type="button"
          onClick={() => onChange([...projects, newRepresentativeProject()])}
          className="rounded-full border border-line px-3 py-1 text-xs font-medium text-ink-muted hover:border-ink/15 hover:text-ink"
        >
          + 添加
        </button>
      </div>
      <div className="flex flex-col gap-4">
        {projects.map((rp, idx) => (
          <div
            key={rp.id}
            className="rounded-2xl border border-line bg-paper/80 p-4"
          >
            <div className="mb-3 flex justify-between gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                项目 {idx + 1}
              </span>
              <button
                type="button"
                className="text-xs text-red-600/80 hover:text-red-600"
                onClick={() =>
                  onChange(projects.filter((_, i) => i !== idx))
                }
              >
                删除
              </button>
            </div>
            <label className="mb-2 flex flex-col gap-1 text-xs">
              <span>标题</span>
              <input
                value={rp.title}
                onChange={(e) => {
                  const list = [...projects];
                  list[idx] = { ...rp, title: e.target.value };
                  onChange(list);
                }}
                className="rounded-lg border border-line bg-surface px-2 py-1.5 text-sm outline-none"
              />
            </label>
            <label className="mb-2 flex flex-col gap-1 text-xs">
              <span>说明</span>
              <input
                value={rp.description ?? ""}
                onChange={(e) => {
                  const list = [...projects];
                  list[idx] = { ...rp, description: e.target.value };
                  onChange(list);
                }}
                className="rounded-lg border border-line bg-surface px-2 py-1.5 text-sm outline-none"
              />
            </label>
            <label className="mb-2 flex flex-col gap-1 text-xs">
              <span>展示类型</span>
              <select
                value={rp.media.kind}
                onChange={(e) => {
                  const k = e.target.value as RepresentativeProjectMedia["kind"];
                  let media: RepresentativeProjectMedia;
                  if (k === "image")
                    media = {
                      kind: "image",
                      url:
                        rp.media.kind === "image"
                          ? rp.media.url
                          : PLACEHOLDER_IMAGES.wide4,
                    };
                  else if (k === "video")
                    media = {
                      kind: "video",
                      url:
                        rp.media.kind === "video"
                          ? rp.media.url
                          : DEMO_SAMPLE_VIDEO_MP4,
                    };
                  else if (k === "link")
                    media = {
                      kind: "link",
                      url:
                        rp.media.kind === "link"
                          ? rp.media.url
                          : "https://example.com",
                    };
                  else if (k === "document")
                    media = {
                      kind: "document",
                      url:
                        rp.media.kind === "document"
                          ? rp.media.url
                          : "/uploads/your-file.pdf",
                      fileName:
                        rp.media.kind === "document" ? rp.media.fileName : undefined,
                    };
                  else
                    media = {
                      kind: "code",
                      language: "tsx",
                      code:
                        rp.media.kind === "code" ? rp.media.code : "// 在此粘贴代码",
                    };
                  setMedia(idx, media);
                }}
                className="rounded-lg border border-line bg-surface px-2 py-1.5 text-sm outline-none"
              >
                <option value="image">图片</option>
                <option value="video">视频 URL</option>
                <option value="code">代码</option>
                <option value="link">外部链接</option>
                <option value="document">文档</option>
              </select>
            </label>
            {rp.media.kind === "image" ||
            rp.media.kind === "video" ||
            rp.media.kind === "link" ||
            rp.media.kind === "document" ? (
              <label className="flex flex-col gap-1 text-xs">
                <span>
                  {rp.media.kind === "image"
                    ? "图片地址"
                    : rp.media.kind === "video"
                      ? "视频地址"
                      : rp.media.kind === "link"
                        ? "链接地址"
                        : "文档地址"}
                </span>
                <input
                  value={rp.media.url}
                  onChange={(e) =>
                    setMedia(idx, {
                      kind: rp.media.kind,
                      url: e.target.value,
                    } as RepresentativeProjectMedia)
                  }
                  className="rounded-lg border border-line bg-surface px-2 py-1.5 font-mono text-[11px] outline-none"
                />
                {rp.media.kind === "document" ? (
                  <label className="mt-2 flex flex-col gap-1 text-xs">
                    <span>文档名（可选）</span>
                    <input
                      value={rp.media.fileName ?? ""}
                      onChange={(e) =>
                        setMedia(idx, {
                          kind: "document",
                          url: rp.media.kind === "document" ? rp.media.url : "",
                          fileName: e.target.value,
                        })
                      }
                      className="rounded-lg border border-line bg-surface px-2 py-1.5 text-sm outline-none"
                    />
                  </label>
                ) : null}
              </label>
            ) : (
              <>
                <label className="mb-2 flex flex-col gap-1 text-xs">
                  <span>语言标签（可选）</span>
                  <input
                    value={
                      rp.media.kind === "code" ? (rp.media.language ?? "") : ""
                    }
                    onChange={(e) =>
                      setMedia(idx, {
                        kind: "code",
                        code: rp.media.kind === "code" ? rp.media.code : "",
                        language: e.target.value,
                      })
                    }
                    className="rounded-lg border border-line bg-surface px-2 py-1.5 text-sm outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs">
                  <span>代码</span>
                  <textarea
                    value={rp.media.kind === "code" ? rp.media.code : ""}
                    onChange={(e) =>
                      setMedia(idx, {
                        kind: "code",
                        code: e.target.value,
                        language:
                          rp.media.kind === "code" ? rp.media.language : undefined,
                      })
                    }
                    rows={8}
                    className="resize-y rounded-lg border border-line bg-surface px-2 py-1.5 font-mono text-[11px] leading-relaxed outline-none"
                  />
                </label>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
