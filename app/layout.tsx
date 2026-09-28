import type { Metadata, Viewport } from "next";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/work-sans/400.css";
import "@fontsource/work-sans/500.css";
import "@fontsource/work-sans/600.css";
import { AuthProvider } from "@/lib/auth-context";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import "./globals.css";

// Paire typographique deliberee — pas Inter/system-ui par defaut.
// Auto-hebergees via @fontsource (pas d'appel a Google Fonts au runtime
// ni au build), voir globals.css pour le mapping font-display/font-body.
// Space Grotesk pour les montants et titres (chiffres distinctifs),
// Work Sans pour le texte courant (humaniste, tres lisible en petite taille).

export const metadata: Metadata = {
  title: "FIADO — Carnet de credit",
  description: "Enregistre tes ventes a credit, relance automatiquement, verifie la fiabilite avant de vendre a credit.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#04342C",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="font-body min-h-screen">
        <AuthProvider>{children}</AuthProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
