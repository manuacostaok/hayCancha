import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display" });
const body = Inter({ subsets: ["latin"], variable: "--font-body" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "¿Hay Cancha? — Gestión para complejos deportivos",
  description: "Reservas, clientes, pagos y torneos en un solo lugar.",
};

// Ancho de dispositivo real + sin zoom accidental en inputs de iOS: clave para que
// la experiencia mobile se sienta como una app, no como una web de escritorio achicada.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0A1220",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="bg-ink font-body text-chalk">{children}</body>
    </html>
  );
}
