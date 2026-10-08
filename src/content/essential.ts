/**
 * Protocolo de dieta proteinada del Método Essential Diet, transcrito de las hojas de fase oficiales
 * (carpeta «Fases ED» de Ignacio, versiones 2020-2023). El médico sitúa al paciente en una fase; el paciente ve
 * aquí todo lo de esa fase. Cualquier cambio de contenido debe hacerse contra las hojas originales.
 */

export type FaseKey =
  | "fase_1"
  | "fase_2_1"
  | "fase_2_2"
  | "fase_3"
  | "fase_3_1"
  | "fase_3_2"
  | "fase_3_3"
  | "fase_3_4"
  | "mantenimiento"
  | "mixto"
  | "sm_1"
  | "sm_2_1"
  | "sm_2_2";

/** Un elemento de una comida. `siempre`: círculo relleno en la hoja; si no, según la pauta del médico. */
export type Item = { t: string; siempre?: boolean; o?: boolean };
export type Comida = { nombre: string; items: Item[][] }; // cada fila: elementos que se suman (+); `o` marca alternativas

export type ListaAlimentos = { titulo: string; nota?: string; items: string[] };

export interface Fase {
  key: FaseKey;
  nombre: string;
  subtitulo?: string;
  grupo: "estandar" | "sindrome_metabolico" | "otros";
  color: string; // color de la hoja oficial
  resumen: string;
  comidas?: Comida[];
  opciones?: { nombre: string; comidas: Comida[] }[]; // método mixto
  notas: string[];
  verduras: { texto: string; listas: ListaAlimentos[] };
  proteinas?: boolean;
  frutas?: boolean;
  lacteos?: boolean;
  pan?: boolean;
  legumbres?: boolean;
  aliño: string[];
  bebidas: string[];
  recomendaciones: { titulo: string; texto: string }[];
  ejercicio?: boolean;
  mantenimiento?: { titulo: string; items: string[] }[];
}

// ───────────── Listas comunes ─────────────
const PREPARACION = "Se pueden tomar solas o combinadas entre sí. Al natural, con los aliños indicados, al horno, hervidas, al vapor, en wok, a la plancha o en papillote.";

const LISTA_1 = ["Acelgas", "Apio", "Berros", "Brócoli", "Brotes de soja", "Calabacines", "Cardo", "Champiñones", "Coliflor", "Endivias", "Ensalada de hoja verde", "Espárragos", "Espinacas", "Hinojo", "Lechugas", "Pepino", "Pimientos verdes", "Rábanos", "Setas"];
const LISTA_2 = ["Alcachofas", "Berenjenas", "Coles de Bruselas", "Judías verdes", "Nabos", "Pimientos rojos", "Puerros", "Tomates"];
const AJO_CEBOLLA = "Ajo y cebolla solo en polvo o deshidratados, como condimento o especia.";

const VERDURAS_F1F2 = {
  texto: PREPARACION,
  listas: [
    { titulo: "Lista 1", nota: "Según apetencia (no superar 250 g) y diversificando al máximo.", items: LISTA_1 },
    { titulo: "Lista 2", nota: `Cantidad autorizada, salvo mejor criterio de tu médico: menos de 150 g al día en total. ${AJO_CEBOLLA}`, items: LISTA_2 },
  ],
};
const VERDURAS_SM = (pepinillo: boolean) => ({
  texto: PREPARACION,
  listas: [
    {
      titulo: "Lista 1",
      nota: `Según apetencia, pero sin exagerar y diversificando al máximo. ${AJO_CEBOLLA}`,
      items: pepinillo ? [...LISTA_1.slice(0, 14), "Pepinillo natural", ...LISTA_1.slice(14)] : LISTA_1,
    },
  ],
});
const VERDURAS_F3 = {
  texto: "Todas las verduras, crudas o cocinadas, según apetencia pero sin exagerar. Al natural, con los aliños indicados, al horno, hervidas, al vapor, en wok, a la plancha o en papillote.",
  listas: [],
};

