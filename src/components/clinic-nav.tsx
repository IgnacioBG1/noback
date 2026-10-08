"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./ui";

type Item = { href: string; label: string; icon: string; count?: number; alert?: boolean; soon?: boolean };

export function ClinicNav({ items, variant }: { items: Item[]; variant: "side" | "top" }) {
  const path = usePathname();
  const active = (href: string) => (href === "/clinica" ? path === "/clinica" : path.startsWith(href));

  if (variant === "top") {
    return (
      <nav aria-label="Panel" className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1">
        {items
          .filter((i) => !i.soon)
          .map((i) => (
            <Link
              key={i.href}
              href={i.href}
              aria-current={active(i.href) ? "page" : undefined}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm ${active(i.href) ? "bg-side-active text-white" : "text-side-soft"}`}
            >
              {i.label}
              {i.count ? <span className={`num text-xs ${i.alert ? "text-[#FDBA74]" : ""}`}>{i.count}</span> : null}
            </Link>
          ))}
      </nav>
    );
  }

  return (
    <nav aria-label="Panel" className="flex flex-col gap-1">
      {items.map((i) =>
        i.soon ? (
          <span key={i.href} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-side-soft/50" title="Disponible próximamente">
            <Icon name={i.icon} size={18} />
            <span className="flex-1">{i.label}</span>
            <span className="text-[10px] tracking-wide uppercase">Pronto</span>
          </span>
        ) : (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active(i.href) ? "page" : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
              active(i.href) ? "bg-side-active font-medium text-white" : "text-side-soft hover:bg-side-active/60 hover:text-white"
            }`}
          >
            <Icon name={i.icon} size={18} />
            <span className="flex-1">{i.label}</span>
            {i.count ? <span className={`num text-xs ${i.alert ? "text-[#FDBA74]" : ""}`}>{i.count}</span> : null}
          </Link>
        ),
      )}
    </nav>
  );
}
