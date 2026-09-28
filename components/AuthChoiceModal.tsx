"use client";

import { useRouter } from "next/navigation";

interface AuthChoiceModalProps {
  next: string;
  onClose: () => void;
}

// Avant, un clic sur un bouton protege (ou un acces direct a une page
// protegee) redirigeait tout de suite vers l'inscription, meme pour un
// commercant qui avait deja un compte. Cette fenetre laisse le choix
// avant d'aller plus loin.
export function AuthChoiceModal({ next, onClose }: AuthChoiceModalProps) {
  const router = useRouter();
  const nextParam = encodeURIComponent(next);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/50 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-gate-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-t-3xl bg-white p-6 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="auth-gate-title" className="font-display text-lg font-semibold text-ink-900">
            Vous avez deja un compte ?
          </h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="shrink-0 text-xl text-ink-500">
            &times;
          </button>
        </div>
        <p className="mt-1 text-sm text-ink-500">
          Connecte-toi si tu geres deja une boutique sur FIADO, ou cree ton compte en quelques secondes.
        </p>

        <button
          type="button"
          onClick={() => router.push(`/login?next=${nextParam}`)}
          className="mt-5 w-full rounded-xl bg-forest-700 py-3.5 font-medium text-forest-50"
        >
          Se connecter
        </button>
        <button
          type="button"
          onClick={() => router.push(`/onboarding?next=${nextParam}`)}
          className="mt-3 w-full rounded-xl border border-forest-700 py-3.5 font-medium text-forest-700"
        >
          Creer un compte
        </button>
      </div>
    </div>
  );
}
