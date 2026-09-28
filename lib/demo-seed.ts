import type { CreditSale, Debtor, Payment } from "./db/dexie";

// Utilisees UNIQUEMENT pour l'apercu public (visiteur non connecte).
// Jamais ecrites en base, jamais melangees aux vraies donnees — voir
// components/DemoBanner.tsx et app/page.tsx.

export const DEMO_MERCHANT_NAME = "Boutique exemple";

export const demoDebtors: Debtor[] = [
  { id: "demo-1", phone: "+22670000001", fullName: "Fatou Traore", createdAt: "2026-08-01" },
  { id: "demo-2", phone: "+22670000002", fullName: "Boubacar Sanou", createdAt: "2026-08-05" },
  { id: "demo-3", phone: "+22670000003", fullName: "Aissata Kone", createdAt: "2026-07-20" },
];

const today = new Date();
function isoDaysFromNow(n: number): string {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export const demoCreditSales: CreditSale[] = [
  {
    id: "demo-sale-1",
    localUuid: "demo-sale-1",
    merchantId: "demo",
    debtorId: "demo-1",
    amount: 18000,
    dueDate: isoDaysFromNow(-4),
    status: "overdue",
    createdAt: isoDaysFromNow(-20),
  },
  {
    id: "demo-sale-2",
    localUuid: "demo-sale-2",
    merchantId: "demo",
    debtorId: "demo-2",
    amount: 32000,
    dueDate: isoDaysFromNow(1),
    status: "pending",
    createdAt: isoDaysFromNow(-10),
  },
  {
    id: "demo-sale-3",
    localUuid: "demo-sale-3",
    merchantId: "demo",
    debtorId: "demo-3",
    amount: 12000,
    dueDate: isoDaysFromNow(-15),
    status: "paid",
    createdAt: isoDaysFromNow(-30),
  },
];

export const demoPayments: Payment[] = [
  {
    id: "demo-pay-1",
    localUuid: "demo-pay-1",
    creditSaleId: "demo-sale-3",
    amount: 12000,
    method: "orange_money",
    paidAt: isoDaysFromNow(-16),
  },
];

export const demoRecoveredThisMonth = 42000;
