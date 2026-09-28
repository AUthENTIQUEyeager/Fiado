"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loginAccount, loginExistingMerchantByPhone, useAuth } from "@/lib/auth-context";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const { refresh } = useAuth();
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Remplace l'ancien envoi de code WhatsApp : la connexion verifie juste
  // que le couple telephone + email correspond a un compte existant (voir
  // lib/auth-context.tsx, loginAccount) — pas de code a recevoir.
  const submit = async () => {
    if (phone.trim().length < 8) {
      setError("Entre un numero valide.");
      return;
    }
    if (!email.trim().includes("@")) {
      setError("Entre un email valide.");
      return;
    }
    setSubmitting(true);
    setError(null);

    const result = await loginAccount(phone.trim(), email.trim());
    if (!result.ok) {
      setError(result.error ?? "Connexion impossible.");
      setSubmitting(false);
      return;
    }

    const merchant = await loginExistingMerchantByPhone(phone.trim(), email.trim());
    setSubmitting(false);
    if (!merchant) {
      setError("Aucun compte trouve pour ce numero et cet email.");
      return;
    }

    await refresh();
    router.replace(next);
  };

  return (
    <main className="flex min-h-screen flex-col justify-center bg-sand-50 px-6">
      <h1 className="font-display text-2xl font-semibold text-ink-900">Se connecter</h1>
      <p className="mt-1 text-sm text-ink-500">Ton telephone et l&apos;email utilises a l&apos;inscription.</p>

      <label htmlFor="login-phone" className="mt-6 block text-xs font-medium text-ink-500">
        Telephone
      </label>
      <input
        id="login-phone"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="+226 70 00 00 00"
        inputMode="tel"
        className="mt-1 w-full rounded-xl border border-ink-900/15 bg-white px-4 py-3 outline-none"
      />

      <label htmlFor="login-email" className="mt-4 block text-xs font-medium text-ink-500">
        Email
      </label>
      <input
        id="login-email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="toi@exemple.com"
        inputMode="email"
        type="email"
        className="mt-1 w-full rounded-xl border border-ink-900/15 bg-white px-4 py-3 outline-none"
      />

      {error && <p className="mt-2 text-xs text-alert-600">{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={submitting}
        className="mt-6 w-full rounded-xl bg-forest-700 py-3.5 font-medium text-forest-50 disabled:opacity-50"
      >
        {submitting ? "Connexion..." : "Se connecter"}
      </button>

      <a href={`/onboarding?next=${encodeURIComponent(next)}`} className="mt-6 text-center text-sm text-forest-700 underline">
        Pas encore de compte ? Inscris-toi
      </a>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-sand-50" />}>
      <LoginForm />
    </Suspense>
  );
}
