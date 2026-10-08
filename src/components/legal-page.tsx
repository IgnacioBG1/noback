import Link from "next/link";
import { Logo } from "@/components/ui";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex h-16 w-full max-w-3xl items-center px-4">
        <Logo />
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-20">
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-ink-soft">Última actualización: {updated}</p>
        <div className="mt-8 space-y-6 leading-relaxed text-ink [&_h2]:mt-10 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:text-ink-soft [&_li]:text-ink-soft">
          {children}
        </div>
        <p className="mt-12 text-sm">
          <Link href="/" className="text-brand hover:underline">
            ← Volver al inicio
          </Link>
        </p>
      </main>
    </div>
  );
}
