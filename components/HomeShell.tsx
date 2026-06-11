"use client";

import { EditNetworkBanner } from "@/components/EditNetworkBanner";
import { PersistErrorBanner } from "@/components/PersistErrorBanner";
import { SiteLoadWarningBanner } from "@/components/SiteLoadWarningBanner";
import { useLanguageMode } from "@/context/LanguageModeProvider";
import { useSiteContent } from "@/context/SiteContentProvider";
import { HashScrollRestorer } from "@/components/HashScrollRestorer";
import { SectionAnchorNav } from "@/components/SectionAnchorNav";
import { SiteEditorDock } from "@/components/SiteEditorDock";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteTourAutoStart, SiteTourListener } from "@/components/SiteTourDriver";
import { TourReadonlySentinels } from "@/components/TourReadonlySentinels";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { TopUtilityBar } from "@/components/TopUtilityBar";
import { VerticalScrollLayout } from "@/components/VerticalScrollLayout";
import { HeroPage } from "@/components/pages/HeroPage";
import { PortfolioPage } from "@/components/pages/PortfolioPage";
import { ResumePage } from "@/components/pages/ResumePage";
import dynamic from "next/dynamic";
import { useState } from "react";

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

const ViewLogModal = dynamic(
  () =>
    import("@/components/ViewLogModal").then((m) => ({
      default: m.ViewLogModal,
    })),
  { ssr: false },
);

export function HomeShell() {
  const { contentReady } = useSiteContent();
  const { mode } = useLanguageMode();
  const [viewLogOpen, setViewLogOpen] = useState(false);

  if (!contentReady) {
    return (
      <div
        className="flex min-h-[100dvh] w-full flex-col items-center justify-center gap-3 bg-paper text-ink-muted"
        aria-busy="true"
        aria-live="polite"
      >
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-ink/70"
          aria-hidden
        />
        <p className="text-sm font-medium">
          {mode === "zh" ? "正在加载简历…" : "Loading resume..."}
        </p>
      </div>
    );
  }

  return (
    <>
      <HashScrollRestorer />
      <SiteTourListener />
      <SiteTourAutoStart />
      <TourReadonlySentinels />
      <ThemeSwitcher />
      <TopUtilityBar />
      <EditNetworkBanner />
      <SiteLoadWarningBanner />
      <PersistErrorBanner />
      <SectionAnchorNav />
      <VerticalScrollLayout>
        <section
          id="intro"
          aria-label={mode === "zh" ? "首页" : "Home"}
          className="border-b border-line/50"
        >
          <HeroPage />
        </section>
        <section
          id="resume"
          aria-label={mode === "zh" ? "履历" : "Resume"}
          className="border-b border-line/50"
        >
          <ResumePage />
        </section>
        <section id="portfolio" aria-label={mode === "zh" ? "作品集" : "Portfolio"}>
          <PortfolioPage />
        </section>
        <SiteFooter />
      </VerticalScrollLayout>
      <ProfileSetupModal />
      <PageBackgroundModal />
      <ResumePageCopyModal />
      <PortfolioPageCopyModal />
      <ResumeDetailOverlay />
      <SiteEditorDock onOpenViewLog={() => setViewLogOpen(true)} />
      <ViewLogModal open={viewLogOpen} onClose={() => setViewLogOpen(false)} />
    </>
  );
}
