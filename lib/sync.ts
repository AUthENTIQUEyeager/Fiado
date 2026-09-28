import { db, type SyncQueueItem } from "./db/dexie";
import { isSupabaseConfigured, supabase } from "./supabase/client";

// Ecriture optimiste : tout passe par Dexie d'abord (voir lib/repo.ts).
// Cette file tente ensuite de pousser vers Supabase, en arriere-plan,
// sans jamais bloquer l'interface. Si Supabase n'est pas configure
// (voir README.md), la file reste "pending" indefiniment — sans risque,
// puisque Dexie est deja la source de verite locale.

const TABLE_MAP: Record<SyncQueueItem["table"], string> = {
  merchants: "merchants",
  debtors: "debtors",
  creditSales: "credit_sales",
  payments: "payments",
  riskReports: "risk_reports",
  markets: "markets",
};

export async function enqueueSync(item: Omit<SyncQueueItem, "id" | "status" | "createdAt">) {
  await db.syncQueue.add({
    ...item,
    status: "pending",
    createdAt: new Date().toISOString(),
  });
  void trySync();
}

let syncing = false;

export async function trySync() {
  if (!isSupabaseConfigured || !supabase || syncing) return;
  syncing = true;
  try {
    const pending = await db.syncQueue.where("status").equals("pending").toArray();
    for (const item of pending) {
      const table = TABLE_MAP[item.table];
      try {
        const { error } = await supabase.from(table).upsert(item.payload as Record<string, unknown>);
        if (error) throw error;
        if (item.id !== undefined) {
          await db.syncQueue.update(item.id, { status: "synced" });
        }
      } catch {
        // Reste "pending" — reessaie a la prochaine occasion (retour reseau, nouvel appel).
      }
    }
  } finally {
    syncing = false;
  }
}

export function registerSyncOnReconnect() {
  if (typeof window === "undefined") return;
  window.addEventListener("online", () => void trySync());
}
