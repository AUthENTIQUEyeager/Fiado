// Supabase Edge Function — declenchee quotidiennement par pg_cron.
//
// Envoie via le bridge WhatsApp maison (Baileys, voir /whatsapp-bridge
// dans le depot separe) plutot que l'API Cloud Meta — pas de compte
// developpeur, pas de carte bancaire, pas de templates a faire
// approuver. En contrepartie, ce chemin n'est pas couvert par les
// conditions officielles de WhatsApp (voir README du bridge sur le
// risque de bannissement) et le texte est libre plutot que des
// templates pre-approuves.
//
// Variables d'environnement requises (a definir via `supabase secrets set`) :
//   WHATSAPP_BRIDGE_URL   (ex. https://ton-serveur.example.com)
//   WHATSAPP_BRIDGE_TOKEN (le meme BRIDGE_TOKEN que cote bridge)
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (fournies automatiquement par Supabase)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type ReminderTemplate = "j_moins_3" | "j_0" | "j_plus_3" | "j_plus_10_escalade";

function daysLate(dueDate: string): number {
  const due = new Date(dueDate);
  const today = new Date();
  const diff = today.setHours(0, 0, 0, 0) - due.setHours(0, 0, 0, 0);
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function templateFor(dueDate: string): ReminderTemplate | null {
  const late = daysLate(dueDate);
  if (late === -3) return "j_moins_3";
  if (late === 0) return "j_0";
  if (late === 3) return "j_plus_3";
  if (late === 10) return "j_plus_10_escalade";
  return null;
}

// Plus de templates a faire approuver par Meta : le texte est ecrit ici
// directement, avec le nom du commerce inclus (une lacune de l'ancienne
// version Meta de ce fichier — un debiteur avec plusieurs commercants
// FIADO ne pouvait pas savoir lequel reclamait le paiement).
function messageFor(template: ReminderTemplate, debtorName: string, amount: number, businessName: string): string {
  const amountText = `${amount.toLocaleString("fr-FR")} FCFA`;
  switch (template) {
    case "j_moins_3":
      return `Bonjour ${debtorName}, rappel de ${businessName} : votre achat de ${amountText} arrive a echeance dans 3 jours.`;
    case "j_0":
      return `Bonjour ${debtorName}, votre paiement de ${amountText} chez ${businessName} est du aujourd'hui.`;
    case "j_plus_3":
      return `Bonjour ${debtorName}, votre paiement de ${amountText} chez ${businessName} est en retard de 3 jours. Merci de regulariser rapidement.`;
    case "j_plus_10_escalade":
      return `Bonjour ${debtorName}, votre paiement de ${amountText} chez ${businessName} est en retard de 10 jours. Merci de contacter le commerce au plus vite.`;
  }
}

async function sendViaBridge(phone: string, message: string): Promise<void> {
  const bridgeUrl = Deno.env.get("WHATSAPP_BRIDGE_URL");
  const bridgeToken = Deno.env.get("WHATSAPP_BRIDGE_TOKEN");
  if (!bridgeUrl || !bridgeToken) {
    throw new Error("Variables WHATSAPP_BRIDGE_URL / WHATSAPP_BRIDGE_TOKEN manquantes");
  }

  // Le bridge repond 202 des que le message est mis en file — l'envoi
  // reel est espace de son cote (voir SEND_DELAY_MS dans le bridge),
  // cette fonction n'attend pas la livraison reelle.
  const res = await fetch(`${bridgeUrl}/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${bridgeToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ phone, message }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Echec mise en file WhatsApp (${res.status}): ${body}`);
  }
}

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: sales, error } = await supabase
    .from("credit_sales")
    .select("id, amount, due_date, debtor:debtors(phone, full_name), merchant:merchants(business_name)")
    .not("status", "eq", "paid");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  let queued = 0;
  const failures: string[] = [];

  for (const sale of sales ?? []) {
    const template = templateFor(sale.due_date as string);
    if (!template) continue;

    const debtor = sale.debtor as unknown as { phone: string; full_name: string } | null;
    const merchant = sale.merchant as unknown as { business_name: string } | null;
    if (!debtor?.phone) continue;

    const message = messageFor(
      template,
      debtor.full_name ?? "Client",
      sale.amount as number,
      merchant?.business_name ?? "votre commercant"
    );

    try {
      await sendViaBridge(debtor.phone, message);
      await supabase.from("reminders_log").insert({
        credit_sale_id: sale.id,
        channel: "whatsapp",
        template,
        status: "queued",
      });
      queued += 1;
    } catch (err) {
      failures.push(`${sale.id}: ${(err as Error).message}`);
      await supabase.from("reminders_log").insert({
        credit_sale_id: sale.id,
        channel: "whatsapp",
        template,
        status: "failed",
      });
    }
  }

  return new Response(JSON.stringify({ queued, failures }), {
    headers: { "Content-Type": "application/json" },
  });
});
