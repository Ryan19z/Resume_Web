/**
 * 验证 mergeInitialSite 不会把用户清空的数组回填为默认示例内容。
 * 运行：npx tsx scripts/test-persist-empty-arrays.mjs
 */
import { mergeInitialSite } from "../lib/persist-site.ts";
import { defaultSiteContent } from "../lib/default-site-content.ts";

const emptyBundle = {
  version: 2,
  profile: { name: "Test", tagline: "T", setupDismissed: true },
  site: {
    ...structuredClone(defaultSiteContent),
    name: "Test User",
    tagline: "Test tagline",
    projects: [],
    experience: [],
    education: [],
    projectExperience: [],
    heroPreviewLines: [],
    transferableSkills: [],
    roleFitEntries: [],
    heroContactQrs: [],
    heroContactQrSrc: "https://example.com/legacy-qr.png",
    heroContactQrCaption: "旧二维码",
  },
  savedAt: Date.now(),
};

const merged = mergeInitialSite(emptyBundle);

const checks = [
  ["projects", merged.projects.length === 0],
  ["experience", merged.experience.length === 0],
  ["education", merged.education.length === 0],
  ["projectExperience", (merged.projectExperience ?? []).length === 0],
  ["heroPreviewLines", merged.heroPreviewLines.length === 0],
  ["transferableSkills", merged.transferableSkills.length === 0],
  ["roleFitEntries", (merged.roleFitEntries ?? []).length === 0],
  [
    "heroContactQrs_no_legacy",
    !(merged.heroContactQrs ?? []).some((q) => q.src?.includes("legacy")),
  ],
];

let failed = 0;
for (const [name, ok] of checks) {
  if (!ok) {
    console.error("FAIL:", name);
    failed++;
  } else {
    console.log("OK:", name);
  }
}

// keyResults 清空后不应恢复默认 bullet
const expBundle = {
  ...emptyBundle,
  site: {
    ...emptyBundle.site,
    experience: [
      {
        id: "e1",
        title: "Job",
        subtitle: "Co",
        period: "2020",
        summary: "s",
        keyResults: [],
        representativeProjects: [],
      },
    ],
  },
};
const mergedExp = mergeInitialSite(expBundle);
const kr = mergedExp.experience[0]?.keyResults ?? ["MISSING"];
if (!Array.isArray(kr) || kr.length !== 0) {
  console.error("FAIL: keyResults_empty", kr);
  failed++;
} else {
  console.log("OK: keyResults_empty");
}

process.exit(failed > 0 ? 1 : 0);
