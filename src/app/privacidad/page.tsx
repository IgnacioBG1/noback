import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { TITULAR as T } from "@/content/legal";

export const metadata: Metadata = { title: "Política de privacidad" };

export default function PrivacidadPage() {
  return (
    <LegalPage title="Política de privacidad" updated="8 de octubre de 2026">
      <p>
        Esta política explica cómo tratamos tus datos personales cuando usas {T.servicio}, el programa médico de salud metabólica de{" "}
        {T.razonSocial}. Tratamos datos de salud, que la ley protege de forma especial, y lo hacemos con el cuidado que exige.
      </p>

      <h2>Quién es el responsable</h2>
      <ul>
        <li>{T.razonSocial}, CIF {T.cif}.</li>
        <li>Domicilio: {T.domicilio}.</li>
        <li>
          Contacto para protección de datos: <a href={`mailto:${T.emailPrivacidad}`} className="text-brand underline">{T.emailPrivacidad}</a>.
        </li>
      </ul>

      <h2>Qué datos tratamos</h2>
      <ul>
        <li>Identificación y contacto: nombre, apellidos, correo, teléfono y fecha de nacimiento.</li>
        <li>Datos de salud: tus respuestas al cuestionario, mediciones, analíticas, notas de consulta, tratamientos y la información que compartas con el equipo.</li>
        <li>Datos de pago: importe, fecha y estado. Los datos de tu tarjeta los trata directamente Stripe; nosotros no los vemos ni los guardamos.</li>
        <li>Datos técnicos: registros de acceso y seguridad.</li>
      </ul>

      <h2>Para qué y con qué base legal</h2>
      <ul>
        <li>Prestarte asistencia sanitaria y gestionar tu historia clínica: artículo 9.2.h del RGPD y Ley 41/2002 de autonomía del paciente.</li>
        <li>Gestionar tu contratación y los pagos: ejecución del contrato (artículo 6.1.b del RGPD).</li>
        <li>Cumplir obligaciones legales, fiscales y sanitarias: artículo 6.1.c del RGPD.</li>
        <li>Asistente con inteligencia artificial y uso anónimo de resultados en comunicación: solo con tu consentimiento, que puedes retirar en cualquier momento.</li>
      </ul>
      <p>No tomamos decisiones automatizadas sobre tu salud: todas las decisiones clínicas las toma un médico.</p>

      <h2>Cuánto tiempo los conservamos</h2>
      <p>
        La historia clínica se conserva al menos cinco años desde el alta de cada proceso asistencial, como exige la ley, aunque canceles tu
        suscripción. Los datos de facturación, durante los plazos que fija la normativa fiscal. El resto, mientras dure la relación.
      </p>

      <h2>Quién más accede</h2>
      <p>
        Solo el equipo sanitario que te atiende, con doble factor de autenticación y registro de cada acceso. Además, tratan datos por
        nuestra cuenta, con contrato de encargado del tratamiento:
      </p>
      <ul>
        <li>Supabase (base de datos y archivos) y Vercel (aplicación web), con servidores en Fráncfort (Alemania).</li>
        <li>Stripe (pagos).</li>
        <li>Proveedores de videoconsulta, envío de correos, mensajería y del asistente de inteligencia artificial, cuando se usen.</li>
      </ul>
      <p>
        Si algún proveedor trata datos fuera del Espacio Económico Europeo, lo hace con las garantías del RGPD (cláusulas contractuales
        tipo u otras equivalentes).
      </p>

      <h2>Tus derechos</h2>
      <p>
        Puedes solicitar acceso, rectificación, supresión (cuando la ley lo permita), oposición, limitación y portabilidad escribiendo a{" "}
        <a href={`mailto:${T.emailPrivacidad}`} className="text-brand underline">{T.emailPrivacidad}</a>. Si crees que no hemos atendido
        bien tu solicitud, puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es).
      </p>

      <h2>Seguridad</h2>
      <p>
        Ciframos las comunicaciones y los datos en reposo, limitamos el acceso a quien lo necesita para atenderte y registramos de forma
        inalterable cada consulta a tu historia clínica.
      </p>
    </LegalPage>
  );
}
