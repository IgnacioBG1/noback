import type { Metadata } from "next";
// Fuente servida desde nuestro dominio (sin llamadas a Google Fonts: RGPD).
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "NoBack · Programa médico de salud metabólica", template: "%s · NoBack" },
  description:
    "Programa médico para perder grasa conservando el músculo, con seguimiento de tu composición corporal, tu fuerza y tu edad biológica.",
  robots: { index: false, follow: false }, // hasta el lanzamiento
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
