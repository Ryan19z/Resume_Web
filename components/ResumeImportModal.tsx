"use client";

import { ImportQualityPanel } from "@/components/ImportQualityPanel";
import { useLanguageMode } from "@/context/LanguageModeProvider";
import { useSiteContent } from "@/context/SiteContentProvider";
import { fieldLabel } from "@/lib/resume-parse-mapper";
import {
  getImportCommitmentBrief,
  getServiceCommitment,
} from "@/lib/service-commitment";
import { privacyNotice } from "@/lib/privacy-notices";
import Link from "next/link";
import {
  fetchParseResumeCapabilities,
  parseResumeFile,
} from "@/lib/resume-parse-client";
import { resumeParseAcceptList } from "@/lib/resume-parse-formats";
import type { ParsedResume } from "@/lib/resume-parse-types";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useId, useRef, useState } from "react";

type Step = "pick" | "parsing" | "preview" | "done";

const PARSE_STAGE_KEYS = ["read", "extract", "parse", "map"] as const;

function ParseProgressRing({
  progress,
  variant,
}: {
  progress: number;
  variant: "ai" | "rule";
}) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const offset = c - (progress / 100) * c;
  const strokeClass =
    variant === "ai" ? "text-violet-500" : "text-ink/45";

  return (
    <div className="relative flex h-28 w-28 items-center justify-center">
      <svg
        className="h-28 w-28 -rotate-90"
        viewBox="0 0 100 100"
        aria-hidden
      >
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-line"
        />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className={`${strokeClass} transition-[stroke-dashoffset] duration-300 ease-out`}
        />
      </svg>
      <span className="absolute text-2xl font-semibold tabular-nums tracking-tight text-ink">
        {progress}%
      </span>
    </div>
  );
}

function useSimulatedParseProgress(active: boolean, useLlm: boolean) {
  const [progress, setProgress] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    if (!active) {
      setProgress(0);
      setStageIndex(0);
      return;
    }

    let value = 0;
    const cap = useLlm ? 88 : 92;
    const id = window.setInterval(() => {
      if (value >= cap) return;
      const increment =
        value < 25 ? 2.8 : value < 55 ? 1.4 : value < 75 ? 0.7 : 0.28;
      value = Math.min(cap, value + increment);
      const rounded = Math.round(value);
      setProgress(rounded);
      if (rounded < 18) setStageIndex(0);
      else if (rounded < 42) setStageIndex(1);
      else if (rounded < 78) setStageIndex(2);
      else setStageIndex(3);
    }, 140);

    return () => window.clearInterval(id);
  }, [active, useLlm]);

  return { progress, stageIndex, setProgress, setStageIndex };
}

