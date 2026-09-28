import { db, type CreditSale, type Debtor, type Market, type Merchant, type Payment, type PaymentMethod, type RiskReport } from "./db/dexie";
import { newId } from "./id";
import { deriveStatus } from "./status";
import { enqueueSync } from "./sync";
import { isSupabaseConfigured, supabase } from "./supabase/client";

// -- Session --------------------------------------------------------------

export async function getCurrentMerchant(): Promise<Merchant | null> {
  const session = await db.session.get("current");
  if (!session?.merchantId) return null;
  return (await db.merchants.get(session.merchantId)) ?? null;
}

export async function setCurrentMerchant(merchantId: string | null) {
  await db.session.put({ id: "current", merchantId });
}

// -- Marches --------------------------------------------------------------

export async function findOrCreateMarket(name: string, city: string): Promise<Market> {
  const existing = await db.markets.filter((m) => m.name === name && m.city === city).first();
  if (existing) return existing;
  const market: Market = { id: newId(), name, city };
  await db.markets.put(market);
  await enqueueSync({
    table: "markets",
    operation: "insert",
    localUuid: market.id,
    payload: { id: market.id, name: market.name, city: market.city },
  });
  return market;
}

// -- Onboarding -------------------------------------------------------------

export interface OnboardingInput {
  businessName: string;
  marketName: string;
  city: string;
  phone: string;
  email: string;
  survey: Record<string, string>;
}

export async function createMerchantFromOnboarding(input: OnboardingInput): Promise<Merchant> {
  const market = await findOrCreateMarket(input.marketName, input.city);

  let authUserId: string | undefined;
  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase.auth.getUser();
    authUserId = data.user?.id;
  }

  const merchant: Merchant = {
    id: newId(),
    authUserId,
    businessName: input.businessName,
    phone: input.phone,
    email: input.email,
    filiere: "tissu",
    marketId: market.id,
    marketName: `${input.marketName} (${input.city})`,
    plan: "free",
    onboardingSurvey: input.survey,
    createdAt: new Date().toISOString(),
  };
  await db.merchants.put(merchant);
  await setCurrentMerchant(merchant.id);
  await enqueueSync({
    table: "merchants",
    operation: "insert",
    localUuid: merchant.id,
    payload: {
      id: merchant.id,
      auth_user_id: authUserId,
      business_name: merchant.businessName,
      phone: merchant.phone,
      email: merchant.email,
      filiere: merchant.filiere,
      market_id: market.id,
      plan: merchant.plan,
      onboarding_survey: merchant.onboardingSurvey,
    },
  });
  return merchant;
}

// -- Debiteurs ---------------------------------------------------------------

export async function findOrCreateDebtor(phone: string, fullName: string): Promise<Debtor> {
  const byPhone = await db.debtors.where("phone").equals(phone).first();
  if (byPhone) return byPhone;
  const debtor: Debtor = { id: newId(), phone, fullName, createdAt: new Date().toISOString() };
  await db.debtors.put(debtor);
  await enqueueSync({
    table: "debtors",
    operation: "insert",
    localUuid: debtor.id,
    payload: { id: debtor.id, phone: debtor.phone, full_name: debtor.fullName },
  });
  return debtor;
}

export async function searchDebtorByPhone(phone: string): Promise<Debtor | undefined> {
  return db.debtors.where("phone").equals(phone).first();
}

// -- Creances -----------------------------------------------------------------

export interface NewCreditSaleInput {
  merchantId: string;
  debtorPhone: string;
  debtorName: string;
  amount: number;
  dueDate: string;
}

export async function createCreditSale(input: NewCreditSaleInput): Promise<CreditSale> {
  const debtor = await findOrCreateDebtor(input.debtorPhone, input.debtorName);
  const sale: CreditSale = {
    id: newId(),
    localUuid: newId(),
    merchantId: input.merchantId,
    debtorId: debtor.id,
    amount: input.amount,
    dueDate: input.dueDate,
    status: deriveStatus({ amount: input.amount, dueDate: input.dueDate }, []),
    createdAt: new Date().toISOString(),
  };
  await db.creditSales.put(sale);
  await enqueueSync({
    table: "creditSales",
    operation: "insert",
    localUuid: sale.localUuid,
    payload: {
      id: sale.id,
      merchant_id: sale.merchantId,
      debtor_id: sale.debtorId,
      amount: sale.amount,
      due_date: sale.dueDate,
      local_uuid: sale.localUuid,
    },
  });
  return sale;
}

// La lecture des creances (avec statut toujours recalcule, jamais lu tel
// quel en base) vit desormais dans lib/hooks.ts (useMerchantSales /
// useDebtorSales), en useLiveQuery — ca evite d'avoir deux facons
// differentes de lire les memes donnees et ca rend l'UI reactive aux
// ecritures de sync entrantes. Voir lib/hooks.ts pour le detail.

export async function addPayment(creditSaleId: string, amount: number, method: PaymentMethod): Promise<Payment> {
  const payment: Payment = {
    id: newId(),
    localUuid: newId(),
    creditSaleId,
    amount,
    method,
    paidAt: new Date().toISOString(),
  };
  await db.payments.put(payment);
  const sale = await db.creditSales.get(creditSaleId);
  if (sale) {
    const payments = await db.payments.where("creditSaleId").equals(creditSaleId).toArray();
    const status = deriveStatus(sale, payments);
    await db.creditSales.update(creditSaleId, { status });
  }
  await enqueueSync({
    table: "payments",
    operation: "insert",
    localUuid: payment.localUuid,
    payload: {
      id: payment.id,
      credit_sale_id: payment.creditSaleId,
      amount: payment.amount,
      method: payment.method,
      local_uuid: payment.localUuid,
    },
  });
  return payment;
}

export async function getPaymentsForSale(creditSaleId: string): Promise<Payment[]> {
  return db.payments.where("creditSaleId").equals(creditSaleId).toArray();
}

// -- Signalements / reseau -----------------------------------------------------

export async function createRiskReport(input: {
  debtorId: string;
  reportedBy: string;
  marketId: string;
  creditSaleId?: string;
  reason?: string;
}): Promise<RiskReport> {
  const report: RiskReport = {
    id: newId(),
    debtorId: input.debtorId,
    reportedBy: input.reportedBy,
    marketId: input.marketId,
    creditSaleId: input.creditSaleId,
    reason: input.reason,
    status: "open",
    createdAt: new Date().toISOString(),
  };
  await db.riskReports.put(report);
  await enqueueSync({
    table: "riskReports",
    operation: "insert",
    localUuid: report.id,
    payload: {
      id: report.id,
      debtor_id: report.debtorId,
      reported_by: report.reportedBy,
      market_id: report.marketId,
      credit_sale_id: report.creditSaleId,
      reason: report.reason,
      status: report.status,
    },
  });
  return report;
}

export async function getRiskReportsForDebtor(debtorId: string): Promise<RiskReport[]> {
  return db.riskReports.where("debtorId").equals(debtorId).toArray();
}

// -- Activite / verifications ----------------------------------------------
//
// Trace chaque verification de fiabilite faite depuis /recherche — sert a
// l'encart "Activite du jour" sur l'accueil (voir components/
// DailyActivityPanel.tsx et lib/hooks.ts, useWeeklyVerificationCount).
// 100% local pour l'instant, pas de sync Supabase.

export async function logVerificationCheck(merchantId: string, debtorPhone: string): Promise<void> {
  await db.verificationChecks.add({
    id: newId(),
    merchantId,
    debtorPhone,
    checkedAt: new Date().toISOString(),
  });
}
