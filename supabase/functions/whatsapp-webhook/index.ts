// Supabase Edge Function — satisfait l'exigence de webhook de Meta pour
// activer un numero de production. FIADO n'a besoin d'aucune conversation
// entrante (send-reminders n'envoie que des messages sortants), donc
// cette fonction se contente de :
//   - repondre a la poignee de main de verification (GET)
//   - accuser reception des evenements entrants (POST), sans les traiter
//
// A DEPLOYER SANS verification JWT (Meta n'envoie pas de token Supabase) :
//   supabase functions deploy whatsapp-webhook --no-verify-jwt
//
// Variable d'environnement requise :
//   WHATSAPP_WEBHOOK_VERIFY_TOKEN — choisis une chaine au hasard, colle la
//   meme valeur dans le champ "Jeton de verification" sur Meta.

Deno.serve(async (req) => {
  const url = new URL(req.url);

  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    const expected = Deno.env.get("WHATSAPP_WEBHOOK_VERIFY_TOKEN");

    if (mode === "subscribe" && token && expected && token === expected) {
      // Meta attend la valeur brute du challenge, pas du JSON.
      return new Response(challenge ?? "", { status: 200 });
    }
    return new Response("Verification refusee", { status: 403 });
  }

  if (req.method === "POST") {
    // Accuse reception sans traiter le contenu — a completer plus tard
    // si FIADO a besoin de reagir aux messages entrants ou aux statuts
    // de livraison (necessiterait aussi de verifier X-Hub-Signature-256).
    return new Response("EVENT_RECEIVED", { status: 200 });
  }

  return new Response("Methode non supportee", { status: 405 });
});
