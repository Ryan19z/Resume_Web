"use client";

import { EditNetworkBanner } from "@/components/EditNetworkBanner";
import { PersistErrorBanner } from "@/components/PersistErrorBanner";
import { SiteLoadWarningBanner } from "@/components/SiteLoadWarningBanner";
import { useLanguageMode } from "@/context/LanguageModeProvider";
import { HrQuickSummary } from "@/components/HrQuickSummary";
import { HashScrollRestorer } from "@/components/HashScrollRestorer";
import { SectionAnchorNav } from "@/components/SectionAnchorNav";
import { SiteEditorDock } from "@/components/SiteEditorDock";
import { SubscriptionStatusBanner } from "@/components/SubscriptionStatusBanner";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteTourAutoStart, SiteTourListener } from "@/components/SiteTourDriver";
import { TourReadonlySentinels } from "@/components/TourReadonlySentinels";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { TopUtilityBar } from "@/components/TopUtilityBar";
import { VerticalScrollLayout } from "@/components/VerticalScrollLayout";
import { AssetOptimizationBanner } from "@/components/AssetOptimizationBanner";
import { EditorLangIndicator } from "@/components/EditorLangIndicator";
import { LazyPageMount } from "@/components/LazyPageMount";
import { HeroPage } from "@/components/pages/HeroPage";
import { useSiteContent } from "@/context/SiteContentProvider";
import dynamic from "next/dynamic";

const ProfileSetupModal = dynamic(
  () =>
    import("@/components/ProfileSetupModal").then((m) => ({
      default: m.ProfileSetupModal,
    })),
  { ssr: false },
);

const ResumePageCopyModal = dynamic(
  () =>
    import("@/components/ResumePageCopyModal").then((m) => ({
      default: m.ResumePageCopyModal,
    })),
  { ssr: false },
);

const PortfolioPageCopyModal = dynamic(
  () =>
    import("@/components/PortfolioPageCopyModal").then((m) => ({
      default: m.PortfolioPageCopyModal,
    })),
  { ssr: false },
);

const PageBackgroundModal = dynamic(
  () =>
    import("@/components/PageBackgroundModal").then((m) => ({
      default: m.PageBackgroundModal,
    })),
  { ssr: false },
);

const ResumeDetailOverlay = dynamic(
  () =>
    import("@/components/ResumeDetailOverlay").then((m) => ({
      default: m.ResumeDetailOverlay,
    })),
  { ssr: false },
);

const ResumeImportModal = dynamic(
  () =>
    import("@/components/ResumeImportModal").then((m) => ({
      default: m.ResumeImportModal,
    })),
  { ssr: false },
);

export function HomeShell() {
  const { mode } = useLanguageMode();
  const { site, previewMode } = useSiteContent();
  const hasResumeContent =
    (site.experience?.length ?? 0) > 0 ||
    (site.projectExperience?.length ?? 0) > 0 ||
    (site.education?.length ?? 0) > 0;
  const hasPortfolioContent = (site.projects?.length ?? 0) > 0;
  const showResumeSection = !previewMode || hasResumeContent;
  const showPortfolioSection = !previewMode || hasPortfolioContent;

  return (
    <>
      <HashScrollRestorer />
      <SiteTourListener />
      <SiteTourAutoStart />
      <TourReadonlySentinels />
      <ThemeSwitcher />
      <TopUtilityBar />
      <EditNetworkBanner />
      <SubscriptionStatusBanner />
      <SiteLoadWarningBanner />
      <PersistErrorBanner />
      <AssetOptimizationBanner />
      <SectionAnchorNav
        showResume={showResumeSection}
        showPortfolio={showPortfolioSection}
      />
      <HrQuickSummary />
      <VerticalScrollLayout>
        <section
          id="intro"
          aria-label={mode === "zh" ? "首页" : "Home"}
          className="border-b border-line/50"
        >
          <HeroPage />
        </section>
        {showResumeSection ? (
          <section
            id="resume"
            aria-label={mode === "zh" ? "履历" : "Resume"}
            className="border-b border-line/50"
          >
            <LazyPageMount
              sectionId="resume"
              loader={() =>
                import("@/components/pages/ResumePage").then((m) => ({
                  default: m.ResumePage,
                }))
              }
            />
          </section>
        ) : null}
        {showPortfolioSection ? (
          <section id="portfolio" aria-label={mode === "zh" ? "作品集" : "Portfolio"}>
            <LazyPageMount
              sectionId="portfolio"
              loader={() =>
                import("@/components/pages/PortfolioPage").then((m) => ({
                  default: m.PortfolioPage,
                }))
              }
            />
          </section>
        ) : null}
        <SiteFooter />
      </VerticalScrollLayout>
      <ProfileSetupModal />
      <PageBackgroundModal />
      <ResumePageCopyModal />
      <PortfolioPageCopyModal />
      <ResumeDetailOverlay />
      <ResumeImportModal />
      <SiteEditorDock />
      <EditorLangIndicator />
    </>
  );
}
