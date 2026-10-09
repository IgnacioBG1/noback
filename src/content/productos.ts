import data from "./essential-productos.json";

/**
 * Productos de dieta Essential (gamas verde, amarilla y roja): datos de la tienda online (9 de octubre de 2026).
 * Fases: del catálogo oficial V23 (`fasesFuente: "catalogo"`); los productos posteriores al catálogo
 * siguen la regla de su gama (`"gama"`) y conviene confirmarlos con Essential Diet.
 */
export interface Producto {
  ref: string;
  nombre: string;
  gama: "verde" | "amarilla" | "roja";
  tipo: string;
  formato: string | null;
  precio: number | null;
  raciones: number | null;
  eurRacion: number | null;
  kcal: number | null;
  proteina: number | null;
  hidratos: number | null;
  grasas: number | null;
  fibra: number | null;
  alergenos: string[];
  /** Posibles trazas declaradas por el fabricante. */
  trazas: string[];
  fases: ("1" | "2" | "3" | "M")[];
  fasesFuente: "catalogo" | "gama";
  listo: boolean;
  url: string;
}

export const PRODUCTOS = data as Producto[];
export const TIPOS = ["Batidos y bebidas", "Barritas", "Comidas saladas", "Postres", "Pan, tostadas y galletas", "Snacks", "Obleas y dulces"];
export const FILTROS_ALERGENOS: { key: string; label: string; excluye: string[] }[] = [
  { key: "gluten", label: "Sin gluten", excluye: ["gluten"] },
  { key: "lactosa", label: "Sin leche ni lactosa", excluye: ["leche", "lactosa"] },
  { key: "huevo", label: "Sin huevo", excluye: ["huevo"] },
  { key: "soja", label: "Sin soja", excluye: ["soja"] },
  { key: "frutos", label: "Sin frutos de cáscara", excluye: ["frutos de cáscara", "cacahuete"] },
];

/** Filtros de alérgenos que se deducen de lo que el paciente escribió en «Alergias» del cuestionario. */
export function alergenosDeTexto(t: string | null | undefined): string[] {
  const s = (t ?? "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  const out: string[] = [];
  if (/gluten|celiac|trigo/.test(s)) out.push("gluten");
  if (/lactosa|leche|lacteo/.test(s)) out.push("lactosa");
  if (/huevo/.test(s)) out.push("huevo");
  if (/soja/.test(s)) out.push("soja");
  if (/frutos secos|frutos de cascara|nuez|nueces|almendra|avellana|cacahuete/.test(s)) out.push("frutos");
  return out;
}

/** Proteína mediana por ración de la gama verde, para estimar la proteína que aportan los productos. */
export const PROTEINA_MEDIANA_RACION = (() => {
  const v = PRODUCTOS.filter((p) => p.gama === "verde" && p.proteina != null)
    .map((p) => p.proteina!)
    .sort((a, b) => a - b);
  return v.length ? v[Math.floor(v.length / 2)] : 15;
})();

export function productosParaFase(fase: "1" | "2" | "3" | "M" | null) {
  return fase ? PRODUCTOS.filter((p) => p.fases.includes(fase)) : PRODUCTOS;
}
