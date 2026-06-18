/**
 * 将服务器发布快照恢复为默认模板（中英文）
 * 用法：npx tsx scripts/reset-site-default.ts
 */
import { defaultSiteContent } from "../lib/default-site-content";
import {
  buildNewCustomerDefaultBundle,
  stampBundleForSave,
} from "../lib/persist-site";
import { writePublishedBundle } from "../lib/server/published-site-store";
import type { PersistedProfile, SiteContent } from "../lib/types";

function buildEnDefaultSite(): SiteContent {
  return {
    ...defaultSiteContent,
    heroCopy: {
      ...defaultSiteContent.heroCopy,
      eyebrow: "Portfolio",
      swipeHint: "Scroll down to resume and portfolio",
    },
    resumeCopy: {
      ...defaultSiteContent.resumeCopy,
      pageEyebrow: "Resume",
      pageTitle: "Resume",
      pageIntro:
        "Open each card to view details, evidence and representative work.",
      experienceSectionEyebrow: "Experience",
      educationSectionEyebrow: "Education",
      experienceCardCta: "View outcomes →",
      educationCardCta: "View highlights →",
      detailWorkEyebrow: "Work Outcomes",
      detailCampusEyebrow: "Academic Highlights",
      keyResultsHeading: "Key Results",
      repProjectsHeading: "Representative Projects",
    },
    portfolioCopy: {
      ...defaultSiteContent.portfolioCopy,
      pageEyebrow: "Work",
      pageTitle: "Portfolio",
      pageIntro: "Selected projects with direct links and preview assets.",
      openLinkLabel: "Open",
      posterThumbTitle: "Poster / Preview",
      posterThumbCaption:
        "Use this area to highlight context and contribution.",
    },
  };
}

function buildEnBundle() {
  const profile: PersistedProfile = {
    name: defaultSiteContent.name,
    tagline: defaultSiteContent.tagline,
    setupDismissed: false,
  };
  return stampBundleForSave({
    version: 2,
    profile,
    site: buildEnDefaultSite(),
    savedAt: Date.now(),
  });
}

async function main() {
  const zhBundle = stampBundleForSave(buildNewCustomerDefaultBundle());
  const enBundle = buildEnBundle();

  await writePublishedBundle(zhBundle, "zh");
  await writePublishedBundle(enBundle, "en");

  console.log("已恢复默认模板：");
  console.log("  - data/published-site.json");
  console.log("  - data/published-site.en.json");
  console.log("\n请在浏览器打开：http://localhost:3000/?reset=default");
  console.log("（会自动清除本机草稿并刷新为默认内容）");
}

void main();
