"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionInfo } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/stripe";

export interface InviteState {
  ok?: string;
  error?: string;
}

const schema = z.object({
  first_name: z.string().trim().min(1, "Escribe el nombre").max(80),
  last_name: z.string().trim().min(1, "Escribe los apellidos").max(120),
  email: z.email("Correo no válido").transform((v) => v.trim().toLowerCase()),
});

/** Invitación de un paciente por la clínica: le llega un correo y entra sin contraseña. */
export async function invitarPaciente(_prev: InviteState, fd: FormData): Promise<InviteState> {
  const s = await getSessionInfo();
  if (s.role !== "admin" || s.aal !== "aal2") return { error: "Solo administración puede invitar pacientes." };
  const v = schema.safeParse(Object.fromEntries(fd));
  if (!v.success) return { error: v.error.issues[0].message };
  const { error } = await createSupabaseAdmin().auth.admin.inviteUserByEmail(v.data.email, {
    data: { first_name: v.data.first_name, last_name: v.data.last_name },
    redirectTo: `${siteUrl()}/auth/confirmar?next=/paciente/valoracion`,
  });
  if (error) {
    console.error("invitarPaciente", error.message);
    if (/already|registered/i.test(error.message)) return { error: "Ese correo ya tiene cuenta. Puede entrar con un código desde la página de acceso." };
    if (/rate/i.test(error.message)) return { error: "Se han enviado demasiados correos seguidos. Espera unos minutos." };
    return { error: "No se ha podido enviar la invitación." };
  }
  revalidatePath("/clinica", "layout");
  return { ok: `Invitación enviada a ${v.data.email}.` };
}
