import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Tant que ces variables ne sont pas definies (voir README.md), l'app
// tourne entierement en local (Dexie) sans jamais tenter d'appel reseau
// vers Supabase — c'est ce qui permet de developper/demontrer FIADO
// avant meme d'avoir cree le projet Supabase.
export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string)
  : null;
