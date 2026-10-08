import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { TITULAR as T } from "@/content/legal";

export const metadata: Metadata = { title: "Aviso legal" };

export default function AvisoLegalPage() {
  return (
    <LegalPage title="Aviso legal" updated="8 de octubre de 2026">
      <h2>Titular</h2>
      <ul>
        <li>
          {T.servicio} es un servicio de {T.razonSocial}, CIF {T.cif}.
        </li>
        <li>Domicilio: {T.domicilio}.</li>
        <li>
          Contacto: <a href={`mailto:${T.email}`} className="text-brand underline">{T.email}</a>.
        </li>
      </ul>

      <h2>Objeto</h2>
      <p>
        Esta web informa sobre {T.servicio}, un programa médico de salud metabólica, y da acceso a las áreas privadas de pacientes y del
        equipo clínico. La información general de la web no sustituye la consulta médica ni constituye un diagnóstico.
      </p>

      <h2>Uso de la web</h2>
      <p>
        Te comprometes a usar la web conforme a la ley y a no intentar acceder a datos de otras personas. Las credenciales de acceso son
        personales e intransferibles.
      </p>

      <h2>Propiedad intelectual</h2>
      <p>Los contenidos, el diseño y el código de la web pertenecen a su titular o a sus licenciantes.</p>

      <h2>Cookies</h2>
      <p>
        Solo usamos cookies técnicas necesarias para mantener tu sesión iniciada y proteger tu cuenta. No usamos cookies de análisis ni de
        publicidad.
      </p>

      <h2>Legislación aplicable</h2>
      <p>Este aviso se rige por la ley española.</p>
    </LegalPage>
  );
}
