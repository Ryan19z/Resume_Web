import {
  buildDemoClassicSampleBundle,
  DEMO_CLASSIC_SAMPLE_DISCLAIMER_ZH,
} from "@/lib/demo-classic-sample-content";
import {
  DEMO_EDIT_TOKEN,
  DEMO_PROD_ORIGIN,
  DEMO_RESUME_ID,
  DEMO_VIEW_TOKEN,
  buildDemoEditUrl,
  buildDemoViewUrl,
} from "@/lib/demo-resume-constants";
import { getPublicSiteOrigin } from "@/lib/public-site-url";
import { writePublishedBundle } from "@/lib/server/published-site-store";
import type { ResumeSpaceMeta } from "@/lib/server/resume-space-store";
import { upsertSubscription } from "@/lib/server/subscription-store";
import fs from "fs/promises";
import path from "path";

export type DemoSeedResult = {
  resumeId: string;
  created: boolean;
  disclaimer: string;
  editUrlLocal: string;
  viewUrlLocal: string;
  editUrlProd: string;
  viewUrlProd: string;
};

async function resumeBaseDir(): Promise<string> {
  const publishPath = process.env.SITE_PUBLISH_PATH?.trim();
  if (process.env.RESUME_SPACE_PATH?.trim()) {
    const custom = process.env.RESUME_SPACE_PATH.trim();
    return path.isAbsolute(custom) ? custom : path.join(process.cwd(), custom);
  }
  if (publishPath) {
    const publishAbs = path.isAbsolute(publishPath)
      ? publishPath
      : path.join(process.cwd(), publishPath);
    return path.join(path.dirname(publishAbs), "resumes");
  }
  return path.join(process.cwd(), "data", "resumes");
}

async function readMeta(resumeId: string): Promise<ResumeSpaceMeta | null> {
  try {
    const raw = await fs.readFile(
      path.join(await resumeBaseDir(), resumeId, "meta.json"),
      "utf8",
    );
    const data = JSON.parse(raw) as ResumeSpaceMeta;
    if (data.resumeId !== resumeId) return null;
    return data;
  } catch {
    return null;
  }
}

async function writeMeta(meta: ResumeSpaceMeta): Promise<void> {
  const dir = path.join(await resumeBaseDir(), meta.resumeId);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "meta.json"), JSON.stringify(meta, null, 2), "utf8");
}

/** 创建或刷新固定 ID 的演示 resume 空间（幂等） */
export async function ensureDemoClassicSampleSpace(): Promise<DemoSeedResult> {
  const savedAt = Date.now();
  const bundleZh = buildDemoClassicSampleBundle("zh", savedAt);
  const bundleEn = buildDemoClassicSampleBundle("en", savedAt);

  const existing = await readMeta(DEMO_RESUME_ID);
  const created = !existing;
  const now = savedAt;

  const meta: ResumeSpaceMeta = existing ?? {
    resumeId: DEMO_RESUME_ID,
    editToken: DEMO_EDIT_TOKEN,
    viewToken: DEMO_VIEW_TOKEN,
    createdAt: now,
    updatedAt: now,
  };
  meta.updatedAt = now;
  await writeMeta(meta);

  await writePublishedBundle(bundleZh, "zh", DEMO_RESUME_ID);
  await writePublishedBundle(bundleEn, "en", DEMO_RESUME_ID);
  await upsertSubscription({
    resumeId: DEMO_RESUME_ID,
    tier: "yearly",
    status: "active",
    extendDays: 365,
    extendFromNow: true,
    note: "推流演示样例 · XXX",
  });

  const configuredLocal =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    (process.env.NODE_ENV === "development" ? getPublicSiteOrigin() : "http://localhost:3000");
  return {
    resumeId: DEMO_RESUME_ID,
    created,
    disclaimer: DEMO_CLASSIC_SAMPLE_DISCLAIMER_ZH,
    editUrlLocal: buildDemoEditUrl(configuredLocal),
    viewUrlLocal: buildDemoViewUrl(configuredLocal),
    editUrlProd: buildDemoEditUrl(DEMO_PROD_ORIGIN),
    viewUrlProd: buildDemoViewUrl(DEMO_PROD_ORIGIN),
  };
}