export const PROTEINAS = {
  nota: "A la plancha, al horno, al vapor o en papillote. Una ración es:",
  items: [
    "Carne roja (buey, ternera, cerdo…): 100 g",
    "Carne blanca (pavo, pollo, conejo…): 130 g",
    "Pescado o marisco: 150 g",
    "Jamón ibérico magro: 90 g (4 lonchas finas)",
    "2 huevos o 4 claras",
    "60 g de jamón ibérico magro + 1 huevo o 2 claras",
    "1 lata pequeña de atún + 1 huevo o 2 claras",
  ],
};
export const FRUTAS = {
  nota: "Una ración es:",
  items: [
    "Pera, manzana o naranja: 125 g (1 pieza pequeña)",
    "Uvas: 60 g (7-8 granos medianos)",
    "Albaricoque: 125 g (3 piezas pequeñas)",
    "Ciruela: 125 g (1 pieza mediana)",
    "Cerezas: 90 g (10-12 piezas)",
    "Kiwi: 100 g (1 pieza mediana)",
    "Fresas: 170 g (8-9 piezas medianas)",
    "Melón: 90 g (1 tajada pequeña)",
    "Sandía: 250 g (1 tajada mediana)",
    "Piña natural: 90 g (1 rodaja mediana)",
    "Melocotón: 90 g (1 pieza pequeña)",
    "Mandarina: 50-75 g (1 pieza pequeña)",
  ],
};
export const LACTEOS = {
  nota: "Lácteos bajos en grasa. Una ración es:",
  items: ["125 ml de leche semidesnatada", "30-40 g de queso de cabra u oveja", "1 yogur proteinado, natural o de soja", "50 g de queso fresco 0 % (tipo Burgos)"],
};
export const PAN = {
  nota: "Una ración es:",
  items: ["1 rebanada de pan integral de molde", "30 g de pan integral de baguette", "2 biscotes integrales", "30 g de copos de cereales integrales sin azúcar"],
};
export const LEGUMBRES = {
  nota: "Ración: el equivalente a un vaso de yogur o medio vaso de agua (4-5 cucharadas ya cocinadas). Siempre como acompañamiento de la proteína, nunca como plato principal. Solo 2 veces por semana y ese día sin pan.",
  items: ["Arroz integral", "Pasta integral", "Garbanzos", "Quinoa", "Guisantes secos", "Sémola", "Habas", "Tapioca", "Judías blancas", "1 patata pequeña", "Lentejas"],
};

const ALIÑO = [
  "Especias y plantas aromáticas deshidratadas",
  "1 cucharadita (tipo café) de vinagre de vino o zumo de limón",
  "1 cucharadita (tipo café) de mostaza de Dijon",
  "Salsa de soja tamari: 1 cucharada de postre",
  "Sal: 2,5 a 3 g al día",
  "Aceite de oliva: 1-2 cucharadas soperas al día (mejor en espray, para dosificar)",
];
const ALIÑO_SM = [
  "Especias y plantas aromáticas deshidratadas",
  "1 cucharadita (tipo café) de vinagre de vino o zumo de limón",
  "1 cucharadita (tipo café) de mostaza de Dijon",
  "Salsa de soja tamari, en cantidad moderada",
  "Vinagreta Essential Mostaza o César Essential: medio sobre al día",
  "Sal: 2,5 a 3 g al día",
  "Aceite de oliva: 1-2 cucharadas soperas al día (mejor en espray, para dosificar)",
];
const BEBIDAS = [
  "Agua con o sin gas: mínimo 1,5 litros al día",
  "Infusiones sin azúcar",
  "Café natural (no torrefacto)",
  "Suero de leche Essential (no tomes otro tipo de leche)",
  "50 ml de bebida de soja (consulta cuáles están permitidas)",
  "Edulcorantes permitidos: sucralosa, stevia o aspartamo",
];

