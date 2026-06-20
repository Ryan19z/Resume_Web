import { SubscriptionAdminPanel } from "@/components/admin/SubscriptionAdminPanel";

export const metadata = {
  title: "客户套餐管理",
  robots: { index: false, follow: false },
};

export default function AdminSubscriptionsPage() {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <SubscriptionAdminPanel />
    </main>
  );
}
