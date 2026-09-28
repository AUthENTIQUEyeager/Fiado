"use client";

import { useRouter } from "next/navigation";

export function DemoBanner() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.push("/onboarding")}
      className="block w-full bg-forest-800 px-4 py-2.5 text-left text-xs text-forest-50"
    >
      <span className="font-medium">Mode demonstration</span> — donnees d&apos;exemple. Touche ici pour creer ton compte.
    </button>
  );
}
