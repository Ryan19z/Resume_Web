import {
  checkRateLimit,
  rateLimitResponse,
} from "@/lib/server/rate-limit";
import {
  requireFeature,
  requireParseQuota,
} from "@/lib/server/entitlements";
import { resolveEditPermission } from "@/lib/server/resolve-edit-permission";
import { incrementUsage } from "@/lib/server/subscription-store";
import { sanitizeResumeId } from "@/lib/resume-scope";
import { mapParsedResumeToSite } from "@/lib/resume-parse-mapper";
import {
  extractContactsFromText,
  parseResumeHeuristic,
} from "@/lib/server/resume-parse-heuristic";
import {
  autoClassifyResumeContent,
  buildParseQualityWarnings,
  computeParseConfidence,
  enrichParsedResumeAwards,
  reconcileProjectList,
} from "@/lib/server/resume-parse-reconcile";
import {
  getLlmParseMeta,
  isLlmParseAvailable,
  parseResumeWithLlm,
} from "@/lib/server/resume-parse-llm";
import {
  extractResumeText,
  isResumeParseExt,
} from "@/lib/server/resume-text-extract";
import { resolveUploadExtension } from "@/lib/server/upload-asset-store";
import { defaultSiteContent } from "@/lib/default-site-content";
import type { ResumeParseMethod } from "@/lib/resume-parse-types";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_PARSE_BYTES = 15 * 1024 * 1024; // 15MB