function ParseMethodBadge({
  method,
  provider,
  model,
  fallback,
  zh,
}: {
  method: "llm" | "heuristic";
  provider: string | null;
  model: string | null;
  fallback?: boolean;
  zh: boolean;
}) {
  const isAi = method === "llm";
  const label = isAi
    ? provider && model
      ? zh
        ? `本次由 ${provider}（${model}）AI 解析`
        : `Parsed with ${provider} (${model})`
      : zh
        ? "本次由 AI 深度解析"
        : "Parsed with AI"
    : fallback
      ? zh
        ? "AI 解析失败，已改用规则引擎"
        : "AI failed — used rule engine"
      : zh
        ? "本次由规则引擎解析"
        : "Parsed with rule engine";

  return (
    <div
      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-[13px] font-medium ${
        isAi
          ? "border-violet-500/35 bg-violet-500/10 text-violet-950 dark:text-violet-100"
          : fallback
            ? "border-amber-500/35 bg-amber-500/10 text-amber-950 dark:text-amber-100"
            : "border-line bg-ink/[0.04] text-ink-muted"
      }`}
      role="status"
    >
      <span aria-hidden>{isAi ? "✦" : fallback ? "⚠" : "◇"}</span>
      <span>{label}</span>
    </div>
  );
}

export function ResumeImportModal() {
  const {
    resumeImportModalOpen,
    closeResumeImportModal,
    applyImportedResume,
    entitlements,
    refreshEntitlements,
    bumpImportUsage,
    resumeScopeActive,
  } = useSiteContent();
  const { mode } = useLanguageMode();
  const titleId = useId();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("pick");
  const [llmAvailable, setLlmAvailable] = useState(false);
  const [llmProvider, setLlmProvider] = useState<string | null>(null);
  const [llmModel, setLlmModel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [method, setMethod] = useState<"llm" | "heuristic" | null>(null);
  const [resultLlmProvider, setResultLlmProvider] = useState<string | null>(null);
  const [resultLlmModel, setResultLlmModel] = useState<string | null>(null);
  const [llmFallback, setLlmFallback] = useState(false);
  const [fieldsFilled, setFieldsFilled] = useState<string[]>([]);
  const [confidence, setConfidence] = useState(0);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const [textLength, setTextLength] = useState(0);
  const [parsedFull, setParsedFull] = useState<ParsedResume | null>(null);
  const [commitmentOpen, setCommitmentOpen] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<{
    name?: string;
    targetRole?: string;
    experienceCount: number;
    educationCount: number;
    projectCount: number;
    awardsCount: number;
  } | null>(null);
  const mappedRef = useRef<Parameters<typeof applyImportedResume>[0] | null>(
    null,
  );
  const planAllowsAi = entitlements.features.aiParse;
  const willUseAi = llmAvailable && planAllowsAi;
  const {
    progress: parseProgress,
    stageIndex: parseStageIndex,
    setProgress: setParseProgress,
    setStageIndex: setParseStageIndex,
  } = useSimulatedParseProgress(step === "parsing", willUseAi);

  useBodyScrollLock(resumeImportModalOpen);

  const i18n =
    mode === "zh"
      ? {
          title: "智能导入简历",
          desc: "上传 PDF / Word / 文本简历，自动识别并填入站点各区块。",
          pick: "选择文件",
          parsing: "正在解析…",
          aiOn: "已启用 AI 深度解析",
          aiOnDetail: (provider: string, model: string) =>
            `已配置 AI（${provider} · ${model}），上传后将优先使用 AI 解析`,
          aiOnNote: "实际解析方式以预览页标识为准",
          aiOff: "使用规则引擎解析（请在 .env.local 配置 OPENAI_API_KEY 启用 AI）",
          planRuleOnly:
            "当前套餐使用规则引擎导入（不含 AI 深度解析）。",
          planRuleOnlyNote: "上传后将按规则识别字段，复杂排版请导入后手动核对。",
          parsingAi: (provider: string, model: string) =>
            `正在使用 ${provider}（${model}）AI 深度解析`,
          parsingRule: "正在使用规则引擎解析",
          parsingStages: {
            read: "读取文件",
            extract: "提取文字内容",
            parse: "AI 深度解析",
            parseRule: "规则引擎解析",
            map: "整理并映射字段",
          },
          parsingNote: "进度为估算值，完成后将自动进入预览",
          previewTitle: "识别结果预览",
          apply: "确认填入站点",
          cancel: "取消",
          close: "关闭",
          retry: "重新上传",
          success: "已填入站点并保存，请检查各页面内容。",
          successAi: (provider: string | null, model: string | null) =>
            provider && model
              ? `已用 ${provider}（${model}）AI 解析并填入站点，请检查各页面内容。`
              : "已用 AI 解析并填入站点，请检查各页面内容。",
          successRule: "已用规则引擎解析并填入站点，请检查各页面内容。",
          successFallback:
            "AI 解析失败后已改用规则引擎填入，请重点核对各页面内容。",
          name: "姓名",
          role: "目标岗位",
          exp: "工作经历",
          edu: "教育背景",
          proj: "项目",
          awards: "奖项荣誉",
          items: "条",
          confidence: "字段完整度",
          qualityScore: "导入质量评分",
          warningsTitle: "建议核对（系统详情）",
          commitmentToggle: "查看服务承诺边界",
          commitmentClose: "收起",
        }
      : {
          title: "Smart Resume Import",
          desc: "Upload PDF / Word / text resume to auto-fill site sections.",
          pick: "Choose file",
          parsing: "Parsing…",
          aiOn: "AI deep parsing enabled",
          aiOnDetail: (provider: string, model: string) =>
            `AI configured (${provider} · ${model}); uploads prefer AI parsing`,
          aiOnNote: "Actual method is shown on the preview badge",
          aiOff: "Rule-based parsing (set OPENAI_API_KEY in .env.local for AI)",
          planRuleOnly:
            "Your plan uses rule-based import only (no AI deep parsing).",
          planRuleOnlyNote:
            "Fields are matched by rules; review manually if layout is complex.",
          parsingAi: (provider: string, model: string) =>
            `Parsing with ${provider} (${model}) AI`,
          parsingRule: "Parsing with rule engine",
          parsingStages: {
            read: "Reading file",
            extract: "Extracting text",
            parse: "AI deep parsing",
            parseRule: "Rule-based parsing",
            map: "Mapping fields",
          },
          parsingNote: "Progress is estimated; preview opens when done",
          previewTitle: "Preview",
          apply: "Apply to site",
          cancel: "Cancel",
          close: "Close",
          retry: "Upload again",
          success: "Applied and saved. Please review each section.",
          successAi: (provider: string | null, model: string | null) =>
            provider && model
              ? `Applied via ${provider} (${model}) AI. Please review each section.`
              : "Applied via AI parsing. Please review each section.",
          successRule:
            "Applied via rule engine. Please review each section.",
          successFallback:
            "AI failed; applied via rule engine. Please review carefully.",
          name: "Name",
          role: "Target role",
          exp: "Experience",
          edu: "Education",
          proj: "Projects",
          awards: "Awards",
          items: "items",
          confidence: "Field completeness",
          qualityScore: "Import quality score",
          warningsTitle: "Please review (system details)",
          commitmentToggle: "Service commitment & limits",
          commitmentClose: "Collapse",
        };

  const parseStageLabel = (() => {
    const key = PARSE_STAGE_KEYS[parseStageIndex] ?? "read";
    if (key === "parse") {
      return willUseAi
        ? i18n.parsingStages.parse
        : i18n.parsingStages.parseRule;
    }
    return i18n.parsingStages[key];
  })();

  const parseModeBanner = (() => {
    if (!planAllowsAi) {
      return {
        main: i18n.planRuleOnly,
        note: i18n.planRuleOnlyNote,
      };
    }
    if (willUseAi && llmProvider && llmModel) {
      return {
        main: i18n.aiOnDetail(llmProvider, llmModel),
        note: i18n.aiOnNote,
      };
    }
    if (willUseAi) {
      return { main: i18n.aiOn, note: i18n.aiOnNote };
    }
    return { main: i18n.aiOff, note: undefined };
  })();

  const reset = useCallback(() => {
    setStep("pick");
    setError(null);
    setFileName("");
    setMethod(null);
    setResultLlmProvider(null);
    setResultLlmModel(null);
    setLlmFallback(false);
    setFieldsFilled([]);
    setConfidence(0);
    setParseWarnings([]);
    setTextLength(0);
    setParsedFull(null);
    setCommitmentOpen(false);
    setParsedPreview(null);
    mappedRef.current = null;
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  useEffect(() => {
    if (!resumeImportModalOpen) {
      reset();
      return;
    }
    void fetchParseResumeCapabilities().then((c) => {
      setLlmAvailable(c.llmAvailable);
      setLlmProvider(c.llmProvider);
      setLlmModel(c.llmModel);
    });
  }, [resumeImportModalOpen, reset]);

  useEffect(() => {
    if (!resumeImportModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && step !== "parsing") closeResumeImportModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [resumeImportModalOpen, step, closeResumeImportModal]);

  const handleFile = async (file: File) => {
    setError(null);
    setFileName(file.name);
    setStep("parsing");

    const tryAi = llmAvailable && planAllowsAi;
    const result = await parseResumeFile(file, {
      preferLlm: tryAi ? undefined : false,
    });
    if (!result.ok) {
      setError(result.message);
      setParseProgress(0);
      setStep("pick");
      return;
    }

    if (resumeScopeActive) {
      bumpImportUsage(result.method === "llm");
      void refreshEntitlements();
    }

    setParseProgress(100);
    setParseStageIndex(3);

    mappedRef.current = result.mapped;
    setMethod(result.method);
    setResultLlmProvider(result.llmProvider);
    setResultLlmModel(result.llmModel);
    setLlmFallback(result.llmFallback);
    setFieldsFilled(result.fieldsFilled);
    setConfidence(result.confidence);
    setParseWarnings(result.warnings ?? []);
    setTextLength(result.textLength);
    setParsedFull(result.parsed);
    setParsedPreview({
      name: result.parsed.name,
      targetRole: result.parsed.targetRole,
      experienceCount: result.parsed.experience.length,
      educationCount: result.parsed.education.length,
      projectCount: result.parsed.projects.length,
      awardsCount: result.parsed.awards?.length ?? 0,
    });
    await new Promise((r) => setTimeout(r, 280));
    setStep("preview");
  };

  const handleApply = () => {
    if (!mappedRef.current) return;
    applyImportedResume(mappedRef.current);
    setStep("done");
  };

  const commitment = getServiceCommitment(mode);

  return (
    <AnimatePresence>
      {resumeImportModalOpen ? (
        <motion.div
          className="fixed inset-0 z-[85] flex items-end justify-center print:hidden sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label={i18n.close}
            className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]"
            onClick={() => {
              if (step !== "parsing") closeResumeImportModal();
            }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ y: 48, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 32, opacity: 0 }}
            className="relative z-[86] max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-line bg-surface p-8 shadow-xl sm:rounded-3xl"
          >
            <p className="mb-1 text-[13px] font-medium uppercase tracking-[0.2em] text-ink-muted">
              Import
            </p>
            <h2 id={titleId} className="mb-2 text-2xl font-semibold tracking-tight">
              {i18n.title}
            </h2>
            <p className="mb-6 text-sm leading-relaxed text-ink-muted">{i18n.desc}</p>

            <p className="mb-4 rounded-xl bg-ink/[0.04] px-3 py-2 text-[12px] text-ink-muted">
              {parseModeBanner.main}
              {parseModeBanner.note ? (
                <span className="mt-1 block text-[11px] opacity-80">
                  {parseModeBanner.note}
                </span>
              ) : null}
            </p>

            <div className="mb-4 rounded-xl border border-line/80 bg-paper/60 px-3 py-2.5 text-[12px] leading-relaxed text-ink-muted">
              <p>{getImportCommitmentBrief(mode)}</p>
              <p className="mt-2 text-[11px] text-ink-muted/90">
                {privacyNotice("importUpload", mode)}{" "}
                <Link
                  href={`/privacy?lang=${mode}`}
                  className="font-semibold text-ink/75 underline-offset-2 hover:text-ink hover:underline"
                >
                  {mode === "zh" ? "完整隐私政策" : "Full privacy policy"}
                </Link>
              </p>
              <button
                type="button"
                onClick={() => setCommitmentOpen((v) => !v)}
                className="mt-2 text-[11px] font-semibold text-ink underline-offset-2 hover:underline"
              >
                {commitmentOpen ? i18n.commitmentClose : i18n.commitmentToggle}
              </button>
              {commitmentOpen ? (
                <div className="mt-3 space-y-3 border-t border-line/60 pt-3 text-[11px]">
                  <div>
                    <p className="font-semibold text-ink">{commitment.weProvide.heading}</p>
                    <ul className="mt-1 list-disc space-y-1 pl-4">
                      {commitment.weProvide.items.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold text-ink">{commitment.weDoNot.heading}</p>
                    <ul className="mt-1 list-disc space-y-1 pl-4">
                      {commitment.weDoNot.items.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                  <p>{commitment.importNote}</p>
                </div>
              ) : null}
            </div>

            {step === "pick" ? (
              <div className="flex flex-col gap-4">
                <label className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-line bg-paper/60 px-6 py-10 transition-colors hover:border-ink/20 hover:bg-paper">
                  <span className="text-3xl" aria-hidden>
                    📄
                  </span>
                  <span className="text-sm font-medium text-ink">{i18n.pick}</span>
                  <span className="text-[11px] text-ink-muted">
                    PDF · Word · TXT（≤15MB）
                  </span>
                  <input
                    ref={fileRef}
                    type="file"
                    accept={resumeParseAcceptList()}
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleFile(f);
                    }}
                  />
                </label>
                {error ? (
                  <p className="text-sm text-red-600" role="alert">
                    {error}
                  </p>
                ) : null}
              </div>
            ) : null}

            {step === "parsing" ? (
              <div
                className="flex flex-col items-center gap-5 py-8"
                aria-busy="true"
                aria-valuenow={parseProgress}
                aria-valuemin={0}
                aria-valuemax={100}
                role="progressbar"
                aria-label={parseStageLabel}
              >
                <ParseProgressRing
                  progress={parseProgress}
                  variant={willUseAi ? "ai" : "rule"}
                />
                <div className="w-full max-w-xs space-y-2 text-center">
                  <p className="text-sm font-medium text-ink">
                    {willUseAi && llmProvider && llmModel
                      ? i18n.parsingAi(llmProvider, llmModel)
                      : willUseAi
                        ? i18n.parsing
                        : i18n.parsingRule}
                  </p>
                  <p
                    className={
                      willUseAi
                        ? "text-[13px] text-violet-700 dark:text-violet-300"
                        : "text-[13px] text-ink-muted"
                    }
                  >
                    {parseStageLabel}
                  </p>
                  {fileName ? (
                    <p className="truncate text-[12px] text-ink-muted">{fileName}</p>
                  ) : null}
                  <div className="h-1.5 overflow-hidden rounded-full bg-line">
                    <div
                      className={`h-full rounded-full transition-[width] duration-300 ease-out ${
                        willUseAi ? "bg-violet-500" : "bg-ink/35"
                      }`}
                      style={{ width: `${parseProgress}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-ink-muted">{i18n.parsingNote}</p>
                </div>
              </div>
            ) : null}

            {step === "preview" && parsedPreview && parsedFull ? (
              <div className="flex flex-col gap-5">
                {method ? (
                  <ParseMethodBadge
                    method={method}
                    provider={resultLlmProvider}
                    model={resultLlmModel}
                    fallback={llmFallback}
                    zh={mode === "zh"}
                  />
                ) : null}
                <ImportQualityPanel
                  parsed={parsedFull}
                  warnings={parseWarnings}
                  confidence={confidence}
                  textLength={textLength}
                  fileName={fileName}
                  method={method ?? "heuristic"}
                  llmFallback={llmFallback}
                  planAllowsAi={planAllowsAi}
                  lang={mode}
                />
                <div className="rounded-2xl border border-line bg-paper/50 p-4 text-sm">
                  <p className="mb-3 font-medium text-ink">{i18n.previewTitle}</p>
                  <ul className="space-y-1.5 text-ink-muted">
                    {parsedPreview.name ? (
                      <li>
                        {i18n.name}：{parsedPreview.name}
                      </li>
                    ) : null}
                    {parsedPreview.targetRole ? (
                      <li>
                        {i18n.role}：{parsedPreview.targetRole}
                      </li>
                    ) : null}
                    <li>
                      {i18n.exp}：{parsedPreview.experienceCount} {i18n.items}
                    </li>
                    <li>
                      {i18n.edu}：{parsedPreview.educationCount} {i18n.items}
                    </li>
                    <li>
                      {i18n.proj}：{parsedPreview.projectCount} {i18n.items}
                    </li>
                    {parsedPreview.awardsCount > 0 ? (
                      <li>
                        {i18n.awards}：{parsedPreview.awardsCount} {i18n.items}
                      </li>
                    ) : null}
                  </ul>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {fieldsFilled.map((f) => (
                      <span
                        key={f}
                        className="rounded-full bg-ink/[0.06] px-2 py-0.5 text-[11px] text-ink"
                      >
                        {fieldLabel(f)}
                      </span>
                    ))}
                  </div>
                </div>
                {parseWarnings.length > 0 ? (
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.08] p-4 text-sm">
                    <p className="mb-2 font-medium text-ink">{i18n.warningsTitle}</p>
                    <ul className="list-disc space-y-1.5 pl-5 text-[13px] leading-relaxed text-ink-muted">
                      {parseWarnings.map((w) => (
                        <li key={w}>{w}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleApply}
                    className="flex-1 rounded-xl bg-ink px-4 py-3 text-sm font-medium text-paper transition-opacity hover:opacity-90"
                  >
                    {i18n.apply}
                  </button>
                  <button
                    type="button"
                    onClick={reset}
                    className="rounded-xl border border-line px-4 py-3 text-sm text-ink-muted hover:bg-ink/[0.03]"
                  >
                    {i18n.retry}
                  </button>
                </div>
              </div>
            ) : null}

            {step === "done" ? (
              <div className="flex flex-col gap-4 py-4">
                {method ? (
                  <ParseMethodBadge
                    method={method}
                    provider={resultLlmProvider}
                    model={resultLlmModel}
                    fallback={llmFallback}
                    zh={mode === "zh"}
                  />
                ) : null}
                <p className="text-sm text-ink">
                  {llmFallback
                    ? i18n.successFallback
                    : method === "llm"
                      ? i18n.successAi(resultLlmProvider, resultLlmModel)
                      : i18n.successRule}
                </p>
                <button
                  type="button"
                  onClick={closeResumeImportModal}
                  className="rounded-xl bg-ink px-4 py-3 text-sm font-medium text-paper"
                >
                  {i18n.close}
                </button>
              </div>
            ) : null}

            {step === "pick" || step === "preview" ? (
              <button
                type="button"
                onClick={closeResumeImportModal}
                className="mt-4 w-full text-center text-sm text-ink-muted hover:text-ink"
              >
                {i18n.cancel}
              </button>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