const REC_F1F2 = [
  { titulo: "Dolor de cabeza", texto: "Es pasajero. Si sigue después de los primeros días, consulta con tu médico." },
  { titulo: "Mal aliento", texto: "Puedes usar las pastillas de menta Essential. No tomes chicles ni caramelos de ningún tipo, aunque sean sin azúcar." },
  { titulo: "Mucha hambre", texto: "Suele desaparecer a las 48 horas de empezar. Si no la toleras, puedes tomar un producto Essential extra o un poco de verdura de la lista 1." },
  { titulo: "Estreñimiento", texto: "Toma las verduras preferentemente cocidas. Puedes usar Carbonato de Magnesio Essential. Si sigue, consulta con tu médico." },
  { titulo: "Cansancio, calambres, debilidad o mareo", texto: "Puede deberse a falta de minerales o de sal. Toma la suplementación que te haya indicado tu médico y sala bien las verduras. Si el malestar sigue, consulta con tu médico." },
  { titulo: "Pierdes menos peso antes de la regla", texto: "Puede pasar. Después volverás a perder peso al mismo ritmo." },
];
const REC_F3 = [
  { titulo: "Hambre", texto: "Si no la toleras, puedes tomar un producto Essential extra o una barrita Essential." },
  { titulo: "Estreñimiento", texto: "Toma las verduras preferentemente cocidas. Puedes usar Carbonato de Magnesio Essential. Si sigue, consulta con tu médico." },
];

export const IMPORTANTE =
  "Dieta bajo prescripción médica: no se puede hacer ni retomar sin control médico. Avisa a tu médico si empiezas cualquier tratamiento o tienes alguna alergia o intolerancia alimentaria.";
export const EJERCICIO =
  "Ejercicio de intensidad baja o moderada: tienes que poder mantener una conversación mientras lo haces. Camina como mínimo 2-3 horas a la semana y evita la vida sedentaria (sube escaleras, no cojas el coche para trayectos cortos…). Puedes hacer musculación de baja intensidad. No hagas ejercicio intenso aunque estés acostumbrado.";

export const GAMAS = [
  { nombre: "Gama verde", color: "#3FA535", texto: "La recomendada en las fases 1 y 2." },
  { nombre: "Gama amarilla", color: "#F2B705", texto: "Máximo 1 producto al día en las fases 1 y 2 (se puede combinar con 1 de gama roja), salvo otro criterio de tu médico." },
  { nombre: "Gama roja", color: "#D7262E", texto: "Máximo 1 producto al día en las fases 1 y 2, salvo otro criterio de tu médico. En mantenimiento, ideal para media mañana o merienda." },
];

// ───────────── Comidas ─────────────
const P: Item = { t: "Producto Essential" };
const V: Item = { t: "Verduras permitidas", siempre: true };
const R: Item = { t: "Ración de proteínas", siempre: true };
const c = (nombre: string, ...filas: Item[][]): Comida => ({ nombre, items: filas });

const COMIDAS_F1 = [c("Desayuno", [P]), c("Media mañana", [P]), c("Comida", [P, V]), c("Merienda", [P]), c("Cena", [P, V])];
const COMIDAS_F2_1 = [c("Desayuno", [P]), c("Media mañana", [P]), c("Comida", [{ t: "Ración de proteínas" }, V]), c("Merienda", [P]), c("Cena", [P, V])];
const COMIDAS_F2_2 = [c("Desayuno", [P]), c("Media mañana", [P]), c("Comida", [{ t: "Ración de proteínas" }, V]), c("Merienda", [P]), c("Cena", [{ t: "Ración de proteínas" }, V])];
const COMIDAS_SM_2_1 = [c("Desayuno", [P]), c("Media mañana", [P]), c("Comida", [R, V]), c("Merienda", [P]), c("Cena", [{ t: "Producto Essential", siempre: true }, V])];
const COMIDAS_SM_2_2 = [c("Desayuno", [P]), c("Media mañana", [P]), c("Comida", [R, V]), c("Merienda", [P]), c("Cena", [R, V])];

