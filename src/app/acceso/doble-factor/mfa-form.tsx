"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase/browser";
import { buttonClass, inputClass } from "@/components/ui";

export function MfaForm({ mode }: { mode: "enroll" | "verify" }) {
  const router = useRouter();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    (async () => {
      if (mode === "verify") {
        const { data } = await supabase.auth.mfa.listFactors();
        const f = data?.totp?.find((x) => x.status === "verified");
        setFactorId(f?.id ?? null);
        return;
      }
      // Limpia intentos anteriores sin verificar y crea uno nuevo.
      const { data: list } = await supabase.auth.mfa.listFactors();
      for (const f of list?.all ?? []) {
        if (f.factor_type === "totp" && f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "NoBack" });
      if (error || !data) {
        setError("No se ha podido iniciar la configuración. Recarga la página.");
        return;
      }
      setFactorId(data.id);
      setQr(data.totp.qr_code);
      setSecret(data.totp.secret);
    })();
  }, [mode]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setBusy(true);
    setError(null);
    const supabase = createSupabaseBrowser();
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.trim() });
    setBusy(false);
    if (error) {
      setError("Código incorrecto o caducado. Prueba con el siguiente.");
      return;
    }
    router.replace("/clinica");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      {mode === "enroll" && (
        <div className="flex flex-col items-center gap-3">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="Código QR para la app de autenticación" className="size-44 rounded-md bg-white p-2" />
          ) : (
            <div className="size-44 animate-pulse rounded-md bg-brand-soft" aria-hidden />
          )}
          {secret && (
            <p className="text-center text-xs text-ink-soft">
              ¿No puedes escanear? Clave: <code className="break-all font-mono text-ink">{secret}</code>
            </p>
          )}
        </div>
      )}
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Código de 6 cifras</span>
        <input
          className={`${inputClass} text-center font-mono tracking-[0.4em]`}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <button className={buttonClass} disabled={busy || !factorId}>
        {busy ? "Comprobando…" : "Verificar"}
      </button>
    </form>
  );
}
