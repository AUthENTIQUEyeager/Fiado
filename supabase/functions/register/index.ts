// Supabase Edge Function — appelee a la fin de l'onboarding, une fois
// telephone + email saisis.
//
// Remplace l'ancien flux OTP WhatsApp (send-otp + verify-otp) : plus de
// message de confirmation a envoyer ni de code a saisir. La seule
// verification est un controle de doublon en base (telephone / email
// deja utilises), quasi instantane — puis la session est creee
// directement via le meme mecanisme de lien magique qu'avant (voir
// lib/auth-context.tsx, registerAccount).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

function syntheticEmail(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  return `${digits}@fiado.local`;
}

Deno.serve(async (req) => {
  const { phone, email } = await req.json();
  if (!phone || typeof phone !== "string") {
    return new Response(JSON.stringify({ ok: false, error: "Numero manquant" }), { status: 400 });
  }
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return new Response(JSON.stringify({ ok: false, error: "Email invalide" }), { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: existingByPhone } = await supabase
    .from("merchants")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();
  if (existingByPhone) {
    return new Response(
      JSON.stringify({ ok: false, error: "Un compte existe deja pour ce numero — connecte-toi plutot." }),
      { status: 409 }
    );
  }

  const { data: existingByEmail } = await supabase
    .from("merchants")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (existingByEmail) {
    return new Response(
      JSON.stringify({ ok: false, error: "Un compte existe deja pour cet email — connecte-toi plutot." }),
      { status: 409 }
    );
  }

  const authEmail = syntheticEmail(phone);

  const { error: createError } = await supabase.auth.admin.createUser({
    email: authEmail,
    phone,
    email_confirm: true,
    phone_confirm: true,
    password: crypto.randomUUID(),
  });
  if (createError) {
    return new Response(JSON.stringify({ ok: false, error: createError.message }), { status: 500 });
  }

  const link = await supabase.auth.admin.generateLink({ type: "magiclink", email: authEmail });
  if (link.error || !link.data?.properties?.hashed_token) {
    return new Response(JSON.stringify({ ok: false, error: "Impossible de creer la session" }), { status: 500 });
  }

  return new Response(
    JSON.stringify({ ok: true, authEmail, tokenHash: link.data.properties.hashed_token }),
    { headers: { "Content-Type": "application/json" } }
  );
});
