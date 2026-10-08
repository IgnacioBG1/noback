import Link from "next/link";

export function Logo({ href = "/", sub, dark = false }: { href?: string; sub?: string; dark?: boolean }) {
  return (
    <Link href={href} className={`inline-flex items-center gap-2.5 font-semibold tracking-tight ${dark ? "text-white" : "text-ink"}`} aria-label="NoBack, inicio">
      <span aria-hidden className="grid size-8 place-items-center rounded-lg bg-brand text-sm text-brand-ink">N</span>
      <span>
        NoBack{sub && <span className={dark ? "text-side-soft" : "text-ink-soft"}> · {sub}</span>}
      </span>
    </Link>
  );
}

/** Contenedor sencillo para páginas públicas y de acceso. */
export function Shell({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4">
          <Logo />
          <div className="flex items-center gap-3 text-sm">{right}</div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">{children}</main>
    </div>
  );
}

export function Card({ children, className = "", tone = "default" }: { children: React.ReactNode; className?: string; tone?: "default" | "warn" | "dark" | "brand" }) {
  const tones = {
    default: "border-line bg-surface",
    warn: "border-warn-line bg-warn-soft",
    dark: "border-side bg-side text-white",
    brand: "border-brand bg-brand text-brand-ink",
  };
  return <section className={`rounded-2xl border p-5 sm:p-6 ${tones[tone]} ${className}`}>{children}</section>;
}

export function CardTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-3">
      <h2 className="text-[15px] font-semibold">{children}</h2>
      {aside && <span className="text-xs text-ink-soft">{aside}</span>}
    </div>
  );
}

export function PageHeader({ eyebrow, title, children, actions }: { eyebrow?: string; title: string; children?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="text-[13px] text-ink-soft">{eyebrow}</p>}
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-[28px]">{title}</h1>
        {children && <p className="mt-1 max-w-2xl text-ink-soft">{children}</p>}
      </div>
      {actions}
    </header>
  );
}

export function Stat({
  label,
  value,
  unit,
  hint,
  tone = "default",
  size = "md",
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  hint?: React.ReactNode;
  tone?: "default" | "warn" | "brand" | "muted";
  size?: "sm" | "md";
}) {
  const valueTone = { default: "text-ink", warn: "text-warn-ink", brand: "text-brand", muted: "text-ink-soft" }[tone];
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-xs text-ink-soft">{label}</span>
      <span className={`num ${size === "md" ? "text-[28px]" : "text-lg"} leading-tight ${valueTone}`}>
        {value}
        {unit && <span className="ml-1 text-sm text-ink-soft">{unit}</span>}
      </span>
      {hint && <span className="text-xs text-ink-soft">{hint}</span>}
    </div>
  );
}

export function StatCard(props: React.ComponentProps<typeof Stat>) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <Stat {...props} />
    </div>
  );
}

