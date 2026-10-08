import "server-only";
import Stripe from "stripe";

let client: Stripe | null = null;

export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Falta STRIPE_SECRET_KEY");
  // Cliente fetch: funciona igual en Vercel y detrás de proxies HTTP.
  client ??= new Stripe(key, { httpClient: Stripe.createFetchHttpClient() });
  return client;
}

/** Precios del programa en céntimos (propuesta del modelo de negocio; ajustables por entorno). */
export const PRECIO_VALORACION_CENTS = Number(process.env.PRECIO_VALORACION_CENTS ?? 8900);

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export const eur = (cents: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(cents / 100);
