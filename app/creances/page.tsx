"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useRequireAuth, useMerchantSales } from "@/lib/hooks";
import { AuthChoiceModal } from "@/components/AuthChoiceModal";
import { BottomNav } from "@/components/BottomNav";
import { CreanceRow } from "@/components/CreanceRow";
import { type CreditSaleStatus } from "@/lib/db/dexie";
import clsx from "clsx";

const FILTERS: { key: CreditSaleStatus | "all"; label: string }[] = [
  { key: "all", label: "Toutes" },
  { key: "overdue", label: "En retard" },
  { key: "pending", label: "En cours" },
  { key: "paid", label: "Soldees" },
];

export default function CreancesPage() {
  const router = useRouter();
  const { merchant, isLoading, isAuthenticated, pathname } = useRequireAuth();
  const liveSales = useMerchantSales(merchant?.id);
  const [filter, setFilter] = useState<CreditSaleStatus | "all">("all");

  const sales = useMemo(
    () => [...(liveSales ?? [])].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()),
    [liveSales]
  );

  const filtered = useMemo(
    () => (filter === "all" ? sales : sales.filter((s) => s.status === filter)),
    [sales, filter]
  );

  if (isLoading) return null;
  if (!isAuthenticated) return <AuthChoiceModal next={pathname} onClose={() => router.replace("/")} />;

  return (
    <main className="min-h-screen bg-sand-50 pb-28">
      <header className="px-5 pb-4 pt-6">
        <h1 className="font-display text-xl font-semibold text-ink-900">Mes creances</h1>
      </header>

      <div className="flex gap-2 overflow-x-auto px-5 pb-3">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={clsx(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium",
              filter === f.key
                ? "border-forest-700 bg-forest-700 text-forest-50"
                : "border-ink-900/15 text-ink-700"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <section className="px-5">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-500">Aucune creance dans cette categorie.</p>
        ) : (
          filtered.map((sale) => (
            <CreanceRow key={sale.id} sale={sale} debtor={sale.debtor} href={`/debiteurs/${sale.debtorId}`} />
          ))
        )}
      </section>

      <BottomNav />
    </main>
  );
}
