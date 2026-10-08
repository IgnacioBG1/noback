import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="inline-flex items-center gap-2 font-semibold tracking-tight text-ink" aria-label="NoBack, inicio">
      <span aria-hidden className="grid size-7 place-items-center rounded-md bg-brand text-sm text-brand-ink">N</span>
      NoBack
    </Link>
  );
}

export function Shell({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
          <Logo />
          <div className="flex items-center gap-3 text-sm">{right}</div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">{children}</main>
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-line bg-surface p-6 ${className}`}>{children}</section>;
}

export function SignOutButton() {
  return (
    <form action="/salir" method="post">
      <button className="rounded-md px-3 py-1.5 text-ink-soft hover:bg-brand-soft hover:text-ink">Cerrar sesión</button>
    </form>
  );
}

export const inputClass =
  "w-full rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30";
export const buttonClass =
  "inline-flex w-full items-center justify-center rounded-md bg-brand px-4 py-2.5 font-medium text-brand-ink hover:opacity-90 disabled:opacity-50";
