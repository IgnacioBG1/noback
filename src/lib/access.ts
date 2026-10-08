/**
 * Reglas de acceso a las áreas de la aplicación. Función pura para poder probarla.
 * La base de datos (RLS) es la barrera real; esto solo decide a dónde enviar al usuario.
 */
export type Role = "patient" | "doctor" | "trainer" | "admin";
export type Aal = "aal1" | "aal2";

export interface SessionInfo {
  userId: string | null;
  role: Role | null;
  aal: Aal | null;
  /** true si el usuario ya tiene un factor verificado (debe introducir el código) */
  hasVerifiedFactor: boolean;
}

export type Decision = { allow: true } | { allow: false; redirectTo: string };

export const isStaffRole = (r: Role | null): boolean => r === "doctor" || r === "trainer" || r === "admin";

export function decideAccess(area: "clinica" | "paciente" | "mfa", s: SessionInfo, path = "/"): Decision {
  if (!s.userId) {
    return { allow: false, redirectTo: `/acceso?next=${encodeURIComponent(path)}` };
  }
  switch (area) {
    case "clinica":
      if (!isStaffRole(s.role)) return { allow: false, redirectTo: "/paciente" };
      if (s.aal !== "aal2") return { allow: false, redirectTo: "/acceso/doble-factor" };
      return { allow: true };
    case "paciente":
      if (isStaffRole(s.role)) return { allow: false, redirectTo: "/clinica" };
      return { allow: true };
    case "mfa":
      if (s.aal === "aal2") return { allow: false, redirectTo: isStaffRole(s.role) ? "/clinica" : "/paciente" };
      return { allow: true };
  }
}

/** Solo se permiten redirecciones internas tras el acceso (evita redirecciones abiertas). */
export function safeNext(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