const PE: Item = { t: "Producto Essential*", siempre: true };
const COMIDAS_F3_1 = [c("Desayuno", [PE, { t: "Fruta" }]), c("Media mañana", [P]), c("Comida", [V, R, { t: "Fruta" }]), c("Merienda", [P]), c("Cena", [V, R])];
const COMIDAS_F3_2 = [
  c("Desayuno", [{ t: "Producto Essential", siempre: true }, { t: "Fruta" }], [{ t: "Lácteo" }]),
  c("Media mañana", [P]),
  c("Comida", [V, R, { t: "Fruta" }]),
  c("Merienda", [P]),
  c("Cena", [V, R, { t: "Lácteo" }]),
];
const COMIDAS_F3_3 = [
  c("Desayuno", [PE, { t: "Fruta" }], [{ t: "Lácteo" }, { t: "Pan" }]),
  c("Media mañana", [P]),
  c("Comida", [V, R], [{ t: "Fruta" }, { t: "Pan" }]),
  c("Merienda", [P]),
  c("Cena", [V, R], [{ t: "Lácteo" }]),
];
const COMIDAS_F3_4 = [
  c("Desayuno", [PE, { t: "Fruta" }], [{ t: "Lácteo" }, { t: "Pan" }]),
  c("Media mañana", [P]),
  c("Comida", [V, R], [{ t: "Fruta" }, { t: "Pan", o: true }, { t: "Legumbres o féculas**" }]),
  c("Merienda", [P]),
  c("Cena", [V, R], [{ t: "Lácteo" }]),
];
const COMIDAS_F3 = [
  c("Desayuno", [PE, { t: "Fruta" }], [{ t: "Lácteo" }, { t: "Pan" }]),
  c("Media mañana", [P]),
  c("Comida", [V, R], [{ t: "Fruta" }, { t: "Pan", o: true }, { t: "Legumbres o féculas**" }]),
  c("Merienda", [P]),
  c("Cena", [V, R], [{ t: "Lácteo" }]),
];

const NOTAS_F3 = [
  "* El producto Essential del desayuno se puede sustituir por 90-100 g de pavo o jamón ibérico magro a partir de la fase 3.3.",
  "** Legumbres o féculas solo 2 veces por semana, y ese día sin pan.",
];

const COLOR = { f1: "#3FA535", f2: "#A6192E", f3: "#F26722", mant: "#1D3F6E", mixto: "#8E5BA6", sm: "#1E5FAE" };

const base1 = {
  notas: ["Recomendable: productos de la gama verde Essential."],
  aliño: ALIÑO,
  bebidas: BEBIDAS,
  recomendaciones: REC_F1F2,
  ejercicio: true,
};
const base3 = { verduras: VERDURAS_F3, proteinas: true, frutas: true, aliño: ALIÑO, bebidas: BEBIDAS, recomendaciones: REC_F3, notas: NOTAS_F3 };

