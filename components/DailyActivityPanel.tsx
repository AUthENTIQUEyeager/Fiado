"use client";

import Link from "next/link";
import { Search, Plus } from "lucide-react";
import { useWeeklyVerificationCount } from "@/lib/hooks";

// V1 volontairement simple : un compteur + deux raccourcis, sans aucune
// notion de "streak" ni de synchronisation Supabase. Concu pour evoluer
// plus tard (jours d'affilee, historique consultable, sync multi-appareil)
// sans casser ce qui existe deja — voir lib/repo.ts (logVerificationCheck)
// et lib/hooks.ts (useWeeklyVerificationCount).
export function DailyActivityPanel({ merchantId }: { merchantId: string | undefined }) {
  const count = useWeeklyVerificationCount(merchantId);

  return (
    <div className="mt-4 rounded-xl border border-ink-900/10 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gold-600">Activite du jour</p>
      <p className="mt-1 text-sm text-ink-700">
        {count === undefined
          ? "…"
          : count > 0
            ? `${count} client${count > 1 ? "s" : ""} verifie${count > 1 ? "s" : ""} cette semaine.`
            : "Aucun client verifie cette semaine."}
      </p>
      <div className="mt-3 flex gap-2">
        <Link
          href="/recherche"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-forest-700 py-2.5 text-xs font-medium text-forest-700"
        >
          <Search size={14} /> Verifier un client
        </Link>
        <Link
          href="/creances/nouvelle"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-forest-700 py-2.5 text-xs font-medium text-forest-50"
        >
          <Plus size={14} /> Enregistrer une vente
        </Link>
      </div>
    </div>
  );
}
