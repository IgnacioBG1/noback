import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServer } from "@/lib/supabase/server";
import { safeNext } from "@/lib/access";

/** Destino de los enlaces de correo de Supabase (confirmación de cuenta, recuperación). */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeNext(url.searchParams.get("next"), "/paciente");
  const supabase = await createSupabaseServer();

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  let ok = false;
  if (code) ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  else if (tokenHash && type) ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;

  const to = request.nextUrl.clone();
  to.search = "";
  if (ok) {
    to.pathname = next;
  } else {
    to.pathname = "/acceso";
    to.searchParams.set("error", "enlace");
  }
  return NextResponse.redirect(to);
}
