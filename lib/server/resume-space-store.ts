import { sanitizeResumeId, sanitizeResumeToken } from "@/lib/resume-scope";
import { randomBytes } from "crypto";
import fs from "fs/promises";
import path from "path";

export type ResumeSpaceMeta = {
  resumeId: string;
  editToken: string;
  viewToken: string;
  createdAt: number;
  updatedAt: number;
};

function resumeBaseDir(): string {
  const custom = process.env.RESUME_SPACE_PATH?.trim();
  if (custom) {
    return path.isAbsolute(custom) ? custom : path.join(process.cwd(), custom);
  }
  const publishPath = process.env.SITE_PUBLISH_PATH?.trim();
  if (publishPath) {
    const publishAbs = path.isAbsolute(publishPath)
      ? publishPath
      : path.join(process.cwd(), publishPath);
    return path.join(path.dirname(publishAbs), "resumes");
  }
  return path.join(process.cwd(), "data", "resumes");
}

function resumeDir(resumeId: string): string {
  return path.join(resumeBaseDir(), resumeId);
}

function metaPath(resumeId: string): string {
  return path.join(resumeDir(resumeId), "meta.json");
}

function now(): number {
  return Date.now();
}

export function makeResumeId(): string {
  return `r_${randomBytes(8).toString("hex")}`;
}

export function makeResumeToken(): string {
  return randomBytes(24).toString("base64url");
}

async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return null;
    throw e;
  }
}

export async function readResumeSpaceMeta(
  resumeIdRaw: string,
): Promise<ResumeSpaceMeta | null> {
  const resumeId = sanitizeResumeId(resumeIdRaw);
  if (!resumeId) return null;
  const data = await readJson<Partial<ResumeSpaceMeta>>(metaPath(resumeId));
  if (!data) return null;
  if (
    data.resumeId !== resumeId ||
    !sanitizeResumeToken(data.editToken) ||
    !sanitizeResumeToken(data.viewToken)
  ) {
    return null;
  }
  return {
    resumeId,
    editToken: data.editToken!,
    viewToken: data.viewToken!,
    createdAt:
      typeof data.createdAt === "number" && Number.isFinite(data.createdAt)
        ? data.createdAt
        : now(),
    updatedAt:
      typeof data.updatedAt === "number" && Number.isFinite(data.updatedAt)
        ? data.updatedAt
        : now(),
  };
}

export async function createResumeSpace(): Promise<ResumeSpaceMeta> {
  const resumeId = makeResumeId();
  const meta: ResumeSpaceMeta = {
    resumeId,
    editToken: makeResumeToken(),
    viewToken: makeResumeToken(),
    createdAt: now(),
    updatedAt: now(),
  };
  const dir = resumeDir(resumeId);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(metaPath(resumeId), JSON.stringify(meta), "utf8");
  return meta;
}

export async function canEditByToken(
  resumeIdRaw: string,
  editTokenRaw: string,
): Promise<boolean> {
  const resumeId = sanitizeResumeId(resumeIdRaw);
  const editToken = sanitizeResumeToken(editTokenRaw);
  if (!resumeId || !editToken) return false;
  const meta = await readResumeSpaceMeta(resumeId);
  return !!meta && meta.editToken === editToken;
}

export async function canViewByToken(
  resumeIdRaw: string,
  viewTokenRaw?: string,
  editTokenRaw?: string,
): Promise<boolean> {
  const resumeId = sanitizeResumeId(resumeIdRaw);
  if (!resumeId) return false;
  const viewToken = sanitizeResumeToken(viewTokenRaw);
  const editToken = sanitizeResumeToken(editTokenRaw);
  const meta = await readResumeSpaceMeta(resumeId);
  if (!meta) return false;
  return !!(viewToken && meta.viewToken === viewToken) || !!(editToken && meta.editToken === editToken);
}

export function getResumePublishFilePath(
  resumeIdRaw: string,
  lang: "zh" | "en",
): string | null {
  const resumeId = sanitizeResumeId(resumeIdRaw);
  if (!resumeId) return null;
  const file = lang === "zh" ? "published-site.json" : "published-site.en.json";
  return path.join(resumeDir(resumeId), file);
}

