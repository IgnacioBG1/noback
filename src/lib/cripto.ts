import "server-only";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "node:crypto";

/** Clave de 32 bytes en base64 (APP_ENCRYPTION_KEY). Cifra teléfonos y otros datos sensibles en la aplicación. */
function key(): Buffer {
  const k = process.env.APP_ENCRYPTION_KEY;
  if (!k) throw new Error("Falta APP_ENCRYPTION_KEY");
  const b = Buffer.from(k, "base64");
  if (b.length !== 32) throw new Error("APP_ENCRYPTION_KEY debe tener 32 bytes en base64");
  return b;
}
export const criptoConfigurado = () => !!process.env.APP_ENCRYPTION_KEY;

export function cifrar(texto: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(texto, "utf8"), c.final()]);
  return ["v1", iv.toString("base64"), c.getAuthTag().toString("base64"), enc.toString("base64")].join(".");
}

export function descifrar(payload: string): string {
  const [v, iv, tag, enc] = payload.split(".");
  if (v !== "v1") throw new Error("Formato de cifrado desconocido");
  const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
  d.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([d.update(Buffer.from(enc, "base64")), d.final()]).toString("utf8");
}

/** Número en formato E.164 sin «+» (como lo envía WhatsApp: 34600111222). */
export function normalizaTelefono(t: string): string {
  const d = t.replace(/\D/g, "").replace(/^00/, "");
  return d.length === 9 && /^[6789]/.test(d) ? `34${d}` : d;
}

export const hashTelefono = (t: string) => createHmac("sha256", key()).update(`tel:${normalizaTelefono(t)}`).digest("hex");

/** Código de vinculación legible (sin 0/O ni 1/I) y su hash para guardarlo. */
export function nuevoCodigo(): { codigo: string; hash: string } {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const b = randomBytes(6);
  const codigo = Array.from(b, (x) => abc[x % abc.length]).join("");
  return { codigo, hash: hashCodigo(codigo) };
}
export const hashCodigo = (c: string) => createHash("sha256").update(`vincular:${c.toUpperCase()}`).digest("hex");
