import { SUBSCRIPTION_PLANS, tierDurationMs } from "@/lib/subscription-plans";
import type {
  SubscriptionRecord,
  SubscriptionStatus,
  SubscriptionTier,
  UsageRecord,
} from "@/lib/subscription-types";
import { sanitizeResumeId } from "@/lib/resume-scope";
import fs from "fs/promises";
import path from "path";

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

function subscriptionPath(resumeId: string): string {
  return path.join(resumeDir(resumeId), "subscription.json");
}

function usagePath(resumeId: string): string {
  return path.join(resumeDir(resumeId), "usage.json");
}

function now(): number {
  return Date.now();
}

function monthKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
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

function isTier(value: unknown): value is SubscriptionTier {
  return (
    value === "legacy" ||
    value === "trial" ||
    value === "monthly" ||
    value === "quarterly" ||
    value === "yearly"
  );
}

function isStatus(value: unknown): value is SubscriptionStatus {
  return value === "active" || value === "expired" || value === "cancelled";
}

function normalizeRecord(
  raw: Partial<SubscriptionRecord> | null,
): SubscriptionRecord | null {
  if (!raw || !isTier(raw.tier) || !isStatus(raw.status)) return null;
  return {
    tier: raw.tier,
    status: raw.status,
    startedAt:
      typeof raw.startedAt === "number" && Number.isFinite(raw.startedAt)
        ? raw.startedAt
        : now(),
    expiresAt:
      raw.expiresAt === null
        ? null
        : typeof raw.expiresAt === "number" && Number.isFinite(raw.expiresAt)
          ? raw.expiresAt
          : null,
    note: typeof raw.note === "string" ? raw.note : undefined,
    updatedAt:
      typeof raw.updatedAt === "number" && Number.isFinite(raw.updatedAt)
        ? raw.updatedAt
        : now(),
  };
}

export async function readSubscriptionRecord(
  resumeIdRaw: string,
): Promise<SubscriptionRecord | null> {
  const resumeId = sanitizeResumeId(resumeIdRaw);
  if (!resumeId) return null;
  return normalizeRecord(await readJson<Partial<SubscriptionRecord>>(subscriptionPath(resumeId)));
}

export async function writeSubscriptionRecord(
  resumeIdRaw: string,
  record: SubscriptionRecord,
): Promise<void> {
  const resumeId = sanitizeResumeId(resumeIdRaw);
  if (!resumeId) throw new Error("invalid resumeId");
  const dir = resumeDir(resumeId);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    subscriptionPath(resumeId),
    JSON.stringify({ ...record, updatedAt: now() }, null, 2),
    "utf8",
  );
}

export async function initializeTrialSubscription(
  resumeIdRaw: string,
  createdAt: number,
): Promise<SubscriptionRecord> {
  const trialDays = Number(process.env.SUBSCRIPTION_TRIAL_DAYS ?? "7");
  const days = Number.isFinite(trialDays) && trialDays > 0 ? trialDays : 7;
  const record: SubscriptionRecord = {
    tier: "trial",
    status: "active",
    startedAt: createdAt,
    expiresAt: createdAt + days * 24 * 60 * 60 * 1000,
    note: "开户默认试用",
    updatedAt: now(),
  };
  await writeSubscriptionRecord(resumeIdRaw, record);
  return record;
}

