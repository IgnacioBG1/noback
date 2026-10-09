/** Preguntas de un toque. El id del botón viaja en la respuesta de WhatsApp o del chat web. */
export type Boton = { id: string; titulo: string }; // título ≤ 20 caracteres (límite de WhatsApp)

export const PREGUNTAS = {
  plan: {
    texto: "¿Ayer pudiste seguir tu plan?",
    botones: [
      { id: "ci:plan:si", titulo: "Sí, entero" },
      { id: "ci:plan:parcial", titulo: "A medias" },
      { id: "ci:plan:no", titulo: "No" },
    ],
  },
  entreno: {
    texto: "¿Hiciste tu entreno de fuerza?",
    botones: [
      { id: "ci:entreno:si", titulo: "Sí" },
      { id: "ci:entreno:no", titulo: "Hoy no" },
    ],
  },
  animo: {
    texto: "¿Cómo te encuentras esta semana?",
    botones: [
      { id: "ci:animo:bien", titulo: "Bien" },
      { id: "ci:animo:regular", titulo: "Regular" },
      { id: "ci:animo:mal", titulo: "Mal" },
    ],
  },
} satisfies Record<string, { texto: string; botones: Boton[] }>;

export type CheckinKind = keyof typeof PREGUNTAS;

export function parseBoton(id: string | null | undefined): { kind: CheckinKind; value: string } | null {
  const m = /^ci:(plan|entreno|animo):(si|parcial|no|bien|regular|mal)$/.exec(id ?? "");
  return m ? { kind: m[1] as CheckinKind, value: m[2] } : null;
}

/** Las plantillas de WhatsApp devuelven el texto del botón, no el id: lo traducimos. */
export function botonDesdeTexto(texto: string | null | undefined): string | null {
  const t = (texto ?? "").trim().toLowerCase();
  for (const q of Object.values(PREGUNTAS)) for (const b of q.botones) if (b.titulo.toLowerCase() === t) return b.id;
  return null;
}

export const RESPUESTA_CHECKIN: Record<string, string> = {
  "plan:si": "¡Genial! Así se avanza. Sigue igual hoy.",
  "plan:parcial": "Bien por intentarlo. Hoy es un día nuevo: si te ayuda, revisa en tu plan qué puedes comer.",
  "plan:no": "Gracias por decírmelo. Pasa a todos. Hoy retomamos: tu plan está en la app y tu equipo lo tiene en cuenta.",
  "entreno:si": "¡Muy bien! La fuerza es lo que protege tu músculo mientras pierdes grasa.",
  "entreno:no": "Sin problema. Intenta hacerlo mañana: es clave para conservar el músculo.",
  "animo:bien": "Me alegro mucho. ¡A seguir así!",
  "animo:regular": "Gracias por contarlo. Si quieres, escríbeme qué te pasa y lo vemos con tu equipo.",
  "animo:mal": "Siento que no estés bien. Se lo paso a tu médico para que te contacte. Si es urgente, llama al 112.",
};