export function Badge({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "brand" | "warn" | "ok" | "dark" }) {
  const tones = {
    default: "bg-bg text-ink-soft border-line",
    brand: "bg-brand-soft text-brand border-transparent",
    warn: "bg-warn-soft text-warn-ink border-warn-line",
    ok: "bg-ok-soft text-ok border-transparent",
    dark: "bg-side text-white border-transparent",
  };
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

export function EmptyState({ icon, title, children, action }: { icon?: React.ReactNode; title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-line bg-bg/60 px-6 py-8 text-center">
      {icon && <div className="mb-3 grid size-10 place-items-center rounded-full bg-surface text-ink-soft">{icon}</div>}
      <p className="font-medium">{title}</p>
      {children && <p className="mt-1 max-w-sm text-sm text-ink-soft">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Línea de pasos con estado: hecho, actual o pendiente. */
export function Steps({ items }: { items: { label: string; detail?: string; state: "done" | "current" | "todo" }[] }) {
  return (
    <ol className="space-y-0">
      {items.map((it, i) => (
        <li key={it.label} className="relative flex gap-3 pb-4 last:pb-0" aria-current={it.state === "current" ? "step" : undefined}>
          {i < items.length - 1 && <span aria-hidden className={`absolute top-6 left-[11px] h-[calc(100%-20px)] w-px ${it.state === "done" ? "bg-brand" : "bg-line"}`} />}
          <span
            aria-hidden
            className={`relative z-10 mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border text-[11px] ${
              it.state === "done"
                ? "border-brand bg-brand text-white"
                : it.state === "current"
                  ? "border-brand bg-surface text-brand ring-4 ring-brand-soft"
                  : "border-line bg-surface text-ink-soft"
            }`}
          >
            {it.state === "done" ? <Icon name="check" size={13} /> : i + 1}
          </span>
          <div className="min-w-0">
            <p className={`text-sm ${it.state === "todo" ? "text-ink-soft" : "font-medium"}`}>
              {it.label}
              <span className="sr-only">{it.state === "done" ? " (hecho)" : it.state === "current" ? " (ahora)" : " (pendiente)"}</span>
            </p>
            {it.detail && <p className="text-xs text-ink-soft">{it.detail}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function SignOutButton({ className = "" }: { className?: string }) {
  return (
    <form action="/salir" method="post">
      <button className={`rounded-lg px-3 py-2 text-sm text-ink-soft hover:bg-bg hover:text-ink ${className}`}>Cerrar sesión</button>
    </form>
  );
}

const paths: Record<string, React.ReactNode> = {
  home: <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
  plan: (
    <>
      <path d="M9 11l3 3 8-8" />
      <path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9" />
    </>
  ),
  chart: <path d="M3 20h18M6 16l4-5 4 3 5-7" />,
  lab: <path d="M9 3h6M10 3v6L4.5 18.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3M7 15h10" />,
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6" />
    </>
  ),
  clipboard: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3" />
    </>
  ),
  message: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  team: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  scale: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M8 9a5.5 5.5 0 0 1 8 0l-2.5 3" />
    </>
  ),
  grip: <path d="M7 10v4M17 10v4M4 11v2M20 11v2M7 12h10" />,
  dna: <path d="M8 3c0 6 8 6 8 12s-8 6-8 6M16 3c0 6-8 6-8 12M9 7h6M9 17h6" />,
  shield: <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4-4" />
    </>
  ),
  video: (
    <>
      <rect x="3" y="6" width="13" height="12" rx="2" />
      <path d="M16 10l5-3v10l-5-3" />
    </>
  ),
  alert: <path d="M12 4l9 16H3zM12 10v4M12 17v.5" />,
};

export function Icon({ name, size = 20, className = "" }: { name: keyof typeof paths | string; size?: number; className?: string }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
      {paths[name]}
    </svg>
  );
}

export const inputClass =
  "w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-ink outline-none placeholder:text-ink-soft/70 focus:border-brand focus:ring-2 focus:ring-brand/25";
export const buttonClass =
  "inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 font-medium text-brand-ink hover:bg-brand-hover disabled:opacity-50";
export const linkButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-brand-ink hover:bg-brand-hover";
export const ghostButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink hover:bg-bg";

// Formatos compartidos (es-ES, hora de Madrid).
export const fmtFecha = (iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) =>
  iso ? new Intl.DateTimeFormat("es-ES", { ...opts, timeZone: "Europe/Madrid" }).format(new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso)) : "—";
export const fmtNum = (n: number, d = 1) => new Intl.NumberFormat("es-ES", { maximumFractionDigits: d, minimumFractionDigits: d }).format(n);
export const nombreCompleto = (p: { first_name: string | null; last_name: string | null }) =>
  [p.first_name, p.last_name].filter(Boolean).join(" ") || "Paciente sin nombre";
export const iniciales = (p: { first_name: string | null; last_name: string | null }) =>
  ((p.first_name?.[0] ?? "") + (p.last_name?.[0] ?? "")).toUpperCase() || "·";
