import type { CreditSale, CreditSaleStatus, Payment } from "./db/dexie";

// Le statut n'est JAMAIS la source de verite — il est toujours recalcule
// depuis due_date + la somme des paiements. Ca elimine la plupart des
// conflits de synchronisation par construction (voir spec V1, section 5).

export function totalPaid(payments: Payment[]): number {
  return payments.reduce((sum, p) => sum + p.amount, 0);
}

export function daysLate(dueDate: string, today: Date = new Date()): number {
  const due = new Date(dueDate);
  const diffMs = today.setHours(0, 0, 0, 0) - due.setHours(0, 0, 0, 0);
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function deriveStatus(sale: Pick<CreditSale, "amount" | "dueDate">, payments: Payment[]): CreditSaleStatus {
  const paid = totalPaid(payments);
  if (paid >= sale.amount) return "paid";
  const late = daysLate(sale.dueDate);
  if (paid > 0) return "partial";
  if (late > 0) return "overdue";
  return "pending";
}

// Seuils par defaut (ajustables par filiere plus tard — voir spec section 8/10).
export const REMINDER_THRESHOLDS = {
  /** Au-dela de ce retard, un paiement compte encore comme "a temps" dans le score. */
  toleranceDays: 7,
  /** A partir de ce retard, un signalement devient possible. */
  reportEligibleDays: 15,
  /** Nombre de signalements de commercants differents avant impact reseau visible. */
  minReportsForNetworkImpact: 2,
} as const;

export function isReportEligible(dueDate: string): boolean {
  return daysLate(dueDate) >= REMINDER_THRESHOLDS.reportEligibleDays;
}

export function countsAsOnTime(dueDate: string, paidAt: string): boolean {
  const late = daysLate(dueDate, new Date(paidAt));
  return late <= REMINDER_THRESHOLDS.toleranceDays;
}

/** Choisit le template de relance a envoyer aujourd'hui pour une creance donnee, ou null si aucune n'est due. */
export function reminderTemplateFor(dueDate: string): ReminderTemplate | null {
  const late = daysLate(dueDate);
  if (late === -3) return "J-3";
  if (late === 0) return "J0";
  if (late === 3) return "J+3";
  if (late === 10) return "J+10_escalade";
  return null;
}

export type ReminderTemplate = "J-3" | "J0" | "J+3" | "J+10_escalade";
