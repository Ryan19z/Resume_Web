import { buildNewCustomerDefaultBundle } from "@/lib/persist-site";
import { buildResumeSpaceUrls } from "@/lib/public-site-url";
import { sanitizeResumeId, sanitizeResumeToken } from "@/lib/resume-scope";
import {
  createAccessPinRecord,
} from "@/lib/server/access-gate";
import { writePublishedBundle } from "@/lib/server/published-site-store";
import { initializeTrialSubscription } from "@/lib/server/subscription-store";
import { randomBytes } from "crypto";
import fs from "fs/promises";
import path from "path";

export type ResumeSpaceMeta = {
  resumeId: string;
  editToken: string;
  viewToken: string;
  createdAt: number;
  updatedAt: number;
  /** 可选：访问口令（哈希存储），链接持有人仍需输入口令才能查看 */
  accessPin?: { salt: string; hash: string };
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
    accessPin:
      data.accessPin &&
      typeof data.accessPin.salt === "string" &&
      typeof data.accessPin.hash === "string"
        ? { salt: data.accessPin.salt, hash: data.accessPin.hash }
        : undefined,
  };
}

async function writeResumeSpaceMeta(meta: ResumeSpaceMeta): Promise<void> {
  await fs.mkdir(resumeDir(meta.resumeId), { recursive: true });
  await fs.writeFile(
    metaPath(meta.resumeId),
    JSON.stringify({ ...meta, updatedAt: now() }, null, 2),
    "utf8",
  );
}

export async function createResumeSpace(options?: {
  /** 默认 true；管理端「开户并开通套餐」时应设为 false，避免先写 7 天试用再叠月租 */
  initTrial?: boolean;
}): Promise<ResumeSpaceMeta> {
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

  const starterBundle = buildNewCustomerDefaultBundle(meta.createdAt);
  await writePublishedBundle(starterBundle, "zh", resumeId);
  await writePublishedBundle(starterBundle, "en", resumeId);
  if (options?.initTrial !== false) {
    await initializeTrialSubscription(resumeId, meta.createdAt);
  }

  return meta;
}

export async function getResumeSpaceLinks(
  resumeIdRaw: string,
): Promise<{ editUrl: string; viewUrl: string } | null> {
  const meta = await readResumeSpaceMeta(resumeIdRaw);
  if (!meta) return null;
  return buildResumeSpaceUrls({
    resumeId: meta.resumeId,
    editToken: meta.editToken,
    viewToken: meta.viewToken,
  });
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

/** 永久删除客户空间（meta、简历快照、订阅与用量）；链接立即失效 */
export async function deleteResumeSpace(resumeIdRaw: string): Promise<boolean> {
  const resumeId = sanitizeResumeId(resumeIdRaw);
  if (!resumeId) return false;
  const dir = resumeDir(resumeId);
  try {
    await fs.rm(dir, { recursive: true, force: true });
    return true;
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return false;
    throw e;
  }
}

/** 重置 edit/view 令牌，旧链接立即失效 */
export async function rotateResumeTokens(
  resumeIdRaw: string,
): Promise<ResumeSpaceMeta | null> {
  const meta = await readResumeSpaceMeta(resumeIdRaw);
  if (!meta) return null;
  const next: ResumeSpaceMeta = {
    ...meta,
    editToken: makeResumeToken(),
    viewToken: makeResumeToken(),
    updatedAt: now(),
  };
  await writeResumeSpaceMeta(next);
  return next;
}

export async function setResumeAccessPin(
  resumeIdRaw: string,
  pin: string,
): Promise<ResumeSpaceMeta | null> {
  const meta = await readResumeSpaceMeta(resumeIdRaw);
  if (!meta) return null;
  const next: ResumeSpaceMeta = {
    ...meta,
    accessPin: createAccessPinRecord(meta.resumeId, pin),
    updatedAt: now(),
  };
  await writeResumeSpaceMeta(next);
  return next;
}

export async function clearResumeAccessPin(
  resumeIdRaw: string,
): Promise<ResumeSpaceMeta | null> {
  const meta = await readResumeSpaceMeta(resumeIdRaw);
  if (!meta) return null;
  const { accessPin: _removed, ...rest } = meta;
  const next: ResumeSpaceMeta = { ...rest, updatedAt: now() };
  await writeResumeSpaceMeta(next);
  return next;
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