export const FASES: Fase[] = [
  { key: "fase_1", nombre: "Fase 1", grupo: "estandar", color: COLOR.f1, resumen: "Solo productos Essential y verduras permitidas.", comidas: COMIDAS_F1, verduras: VERDURAS_F1F2, ...base1 },
  { key: "fase_2_1", nombre: "Fase 2.1", grupo: "estandar", color: COLOR.f2, resumen: "Una comida al día con ración de proteínas.", comidas: COMIDAS_F2_1, verduras: VERDURAS_F1F2, proteinas: true, ...base1 },
  { key: "fase_2_2", nombre: "Fase 2.2", grupo: "estandar", color: COLOR.f2, resumen: "Comida y cena con ración de proteínas.", comidas: COMIDAS_F2_2, verduras: VERDURAS_F1F2, proteinas: true, ...base1 },
  { key: "fase_3", nombre: "Fase 3", subtitulo: "Reintroducción de hidratos de carbono", grupo: "estandar", color: COLOR.f3, resumen: "Se reintroducen fruta, lácteos, pan y legumbres.", comidas: COMIDAS_F3, lacteos: true, pan: true, legumbres: true, ...base3 },
  { key: "fase_3_1", nombre: "Fase 3.1", subtitulo: "Reintroducción de frutas", grupo: "estandar", color: COLOR.f3, resumen: "Vuelve la fruta.", comidas: COMIDAS_F3_1, ...base3, notas: [NOTAS_F3[0]] },
  { key: "fase_3_2", nombre: "Fase 3.2", subtitulo: "Reintroducción de lácteos", grupo: "estandar", color: COLOR.f3, resumen: "Vuelven los lácteos.", comidas: COMIDAS_F3_2, lacteos: true, ...base3, notas: [] },
  { key: "fase_3_3", nombre: "Fase 3.3", subtitulo: "Reintroducción de pan", grupo: "estandar", color: COLOR.f3, resumen: "Vuelve el pan.", comidas: COMIDAS_F3_3, lacteos: true, pan: true, ...base3, notas: ["* El producto Essential del desayuno se puede sustituir por 90-100 g de pavo o jamón ibérico magro."] },
  { key: "fase_3_4", nombre: "Fase 3.4", subtitulo: "Reintroducción de legumbres y féculas", grupo: "estandar", color: COLOR.f3, resumen: "Vuelven las legumbres y las féculas.", comidas: COMIDAS_F3_4, lacteos: true, pan: true, legumbres: true, ...base3 },
  {
    key: "mantenimiento",
    nombre: "Mantenimiento",
    subtitulo: "Dieta saludable",
    grupo: "estandar",
    color: COLOR.mant,
    resumen: "Mantén los hábitos para no recuperar el peso.",
    verduras: { texto: "Verduras 2 veces al día, mejor crudas, aliñadas, al vapor, a la plancha, asadas, en papillote, en puré o al horno. Evita la verdura frita. Mejor fresca; si no, congelada y, en último lugar, en conserva.", listas: [] },
    proteinas: true,
    frutas: true,
    lacteos: true,
    pan: true,
    legumbres: true,
    notas: [],
    aliño: ["Aceite de oliva: 1 cucharada sopera en desayuno, comida y cena", "Frutos secos: 4-5 unidades a media mañana y en la merienda", "Mejor las salsas Essential", "Evita la grasa saturada (nata, mantequilla…): solo de forma esporádica"],
    bebidas: ["Agua: mínimo 1,5 litros al día", "Infusiones según apetencia", "Café y té sin abusar; mejor junto con otros alimentos", "Evita las bebidas azucaradas y con gas", "Edulcorantes: sucralosa, stevia o aspartamo. Evita el azúcar; si lo tomas, mejor de caña que blanco"],
    recomendaciones: [
      { titulo: "5 comidas al día", texto: "3 principales y 2 tentempiés, con horarios regulares. En cada comida, proteína, grasa e hidratos (en torno a 30 % de proteína y 30 % de grasa)." },
      { titulo: "Planifica", texto: "Menús semanales y lista de la compra. Evita tener en casa alimentos no recomendados." },
      { titulo: "Variedad y poca sal", texto: "Come variado y evita el exceso de sal." },
      { titulo: "Ten siempre un producto Essential", texto: "Para momentos de hambre o ansiedad." },
      { titulo: "Después de excesos", texto: "Tras un fin de semana o días de excesos, puedes sustituir la comida o la cena del día siguiente por un producto de gama verde o amarilla con verduras." },
    ],
    ejercicio: false,
    mantenimiento: [
      {
        titulo: "Desayuno · elige una opción",
        items: [
          "A: 1 huevo + 2 claras, o 60 g de jamón ibérico magro, o 90 g de pavo, o 60 g de atún, o 90 g de queso fresco · 125 ml de leche semidesnatada (con café o té) o un yogur proteinado o de soja · 1 rebanada de molde integral con 1 cucharada de aceite de oliva · 1 pieza de fruta (como en la fase 3.1)",
          "B: Pan fresco Essential con 1 cucharada de aceite de oliva · 1 huevo, o 30 g de jamón ibérico magro, o 30 g de atún, o 45 g de pavo, o 45 g de queso fresco, o 2 claras · 1 pieza de fruta (como en la fase 3.1) · Té, café o infusión sin leche ni azúcar",
          "C: 125 ml de leche semidesnatada (con café o té) o un yogur proteinado o de soja · 1 ración de galletas Essential gama roja",
        ],
      },
      {
        titulo: "Media mañana y merienda · elige una opción",
        items: ["A: Yogur proteinado o de soja", "B: 1 rebanada de molde integral (o una ración de fruta) + 45 g de pavo + 1 nuez", "C: 1 producto Essential (mejor de gama roja, para mantener la masa magra)"],
      },
      {
        titulo: "Comida",
        items: [
          "1 ración de proteína (como en la fase 2)",
          "1 ración de verduras",
          "1 ración de fruta (como en la fase 3.1)",
          "1 rebanada de pan integral (no todos los días; se puede cambiar por 1 tostada Essential gama verde)",
          "Solo 2 veces por semana, unos 60 g de legumbres o pasta integral como acompañamiento, nunca como plato principal, y ese día sin pan",
        ],
      },
      { titulo: "Cena", items: ["1 ración de proteína (como en la fase 2)", "1 ración de verduras (como en la fase 3)", "1 ración de fruta (como en la fase 3.1) o un yogur proteinado"] },
      {
        titulo: "Fuentes de proteína",
        items: [
          "Pescado blanco: 1-2 porciones al día. Pescado azul: mínimo 3-4 veces por semana. Marisco: 2-3 veces por semana",
          "Aves: 1-2 porciones al día. Huevos: 3-4 veces por semana, sin tomar la yema en todas",
          "Jamón ibérico magro: 2-3 veces por semana. Resto de embutidos y carne roja: de forma esporádica",
          "Vegetal: seitán (no apto para celíacos). Puedes sustituir la proteína de una toma por un sobre Essential",
        ],
      },
      {
        titulo: "Hidratos de carbono",
        items: [
          "Fruta: mínimo 3 piezas al día, fresca y entera, mejor que en zumo; limita las tropicales",
          "Pan integral: 1-2 veces al día (como en la fase 3.3). Mejor el Pan Fresco Essential",
          "Féculas y legumbres: 2 veces por semana en la comida (como en la fase 3.4)",
          "Evita la pasta refinada, el arroz blanco, los dulces y la bollería industrial",
        ],
      },
      {
        titulo: "Lácteos",
        items: ["125 ml de leche semidesnatada", "Quesos frescos, de cabra y de oveja bajos en grasa, con moderación", "Yogures proteinados o naturales bajos en grasa. Evita postres lácteos (mousse, flan, cuajada…): mejor las exquisiteces Essential"],
      },
    ],
  },
  {
    key: "mixto",
    nombre: "Método mixto",
    grupo: "otros",
    color: COLOR.mixto,
    resumen: "Combina productos Essential con comida normal. Tu médico te indica la opción.",
    opciones: [
      {
        nombre: "Opción A",
        comidas: [c("Desayuno", [P]), c("Media mañana", [P]), c("Comida", [V, R], [{ t: "Fruta", o: true }, { t: "Pan", o: true }, { t: "Legumbres o féculas" }]), c("Merienda", [P]), c("Cena", [V, R], [{ t: "Lácteo" }])],
      },
      {
        nombre: "Opción B",
        comidas: [
          c("Desayuno", [{ t: "Ración de proteínas", siempre: true }, { t: "Fruta" }], [{ t: "Pan" }, { t: "Lácteo" }]),
          c("Media mañana", [P]),
          c("Comida", [V, { t: "Producto Essential", siempre: true }]),
          c("Merienda", [P]),
          c("Cena", [V, R], [{ t: "Fruta", o: true }, { t: "Lácteo" }]),
        ],
      },
      {
        nombre: "Opción C",
        comidas: [
          c("Desayuno", [{ t: "Ración de proteínas", siempre: true }, { t: "Fruta" }], [{ t: "Pan" }, { t: "Lácteo" }]),
          c("Media mañana", [P]),
          c("Comida", [V, R], [{ t: "Fruta", o: true }, { t: "Pan", o: true }, { t: "Legumbres o féculas" }]),
          c("Merienda", [P]),
          c("Cena", [V, { t: "Producto Essential", siempre: true }]),
        ],
      },
    ],
    notas: [],
    verduras: { texto: "Todas las verduras, crudas o cocinadas, según apetencia pero sin exagerar. Al natural, con los aliños indicados, al horno, hervidas, al vapor, en wok, a la plancha o en papillote.", listas: [] },
    proteinas: true,
    frutas: true,
    lacteos: true,
    pan: true,
    legumbres: true,
    aliño: ALIÑO,
    bebidas: BEBIDAS,
    recomendaciones: REC_F3,
  },
  { key: "sm_1", nombre: "Fase 1", subtitulo: "Diabetes tipo 2 y síndrome metabólico", grupo: "sindrome_metabolico", color: COLOR.sm, resumen: "Solo productos Essential y verduras permitidas.", comidas: COMIDAS_F1, verduras: VERDURAS_SM(false), ...base1, aliño: ALIÑO_SM },
  { key: "sm_2_1", nombre: "Fase 2.1", subtitulo: "Diabetes tipo 2 y síndrome metabólico", grupo: "sindrome_metabolico", color: COLOR.sm, resumen: "Una comida al día con ración de proteínas.", comidas: COMIDAS_SM_2_1, verduras: VERDURAS_SM(true), proteinas: true, ...base1, aliño: ALIÑO_SM },
  { key: "sm_2_2", nombre: "Fase 2.2", subtitulo: "Diabetes tipo 2 y síndrome metabólico", grupo: "sindrome_metabolico", color: COLOR.sm, resumen: "Comida y cena con ración de proteínas.", comidas: COMIDAS_SM_2_2, verduras: VERDURAS_SM(true), proteinas: true, ...base1, aliño: ALIÑO_SM },
];

