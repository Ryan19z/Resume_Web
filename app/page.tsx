import AppClientTree from "@/components/AppClientTree";
import { buildPageMetadata } from "@/lib/server/site-metadata";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata("zh");
}

export default function Home() {
  return (
    <main className="min-h-[100dvh] w-full text-ink">
      <AppClientTree />
    </main>
  );
}
