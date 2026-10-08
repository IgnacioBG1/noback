"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./ui";

const ITEMS = [
  { href: "/paciente", label: "Inicio", icon: "home" },
  { href: "/paciente/plan", label: "Plan", icon: "plan" },
  { href: "/paciente/progreso", label: "Progreso", icon: "chart" },
  { href: "/paciente/analiticas", label: "Analíticas", icon: "lab" },
];

function useActive() {
  const path = usePathname();
  return (href: string) => (href === "/paciente" ? path === "/paciente" || path.startsWith("/paciente/valoracion") : path.startsWith(href));
}

/** Barra inferior en móvil. */
export function PatientBottomNav() {
  const active = useActive();
  return (
    <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-4">
        {ITEMS.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active(i.href) ? "page" : undefined}
            className={`flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] ${active(i.href) ? "font-semibold text-brand" : "text-ink-soft"}`}
          >
            <Icon name={i.icon} size={22} />
            {i.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

/** Pestañas superiores en escritorio. */
export function PatientTopNav() {
  const active = useActive();
  return (
    <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
      {ITEMS.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          aria-current={active(i.href) ? "page" : undefined}
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${active(i.href) ? "bg-brand-soft font-medium text-brand" : "text-ink-soft hover:bg-bg hover:text-ink"}`}
        >
          <Icon name={i.icon} size={18} />
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
