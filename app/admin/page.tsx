"use client";

// ATTENTION — DEMO LOCALE UNIQUEMENT.
// Cette page lit Dexie (donnees de CET appareil), ce qui suffit pour
// tester l'UI. En production, l'admin doit etre une Server Component
// Next.js qui interroge Supabase avec la cle service_role (jamais
// exposee au client), protegee par la liste blanche d'emails du
// README — pas une verification cote client comme ci-dessous, qui
// n'est qu'un garde-fou de confort pour la demo.

import { useEffect, useState } from "react";
import { db, type Merchant } from "@/lib/db/dexie";

const DEMO_ADMIN_CODE = "fiado-admin";

export default function AdminPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [code, setCode] = useState("");
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [salesCount, setSalesCount] = useState(0);

  useEffect(() => {
    if (!unlocked) return;
    (async () => {
      setMerchants(await db.merchants.toArray());
      setSalesCount(await db.creditSales.count());
    })();
  }, [unlocked]);

  if (!unlocked) {
    return (
      <main className="flex min-h-screen flex-col justify-center bg-sand-50 px-6">
        <h1 className="font-display text-xl font-semibold text-ink-900">Acces admin</h1>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Code"
          type="password"
          className="mt-4 w-full rounded-xl border border-ink-900/15 bg-white px-4 py-3 outline-none"
        />
        <button
          onClick={() => setUnlocked(code === DEMO_ADMIN_CODE)}
          className="mt-4 w-full rounded-xl bg-forest-700 py-3 font-medium text-forest-50"
        >
          Entrer
        </button>
      </main>
    );
  }

  const surveyStats = aggregateSurvey(merchants);

  return (
    <main className="min-h-screen bg-sand-50 px-5 pb-16 pt-6">
      <h1 className="font-display text-xl font-semibold text-ink-900">Tableau de bord admin</h1>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Metric label="Inscrits" value={merchants.length} />
        <Metric label="Creances enregistrees" value={salesCount} />
      </div>

      <h2 className="mt-8 text-sm font-medium text-ink-900">Reponses au sondage</h2>
      <div className="mt-3 space-y-4">
        {Object.entries(surveyStats).map(([question, options]) => (
          <div key={question} className="rounded-xl border border-ink-900/10 bg-white p-4">
            <p className="text-xs font-medium text-ink-500">{question}</p>
            <div className="mt-2 space-y-1">
              {Object.entries(options).map(([option, count]) => (
                <div key={option} className="flex items-center justify-between text-sm">
                  <span className="text-ink-700">{option}</span>
                  <span className="tabular text-ink-900">{count}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <h2 className="mt-8 text-sm font-medium text-ink-900">Boutiques inscrites</h2>
      <div className="mt-3 space-y-2">
        {merchants.map((m) => (
          <div key={m.id} className="rounded-xl border border-ink-900/10 bg-white p-3 text-sm">
            <p className="font-medium text-ink-900">{m.businessName}</p>
            <p className="text-xs text-ink-500">
              {m.marketName ?? "—"} · {m.phone} · {new Date(m.createdAt).toLocaleDateString("fr-FR")}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-ink-900/10 bg-white p-4">
      <p className="text-xs text-ink-500">{label}</p>
      <p className="tabular font-display text-2xl font-semibold text-ink-900">{value}</p>
    </div>
  );
}

function aggregateSurvey(merchants: Merchant[]): Record<string, Record<string, number>> {
  const questions: Record<string, string> = {
    q1: "Deja perdu de l'argent par credit impaye ?",
    q2: "Temps passe a relancer chaque semaine",
    q3: "Voudrait verifier la fiabilite avant de vendre a credit",
  };
  const stats: Record<string, Record<string, number>> = {};
  for (const [key, label] of Object.entries(questions)) {
    stats[label] = {};
  }
  for (const m of merchants) {
    if (!m.onboardingSurvey) continue;
    for (const [key, label] of Object.entries(questions)) {
      const answer = m.onboardingSurvey[key];
      if (!answer) continue;
      stats[label][answer] = (stats[label][answer] ?? 0) + 1;
    }
  }
  return stats;
}
