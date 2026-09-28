"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useMerchantSales, type SaleWithDebtor } from "@/lib/hooks";
import { AuthChoiceModal } from "@/components/AuthChoiceModal";
import { BottomNav } from "@/components/BottomNav";
import { DemoBanner } from "@/components/DemoBanner";
import { CreanceRow } from "@/components/CreanceRow";
import { DailyActivityPanel } from "@/components/DailyActivityPanel";
import { formatFcfa } from "@/lib/format";
import { demoCreditSales, demoDebtors, demoRecoveredThisMonth } from "@/lib/demo-seed";

const demoSalesWithDebtor: SaleWithDebtor[] = demoCreditSales.map((sale) => ({
  ...sale,
  debtor: demoDebtors.find((d) => d.id === sale.debtorId),
}));

export default function HomePage() {
  const { merchant, isAuthenticated, isLoading } = useAuth();
  const liveSales = useMerchantSales(isAuthenticated ? merchant?.id : undefined);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const sales = useMemo(
    () => (isAuthenticated ? liveSales ?? [] : demoSalesWithDebtor),
    [isAuthenticated, liveSales]
  );

  const totalOutstanding = useMemo(
    () => sales.filter((s) => s.status !== "paid").reduce((sum, s) => sum + s.amount, 0),
    [sales]
  );

  const priority = useMemo(() => {
    return [...sales]
      .filter((s) => s.status !== "paid")
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 8);
  }, [sales]);

  const recovered = isAuthenticated ? computeRecoveredThisMonth(sales) : demoRecoveredThisMonth;
  // Deux etats vides bien distincts : un nouveau compte qui n'a jamais
  // rien enregistre n'est pas dans la meme situation qu'un commercant
  // qui a tout encaisse — le premier a besoin d'etre invite a agir, le
  // second merite d'etre rassure, pas de lire un message qui sonne
  // comme un manque.
  const hasNeverSold = isAuthenticated && sales.length === 0;

  return (
    <main className="min-h-screen bg-sand-50 pb-28">
      {!isAuthenticated && !isLoading && <DemoBanner />}

      <header className="bg-forest-900 px-5 pb-7 pt-6 text-forest-50">
        <p className="text-xs text-forest-100/80">Total dehors</p>
        <p className="tabular font-display text-3xl font-semibold">{formatFcfa(totalOutstanding)}</p>
        {recovered > 0 && (
          <p className="mt-2 text-xs text-forest-100">+ {formatFcfa(recovered)} recuperes ce mois</p>
        )}
      </header>

      <section className="px-5 pt-4">
        <h2 className="mb-2 text-xs font-medium text-gold-600">A relancer en priorite</h2>
        {priority.length === 0 ? (
          <div>
            {hasNeverSold ? (
              <p className="py-6 text-center text-sm text-ink-700">
                Enregistre ta premiere vente a credit pour commencer a suivre tes creances.
              </p>
            ) : (
              <p className="py-6 text-center text-sm text-ink-700">
                Tout est a jour — aucune relance en attente. 👍
              </p>
            )}
            {isAuthenticated && <DailyActivityPanel merchantId={merchant?.id} />}
          </div>
        ) : (
          <div>
            {priority.map((sale) => (
              <CreanceRow
                key={sale.id}
                sale={sale}
                debtor={sale.debtor}
                href={isAuthenticated ? `/debiteurs/${sale.debtorId}` : "/onboarding"}
                onClick={isAuthenticated ? undefined : () => setShowAuthGate(true)}
              />
            ))}
          </div>
        )}
      </section>

      <BottomNav />
      {showAuthGate && <AuthChoiceModal next="/" onClose={() => setShowAuthGate(false)} />}
    </main>
  );
}

function computeRecoveredThisMonth(sales: SaleWithDebtor[]): number {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  return sales
    .filter((s) => s.status === "paid")
    .reduce((sum, s) => (new Date(s.createdAt).getTime() >= monthStart ? sum + s.amount : sum), 0);
}
