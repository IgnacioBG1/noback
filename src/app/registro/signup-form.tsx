"use client";
import { useState } from "react";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/supabase/browser";
import { buttonClass, inputClass } from "@/components/ui";

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{12,}$/;

export function SignupForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email") ?? "").trim();
    const password = String(f.get("password") ?? "");
    if (!PASSWORD_RULE.test(password)) {
      setError("La contraseña necesita al menos 12 caracteres, con mayúsculas, minúsculas y algún número.");
      return;
    }
    setBusy(true);
    setError(null);
    const supabase = createSupabaseBrowser();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirmar?next=/paciente/valoracion`,
        data: { first_name: String(f.get("first_name") ?? "").trim(), last_name: String(f.get("last_name") ?? "").trim() },
      },
    });
    setBusy(false);
    if (error) {
      setError("No hemos podido crear la cuenta. Revisa los datos o inténtalo más tarde.");
      return;
    }
    setSentTo(email);
  }

  if (sentTo) {
    return (
      <div className="mt-6 rounded-md bg-brand-soft p-4 text-sm">
        <p className="font-medium">Revisa tu correo</p>
        <p className="mt-1">
          Te hemos enviado un enlace a <strong>{sentTo}</strong> para confirmar tu cuenta. Al abrirlo empezarás tu valoración.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Nombre</span>
          <input className={inputClass} name="first_name" autoComplete="given-name" required maxLength={80} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Apellidos</span>
          <input className={inputClass} name="last_name" autoComplete="family-name" required maxLength={120} />
        </label>
      </div>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Correo electrónico</span>
        <input className={inputClass} type="email" name="email" autoComplete="email" required />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Contraseña</span>
        <input className={inputClass} type="password" name="password" autoComplete="new-password" required minLength={12} />
        <span className="mt-1 block text-xs text-ink-soft">Mínimo 12 caracteres, con mayúsculas, minúsculas y algún número.</span>
      </label>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" required className="mt-0.5 size-4 accent-[var(--brand)]" />
        <span>
          Soy mayor de 18 años y he leído la{" "}
          <Link href="/privacidad" target="_blank" className="text-brand underline">
            política de privacidad
          </Link>
          .
        </span>
      </label>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <button className={buttonClass} disabled={busy}>
        {busy ? "Creando cuenta…" : "Crear cuenta"}
      </button>
    </form>
  );
}
