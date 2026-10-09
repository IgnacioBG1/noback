import { describe, expect, it, beforeAll } from "vitest";
import { createHmac, randomBytes } from "node:crypto";
import { firmaValida, parseWebhook } from "./whatsapp";
import { cifrar, descifrar, hashCodigo, hashTelefono, normalizaTelefono, nuevoCodigo } from "@/lib/cripto";

beforeAll(() => {
  process.env.WHATSAPP_APP_SECRET = "secreto-de-prueba";
  process.env.APP_ENCRYPTION_KEY = randomBytes(32).toString("base64");
});

describe("Webhook de WhatsApp", () => {
  it("solo acepta la firma de Meta", () => {
    const raw = JSON.stringify({ a: 1 });
    const ok = "sha256=" + createHmac("sha256", "secreto-de-prueba").update(raw).digest("hex");
    expect(firmaValida(raw, ok)).toBe(true);
    expect(firmaValida(raw + " ", ok)).toBe(false);
    expect(firmaValida(raw, null)).toBe(false);
  });
  it("normaliza texto, botones e imágenes", () => {
    const m = parseWebhook({
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  { from: "34600111222", id: "w1", type: "text", text: { body: "Hola" } },
                  { from: "34600111222", id: "w2", type: "interactive", interactive: { button_reply: { id: "ci:plan:si", title: "Sí, entero" } } },
                  { from: "34600111222", id: "w3", type: "image", image: { id: "m1", mime_type: "image/jpeg", caption: "comida" } },
                  { from: "34600111222", id: "w4", type: "button", button: { text: "A medias", payload: "A medias" } },
                ],
              },
            },
          ],
        },
      ],
    });
    expect(m.map((x) => x.tipo)).toEqual(["text", "button", "image", "button"]);
    expect(m[1].botonId).toBe("ci:plan:si");
    expect(m[2].mediaId).toBe("m1");
  });
});

describe("Cifrado y vinculación", () => {
  it("cifra y descifra; el hash del teléfono no depende del formato", () => {
    const c = cifrar("34600111222");
    expect(c).not.toContain("600111222");
    expect(descifrar(c)).toBe("34600111222");
    expect(normalizaTelefono("+34 600 11 12 22")).toBe("34600111222");
    expect(normalizaTelefono("600111222")).toBe("34600111222");
    expect(hashTelefono("+34 600111222")).toBe(hashTelefono("0034600111222"));
  });
  it("códigos legibles de 6 caracteres", () => {
    const { codigo, hash } = nuevoCodigo();
    expect(codigo).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(hashCodigo(codigo.toLowerCase())).toBe(hash);
  });
});