export async function upsertSubscription(input: {
  resumeId: string;
  tier: SubscriptionTier;
  status?: SubscriptionStatus;
  expiresAt?: number | null;
  extendDays?: number;
  /** 续费叠加在旧到期日上；开户/换档默认从今天起算 */
  extendFromNow?: boolean;
  note?: string;
}): Promise<SubscriptionRecord> {
  const resumeId = sanitizeResumeId(input.resumeId);
  if (!resumeId) throw new Error("invalid resumeId");

  const existing = await readSubscriptionRecord(resumeId);
  const startedAt = existing?.startedAt ?? now();
  let expiresAt =
    input.expiresAt !== undefined ? input.expiresAt : (existing?.expiresAt ?? null);

  if (typeof input.extendDays === "number" && input.extendDays > 0) {
    const tierChanged = Boolean(existing && existing.tier !== input.tier);
    const fromNow = input.extendFromNow ?? tierChanged;
    const base = fromNow ? now() : Math.max(now(), expiresAt ?? now());
    expiresAt = base + input.extendDays * 24 * 60 * 60 * 1000;
  } else if (expiresAt == null && input.tier !== "legacy") {
    const duration = tierDurationMs(input.tier);
    if (duration != null) {
      expiresAt = now() + duration;
    }
  }

  const record: SubscriptionRecord = {
    tier: input.tier,
    status: input.status ?? "active",
    startedAt,
    expiresAt,
    note: input.note ?? existing?.note,
    updatedAt: now(),
  };
  await writeSubscriptionRecord(resumeId, record);
  return record;
}

export async function readUsageRecord(resumeIdRaw: string): Promise<UsageRecord> {
  const resumeId = sanitizeResumeId(resumeIdRaw);
  if (!resumeId) {
    return { monthKey: monthKey(), smartImport: 0, aiParse: 0 };
  }
  const raw = await readJson<Partial<UsageRecord>>(usagePath(resumeId));
  const key = monthKey();
  if (!raw || raw.monthKey !== key) {
    return { monthKey: key, smartImport: 0, aiParse: 0 };
  }
  return {
    monthKey: key,
    smartImport:
      typeof raw.smartImport === "number" && raw.smartImport >= 0
        ? raw.smartImport
        : 0,
    aiParse:
      typeof raw.aiParse === "number" && raw.aiParse >= 0 ? raw.aiParse : 0,
  };
}

export async function incrementUsage(
  resumeIdRaw: string,
  kind: "smartImport" | "aiParse",
): Promise<UsageRecord> {
  const resumeId = sanitizeResumeId(resumeIdRaw);
  if (!resumeId) throw new Error("invalid resumeId");
  const current = await readUsageRecord(resumeId);
  const next: UsageRecord = {
    ...current,
    [kind]: current[kind] + 1,
  };
  await fs.mkdir(resumeDir(resumeId), { recursive: true });
  await fs.writeFile(usagePath(resumeId), JSON.stringify(next), "utf8");
  return next;
}

export type ResumeSpaceListItem = {
  resumeId: string;
  createdAt: number | null;
  updatedAt: number | null;
  subscription: SubscriptionRecord | null;
  usage: UsageRecord;
};

export async function listResumeSpacesWithSubscription(): Promise<
  ResumeSpaceListItem[]
> {
  const base = resumeBaseDir();
  let entries: string[] = [];
  try {
    const dirents = await fs.readdir(base, { withFileTypes: true });
    entries = dirents
      .filter((d) => d.isDirectory() && d.name.startsWith("r_"))
      .map((d) => d.name);
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return [];
    throw e;
  }

  const items: ResumeSpaceListItem[] = [];
  for (const resumeId of entries.sort()) {
    const meta = await readJson<{
      createdAt?: number;
      updatedAt?: number;
    }>(path.join(resumeDir(resumeId), "meta.json"));
    items.push({
      resumeId,
      createdAt:
        typeof meta?.createdAt === "number" ? meta.createdAt : null,
      updatedAt:
        typeof meta?.updatedAt === "number" ? meta.updatedAt : null,
      subscription: await readSubscriptionRecord(resumeId),
      usage: await readUsageRecord(resumeId),
    });
  }
  return items;
}

export function planFeaturesForTier(tier: SubscriptionTier) {
  return SUBSCRIPTION_PLANS[tier].features;
}

export function planQuotasForTier(tier: SubscriptionTier) {
  return SUBSCRIPTION_PLANS[tier].quotas;
}