export async function POST(request: NextRequest) {
  const limited = checkRateLimit(
    request.headers,
    "parse-resume",
    12,
    60 * 60 * 1000,
  );
  if (!limited.ok) {
    return NextResponse.json(rateLimitResponse(limited.retryAfterSec), {
      status: 429,
      headers: { "Retry-After": String(limited.retryAfterSec) },
    });
  }

  const perm = await resolveEditPermission(request);
  if (!perm.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: perm.code ?? "forbidden",
        message: perm.message || "无编辑权限，无法解析简历。",
      },
      { status: 403 },
    );
  }

  const resumeId = sanitizeResumeId(request.nextUrl.searchParams.get("resumeId"));
  const importQuota = await requireParseQuota(resumeId || undefined, false);
  if (!importQuota.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: importQuota.code,
        message: importQuota.message,
      },
      { status: 403 },
    );
  }

  try {
    const formData = await request.formData();
    const fileValue = formData.get("file");
    if (!(fileValue instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "bad_request", message: "请上传 file 字段。" },
        { status: 400 },
      );
    }

    if (fileValue.size <= 0 || fileValue.size > MAX_PARSE_BYTES) {
      return NextResponse.json(
        {
          ok: false,
          error: "file_too_large",
          message: `文件需在 0–${Math.round(MAX_PARSE_BYTES / 1024 / 1024)}MB 之间。`,
        },
        { status: 413 },
      );
    }

    const ext = resolveUploadExtension(
      fileValue.name || "resume.bin",
      fileValue.type || "",
    );
    if (!ext || !isResumeParseExt(ext)) {
      return NextResponse.json(
        {
          ok: false,
          error: "unsupported_type",
          message: "仅支持 PDF、Word（.doc/.docx）、纯文本（.txt）简历。",
        },
        { status: 415 },
      );
    }

    const buffer = Buffer.from(await fileValue.arrayBuffer());
    let rawText: string;
    try {
      rawText = await extractResumeText(buffer, ext);
    } catch (e) {
      const code = e instanceof Error ? e.message : "extract_failed";
      const message =
        code === "text_too_short"
          ? "未能从文件中提取有效文字，请换 PDF/Word 或检查是否为扫描件（需 OCR）。"
          : code === "unsupported_format"
            ? "不支持的文件格式。"
            : "文件文字提取失败，请确认文件未损坏。";
      return NextResponse.json(
        { ok: false, error: code, message },
        { status: 422 },
      );
    }

    let method: ResumeParseMethod = "heuristic";
    let parsed;
    let confidence = 0.5;
    let warnings: string[] = [];
    let llmAttempted = false;

    const heuristic = parseResumeHeuristic(rawText);
    const heuristicProjects = heuristic.parsed.projects;

    const preferLlmParam = request.nextUrl.searchParams.get("llm") !== "0";
    let preferLlm = preferLlmParam && isLlmParseAvailable();
    if (preferLlm) {
      const aiQuota = await requireParseQuota(resumeId || undefined, true);
      if (!aiQuota.ok) {
        preferLlm = false;
        warnings.push(aiQuota.message);
      }
    }
    if (preferLlm) {
      llmAttempted = true;
      try {
        const llmResult = await parseResumeWithLlm(rawText);
        if (llmResult) {
          parsed = llmResult.parsed;
          confidence = llmResult.confidence;
          method = "llm";
        }
      } catch (e) {
        console.warn("[api/parse-resume] LLM 解析失败，回退规则引擎:", e);
      }
    }

    const llmMeta = getLlmParseMeta();
    const llmFallback = llmAttempted && method !== "llm";

    if (!parsed) {
      parsed = heuristic.parsed;
      confidence = heuristic.confidence;
      warnings = heuristic.warnings;
      method = "heuristic";
      if (llmFallback) {
        warnings = [
          "AI 解析未能完成，已自动改用规则引擎；请重点核对下方字段。",
          ...warnings,
        ];
      }
    } else {
      const projectReconcile = reconcileProjectList(
        parsed.projects,
        heuristicProjects,
      );
      parsed.projects = projectReconcile.projects;
      warnings = buildParseQualityWarnings({
        experience: parsed.experience,
        projects: parsed.projects,
        name: parsed.name,
        educationCount: parsed.education.length,
        method: "llm",
        reconcileWarnings: projectReconcile.warnings,
      });
      confidence = computeParseConfidence(parsed);
      if (warnings.length > 0) {
        confidence = Math.max(
          0.2,
          confidence - Math.min(0.12, warnings.length * 0.03),
        );
      }
    }

    const contactFallback = extractContactsFromText(rawText);
    if (contactFallback.email?.trim()) {
      parsed.contactEmail = contactFallback.email.trim();
    }
    if (contactFallback.phone?.trim()) {
      parsed.contactPhone = contactFallback.phone.trim();
    }
    if (contactFallback.extra?.trim() && !parsed.contactExtra?.trim()) {
      parsed.contactExtra = contactFallback.extra.trim();
    }

    parsed = enrichParsedResumeAwards(parsed, heuristic.parsed.awards ?? []);

    const classified = autoClassifyResumeContent(parsed);
    parsed = classified.parsed;
    if (classified.warnings.length > 0) {
      warnings = [...classified.warnings, ...warnings];
    }
    confidence = computeParseConfidence(parsed);
    if (warnings.length > 0) {
      confidence = Math.max(0.2, confidence - Math.min(0.12, warnings.length * 0.03));
    }

    const mapped = mapParsedResumeToSite(parsed, defaultSiteContent);

    if (mapped.fieldsFilled.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "no_fields",
          message:
            "未能识别有效字段。请确认上传的是文字版简历（非纯图片扫描件），或配置 OPENAI_API_KEY 启用 AI 解析。",
        },
        { status: 422 },
      );
    }

    if (resumeId) {
      await incrementUsage(resumeId, "smartImport");
      if (method === "llm") {
        await incrementUsage(resumeId, "aiParse");
      }
    }

    return NextResponse.json({
      ok: true,
      method,
      llmAvailable: isLlmParseAvailable(),
      llmProvider: method === "llm" ? (llmMeta?.provider ?? null) : null,
      llmModel: method === "llm" ? (llmMeta?.model ?? null) : null,
      llmFallback,
      parsed,
      mapped,
      fieldsFilled: mapped.fieldsFilled,
      textLength: rawText.length,
      confidence,
      warnings,
    });
  } catch (e) {
    console.error("[api/parse-resume]", e);
    return NextResponse.json(
      {
        ok: false,
        error: "server_error",
        message: "简历解析失败，请稍后重试。",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  const llmMeta = getLlmParseMeta();
  return NextResponse.json({
    ok: true,
    llmAvailable: isLlmParseAvailable(),
    llmProvider: llmMeta?.provider ?? null,
    llmModel: llmMeta?.model ?? null,
    supportedFormats: [".pdf", ".doc", ".docx", ".txt"],
    maxBytes: MAX_PARSE_BYTES,
  });
}
