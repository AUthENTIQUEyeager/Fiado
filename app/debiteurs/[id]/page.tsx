"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useRequireAuth, useDebtorSales } from "@/lib/hooks";
import { AuthChoiceModal } from "@/components/AuthChoiceModal";
import { StatusBadge } from "@/components/StatusBadge";
import { formatFcfa, formatRelativeDueDate } from "@/lib/format";
import { db, type Debtor, type PaymentMethod } from "@/lib/db/dexie";
import { addPayment, createRiskReport, getRiskReportsForDebtor } from "@/lib/repo";
import { isReportEligible } from "@/lib/status";

const METHODS: { key: PaymentMethod; label: string }[] = [
  { key: "especes", label: "Especes" },
  { key: "orange_money", label: "Orange Money" },
  { key: "wave", label: "Wave" },
  { key: "moov_money", label: "Moov Money" },
];

export default function DebiteurPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { merchant, isLoading: authLoading, isAuthenticated, pathname } = useRequireAuth();
  const [debtor, setDebtor] = useState<Debtor | null>(null);
  const [reportCount, setReportCount] = useState(0);
  const [payingFor, setPayingFor] = useState<string | null>(null);

  // Statut toujours recalcule et reactif (voir lib/hooks.ts) — avant,
  // cette page lisait le champ "status" brut de Dexie, qui pouvait rester
  // perime (ex. "pending" alors que l'echeance est passee) tant que
  // l'accueil ou /creances n'avaient pas ete visites entretemps.
  const liveSales = useDebtorSales(id, merchant?.id);
  const sales = [...(liveSales ?? [])].sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());

  const refreshReportCount = async () => {
    const reports = await getRiskReportsForDebtor(id);
    setReportCount(reports.length);
  };

  useEffect(() => {
    (async () => {
      const d = await db.debtors.get(id);
      setDebtor(d ?? null);
    })();
    void refreshReportCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const markPaid = async (saleId: string, amount: number, method: PaymentMethod) => {
    await addPayment(saleId, amount, method);
    setPayingFor(null);
    // Pas besoin de recharger les creances : useDebtorSales se met a jour
    // tout seul des que le paiement est ecrit dans Dexie.
  };

  const signal = async (sale: { id: string }) => {
    if (!merchant?.marketId || !debtor) return;
    await createRiskReport({
      debtorId: debtor.id,
      reportedBy: merchant.id,
      marketId: merchant.marketId,
      creditSaleId: sale.id,
      reason: "Retard de plus de 15 jours",
    });
    await refreshReportCount();
  };

  if (authLoading) return null;
  if (!isAuthenticated || !merchant) {
    return <AuthChoiceModal next={pathname} onClose={() => router.replace("/")} />;
  }

  if (!debtor) {
    return (
      <main className="min-h-screen bg-sand-50 px-5 pt-6">
        <p className="text-sm text-ink-500">Client introuvable.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-sand-50 px-5 pb-16 pt-6">
      <button onClick={() => router.back()} className="text-sm text-forest-700">
        ← Retour
      </button>

      <h1 className="font-display mt-3 text-xl font-semibold text-ink-900">{debtor.fullName}</h1>
      <p className="text-sm text-ink-500">{debtor.phone}</p>

      <div className="mt-6 space-y-3">
        {sales.map((sale) => (
          <div key={sale.id} className="rounded-xl border border-ink-900/10 bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="tabular font-display text-lg font-semibold text-ink-900">{formatFcfa(sale.amount)}</p>
              <StatusBadge tone={sale.status === "disputed" ? "overdue" : sale.status}>
                {sale.status === "paid" ? "Soldee" : formatRelativeDueDate(sale.dueDate)}
              </StatusBadge>
            </div>

            {sale.status !== "paid" && (
              <div className="mt-3">
                {payingFor === sale.id ? (
                  <div className="flex flex-wrap gap-2">
                    {METHODS.map((m) => (
                      <button
                        key={m.key}
                        onClick={() => markPaid(sale.id, sale.amount, m.key)}
                        className="rounded-lg border border-forest-700 px-3 py-1.5 text-xs text-forest-700"
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPayingFor(sale.id)}
                      className="rounded-lg bg-forest-700 px-3 py-1.5 text-xs font-medium text-forest-50"
                    >
                      Marquer paye
                    </button>
                    {isReportEligible(sale.dueDate) && (
                      <button
                        onClick={() => signal(sale)}
                        className="rounded-lg border border-alert-600 px-3 py-1.5 text-xs text-alert-600"
                      >
                        Signaler
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {reportCount > 0 && (
        <p className="mt-4 text-xs text-alert-600">{reportCount} signalement(s) existant(s) pour ce client.</p>
      )}
    </main>
  );
}
