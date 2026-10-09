import { Card, CardTitle, Icon, fmtFecha } from "./ui";
import { CatalogoProductos } from "./catalogo-productos";
import { FILTROS_ALERGENOS, PROTEINA_MEDIANA_RACION, TIPOS, productosParaFase } from "@/content/productos";
import { faseCatalogo, EJERCICIO, FRUTAS, GAMAS, IMPORTANTE, LACTEOS, LEGUMBRES, PAN, PROTEINAS, SUPLEMENTOS, type Comida, type Fase } from "@/content/essential";

function Chip({ t, siempre, color }: { t: string; siempre?: boolean; color: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-1 text-[13px] font-medium"
      style={siempre ? { background: color, borderColor: color, color: "#fff" } : { borderColor: color, color }}
    >
      {t}
    </span>
  );
}

function Comidas({ comidas, color }: { comidas: Comida[]; color: string }) {
  return (
    <ol className="divide-y divide-line">
      {comidas.map((c) => (
        <li key={c.nombre} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start">
          <span className="w-32 shrink-0 text-sm font-semibold">{c.nombre}</span>
          <div className="space-y-1.5">
            {c.items.map((fila, i) => (
              <div key={i} className="flex flex-wrap items-center gap-1.5">
                {i > 0 && <span className="text-xs text-ink-soft">y además, si te lo indica tu médico:</span>}
                {fila.map((it, j) => (
                  <span key={j} className="inline-flex items-center gap-1.5">
                    {j > 0 && <span className="text-xs text-ink-soft">{fila[j - 1].o ? "o" : "+"}</span>}
                    <Chip t={it.t} siempre={it.siempre} color={color} />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </li>
      ))}
    </ol>
  );
}

function Seccion({ icon, titulo, children, open = false }: { icon: string; titulo: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details open={open} className="group rounded-2xl border border-line bg-surface">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4">
        <span className="grid size-9 place-items-center rounded-lg bg-bg text-brand">
          <Icon name={icon} size={18} />
        </span>
        <span className="flex-1 font-semibold">{titulo}</span>
        <Icon name="arrow" size={16} className="rotate-90 text-ink-soft transition-transform group-open:-rotate-90" />
      </summary>
      <div className="px-5 pb-5 text-[15px]">{children}</div>
    </details>
  );
}

const Lista = ({ items }: { items: string[] }) => (
  <ul className="space-y-1.5">
    {items.map((i) => (
      <li key={i} className="flex gap-2">
        <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" />
        {i}
      </li>
    ))}
  </ul>
);

function noPermitido(f: Fase): string[] {
  if (f.key === "mantenimiento") return [];
  const out: string[] = [];
  if (!f.frutas) out.push("Fruta (vuelve en la fase 3.1)");
  if (!f.lacteos) out.push("Leche, yogur y queso (vuelven en la fase 3.2). Solo suero de leche Essential y 50 ml de bebida de soja");
  if (!f.pan) out.push("Pan, biscotes y cereales (vuelven en la fase 3.3)");
  if (!f.legumbres) out.push("Legumbres, arroz, pasta y patata (vuelven en la fase 3.4)");
  if (!f.proteinas) out.push("Carne, pescado, huevos y jamón (vuelven en la fase 2.1)");
  out.push("Azúcar y cualquier edulcorante que no sea sucralosa, stevia o aspartamo");
  if (f.recomendaciones.some((r) => r.titulo === "Mal aliento")) out.push("Chicles y caramelos, aunque sean sin azúcar");
  out.push("Café torrefacto");
  if (f.verduras.listas.length) out.push("Ajo y cebolla frescos (solo en polvo o deshidratados) y verduras que no estén en tus listas");
  return out;
}

export function ProtocoloFase({
  fase: f,
  productosDia,
  periodoDias,
  inicio,
  mixtoOpcion,
  suplementos,
  alergias = [],
}: {
  fase: Fase;
  productosDia: number | null;
  periodoDias: number | null;
  inicio: string | null;
  mixtoOpcion: string | null;
  suplementos: string[];
  alergias?: string[];
}) {
  const dia = inicio ? Math.floor((Date.parse(new Date().toISOString().slice(0, 10)) - Date.parse(inicio)) / 86_400_000) + 1 : null;
  const opciones = f.opciones ? f.opciones.filter((o) => !mixtoOpcion || o.nombre.endsWith(mixtoOpcion)) : [];
  const no = noPermitido(f);
  const sup = suplementos.map((k) => SUPLEMENTOS.find((s) => s.key === k)).filter(Boolean) as typeof SUPLEMENTOS;

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-2xl text-white" style={{ background: f.color }}>
        <div className="p-5 sm:p-6">
          <p className="text-xs font-medium tracking-wide text-white/80 uppercase">Tu fase ahora</p>
          <h2 className="mt-1 text-2xl font-semibold">{f.nombre}</h2>
          {f.subtitulo && <p className="text-white/90">{f.subtitulo}</p>}
          <p className="mt-2 text-sm text-white/90">{f.resumen}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            {productosDia != null && <span className="rounded-full bg-white/20 px-3 py-1"><span className="num">{productosDia}</span> productos Essential al día</span>}
            {productosDia ? (
              <span className="rounded-full bg-white/20 px-3 py-1">
                ≈ <span className="num">{Math.round(productosDia * PROTEINA_MEDIANA_RACION)}</span> g de proteína de los productos
              </span>
            ) : null}
            {periodoDias != null && (
              <span className="rounded-full bg-white/20 px-3 py-1">
                {dia != null && dia >= 1 ? <>Día <span className="num">{Math.min(dia, periodoDias)}</span> de <span className="num">{periodoDias}</span></> : <><span className="num">{periodoDias}</span> días</>}
              </span>
            )}
            {inicio && <span className="rounded-full bg-white/20 px-3 py-1">Desde el {fmtFecha(inicio, { day: "numeric", month: "long" })}</span>}
          </div>
        </div>
      </section>

      {f.mantenimiento ? (
        <Card>
          <CardTitle>Tu día a día</CardTitle>
          <div className="space-y-5">
            {f.mantenimiento.map((b) => (
              <div key={b.titulo}>
                <p className="mb-2 text-sm font-semibold">{b.titulo}</p>
                <Lista items={b.items} />
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Card>
          <CardTitle aside={<span className="inline-flex items-center gap-3"><span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-full" style={{ background: f.color }} /> siempre</span><span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-full border" style={{ borderColor: f.color }} /> según tu pauta</span></span>}>
            Tu día
          </CardTitle>
          {f.comidas && <Comidas comidas={f.comidas} color={f.color} />}
          {opciones.map((o) => (
            <div key={o.nombre} className="mt-2">
              {!mixtoOpcion && <p className="mt-3 text-sm font-semibold" style={{ color: f.color }}>{o.nombre}</p>}
              <Comidas comidas={o.comidas} color={f.color} />
            </div>
          ))}
          {f.notas.length > 0 && (
            <ul className="mt-3 space-y-1 border-t border-line pt-3 text-xs text-ink-soft">
              {f.notas.map((n) => <li key={n}>{n}</li>)}
            </ul>
          )}
          {productosDia == null && !f.mantenimiento && <p className="mt-3 text-xs text-ink-soft">Tu médico te indicará cuántos productos Essential tomar al día.</p>}
        </Card>
      )}

      {no.length > 0 && (
        <Card tone="warn">
          <p className="flex items-center gap-2 font-semibold text-warn-ink">
            <Icon name="alert" size={18} /> En esta fase, no
          </p>
          <p className="mt-1 text-sm">Solo están permitidos los alimentos de tu fase. En especial, evita:</p>
          <ul className="mt-2 space-y-1 text-sm">
            {no.map((n) => <li key={n}>· {n}</li>)}
          </ul>
        </Card>
      )}

      {faseCatalogo(f.key) && (
        <Card>
          <CardTitle aside={f.key === "mantenimiento" ? "para cualquier momento" : `permitidos en ${f.nombre.toLowerCase()}`}>Productos Essential para tu fase</CardTitle>
          {["1", "2"].includes(faseCatalogo(f.key)!) && (
            <ul className="mb-4 space-y-1 rounded-xl bg-bg p-3 text-sm">
              <li>· Mejor de <strong>gama verde</strong>.</li>
              <li>· Como máximo <strong>1 de gama amarilla</strong> y <strong>1 de gama roja</strong> al día, salvo otra indicación de tu médico.</li>
            </ul>
          )}
          <CatalogoProductos productos={productosParaFase(faseCatalogo(f.key))} tipos={TIPOS} filtrosAlergenos={FILTROS_ALERGENOS} alergiasIniciales={alergias} />
        </Card>
      )}

      <div className="space-y-3">
        <Seccion icon="plan" titulo="Verduras permitidas" open>
          <p className="text-sm text-ink-soft">{f.verduras.texto}</p>
          {f.verduras.listas.map((l) => (
            <div key={l.titulo} className="mt-4">
              <p className="text-sm font-semibold">{l.titulo}</p>
              {l.nota && <p className="text-xs text-ink-soft">{l.nota}</p>}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {l.items.map((v) => (
                  <span key={v} className="rounded-full bg-ok-soft px-2.5 py-1 text-[13px] text-ok">{v}</span>
                ))}
              </div>
            </div>
          ))}
        </Seccion>
        {f.proteinas && (
          <Seccion icon="grip" titulo="Raciones de proteínas">
            <p className="mb-2 text-sm text-ink-soft">{PROTEINAS.nota}</p>
            <Lista items={PROTEINAS.items} />
          </Seccion>
        )}
        {f.frutas && (
          <Seccion icon="plan" titulo="Frutas permitidas">
            <p className="mb-2 text-sm text-ink-soft">{FRUTAS.nota}</p>
            <Lista items={FRUTAS.items} />
          </Seccion>
        )}
        {f.lacteos && (
          <Seccion icon="plan" titulo="Lácteos permitidos">
            <p className="mb-2 text-sm text-ink-soft">{LACTEOS.nota}</p>
            <Lista items={LACTEOS.items} />
          </Seccion>
        )}
        {f.pan && (
          <Seccion icon="plan" titulo="Pan permitido">
            <p className="mb-2 text-sm text-ink-soft">{PAN.nota}</p>
            <Lista items={PAN.items} />
          </Seccion>
        )}
        {f.legumbres && (
          <Seccion icon="plan" titulo="Legumbres y féculas">
            <p className="mb-2 text-sm text-ink-soft">{LEGUMBRES.nota}</p>
            <div className="flex flex-wrap gap-1.5">
              {LEGUMBRES.items.map((v) => <span key={v} className="rounded-full bg-bg px-2.5 py-1 text-[13px]">{v}</span>)}
            </div>
          </Seccion>
        )}
        <Seccion icon="clipboard" titulo={f.key === "mantenimiento" ? "Grasas y aliños" : "Aliños permitidos"}>
          <Lista items={f.aliño} />
        </Seccion>
        <Seccion icon="message" titulo="Bebidas permitidas">
          <Lista items={f.bebidas} />
        </Seccion>
        {sup.length > 0 && (
          <Seccion icon="shield" titulo="Tu suplementación">
            <ul className="divide-y divide-line">
              {sup.map((s) => (
                <li key={s.key} className="flex justify-between gap-3 py-2 text-sm">
                  <span className="font-medium">{s.nombre}</span>
                  <span className="text-right text-ink-soft">{s.pauta}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-ink-soft">Posología recomendada; sigue siempre la que te indique tu médico.</p>
          </Seccion>
        )}
        <Seccion icon="dna" titulo="Productos Essential por colores">
          <ul className="space-y-3">
            {GAMAS.map((g) => (
              <li key={g.nombre} className="flex gap-3 text-sm">
                <span aria-hidden className="mt-1 size-3 shrink-0 rounded-full" style={{ background: g.color }} />
                <span>
                  <span className="font-semibold">{g.nombre}.</span> {g.texto}
                </span>
              </li>
            ))}
          </ul>
        </Seccion>
        <Seccion icon="alert" titulo={f.key === "mantenimiento" ? "Consejos" : "Si notas…"}>
          <dl className="space-y-3">
            {f.recomendaciones.map((r) => (
              <div key={r.titulo}>
                <dt className="text-sm font-semibold">{r.titulo}</dt>
                <dd className="text-sm text-ink-soft">{r.texto}</dd>
              </div>
            ))}
          </dl>
        </Seccion>
        {f.ejercicio && (
          <Seccion icon="grip" titulo="Ejercicio en esta fase">
            <p className="text-sm">{EJERCICIO}</p>
          </Seccion>
        )}
      </div>

      <p className="flex gap-2 px-1 text-xs text-ink-soft">
        <Icon name="shield" size={14} className="mt-0.5 shrink-0" /> {IMPORTANTE} Ante cualquier urgencia, llama al 112.
      </p>
    </div>
  );
}
