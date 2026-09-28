import Link from "next/link";
import { formatFcfaShort } from "@/lib/format";
import { formatRelativeDueDate } from "@/lib/format";
import { StatusBadge } from "./StatusBadge";
import type { CreditSale, Debtor } from "@/lib/db/dexie";

const TONE_BY_STATUS = {
  overdue: "overdue",
  pending: "pending",
  partial: "partial",
  paid: "paid",
  disputed: "overdue",
} as const;

export function CreanceRow({
  sale,
  debtor,
  href,
  onClick,
}: {
  sale: CreditSale;
  debtor: Debtor | undefined;
  href: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={(e) => {
        if (onClick) {
          e.preventDefault();
          onClick();
        }
      }}
      className="flex items-center justify-between border-b border-ink-900/10 py-3 first:pt-0 last:border-b-0"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-ink-900">{debtor?.fullName ?? "Client"}</p>
        <p className="text-xs text-ink-500">{formatRelativeDueDate(sale.dueDate)}</p>
      </div>
      <StatusBadge tone={TONE_BY_STATUS[sale.status]}>
        {sale.status === "paid" ? "Solde" : formatFcfaShort(sale.amount)}
      </StatusBadge>
    </Link>
  );
}
