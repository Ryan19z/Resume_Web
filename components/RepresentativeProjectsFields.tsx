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
import {
  mediaAcceptForKind,
  uploadAssetFile,
} from "@/lib/upload-asset-client";
import { useRef, useState } from "react";

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadIdx, setUploadIdx] = useState<number | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");

  const setMedia = (idx: number, media: RepresentativeProjectMedia) => {
    const list = [...projects];
    list[idx] = { ...list[idx], media };
    onChange(list);
  };

  const triggerUpload = (idx: number) => {
    const kind = projects[idx]?.media.kind;
    if (kind !== "image" && kind !== "video" && kind !== "document") return;
    setUploadIdx(idx);
    setUploadMessage("");
    if (fileInputRef.current) {
      fileInputRef.current.accept = mediaAcceptForKind(kind);
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const onUploadFile = async (file: File) => {
    if (uploadIdx === null) return;
    const rp = projects[uploadIdx];
    if (!rp) return;
    const kind = rp.media.kind;
    if (kind !== "image" && kind !== "video" && kind !== "document") return;

    setUploadBusy(true);
    setUploadMessage("");
    try {
      const data = await uploadAssetFile(file);
      if (kind === "document") {
        setMedia(uploadIdx, {
          kind: "document",
          url: data.url ?? "",
          fileName: data.fileName ?? file.name,
        });
      } else {
        setMedia(uploadIdx, { kind, url: data.url ?? "" });
      }
      setUploadMessage("上传成功");
    } catch (e) {
      setUploadMessage(
        e instanceof Error && e.message ? e.message : "上传失败，请稍后重试。",
      );
    } finally {
      setUploadBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
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
              <textarea
                value={rp.description ?? ""}
                onChange={(e) => {
                  const list = [...projects];
                  list[idx] = { ...rp, description: e.target.value };
                  onChange(list);
                }}
                rows={3}
                className="resize-y rounded-lg border border-line bg-surface px-2 py-1.5 text-sm outline-none"
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
                {rp.media.kind === "image" ||
                rp.media.kind === "video" ||
                rp.media.kind === "document" ? (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => triggerUpload(idx)}
                      disabled={uploadBusy && uploadIdx === idx}
                      className="rounded-full border border-line bg-surface/90 px-3 py-2 text-xs font-medium text-ink-muted transition-colors hover:border-ink/20 hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {uploadBusy && uploadIdx === idx
                        ? "上传中…"
                        : "从本地上传"}
                    </button>
                    {uploadIdx === idx && uploadMessage ? (
                      <p className="mt-2 text-xs text-ink-muted">
                        {uploadMessage}
                      </p>
                    ) : null}
                    {rp.media.kind === "video" ? (
                      <p className="mt-1 text-xs text-ink-muted/90">
                        支持常见视频格式，单文件最大 1024MB。
                      </p>
                    ) : null}
                  </div>
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
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          void onUploadFile(f);
        }}
      />
    </div>
  );
}
