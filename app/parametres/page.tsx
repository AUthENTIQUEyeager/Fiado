"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useRequireAuth } from "@/lib/hooks";
import { AuthChoiceModal } from "@/components/AuthChoiceModal";
import { BottomNav } from "@/components/BottomNav";

export default function ParametresPage() {
  const { logout } = useAuth();
  const { merchant, isLoading, isAuthenticated, pathname } = useRequireAuth();
  const router = useRouter();

  if (isLoading) return null;
  if (!isAuthenticated || !merchant) return <AuthChoiceModal next={pathname} onClose={() => router.replace("/")} />;

  return (
    <main className="min-h-screen bg-sand-50 px-5 pb-28 pt-6">
      <h1 className="font-display text-xl font-semibold text-ink-900">Profil</h1>

      <div className="mt-6 space-y-4 rounded-xl border border-ink-900/10 bg-white p-5">
        <Field label="Boutique" value={merchant.businessName} />
        <Field label="Telephone" value={merchant.phone} />
        <Field label="Email" value={merchant.email ?? "—"} />
        <Field label="Marche" value={merchant.marketName ?? "—"} />
        <Field label="Formule" value={merchant.plan === "free" ? "Gratuite" : "Pro"} />
      </div>

      <button
        onClick={async () => {
          await logout();
          router.replace("/");
        }}
        className="mt-8 w-full rounded-xl border border-alert-600 py-3.5 font-medium text-alert-600"
      >
        Se deconnecter
      </button>

      <BottomNav />
    </main>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-ink-500">{label}</p>
      <p className="text-sm text-ink-900">{value}</p>
    </div>
  );
}
