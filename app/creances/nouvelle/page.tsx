"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/lib/hooks";
import { AuthChoiceModal } from "@/components/AuthChoiceModal";
import { createCreditSale } from "@/lib/repo";

function defaultDueDate(daysAhead = 7): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

export default function NouvelleCreancePage() {
  const router = useRouter();
  const { merchant, isLoading, isAuthenticated, pathname } = useRequireAuth();
  const [amount, setAmount] = useState("");
  const [debtorName, setDebtorName] = useState("");
  const [debtorPhone, setDebtorPhone] = useState("");
  const [dueDate, setDueDate] = useState(defaultDueDate());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!merchant) return;
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      setError("Entre un montant valide.");
      return;
    }
    if (debtorName.trim().length < 2 || debtorPhone.trim().length < 8) {
      setError("Nom et numero du client requis.");
      return;
    }
    setSubmitting(true);
    await createCreditSale({
      merchantId: merchant.id,
      debtorPhone: debtorPhone.trim(),
      debtorName: debtorName.trim(),
      amount: numericAmount,
      dueDate,
    });
    router.replace("/");
  };

  if (isLoading) return null;
  if (!isAuthenticated) return <AuthChoiceModal next={pathname} onClose={() => router.replace("/")} />;

  return (
    <main className="min-h-screen bg-sand-50 px-5 pb-10 pt-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Annuler"
          className="-ml-1 rounded-full p-1 text-xl text-ink-500"
        >
          ←
        </button>
        <h1 className="font-display text-xl font-semibold text-ink-900">Nouvelle vente a credit</h1>
      </div>

      <label htmlFor="amount" className="mt-6 block text-xs font-medium text-ink-500">
        Montant
      </label>
      <input
        id="amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
        inputMode="numeric"
        placeholder="0"
        autoFocus
        className="tabular font-display mt-1 w-full rounded-xl border border-ink-900/15 bg-white px-4 py-4 text-3xl outline-none"
      />

      <label htmlFor="debtorName" className="mt-5 block text-xs font-medium text-ink-500">
        Client
      </label>
      <input
        id="debtorName"
        value={debtorName}
        onChange={(e) => setDebtorName(e.target.value)}
        placeholder="Nom du client"
        className="mt-1 w-full rounded-xl border border-ink-900/15 bg-white px-4 py-3 outline-none"
      />
      <label htmlFor="debtorPhone" className="sr-only">
        Numero du client
      </label>
      <input
        id="debtorPhone"
        value={debtorPhone}
        onChange={(e) => setDebtorPhone(e.target.value)}
        placeholder="+226 70 00 00 00"
        inputMode="tel"
        className="mt-2 w-full rounded-xl border border-ink-900/15 bg-white px-4 py-3 outline-none"
      />

      <label htmlFor="dueDate" className="mt-5 block text-xs font-medium text-ink-500">
        Echeance
      </label>
      <input
        id="dueDate"
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        className="mt-1 w-full rounded-xl border border-ink-900/15 bg-white px-4 py-3 outline-none"
      />

      {error && <p className="mt-3 text-sm text-alert-600">{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={submitting}
        className="mt-8 w-full rounded-xl bg-gold-400 py-3.5 font-medium text-forest-900 disabled:opacity-50"
      >
        {submitting ? "Enregistrement..." : "Enregistrer"}
      </button>
    </main>
  );
}
