"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServer, getSessionInfo } from "@/lib/supabase/server";

export interface EquipoState {
  ok?: string;
  error?: string;
}

const schema = z.object({
  patient_id: z.uuid(),
  doctor: z.uuid().or(z.literal("")),
  trainer: z.uuid().or(z.literal("")),
});

const ayer = () => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};

/** Asigna médico y entrenador. Cambiar a alguien cierra su asignación (no se borra: queda el historial). */
export async function asignarEquipo(_prev: EquipoState, fd: FormData): Promise<EquipoState> {
  const s = await getSessionInfo();
  if (s.role !== "admin" || s.aal !== "aal2") return { error: "Solo administración puede asignar el equipo." };
  const v = schema.safeParse(Object.fromEntries(fd));
  if (!v.success) return { error: "Datos no válidos." };
  const supabase = await createSupabaseServer();
  const hoy = new Date().toISOString().slice(0, 10);

  const { data: actuales, error: e1 } = await supabase
    .from("care_team")
    .select("id, staff_id, staff_role, since")
    .eq("patient_id", v.data.patient_id)
    .or(`until.is.null,until.gte.${hoy}`);
  if (e1) return { error: "No se ha podido leer el equipo actual." };

  for (const role of ["doctor", "trainer"] as const) {
    const quiero = v.data[role] || null;
    const activos = (actuales ?? []).filter((a) => a.staff_role === role);
    if (activos.some((a) => a.staff_id === quiero) && activos.length === 1) continue;
    for (const a of activos.filter((a) => a.staff_id !== quiero)) {
      const { error } = await supabase.from("care_team").update({ until: ayer() }).eq("id", a.id);
      if (error) return { error: "No se ha podido cerrar la asignación anterior." };
    }
    if (quiero && !activos.some((a) => a.staff_id === quiero)) {
      // Si ya hubo una asignación que empezó hoy con esa persona, se reabre en lugar de duplicarla.
      const { data: hoyRow } = await supabase.from("care_team").select("id").eq("patient_id", v.data.patient_id).eq("staff_id", quiero).eq("since", hoy).maybeSingle();
      const { error } = hoyRow
        ? await supabase.from("care_team").update({ until: null }).eq("id", hoyRow.id)
        : await supabase.from("care_team").insert({ patient_id: v.data.patient_id, staff_id: quiero, staff_role: role });
      if (error) {
        console.error("asignarEquipo", error.message);
        return { error: error.message.includes("rol") ? error.message : "No se ha podido asignar." };
      }
    }
  }
  revalidatePath("/clinica", "layout");
  return { ok: "Equipo guardado." };
}
