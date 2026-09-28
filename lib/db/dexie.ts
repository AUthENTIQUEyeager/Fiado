import Dexie, { type Table } from "dexie";

// Miroir local (IndexedDB) du schema Supabase. Toute ecriture passe
// d'abord ici, avant toute tentative reseau — voir lib/sync.ts.

export interface Merchant {
  id: string;
  authUserId?: string;
  businessName: string;
  phone: string;
  email?: string;
  filiere: string;
  marketId?: string;
  marketName?: string;
  plan: "free" | "pro";
  onboardingSurvey?: Record<string, string>;
  createdAt: string;
}

export interface Market {
  id: string;
  name: string;
  city: string;
}

export interface Debtor {
  id: string;
  phone: string;
  fullName: string;
  createdAt: string;
}

export type CreditSaleStatus = "pending" | "partial" | "paid" | "overdue" | "disputed";

export interface CreditSale {
  id: string;
  localUuid: string;
  merchantId: string;
  debtorId: string;
  amount: number;
  dueDate: string; // ISO date
  status: CreditSaleStatus; // cache — toujours recalcule via lib/status.ts
  createdAt: string;
  syncedAt?: string;
}

export type PaymentMethod = "especes" | "orange_money" | "wave" | "moov_money";

export interface Payment {
  id: string;
  localUuid: string;
  creditSaleId: string;
  amount: number;
  method: PaymentMethod;
  paidAt: string;
}

export interface ReminderLogEntry {
  id: string;
  creditSaleId: string;
  channel: "whatsapp" | "sms";
  template: "J-3" | "J0" | "J+3" | "J+10_escalade";
  status: "sent" | "delivered" | "failed" | "pending";
  sentAt: string;
}

export interface RiskReport {
  id: string;
  debtorId: string;
  reportedBy: string;
  marketId: string;
  creditSaleId?: string;
  reason?: string;
  debtorResponse?: string;
  status: "open" | "contested" | "resolved" | "confirmed";
  createdAt: string;
}

// Trace legere des verifications de client (recherche de fiabilite avant
// vente) — sert a l'encart "Activite du jour" sur l'accueil. 100% local
// pour l'instant, pas de sync Supabase (voir components/DailyActivityPanel.tsx).
export interface VerificationCheck {
  id: string;
  merchantId: string;
  debtorPhone: string;
  checkedAt: string; // ISO date
}

export interface SyncQueueItem {
  id?: number;
  table: "merchants" | "debtors" | "creditSales" | "payments" | "riskReports" | "markets";
  operation: "insert" | "update";
  payload: unknown;
  localUuid: string;
  status: "pending" | "synced" | "error";
  createdAt: string;
}

export interface SessionRecord {
  id: "current";
  merchantId: string | null;
}

class FiadoDB extends Dexie {
  merchants!: Table<Merchant, string>;
  markets!: Table<Market, string>;
  debtors!: Table<Debtor, string>;
  creditSales!: Table<CreditSale, string>;
  payments!: Table<Payment, string>;
  remindersLog!: Table<ReminderLogEntry, string>;
  riskReports!: Table<RiskReport, string>;
  syncQueue!: Table<SyncQueueItem, number>;
  session!: Table<SessionRecord, string>;
  verificationChecks!: Table<VerificationCheck, string>;

  constructor() {
    super("fiado");
    this.version(1).stores({
      merchants: "id, phone",
      debtors: "id, phone",
      creditSales: "id, localUuid, merchantId, debtorId, status, dueDate",
      payments: "id, localUuid, creditSaleId",
      remindersLog: "id, creditSaleId",
      riskReports: "id, debtorId, marketId, status",
      syncQueue: "++id, table, status",
      session: "id",
    });
    this.version(2).stores({
      markets: "id, name, city",
    });
    this.version(3).stores({
      verificationChecks: "id, merchantId, checkedAt",
    });
  }
}

export const db = new FiadoDB();
