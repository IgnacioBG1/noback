import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { isSupabaseConfigured, supabaseEnv } from "@/lib/env";
import type { Aal, Role, SessionInfo } from "@/lib/access";

/** Cliente de Supabase para Server Components, Server Actions y Route Handlers (actúa como el usuario: aplica RLS). */
export async function createSupabaseServer() {
  const cookieStore = await cookies();
  const { url, key } = supabaseEnv();
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // En Server Components no se pueden escribir cookies; el proxy ya refresca la sesión.
        }
      },
    },
  });
}

/** Usuario, rol y nivel de autenticación verificados en el servidor. */
export async function getSessionInfo(): Promise<SessionInfo> {
  if (!isSupabaseConfigured()) return { userId: null, role: null, aal: null, hasVerifiedFactor: false };
  const supabase = await createSupabaseServer();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return { userId: null, role: null, aal: null, hasVerifiedFactor: false };

  const [{ data: role }, { data: aal }] = await Promise.all([
    supabase.rpc("my_role"), // funciona también sin doble factor
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);

  return {
    userId: claims.sub,
    role: (role as Role | null) ?? null,
    aal: (claims.aal as Aal | undefined) ?? "aal1",
    hasVerifiedFactor: aal?.nextLevel === "aal2",
  };
}
