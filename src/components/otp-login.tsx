"use client";
import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/browser";
import { buttonClass, inputClass } from "./ui";

const CODE_LEN = 6;
const ESPERA_REENVIO = 60;

type Alta = { first_name: string; last_name: string };

/**
 * Acceso sin contraseña: el paciente escribe su correo y recibe un código de 6 cifras
 * (y un enlace que hace lo mismo). Sirve para entrar y, con `alta`, para crear la cuenta.
 */
export function OtpLogin({ next, alta, onEmailStep }: { next: string; alta?: () => Alta | null; onEmailStep?: React.ReactNode }) {
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wait, setWait] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function enviar(to: string) {
    const datos = alta ? alta() : null;
    if (alta && !datos) return;
    setBusy(true);
    setError(null);
    const supabase = createSupabaseBrowser();
    const { error } = await supabase.auth.signInWithOtp({
      email: to,
      options: {
        shouldCreateUser: !!alta,
        data: datos ?? undefined,
        emailRedirectTo: `${window.location.origin}/auth/confirmar?next=${encodeURIComponent(next)}`,
      },
    });
    setBusy(false);
    if (error && /rate|seconds|too many/i.test(error.message)) {
      setError("Has pedido varios códigos seguidos. Espera un minuto y vuelve a intentarlo.");
      return;
    }
    if (error && alta) {
      setError("No hemos podido crear la cuenta. Revisa el correo o inténtalo más tarde.");
      return;
    }
    // Sin cuenta también mostramos el paso del código: no revelamos qué correos están registrados.
    setSentTo(to);
    setWait(ESPERA_REENVIO);
    setTimeout(() => codeRef.current?.focus(), 50);
  }

  async function verificar(c: string) {
    if (!sentTo || c.length !== CODE_LEN) return;
    setBusy(true);
    setError(null);
    const supabase = createSupabaseBrowser();
    const { error } = await supabase.auth.verifyOtp({ email: sentTo, token: c, type: "email" });
    if (error) {
      setBusy(false);
      setCode("");
      setError(/expired/i.test(error.message) ? "El código ha caducado. Pide uno nuevo." : "El código no es correcto. Revísalo o pide uno nuevo.");
      return;
    }
    window.location.assign(next);
  }

  if (!sentTo) {
    return (
      <form
        className="mt-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          enviar(email.trim().toLowerCase());
        }}
      >
        {onEmailStep}
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Tu correo electrónico</span>
          <input className={inputClass} type="email" name="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <button className={buttonClass} disabled={busy}>
          {busy ? "Enviando…" : alta ? "Crear cuenta" : "Recibir código"}
        </button>
        <p className="text-center text-xs text-ink-soft">Sin contraseñas: te enviamos un código para entrar.</p>
      </form>
    );
  }

  return (
    <form
      className="mt-6 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        verificar(code);
      }}
    >
      <div className="rounded-xl bg-brand-soft p-4 text-sm">
        Te hemos enviado un código de {CODE_LEN} cifras a <strong className="break-all">{sentTo}</strong>. También puedes pulsar el enlace del correo.
      </div>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Código</span>
        <input
          ref={codeRef}
          className={`${inputClass} num text-center text-2xl tracking-[0.5em]`}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={CODE_LEN}
          value={code}
          onChange={(e) => {
            const c = e.target.value.replace(/\D/g, "").slice(0, CODE_LEN);
            setCode(c);
            if (c.length === CODE_LEN) verificar(c);
          }}
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <button className={buttonClass} disabled={busy || code.length !== CODE_LEN}>
        {busy ? "Comprobando…" : "Entrar"}
      </button>
      <div className="flex justify-between text-sm">
        <button
          type="button"
          className="text-ink-soft hover:text-ink"
          onClick={() => {
            setSentTo(null);
            setCode("");
            setError(null);
          }}
        >
          Cambiar correo
        </button>
        <button type="button" className="font-medium text-brand disabled:text-ink-soft" disabled={wait > 0 || busy} onClick={() => enviar(sentTo)}>
          {wait > 0 ? `Reenviar en ${wait} s` : "Reenviar código"}
        </button>
      </div>
      <p className="text-xs text-ink-soft">Si no lo ves, mira en la carpeta de correo no deseado.</p>
    </form>
  );
}
