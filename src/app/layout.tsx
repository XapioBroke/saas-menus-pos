import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

// 1. CONFIGURACIÓN DEL VIEWPORT (Evita que el usuario haga zoom por accidente y rompa el diseño)
export const viewport: Viewport = {
  themeColor: "#09090B",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

// 2. METADATA Y CONFIGURACIÓN PWA PARA APPLE Y ANDROID
export const metadata: Metadata = {
  title: "MiTerminal | Ecosistema SaaS",
  description: "Plataforma de gestión inteligente para negocios Tier 1.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MiTerminal",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={inter.className}>{children}</body>
    </html>
  );
}