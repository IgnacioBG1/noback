import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseEnv } from "@/lib/env";

/**
 * Cliente de servidor con la clave secreta (rol service_role: salta RLS).
 * Solo para operaciones que el usuario no puede hacer por sí mismo: pagos y webhooks.
 * Nunca se importa desde componentes de cliente (lo impide "server-only").
 */
export function createSupabaseAdmin() {
  const { url } = supabaseEnv();
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("Falta SUPABASE_SECRET_KEY");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
