"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { db, type Merchant } from "./db/dexie";
import { getCurrentMerchant, setCurrentMerchant as persistCurrentMerchant } from "./repo";
import { registerSyncOnReconnect, trySync } from "./sync";
import { isSupabaseConfigured, supabase } from "./supabase/client";

interface AuthContextValue {
  merchant: Merchant | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async () => {
    const current = await getCurrentMerchant();
    setMerchant(current);
    setIsLoading(false);
  };

  useEffect(() => {
    void refresh();
    registerSyncOnReconnect();
    void trySync();
  }, []);

  const logout = async () => {
    await persistCurrentMerchant(null);
    setMerchant(null);
  };

  return (
    <AuthContext.Provider value={{ merchant, isLoading, isAuthenticated: Boolean(merchant), refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit etre utilise a l'interieur de <AuthProvider>");
  return ctx;
}

// -- Creation de compte / connexion --------------------------------------
//
// Remplace l'ancien flux par code WhatsApp (supabase/functions/send-otp +
// verify-otp, desormais supprimes) : plus de message de confirmation a
// envoyer ni de code a saisir. La verification est une simple
// correspondance telephone + email en base (voir supabase/functions/
// register et login) — quasi instantanee, mais moins forte qu'une vraie
// preuve de possession du telephone ou de l'email (voir le commentaire
// dans supabase/functions/login). En mode demo (sans cle Supabase), tout
// se passe en local, sans aucune verification distante.

export interface AccountResult {
  ok: boolean;
  error?: string;
}

export async function registerAccount(phone: string, email: string): Promise<AccountResult> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.functions.invoke("register", { body: { phone, email } });
    if (error) return { ok: false, error: error.message };
    const result = data as { ok?: boolean; error?: string; authEmail?: string; tokenHash?: string } | null;
    if (!result?.ok || !result.authEmail || !result.tokenHash) {
      return { ok: false, error: result?.error ?? "Impossible de creer le compte." };
    }
    const { error: sessionError } = await supabase.auth.verifyOtp({
      email: result.authEmail,
      token: result.tokenHash,
      type: "magiclink",
    });
    return sessionError ? { ok: false, error: sessionError.message } : { ok: true };
  }

  const existing = await db.merchants.where("phone").equals(phone).first();
  if (existing) return { ok: false, error: "Un compte existe deja pour ce numero sur cet appareil." };
  return { ok: true };
}

export async function loginAccount(phone: string, email: string): Promise<AccountResult> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.functions.invoke("login", { body: { phone, email } });
    if (error) return { ok: false, error: error.message };
    const result = data as { ok?: boolean; error?: string; authEmail?: string; tokenHash?: string } | null;
    if (!result?.ok || !result.authEmail || !result.tokenHash) {
      return { ok: false, error: result?.error ?? "Aucun compte ne correspond a ce telephone et cet email." };
    }
    const { error: sessionError } = await supabase.auth.verifyOtp({
      email: result.authEmail,
      token: result.tokenHash,
      type: "magiclink",
    });
    return sessionError ? { ok: false, error: sessionError.message } : { ok: true };
  }

  const merchant = await db.merchants.where("phone").equals(phone).first();
  if (!merchant || (merchant.email ?? "").toLowerCase() !== email.toLowerCase()) {
    return { ok: false, error: "Aucun compte ne correspond a ce telephone et cet email." };
  }
  return { ok: true };
}

export async function loginExistingMerchantByPhone(phone: string, email: string): Promise<Merchant | null> {
  if (isSupabaseConfigured && supabase) {
    const { data: session } = await supabase.auth.getUser();
    const authUserId = session.user?.id;
    if (!authUserId) return null;

    const { data: remote } = await supabase.from("merchants").select("*").eq("auth_user_id", authUserId).maybeSingle();
    if (!remote) return null;

    const merchant: Merchant = {
      id: remote.id,
      authUserId: remote.auth_user_id,
      businessName: remote.business_name,
      phone: remote.phone,
      email: remote.email ?? undefined,
      filiere: remote.filiere,
      marketId: remote.market_id ?? undefined,
      plan: remote.plan,
      onboardingSurvey: remote.onboarding_survey ?? undefined,
      createdAt: remote.created_at,
    };
    await db.merchants.put(merchant);
    await persistCurrentMerchant(merchant.id);
    return merchant;
  }

  const merchant = await db.merchants.where("phone").equals(phone).first();
  if (!merchant || (merchant.email ?? "").toLowerCase() !== email.toLowerCase()) return null;
  await persistCurrentMerchant(merchant.id);
  return merchant;
}
