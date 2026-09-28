import type { CreditSale, Payment, RiskReport } from "./db/dexie";
import { REMINDER_THRESHOLDS, countsAsOnTime, totalPaid } from "./status";

export type ReliabilityBadge = "inconnu" | "fiable" | "a_verifier" | "risque";

export interface ReliabilityResult {
  badge: ReliabilityBadge;
  label: string;
  detail: string;
}

/**
 * Reproduit cote client la logique qui, en production, vit dans une
 * fonction RPC Supabase (jamais un acces direct aux lignes risk_reports
 * d'un autre commercant — voir spec V1 section 4, RLS).
 */
export function computeReliability(params: {
  sales: CreditSale[];
  paymentsBySale: Record<string, Payment[]>;
  confirmedReports: RiskReport[];
}): ReliabilityResult {
  const { sales, paymentsBySale, confirmedReports } = params;

  const openConfirmed = confirmedReports.filter((r) => r.status === "confirmed");
  if (openConfirmed.length >= REMINDER_THRESHOLDS.minReportsForNetworkImpact) {
    return {
      badge: "risque",
      label: "Risque",
      detail: `${openConfirmed.length} signalements confirmes`,
    };
  }

  const openIsolated = confirmedReports.filter((r) => r.status === "open" || r.status === "confirmed");
  if (openIsolated.length >= 1 && openConfirmed.length < REMINDER_THRESHOLDS.minReportsForNetworkImpact) {
    return {
      badge: "a_verifier",
      label: "A verifier",
      detail: "Signalement isole, pas encore confirme",
    };
  }

  if (sales.length === 0) {
    return { badge: "inconnu", label: "Aucune donnee", detail: "Nouveau numero" };
  }

  let onTimeCount = 0;
  for (const sale of sales) {
    const payments = paymentsBySale[sale.id] ?? [];
    const paid = totalPaid(payments);
    if (paid < sale.amount) continue;
    const lastPayment = payments[payments.length - 1];
    if (lastPayment && countsAsOnTime(sale.dueDate, lastPayment.paidAt)) {
      onTimeCount += 1;
    }
  }

  const ratio = onTimeCount / sales.length;
  if (ratio >= 0.7) {
    return {
      badge: "fiable",
      label: "Fiable",
      detail: `${onTimeCount}/${sales.length} creances payees a temps`,
    };
  }

  return {
    badge: "a_verifier",
    label: "A verifier",
    detail: `${onTimeCount}/${sales.length} creances payees a temps`,
  };
}
