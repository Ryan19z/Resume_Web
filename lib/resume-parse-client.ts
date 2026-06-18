import { parseClientResumeScope } from "@/lib/resume-scope";
import type { MappedResumeImport } from "@/lib/resume-parse-mapper";
import type { ParsedResume, ResumeParseMethod } from "@/lib/resume-parse-types";

export type ParseResumeClientResult =
  | {
      ok: true;
      method: ResumeParseMethod;
      llmAvailable: boolean;
      llmProvider: string | null;
      llmModel: string | null;
      llmFallback: boolean;
      parsed: ParsedResume;
      mapped: MappedResumeImport;
      fieldsFilled: string[];
      textLength: number;
      confidence: number;
      warnings?: string[];
    }
  | {
      ok: false;
      message: string;
      error?: string;
    };

function buildParseUrl(scope: ReturnType<typeof parseClientResumeScope>): string {
  const params = new URLSearchParams();
  if (scope.resumeId) params.set("resumeId", scope.resumeId);
  if (scope.editToken) params.set("editToken", scope.editToken);
  const qs = params.toString();
  return `/api/parse-resume${qs ? `?${qs}` : ""}`;
}

export async function parseResumeFile(
  file: File,
  opts?: { preferLlm?: boolean },
): Promise<ParseResumeClientResult> {
  const scope = parseClientResumeScope();
  const url = buildParseUrl(scope);
  if (opts?.preferLlm === false) {
    const u = new URL(url, window.location.origin);
    u.searchParams.set("llm", "0");
    const form = new FormData();
    form.append("file", file);
    const resp = await fetch(u.pathname + u.search, {
      method: "POST",
      body: form,
    });
    return (await resp.json()) as ParseResumeClientResult;
  }

  const form = new FormData();
  form.append("file", file);
  const resp = await fetch(url, { method: "POST", body: form });
  const data = (await resp.json()) as ParseResumeClientResult;
  return data;
}

export async function fetchParseResumeCapabilities(): Promise<{
  llmAvailable: boolean;
  llmProvider: string | null;
  llmModel: string | null;
  supportedFormats: string[];
}> {
  const resp = await fetch("/api/parse-resume", { cache: "no-store" });
  if (!resp.ok) {
    return {
      llmAvailable: false,
      llmProvider: null,
      llmModel: null,
      supportedFormats: [".pdf", ".docx", ".txt"],
    };
  }
  const data = (await resp.json()) as {
    llmAvailable?: boolean;
    llmProvider?: string | null;
    llmModel?: string | null;
    supportedFormats?: string[];
  };
  return {
    llmAvailable: Boolean(data.llmAvailable),
    llmProvider: data.llmProvider ?? null,
    llmModel: data.llmModel ?? null,
    supportedFormats: data.supportedFormats ?? [".pdf", ".docx", ".txt"],
  };
}