export const FASE_KEYS = FASES.map((f) => f.key) as [FaseKey, ...FaseKey[]];
export const fase = (k: string | null | undefined) => FASES.find((f) => f.key === k) ?? null;
export const faseNombre = (k: string | null | undefined) => {
  const f = fase(k);
  if (!f) return k ?? "—";
  return f.grupo === "sindrome_metabolico" ? `${f.nombre} · Síndrome metabólico` : f.subtitulo && f.key !== "mantenimiento" ? `${f.nombre} · ${f.subtitulo}` : f.nombre;
};

/** Suplementación Essential Micro con su posología recomendada (hoja de fase). La pauta la marca el médico. */
export const SUPLEMENTOS: { key: string; nombre: string; pauta: string }[] = [
  { key: "trimin_capsulas", nombre: "Trimin cápsulas", pauta: "1 o 2 en el desayuno" },
  { key: "trimin_sobres", nombre: "Trimin sobres", pauta: "1 sobre al día, fuera de las comidas" },
  { key: "oligovit", nombre: "Oligovit", pauta: "1 sobre al día" },
  { key: "vitaminas_minerales", nombre: "Vitaminas y minerales", pauta: "1 cápsula en el desayuno" },
  { key: "vitamina_d3", nombre: "Vitamina D3 gotas", pauta: "1 a 4 gotas al día" },
  { key: "cabello_unas_m", nombre: "Cabello y uñas M", pauta: "1 cápsula en la cena" },
  { key: "cabello_unas_h", nombre: "Cabello y uñas H", pauta: "1 cápsula en la cena" },
  { key: "carbonato_magnesio", nombre: "Carbonato de magnesio", pauta: "2 cucharaditas de café al día (1,5 g)" },
  { key: "dinamic", nombre: "Dinamic Essential", pauta: "1 a 4 cápsulas al día, repartidas entre las comidas" },
  { key: "triptofano", nombre: "Triptófano Essential", pauta: "1 cápsula al día, a partir de media tarde" },
  { key: "essential_lx", nombre: "Essential LX", pauta: "1 cápsula en el desayuno" },
  { key: "lipo_plus", nombre: "Lipo+ Essential", pauta: "2 en el desayuno y 1 en la comida" },
  { key: "linfo", nombre: "Linfo Essential", pauta: "20 ml al día" },
  { key: "hepato_plus", nombre: "Hepato+ Essential", pauta: "20 ml al día" },
  { key: "omega3_lipid", nombre: "Omega 3 Lipid", pauta: "1 cápsula al día" },
  { key: "omega3_plus", nombre: "Omega 3 Plus", pauta: "1 cápsula al día" },
  { key: "cla", nombre: "CLA Essential", pauta: "1 cápsula antes de cada comida" },
  { key: "cicatial", nombre: "Cicatial", pauta: "1 sobre al día" },
  { key: "magnesio_plus", nombre: "Magnesio Plus", pauta: "1 cápsula al día" },
];
export const SUPLEMENTO_KEYS = SUPLEMENTOS.map((s) => s.key) as [string, ...string[]];
