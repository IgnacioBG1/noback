import "server-only";
import { cache } from "react";
import { createSupabaseServer } from "@/lib/supabase/server";

export type Escalado = {
  id: string;
  patient_id: string;
  first_name: string | null;
  last_name: string | null;
  reason: "clinico" | "peticion" | "no_entiende" | "malestar";
  status: "abierta" | "respondida" | "cerrada";
  created_at: string;
  body: string | null;
  kind: string;
  channel: string;
  resolved_at: string | null;
};

export const REASON_LABEL: Record<string, string> = { clinico: "Salud", peticion: "Petición", no_entiende: "Sin respuesta", malestar: "Se encuentra mal" };

export const getEscalados = cache(async (status: "abierta" | "todas" = "abierta"): Promise<Escalado[]> => {
  const supabase = await createSupabaseServer();
  const { data } = await supabase.rpc("list_escalations", { p_status: status });
  return (data ?? []) as Escalado[];
});
