// Supabase Edge Function — appelee par l'app au moment de l'inscription/connexion.
// Envoie le code via WhatsApp (API Cloud Meta directe), pas de SMS payant.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const META_GRAPH_URL = "https://graph.facebook.com/v20.0";
const OTP_TTL_MINUTES = 10;

Deno.serve(async (req) => {
  const { phone } = await req.json();
  if (!phone || typeof phone !== "string") {
    return new Response(JSON.stringify({ error: "Numero manquant" }), { status: 400 });
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { error } = await supabase.from("otp_codes").upsert({ phone, code, expires_at: expiresAt });
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const phoneNumberId = Deno.env.get("META_WA_PHONE_NUMBER_ID");
  const token = Deno.env.get("META_WA_ACCESS_TOKEN");
  if (!phoneNumberId || !token) {
    return new Response(JSON.stringify({ error: "WhatsApp non configure" }), { status: 500 });
  }

  const res = await fetch(`${META_GRAPH_URL}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phone,
      type: "template",
      template: {
        name: "otp_code", // categorie "authentication" dans Meta Business Manager
        language: { code: "fr" },
        components: [{ type: "body", parameters: [{ type: "text", text: code }] }],
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    return new Response(JSON.stringify({ error: `Echec envoi WhatsApp: ${body}` }), { status: 502 });
  }

  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
});
