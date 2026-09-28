import clsx from "clsx";

type Tone = "overdue" | "pending" | "paid" | "partial" | "fiable" | "a_verifier" | "risque" | "inconnu";

const TONE_STYLES: Record<Tone, string> = {
  overdue: "bg-alert-100 text-alert-900",
  pending: "bg-gold-100 text-gold-900",
  partial: "bg-gold-100 text-gold-900",
  paid: "bg-forest-100 text-forest-900",
  fiable: "bg-forest-100 text-forest-900",
  a_verifier: "bg-gold-100 text-gold-900",
  risque: "bg-alert-100 text-alert-900",
  inconnu: "bg-sand-200 text-ink-700",
};

export function StatusBadge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className={clsx("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", TONE_STYLES[tone])}>
      {children}
    </span>
  );
}
