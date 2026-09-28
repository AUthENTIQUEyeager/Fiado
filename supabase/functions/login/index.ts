// Supabase Edge Function — connexion sur un appareil qui n'a pas encore
// de session locale (nouveau telephone, cache navigateur vide, etc.).
//
// Remplace l'ancien flux OTP WhatsApp : au lieu d'envoyer un code et de
// le faire ressaisir, on verifie juste que le telephone ET l'email
// fournis correspondent a la meme ligne `merchants` en base — une
// simple requete, quasi instantanee. C'est moins fort qu'une preuve de
// possession du telephone (WhatsApp) ou de l'email (lien clique), donc
// n'importe qui connaissant les deux peut se connecter : acceptable
// pour ce produit, mais a garder en tete si des donnees plus sensibles
// arrivent plus tard.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

function syntheticEmail(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  return `${digits}@fiado.local`;
}

Deno.serve(async (req) => {
  const { phone, email } = await req.json();
  if (!phone || !email) {
    return new Response(JSON.stringify({ ok: false, error: "Telephone et email requis" }), { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: merchant } = await supabase
    .from("merchants")
    .select("id, phone, email")
    .eq("phone", phone)
    .maybeSingle();

  const matches = merchant?.email && String(merchant.email).toLowerCase() === String(email).toLowerCase();
  if (!merchant || !matches) {
    return new Response(
      JSON.stringify({ ok: false, error: "Aucun compte ne correspond a ce telephone et cet email." }),
      { status: 404 }
    );
  }

  const authEmail = syntheticEmail(phone);
  const link = await supabase.auth.admin.generateLink({ type: "magiclink", email: authEmail });
  if (link.error || !link.data?.properties?.hashed_token) {
    return new Response(JSON.stringify({ ok: false, error: "Impossible de creer la session" }), { status: 500 });
  }

  return new Response(
    JSON.stringify({ ok: true, authEmail, tokenHash: link.data.properties.hashed_token }),
    { headers: { "Content-Type": "application/json" } }
  );
});
