"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { db, type Payment } from "@/lib/db/dexie";
import { computeReliability, type ReliabilityResult } from "@/lib/score";
import { logVerificationCheck } from "@/lib/repo";
import { StatusBadge } from "@/components/StatusBadge";
import { BottomNav } from "@/components/BottomNav";

export default function RecherchePage() {
  const { merchant } = useAuth();
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState<ReliabilityResult | null>(null);
  const [searched, setSearched] = useState(false);

  const search = async () => {
    setSearched(true);
    const trimmed = phone.trim();
    // Alimente l'encart "Activite du jour" de l'accueil (voir
    // components/DailyActivityPanel.tsx) — une verification compte meme
    // si le numero est inconnu du reseau.
    if (merchant && trimmed) {
      void logVerificationCheck(merchant.id, trimmed);
    }
    const debtor = await db.debtors.where("phone").equals(trimmed).first();
    if (!debtor) {
      setResult({ badge: "inconnu", label: "Aucune donnee", detail: "Nouveau numero" });
      return;
    }
    // En production, cet appel passe par une fonction RPC Supabase qui
    // agrege les donnees de TOUS les commercants du reseau, sans jamais
    // exposer le detail de leurs transactions (voir spec V1, section 4).
    const sales = await db.creditSales.where("debtorId").equals(debtor.id).toArray();
    const paymentsBySale: Record<string, Payment[]> = {};
    for (const sale of sales) {
      paymentsBySale[sale.id] = await db.payments.where("creditSaleId").equals(sale.id).toArray();
    }
    const reports = await db.riskReports.where("debtorId").equals(debtor.id).toArray();
    setResult(computeReliability({ sales, paymentsBySale, confirmedReports: reports }));
  };

  return (
    <main className="min-h-screen bg-sand-50 px-5 pb-28 pt-6">
      <h1 className="font-display text-xl font-semibold text-ink-900">Verifier un client</h1>
      <p className="mt-1 text-sm text-ink-500">Avant de vendre a credit a quelqu&apos;un que tu connais peu.</p>

      <div className="mt-6 flex gap-2">
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+226 70 00 00 00"
          inputMode="tel"
          className="flex-1 rounded-xl border border-ink-900/15 bg-white px-4 py-3 outline-none"
        />
        <button
          onClick={search}
          className="rounded-xl bg-forest-700 px-5 py-3 font-medium text-forest-50"
        >
          Verifier
        </button>
      </div>

      {searched && result && (
        <div className="mt-6 rounded-xl border border-ink-900/10 bg-white p-5">
          <StatusBadge tone={result.badge}>{result.label}</StatusBadge>
          <p className="mt-2 text-sm text-ink-700">{result.detail}</p>
        </div>
      )}

      <BottomNav />
    </main>
  );
}
