import { PrivacyPolicyView } from "@/components/PrivacyPolicyView";
import { Suspense } from "react";

export const metadata = {
  title: "隐私政策",
  description: "面向编辑链接持有人的隐私政策说明",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <Suspense
        fallback={
          <div className="mx-auto max-w-3xl px-6 py-14 text-sm text-ink-muted">
            加载中…
          </div>
        }
      >
        <PrivacyPolicyView />
      </Suspense>
    </main>
  );
}
