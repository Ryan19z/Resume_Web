"use client";

import { EditNetworkBanner } from "@/components/EditNetworkBanner";
import { PersistErrorBanner } from "@/components/PersistErrorBanner";
import { SiteLoadWarningBanner } from "@/components/SiteLoadWarningBanner";
import { useSiteContent } from "@/context/SiteContentProvider";
import { HashScrollRestorer } from "@/components/HashScrollRestorer";
import { HrPresenceHud } from "@/components/HrPresenceHud";
import { SectionAnchorNav } from "@/components/SectionAnchorNav";
import { SiteEditorDock } from "@/components/SiteEditorDock";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteTourAutoStart, SiteTourListener } from "@/components/SiteTourDriver";
import { TourReadonlySentinels } from "@/components/TourReadonlySentinels";
import { VisitorSessionPinger } from "@/components/VisitorSessionPinger";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { TopUtilityBar } from "@/components/TopUtilityBar";
import { VerticalScrollLayout } from "@/components/VerticalScrollLayout";
import { HeroPage } from "@/components/pages/HeroPage";
import { PortfolioPage } from "@/components/pages/PortfolioPage";
import { ResumePage } from "@/components/pages/ResumePage";
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

const ResumeDetailOverlay = dynamic(
  () =>
    import("@/components/ResumeDetailOverlay").then((m) => ({
      default: m.ResumeDetailOverlay,
    })),
  { ssr: false },
);

export function HomeShell() {
  const { contentReady } = useSiteContent();

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
        <p className="text-sm font-medium">正在加载简历…</p>
      </div>
    );
  }

  return (
    <>
      <HashScrollRestorer />
      <SiteTourListener />
      <SiteTourAutoStart />
      <TourReadonlySentinels />
      <VisitorSessionPinger />
      <ThemeSwitcher />
      <TopUtilityBar />
      <HrPresenceHud />
      <EditNetworkBanner />
      <SiteLoadWarningBanner />
      <PersistErrorBanner />
      <SectionAnchorNav />
      <VerticalScrollLayout>
        <section
          id="intro"
          aria-label="首页"
          className="border-b border-line/50"
        >
          <HeroPage />
        </section>
        <section
          id="resume"
          aria-label="履历"
          className="border-b border-line/50"
        >
          <ResumePage />
        </section>
        <section id="portfolio" aria-label="作品集">
          <PortfolioPage />
        </section>
        <SiteFooter />
      </VerticalScrollLayout>
      <ProfileSetupModal />
      <ResumePageCopyModal />
      <PortfolioPageCopyModal />
      <ResumeDetailOverlay />
      <SiteEditorDock />
    </>
  );
}
