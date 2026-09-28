"use client";

import { useState } from "react";
import { Home, Search, Plus, ListChecks, User, type LucideIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AuthChoiceModal } from "@/components/AuthChoiceModal";
import clsx from "clsx";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  requiresAuth: boolean;
}

const ITEMS: NavItem[] = [
  { href: "/", label: "Accueil", icon: Home, requiresAuth: false },
  { href: "/recherche", label: "Rechercher un numero", icon: Search, requiresAuth: true },
  { href: "/creances/nouvelle", label: "Enregistrer une nouvelle dette", icon: Plus, requiresAuth: true },
  { href: "/creances", label: "Mes creances", icon: ListChecks, requiresAuth: true },
  { href: "/parametres", label: "Profil", icon: User, requiresAuth: true },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  // Avant, un clic sur un item protege redirigeait tout de suite vers
  // l'inscription. On propose maintenant un choix (voir AuthChoiceModal).
  const [pendingItem, setPendingItem] = useState<NavItem | null>(null);

  const go = (item: NavItem) => {
    if (item.requiresAuth && !isAuthenticated) {
      setPendingItem(item);
      return;
    }
    router.push(item.href);
  };

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-ink-900/10 bg-sand-50/95 backdrop-blur px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2"
        aria-label="Navigation principale"
      >
        <div className="mx-auto flex max-w-md items-center justify-around">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            const isFab = item.href === "/creances/nouvelle";
            const active = pathname === item.href;

            if (isFab) {
              return (
                <button
                  key={item.href}
                  type="button"
                  aria-label={item.label}
                  onClick={() => go(item)}
                  className="-mt-8 flex h-14 w-14 items-center justify-center rounded-full bg-gold-400 text-sand-50 shadow-lg shadow-gold-400/30 active:scale-95 transition-transform ring-4 ring-sand-50"
                >
                  <Icon size={26} />
                </button>
              );
            }

            return (
              <button
                key={item.href}
                type="button"
                aria-label={item.label}
                onClick={() => go(item)}
                className={clsx(
                  "flex flex-col items-center justify-center gap-1 rounded-lg px-3 py-1.5 transition-colors",
                  active ? "text-forest-700" : "text-ink-500"
                )}
              >
                <Icon size={22} />
              </button>
            );
          })}
        </div>
      </nav>

      {pendingItem && <AuthChoiceModal next={pendingItem.href} onClose={() => setPendingItem(null)} />}
    </>
  );
}
