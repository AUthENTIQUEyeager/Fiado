import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

// Verifie le code WhatsApp, puis cree une VRAIE session Supabase pour ce
// numero de telephone — sans jamais passer par le fournisseur SMS de
// Supabase (qu'on evite volontairement, voir la discussion cout).
//
// Comment : Supabase n'expose pas de "cree-moi une session pour cet
// utilisateur" cote admin. Le contournement standard est de generer un
// lien magique server-side (admin.generateLink), puis de faire echanger
// son token cote client via supabase.auth.verifyOtp — c'est ce que fait
// ce fichier + lib/auth-context.tsx.
//
// L'identifiant Supabase Auth de chaque commercant est un email
// synthetique derive du telephone (ex. 22670000001@fiado.local) ; le
// vrai numero reste stocke normalement dans merchants.phone.

function syntheticEmail(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  return `${digits}@fiado.local`;
}

Deno.serve(async (req) => {
  const { phone, code } = await req.json();
  if (!phone || !code) {
    return new Response(JSON.stringify({ ok: false, error: "Parametres manquants" }), { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: otp, error: otpError } = await supabase
    .from("otp_codes")
    .select("*")
    .eq("phone", phone)
    .maybeSingle();

  if (otpError || !otp) {
    return new Response(JSON.stringify({ ok: false, error: "Aucun code en attente" }), { status: 400 });
  }
  if (new Date(otp.expires_at) < new Date()) {
    return new Response(JSON.stringify({ ok: false, error: "Code expire" }), { status: 400 });
  }
  if (otp.code !== code) {
    return new Response(JSON.stringify({ ok: false, error: "Code incorrect" }), { status: 400 });
  }

  await supabase.from("otp_codes").delete().eq("phone", phone);

  const email = syntheticEmail(phone);

  // 1. Tente de generer un lien magique pour un utilisateur existant.
  let link = await supabase.auth.admin.generateLink({ type: "magiclink", email });

  // 2. S'il n'existe pas encore, on le cree (confirme, sans mot de passe
  //    utilisable) puis on regenere le lien.
  if (link.error) {
    const { error: createError } = await supabase.auth.admin.createUser({
      email,
      phone,
      email_confirm: true,
      phone_confirm: true,
      password: crypto.randomUUID(),
    });
    if (createError) {
      return new Response(JSON.stringify({ ok: false, error: createError.message }), { status: 500 });
    }
    link = await supabase.auth.admin.generateLink({ type: "magiclink", email });
  }

  if (link.error || !link.data?.properties?.hashed_token) {
    return new Response(JSON.stringify({ ok: false, error: "Impossible de creer la session" }), { status: 500 });
  }

  return new Response(
    JSON.stringify({ ok: true, email, tokenHash: link.data.properties.hashed_token }),
    { headers: { "Content-Type": "application/json" } }
  );
});
