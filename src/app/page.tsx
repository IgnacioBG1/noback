import Link from "next/link";
import { Logo } from "@/components/ui";

const pillars = [
  {
    title: "Pierdes grasa, no músculo",
    body: "Objetivo de proteína y plan de fuerza desde el primer día. Medimos tu composición corporal y tu fuerza, no solo la báscula.",
  },
  {
    title: "Un médico decide contigo",
    body: "Valoración médica, analíticas y un plan individual. Si un tratamiento es adecuado para ti, lo decide tu médico en consulta.",
  },
  {
    title: "Acompañamiento cada día",
    body: "Un asistente por WhatsApp te ayuda con las comidas, los recordatorios y el registro. Todo lo clínico lo revisa tu médico.",
  },
  {
    title: "Una salida para no recuperar el peso",
    body: "El programa no acaba al llegar a tu objetivo: una fase de mantenimiento estructurada para que el resultado dure.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4">
        <Logo />
        <Link href="/acceso" className="rounded-md px-3 py-1.5 text-sm text-ink-soft hover:bg-brand-soft hover:text-ink">
          Acceder
        </Link>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4">
        <section className="py-16 sm:py-24">
          <p className="mb-4 text-sm font-medium text-brand">Programa médico de salud metabólica</p>
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Baja tu grasa y tu edad biológica. No tu músculo.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-ink-soft">
            Un equipo médico y de entrenamiento que mide lo que importa: composición corporal, fuerza, analíticas y edad
            biológica, antes, durante y después.
          </p>
          <p className="mt-8 inline-block rounded-md bg-brand-soft px-4 py-2 text-sm text-ink">
            Abriremos plazas próximamente. El programa piloto está reservado a pacientes de Longevidad y Salud 360.
          </p>
        </section>

        <section className="grid gap-4 pb-20 sm:grid-cols-2">
          {pillars.map((p) => (
            <article key={p.title} className="rounded-xl border border-line bg-surface p-6">
              <h2 className="font-semibold">{p.title}</h2>
              <p className="mt-2 text-ink-soft">{p.body}</p>
            </article>
          ))}
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-1 px-4 py-6 text-sm text-ink-soft sm:flex-row sm:justify-between">
          <span>NoBack es un servicio de Longevidad y Salud 360. La información de esta web no sustituye la consulta médica.</span>
          <span className="flex gap-4">
            <Link href="/privacidad" className="hover:text-ink">Privacidad</Link>
            <Link href="/aviso-legal" className="hover:text-ink">Aviso legal</Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
