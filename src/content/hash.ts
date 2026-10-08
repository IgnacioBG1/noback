import { createHash } from "node:crypto";
import type { ConsentDoc } from "./consentimientos";

/** Hash SHA-256 del contenido exacto que ve y acepta el paciente. */
export function consentHash(d: ConsentDoc): string {
  return createHash("sha256")
    .update(JSON.stringify({ kind: d.kind, version: d.version, title: d.title, checkbox: d.checkbox, body: d.body }))
    .digest("hex");
}
