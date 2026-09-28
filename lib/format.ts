export function formatFcfa(amount: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(amount)) + " FCFA";
}

export function formatFcfaShort(amount: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(amount));
}

export function formatRelativeDueDate(dueDate: string): string {
  const due = new Date(dueDate);
  const today = new Date();
  const diffDays = Math.round(
    (due.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24)
  );
  if (diffDays === 0) return "Echeance aujourd'hui";
  if (diffDays === 1) return "Echeance demain";
  if (diffDays > 1) return `Echeance dans ${diffDays} jours`;
  if (diffDays === -1) return "Echeance il y a 1 jour";
  return `Echeance il y a ${Math.abs(diffDays)} jours`;
}
