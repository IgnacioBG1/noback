/**
 * Textos de los consentimientos y documentos informativos que firma el paciente.
 * Cada texto tiene versión; la firma guarda la versión y el hash SHA-256 del contenido.
 * Cambiar un texto obliga a subir la versión: lo comprueba consentimientos.test.ts contra el archivo .lock.
 */
export type ConsentKind = "privacidad" | "telemedicina_whatsapp" | "agente_ia" | "uso_comunicacion";

export interface ConsentDoc {
  kind: ConsentKind;
  version: string;
  title: string;
  required: boolean;
  /** Frase que acompaña a la casilla de aceptación. */
  checkbox: string;
  body: string[];
}

export const CONSENT_DOCS: ConsentDoc[] = [
  {
    kind: "privacidad",
    version: "2026-10-08",
    title: "Información sobre protección de datos",
    required: true,
    checkbox: "He leído la información sobre protección de datos.",
    body: [
      "Responsable: Longevidad y Salud 360 S.L., que presta el servicio NoBack como centro sanitario autorizado. Los datos de contacto y del delegado de protección de datos figuran en la política de privacidad.",
      "Finalidad: prestarte asistencia sanitaria (valoración médica, seguimiento, prescripción cuando proceda y entrenamiento), gestionar tu historia clínica, cobrar el servicio y comunicarnos contigo.",
      "Base jurídica: la prestación de asistencia sanitaria (artículo 9.2.h del RGPD y Ley 41/2002) y la relación contractual. Los usos que no son asistenciales solo se hacen con tu consentimiento, que puedes retirar cuando quieras.",
      "Conservación: la historia clínica se conserva al menos cinco años desde el alta de cada proceso asistencial, aunque canceles tu suscripción, como exige la ley. El resto de datos, mientras dure la relación y los plazos legales.",
      "Destinatarios y proveedores: solo el equipo sanitario que te atiende. Tratan datos por nuestra cuenta, con contrato y en la Unión Europea siempre que es posible, proveedores de alojamiento (Supabase y Vercel, en Fráncfort), pagos (Stripe) y videoconsulta. Si algún proveedor trata datos fuera de la UE, se aplican las garantías del RGPD.",
      "Derechos: puedes pedir acceso, rectificación, supresión cuando la ley lo permita, oposición, limitación y portabilidad desde tu área privada o por correo, y reclamar ante la Agencia Española de Protección de Datos.",
    ],
  },
  {
    kind: "telemedicina_whatsapp",
    version: "2026-10-08",
    title: "Consentimiento para la atención por telemedicina",
    required: true,
    checkbox: "Doy mi consentimiento para ser atendido por telemedicina en las condiciones descritas.",
    body: [
      "NoBack es un programa médico que se presta principalmente a distancia: videoconsulta con tu médico, mensajes en tu área privada y, si lo activas, avisos por WhatsApp.",
      "La consulta a distancia es un acto médico con las mismas obligaciones que la presencial. Tiene límites: tu médico no puede explorarte físicamente, y si lo considera necesario te citará de forma presencial o te derivará.",
      "El canal a distancia no es un servicio de urgencias. Si tienes un problema de salud urgente, llama al 112 o acude a urgencias.",
      "Te pediremos que te identifiques en cada consulta. Las consultas no se graban. Lo relevante de cada consulta se anota en tu historia clínica.",
      "Por WhatsApp solo enviaremos recordatorios y mensajes breves; tus resultados e informes se consultan en tu área privada. Puedes dejar de usar WhatsApp en cualquier momento sin que afecte a tu atención.",
    ],
  },
  {
    kind: "agente_ia",
    version: "2026-10-08",
    title: "Asistente con inteligencia artificial",
    required: false,
    checkbox: "Quiero usar el asistente con inteligencia artificial (opcional).",
    body: [
      "NoBack ofrece un asistente con inteligencia artificial que te acompaña en el día a día: te recuerda lo que ha pautado tu médico, te ayuda a registrar comidas y mediciones y resuelve dudas generales sobre el programa.",
      "El asistente no es un médico: no diagnostica, no interpreta tus análisis, no ajusta tratamientos ni dosis y no valora la urgencia de tus síntomas. Cualquier consulta clínica la pasa a tu médico.",
      "Para funcionar, el asistente procesa tus mensajes con un proveedor de inteligencia artificial bajo contrato, sin que se usen para entrenar modelos. Solo recibe tu nombre de pila y la información necesaria para cada conversación.",
      "Es opcional. Si no lo activas o lo desactivas, tu atención médica es la misma.",
    ],
  },
  {
    kind: "uso_comunicacion",
    version: "2026-10-08",
    title: "Uso de tus resultados en comunicación",
    required: false,
    checkbox: "Acepto que se usen mis resultados de forma anónima para mostrar resultados del programa (opcional).",
    body: [
      "Con tu permiso, podremos usar tus resultados (por ejemplo, la evolución de tu composición corporal o de tu edad biológica) de forma anónima para explicar qué resultados se consiguen en el programa.",
      "Nunca publicaremos tu nombre, tu imagen ni datos que permitan identificarte sin un consentimiento específico y por escrito para ese uso concreto.",
      "Es opcional y puedes retirarlo cuando quieras.",
    ],
  },
];

export const consentDoc = (kind: ConsentKind): ConsentDoc => {
  const d = CONSENT_DOCS.find((x) => x.kind === kind);
  if (!d) throw new Error(`Documento de consentimiento desconocido: ${kind}`);
  return d;
};

export const REQUIRED_CONSENTS = CONSENT_DOCS.filter((d) => d.required).map((d) => d.kind);
