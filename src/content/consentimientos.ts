/**
 * Textos de los consentimientos y documentos informativos que firma el paciente.
 * Cada texto tiene versión; la firma guarda la versión y el hash SHA-256 del contenido.
 * Cambiar un texto obliga a subir la versión: lo comprueba consentimientos.test.ts contra el archivo .lock.
 */
export type ConsentKind = "privacidad" | "telemedicina_whatsapp" | "agente_ia" | "uso_comunicacion" | TreatmentConsentKind;
export type TreatmentConsentKind = "tratamiento_glp1" | "dieta_proteinada";

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

/**
 * Consentimientos informados del tratamiento. Se firman en la app después de la consulta, cuando el médico
 * asigna la ruta. Borrador pendiente de revisión médica y del DPD antes del piloto.
 * No nombran medicamentos: el fármaco concreto, la dosis y la pauta los indica el médico en el plan.
 */
export const TREATMENT_DOCS: ConsentDoc[] = [
  {
    kind: "tratamiento_glp1",
    version: "2026-10-08",
    title: "Consentimiento informado · Tratamiento farmacológico para el control del peso",
    required: true,
    checkbox: "He leído esta información, he podido resolver mis dudas con mi médico y doy mi consentimiento al tratamiento.",
    body: [
      "Qué es: un medicamento con receta que actúa sobre las hormonas que regulan el apetito y la saciedad. Ayuda a comer menos sin pasar hambre y se combina siempre con alimentación alta en proteína y entrenamiento de fuerza. Tu médico te ha indicado el medicamento concreto, la dosis y cómo aumentarla.",
      "Para qué: reducir la grasa corporal y mejorar la salud metabólica conservando la masa muscular. Los resultados varían de una persona a otra y no se pueden garantizar.",
      "Efectos adversos frecuentes: náuseas, vómitos, diarrea, estreñimiento, ardor, cansancio y sensación de plenitud, sobre todo al empezar o al subir la dosis. Suelen ser leves y pasajeros.",
      "Riesgos poco frecuentes pero importantes: inflamación del páncreas (dolor intenso de abdomen que va hacia la espalda), problemas de vesícula, deshidratación con afectación del riñón si hay vómitos o diarrea intensos, bajadas de azúcar si tomas otros medicamentos para la diabetes y pérdida de músculo si no comes suficiente proteína ni entrenas fuerza.",
      "No debes usarlo durante el embarazo ni la lactancia. Si buscas un embarazo o te quedas embarazada, díselo a tu médico enseguida. Puede reducir la eficacia de los anticonceptivos orales en algunos casos: tu médico te dirá si necesitas un método adicional.",
      "Si lo dejas, es frecuente recuperar parte del peso. Por eso el programa incluye una fase de mantenimiento.",
      "Alternativas: la ruta sin medicación, con dieta proteinada por fases supervisada, o seguir solo con cambios de alimentación y ejercicio.",
      "Qué hacer si algo va mal: ante dolor abdominal intenso, vómitos que no ceden, signos de deshidratación o una reacción alérgica, deja de usarlo y busca atención urgente (112). Para dudas, escribe al equipo: el asistente avisará a tu médico.",
      "Puedes retirar este consentimiento y dejar el tratamiento cuando quieras, avisando a tu médico.",
    ],
  },
  {
    kind: "dieta_proteinada",
    version: "2026-10-08",
    title: "Consentimiento informado · Dieta proteinada por fases",
    required: true,
    checkbox: "He leído esta información, he podido resolver mis dudas con mi médico y doy mi consentimiento a la dieta.",
    body: [
      "Qué es: una dieta muy baja en hidratos de carbono y grasas y suficiente en proteína, que se hace por fases bajo supervisión médica. En las primeras fases el cuerpo usa la grasa como fuente de energía (cetosis). Después se reintroducen los alimentos poco a poco hasta llegar a una alimentación de mantenimiento.",
      "Para qué: perder grasa de forma rápida conservando la masa muscular, junto con entrenamiento de fuerza. Los resultados varían de una persona a otra y no se pueden garantizar.",
      "Efectos frecuentes, sobre todo los primeros días: cansancio, dolor de cabeza, mareo al levantarte, estreñimiento, mal aliento, calambres y frío. Beber agua suficiente y tomar los suplementos indicados los reduce.",
      "Riesgos menos frecuentes: piedras en la vesícula por la pérdida rápida de peso, aumento del ácido úrico o ataques de gota, alteraciones de las sales del cuerpo y bajadas de tensión o de azúcar si tomas medicación para la tensión o la diabetes. Tu médico puede ajustar esa medicación.",
      "No es adecuada durante el embarazo ni la lactancia, ni en algunas enfermedades del riñón, del hígado o del corazón, ni con antecedentes de trastornos de la conducta alimentaria. Si alguna de estas situaciones cambia, díselo a tu médico.",
      "Es importante seguir las fases y no alargar la fase inicial más de lo indicado. Si la dejas de golpe, es frecuente recuperar peso: por eso existen la reintroducción y el mantenimiento.",
      "Alternativas: la ruta con tratamiento farmacológico o seguir solo con cambios de alimentación y ejercicio.",
      "Qué hacer si algo va mal: ante dolor abdominal intenso, palpitaciones, desmayos o cualquier síntoma que te preocupe, busca atención urgente (112). Para dudas, escribe al equipo: el asistente avisará a tu médico.",
      "Puedes retirar este consentimiento y dejar la dieta cuando quieras, avisando a tu médico.",
    ],
  },
];

export const TREATMENT_CONSENT_FOR_ROUTE = { farmaco: "tratamiento_glp1", sin_farmaco: "dieta_proteinada" } as const;

export const consentDoc = (kind: ConsentKind): ConsentDoc => {
  const d = [...CONSENT_DOCS, ...TREATMENT_DOCS].find((x) => x.kind === kind);
  if (!d) throw new Error(`Documento de consentimiento desconocido: ${kind}`);
  return d;
};

export const REQUIRED_CONSENTS = CONSENT_DOCS.filter((d) => d.required).map((d) => d.kind);
