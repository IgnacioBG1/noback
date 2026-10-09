/**
 * Capa de seguridad del asistente. No interpreta ni valora la urgencia: si un mensaje habla de salud
 * (síntomas, medicación, dosis, embarazo…), se reenvía literal al médico y se responde siempre lo mismo.
 * Ante la duda, se escala.
 */

const PATRONES_CLINICOS = [
  /dolor|duele|molest/,
  /mare|v[eé]rtigo|desmay|me caigo|perd[ií] el conocimiento/,
  /n[aá]use|v[oó]mit|diarre|estre[nñ]|heces|sangr|ardor|acidez|reflujo/,
  /fiebre|tiritona|escalofr/,
  /palpitac|taquicard|coraz[oó]n|pecho|tensi[oó]n|presi[oó]n arterial|hipertens|hipotens/,
  /az[uú]car|gluc|hipogluc|diabet|insulina/,
  /medic|pastill|f[aá]rmaco|dosis|inyecci|pinchaz|pluma|receta|tratamiento|antibi[oó]tic|ibuprofeno|paracetamol/,
  /embaraz|lactan|regla|menstru/,
  /alergi|urticaria|hinchaz|picor|ronchas/,
  /me encuentro mal|me siento mal|estoy mal|no me encuentro|enferm|s[ií]ntoma|efecto (secundario|adverso)/,
  /ansiedad|depres|triste|no quiero comer|atrac[oó]n|purg/,
  /urgen|emergenc|hospital|ambulancia|112|061/,
  /an[aá]lisis|anal[ií]tica|resultado|colesterol|hierro|tiroides/,
  /cansad|agotad|debilidad|calambr|insomnio/,
];

const normaliza = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function pareceClinico(texto: string | null | undefined): boolean {
  if (!texto) return false;
  const t = normaliza(texto);
  return PATRONES_CLINICOS.some((r) => r.test(t) || r.test(texto.toLowerCase()));
}

export const MENSAJE_ESCALADO =
  "Gracias por contármelo. Se lo paso tal cual a tu médico, que te responderá lo antes posible. Si es urgente o te encuentras muy mal, llama al 112.";

export const MENSAJE_NO_SE =
  "Esa no te la sé responder con seguridad. Se la paso a tu equipo y te contestan por aquí.";

export const AVISO_IA =
  "Hola, soy el asistente automático de NoBack (un sistema de inteligencia artificial, no una persona). Te ayudo con tu plan, tus recordatorios y tus dudas sobre el programa. No doy consejos médicos: todo lo que tenga que ver con tu salud se lo paso a tu médico.";
