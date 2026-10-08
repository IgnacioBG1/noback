"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { OtpLogin } from "@/components/otp-login";
import { inputClass } from "@/components/ui";

/** Alta sin contraseña: nombre, apellidos y correo; se confirma con el código que llega por correo. */
export function SignupForm() {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  const alta = () => {
    const el = ref.current;
    if (!el) return null;
    const v = (n: string) => (el.querySelector(`[name="${n}"]`) as HTMLInputElement | null)?.value.trim() ?? "";
    const ok = (el.querySelector('[name="mayor"]') as HTMLInputElement | null)?.checked;
    if (!v("first_name") || !v("last_name")) {
      setError("Escribe tu nombre y apellidos.");
      return null;
    }
    if (!ok) {
      setError("Marca la casilla para continuar.");
      return null;
    }
    setError(null);
    return { first_name: v("first_name").slice(0, 80), last_name: v("last_name").slice(0, 120) };
  };

  return (
    <OtpLogin
      next="/paciente/valoracion"
      alta={alta}
      onEmailStep={
        <div ref={ref} className="space-y-4">
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
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" name="mayor" required className="mt-0.5 size-4 accent-[var(--brand)]" />
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
        </div>
      }
    />
  );
}
