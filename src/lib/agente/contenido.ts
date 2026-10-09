import { fase as faseDe, faseNombre, PROTEINAS, FRUTAS, LACTEOS, PAN, LEGUMBRES, SUPLEMENTOS, type Fase } from "@/content/essential";

/** Lo que el asistente sabe del paciente: solo su nombre de pila y su plan (consentimiento del asistente). */
export interface ContextoPaciente {
  nombre: string | null;
  plan: {
    route: "farmaco" | "sin_farmaco";
    fase_dieta: string | null;
    productos_dia: number | null;
    periodo_dias: number | null;
    fase_inicio: string | null;
    proteina_g_dia: number | null;
    fuerza_sesiones_semana: number | null;
    pasos_dia: number | null;
    indicaciones: string | null;
    suplementos: string[];
    proxima_revision: string | null;
  } | null;
}

const lista = (xs: string[]) => xs.map((x) => `• ${x}`).join("\n");

export function resumenFase(ctx: ContextoPaciente, hoy = new Date()): string | null {
  const p = ctx.plan;
  const f = faseDe(p?.fase_dieta);
  if (!p || !f) return null;
  const dia = p.fase_inicio ? Math.floor((Date.parse(hoy.toISOString().slice(0, 10)) - Date.parse(p.fase_inicio)) / 86_400_000) + 1 : null;
  const partes = [`Estás en ${faseNombre(f.key)}${dia && p.periodo_dias ? ` (día ${Math.min(dia, p.periodo_dias)} de ${p.periodo_dias})` : ""}.`];
  if (p.productos_dia != null) partes.push(`Hoy tocan ${p.productos_dia} productos Essential.`);
  if (f.comidas) partes.push(f.comidas.map((c) => `${c.nombre}: ${c.items.flat().map((i) => i.t.replace(/\*+/g, "")).join(" + ")}`).join("\n"));
  return partes.join("\n");
}

type Intent = { re: RegExp; responde: (ctx: ContextoPaciente, f: Fase | null) => string | null };

const INTENTS: Intent[] = [
  {
    re: /verdura|ensalada|que verdura/,
    responde: (_c, f) => (f ? [f.verduras.texto, ...f.verduras.listas.map((l) => `${l.titulo}${l.nota ? ` (${l.nota})` : ""}:\n${lista(l.items)}`)].join("\n\n") : null),
  },
  { re: /beb|agua|cafe|infusion|leche|refresco|alcohol|vino|cerveza/, responde: (_c, f) => (f ? `Bebidas permitidas en tu fase:\n${lista(f.bebidas)}\n\nLo que no aparece en esta lista, mejor no.` : null) },
  { re: /alin|aceite|sal\b|salsa|vinagre|mostaza|especia/, responde: (_c, f) => (f ? `Aliños permitidos:\n${lista(f.aliño)}` : null) },
  { re: /proteina|carne|pescado|huevo|pollo|jamon|atun/, responde: (_c, f) => (f?.proteinas ? `${PROTEINAS.nota}\n${lista(PROTEINAS.items)}` : f ? "En tu fase todavía no toca ración de proteína de alimento: la proteína te la dan los productos Essential." : null) },
  { re: /fruta|manzana|platano|naranja|fresa/, responde: (_c, f) => (f?.frutas ? `${FRUTAS.nota}\n${lista(FRUTAS.items)}` : f ? "En tu fase todavía no toca fruta. Vuelve en la fase 3.1." : null) },
  { re: /yogur|queso|lacteo/, responde: (_c, f) => (f?.lacteos ? `${LACTEOS.nota}\n${lista(LACTEOS.items)}` : f ? "En tu fase todavía no tocan lácteos (vuelven en la 3.2). Sí puedes tomar suero de leche Essential y 50 ml de bebida de soja." : null) },
  { re: /\bpan\b|tostada|galleta|cereal/, responde: (_c, f) => (f?.pan ? `${PAN.nota}\n${lista(PAN.items)}` : f ? "En tu fase todavía no toca pan (vuelve en la 3.3). Los productos Essential de tu fase sí, incluidos sus panes y tostadas." : null) },
  { re: /legumbre|lenteja|garbanzo|arroz|pasta|patata/, responde: (_c, f) => (f?.legumbres ? `${LEGUMBRES.nota}\n${lista(LEGUMBRES.items)}` : f ? "En tu fase todavía no tocan legumbres ni féculas (vuelven en la 3.4)." : null) },
  { re: /producto|batido|barrita|essential/, responde: (c, f) => (f ? `${c.plan?.productos_dia != null ? `Hoy tocan ${c.plan.productos_dia} productos Essential.` : "Tu médico te indica cuántos productos al día."} En tu fase, mejor de gama verde${["fase_1", "fase_2_1", "fase_2_2", "sm_1", "sm_2_1", "sm_2_2"].includes(f.key) ? "; como máximo 1 de gama amarilla y 1 de gama roja al día" : ""}. En la app, en «Mi plan», tienes todos los permitidos filtrados por tus alergias.` : null) },
  { re: /suplement|vitamina|magnesio|trimin|oligovit|omega/, responde: (c) => (c.plan?.suplementos?.length ? `Tu suplementación:\n${lista(c.plan.suplementos.map((k) => SUPLEMENTOS.find((s) => s.key === k)).filter(Boolean).map((s) => `${s!.nombre}: ${s!.pauta}`))}` : "Tu médico no te ha pautado suplementos por ahora.") },
  { re: /fase|que (me )?toca|que como|que puedo comer|menu|hoy/, responde: (c) => resumenFase(c) },
  { re: /entren|ejercicio|fuerza|pasos|caminar|gimnasio/, responde: (c, f) => [c.plan?.fuerza_sesiones_semana ? `Tu objetivo: ${c.plan.fuerza_sesiones_semana} sesiones de fuerza a la semana.` : null, c.plan?.pasos_dia ? `Y unos ${c.plan.pasos_dia.toLocaleString("es-ES")} pasos al día.` : null, f?.ejercicio ? "En esta fase, ejercicio de intensidad baja o moderada: tienes que poder hablar mientras lo haces." : null].filter(Boolean).join(" ") || null },
  { re: /revision|consulta|cita|medico|cuando/, responde: (c) => (c.plan?.proxima_revision ? `Tu próxima revisión es el ${new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long" }).format(new Date(`${c.plan.proxima_revision}T12:00:00Z`))}. Si necesitas hablar antes con tu médico, escríbeme y se lo paso.` : null) },
  { re: /^(hola|buenas|buenos dias|buenas tardes|hey)\b/, responde: (c) => `¡Hola${c.nombre ? `, ${c.nombre}` : ""}! Pregúntame lo que quieras de tu plan: qué te toca hoy, verduras, bebidas, productos… Si es algo de salud, se lo paso a tu médico.` },
  { re: /^(gracias|ok|vale|perfecto|genial)\b/, responde: () => "¡A ti! Aquí estoy para lo que necesites." },
];

const normaliza = (t: string) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

/** Respuesta a partir del contenido aprobado del plan, sin IA. `null` si no hay una respuesta segura. */
export function respuestaDelPlan(texto: string, ctx: ContextoPaciente): string | null {
  const t = normaliza(texto);
  const f = faseDe(ctx.plan?.fase_dieta);
  for (const i of INTENTS) if (i.re.test(t)) return i.responde(ctx, f);
  return null;
}
