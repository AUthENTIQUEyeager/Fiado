"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { usePathname } from "next/navigation";
import { useAuth } from "./auth-context";
import { db, type CreditSale, type Debtor } from "./db/dexie";
import { deriveStatus } from "./status";

// -- Garde d'authentification ---------------------------------------------
//
// Avant, chaque page protegee (creances, nouvelle creance, fiche
// debiteur, parametres) redirigeait automatiquement vers l'inscription
// des qu'elle detectait l'absence de session — meme pour un commercant
// qui avait deja un compte. Desormais ce hook expose juste l'etat ; la
// page affiche <AuthChoiceModal /> (voir components/AuthChoiceModal.tsx)
// plutot que de rediriger d'office.
export function useRequireAuth() {
  const { merchant, isLoading, isAuthenticated } = useAuth();
  const pathname = usePathname();

  return { merchant, isLoading, isAuthenticated, pathname };
}

// -- Creances reactives -----------------------------------------------------
//
// `dexie-react-hooks` etait deja une dependance du projet mais n'etait
// utilise nulle part : chaque page refaisait un useEffect + fetch manuel,
// puis rappelait sa propre fonction de rechargement apres chaque action
// (paiement, signalement). Avec useLiveQuery, l'UI se reabonne
// automatiquement des qu'une ecriture touche creditSales/payments/debtors —
// y compris une ecriture qui arrive par la sync Supabase en arriere-plan,
// que l'ancien code ne voyait jamais tant que l'utilisateur ne rechargeait
// pas la page.
//
// Le statut est toujours recalcule ici (voir lib/status.ts), jamais lu tel
// quel en base : avant, seules /creances et l'accueil passaient par ce
// recalcul (via lib/repo.ts) ; la fiche debiteur affichait le champ status
// brut de Dexie, qui pouvait rester "pending" plusieurs jours apres
// l'echeance si l'utilisateur n'etait pas repasse par les deux autres
// pages entretemps.

export interface SaleWithDebtor extends CreditSale {
  debtor?: Debtor;
}

export function useMerchantSales(merchantId: string | undefined): SaleWithDebtor[] | undefined {
  return useLiveQuery(async (): Promise<SaleWithDebtor[]> => {
    if (!merchantId) return [];
    const sales = await db.creditSales.where("merchantId").equals(merchantId).toArray();
    return attachStatusAndDebtor(sales);
  }, [merchantId]);
}

export function useDebtorSales(
  debtorId: string | undefined,
  merchantId: string | undefined
): SaleWithDebtor[] | undefined {
  return useLiveQuery(async (): Promise<SaleWithDebtor[]> => {
    if (!debtorId || !merchantId) return [];
    const sales = await db.creditSales
      .where("debtorId")
      .equals(debtorId)
      .and((s) => s.merchantId === merchantId)
      .toArray();
    return attachStatusAndDebtor(sales);
  }, [debtorId, merchantId]);
}

async function attachStatusAndDebtor(sales: CreditSale[]): Promise<SaleWithDebtor[]> {
  const debtors = await db.debtors.bulkGet(sales.map((s) => s.debtorId));
  const debtorById = new Map(debtors.filter((d): d is Debtor => Boolean(d)).map((d) => [d.id, d]));

  const result: SaleWithDebtor[] = [];
  for (const sale of sales) {
    const payments = await db.payments.where("creditSaleId").equals(sale.id).toArray();
    result.push({ ...sale, status: deriveStatus(sale, payments), debtor: debtorById.get(sale.debtorId) });
  }
  return result;
}

// -- Activite du jour --------------------------------------------------------
//
// Nombre de clients distincts verifies (via /recherche) au cours des 7
// derniers jours — voir components/DailyActivityPanel.tsx. Un meme client
// verifie plusieurs fois ne compte qu'une fois : le chiffre reflete des
// clients couverts, pas un nombre de recherches.
export function useWeeklyVerificationCount(merchantId: string | undefined): number | undefined {
  return useLiveQuery(async (): Promise<number> => {
    if (!merchantId) return 0;
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const checks = await db.verificationChecks
      .where("merchantId")
      .equals(merchantId)
      .and((c) => new Date(c.checkedAt).getTime() >= weekAgo)
      .toArray();
    return new Set(checks.map((c) => c.debtorPhone)).size;
  }, [merchantId]);
}
