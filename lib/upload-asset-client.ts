import { appendResumeScopeToPath, parseClientResumeScope } from "@/lib/resume-scope";
import {
  documentAcceptList,
  extFromFileName,
  resolveExtFromNameAndMime,
} from "@/lib/upload-mime";

const UPLOAD_TIMEOUT_MS = 10 * 60 * 1000;

export function ensureUploadFileName(file: File): File {
  const ext = resolveExtFromNameAndMime(file.name || "upload", file.type);
  if (!ext) return file;
  if (extFromFileName(file.name || "")) return file;

  return new File([file], `upload${ext}`, {
    type: file.type,
    lastModified: file.lastModified,
  });
}

export type UploadAssetResult = {
  ok?: boolean;
  url?: string;
  fileName?: string;
  message?: string;
};

export function mediaAcceptForKind(
  kind: "image" | "video" | "document",
): string {
  if (kind === "image") return "image/*";
  if (kind === "video") return "video/*";
  return documentAcceptList();
}

async function parseUploadResponse(
  resp: Response,
  locale: "zh" | "en" = "zh",
): Promise<UploadAssetResult> {
  const text = await resp.text();
  let data: UploadAssetResult = {};
  try {
    data = JSON.parse(text) as UploadAssetResult;
  } catch {
    data = {};
  }

  if (resp.ok && data.ok && data.url) return data;

  if (data.message) {
    throw new Error(data.message);
  }

  if (resp.status === 413) {
    throw new Error(
      locale === "zh"
        ? "上传失败：文件超过网关限制（通常是 Nginx client_max_body_size）。请把服务器限制调大到 1024m。"
        : "Upload failed: payload exceeds gateway limit (usually Nginx client_max_body_size). Please raise it to 1024m.",
    );
  }

  if (text.includes("<html") || text.includes("<!DOCTYPE html")) {
    throw new Error(
      locale === "zh"
        ? "上传失败：服务器网关返回了 HTML 错误页（可能是 413/502/504）。请检查 Nginx 上传大小与超时配置。"
        : "Upload failed: gateway returned an HTML error page (possibly 413/502/504). Please check Nginx body-size and timeout settings.",
    );
  }

  throw new Error(
    locale === "zh" ? "上传失败，请稍后重试。" : "Upload failed. Please retry.",
  );
}

export async function uploadAssetFile(
  file: File,
  options?: { locale?: "zh" | "en" },
): Promise<UploadAssetResult> {
  const locale = options?.locale ?? "zh";
  const uploadFile = ensureUploadFileName(file);
  const form = new FormData();
  form.append("file", uploadFile);
  const clientScope = parseClientResumeScope();
  const uploadUrl = appendResumeScopeToPath("/api/upload-asset", clientScope, {
    includeEditToken: true,
    includeViewToken: false,
  });

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
  try {
    const resp = await fetch(uploadUrl, {
      method: "POST",
      body: form,
      signal: controller.signal,
    });
    return await parseUploadResponse(resp, locale);
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new Error(
        locale === "zh"
          ? "上传超时：网络或服务器处理过慢，请稍后重试；若多次出现，请检查 Nginx 超时与反向代理配置。"
          : "Upload timeout: network or server is too slow. Please retry and check Nginx/proxy timeout settings.",
      );
    }
    throw e;
  } finally {
    window.clearTimeout(timeout);
  }
}
