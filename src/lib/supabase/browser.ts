"use client";
import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnv } from "@/lib/env";

/** Cliente de Supabase para componentes de cliente (inicio de sesión y doble factor). */
export function createSupabaseBrowser() {
  const { url, key } = supabaseEnv();
  return createBrowserClient(url, key);
}
