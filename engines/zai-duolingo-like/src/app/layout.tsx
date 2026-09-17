import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Vertical Protocol — O Duolingo da IA",
  description:
    "Aprenda letramento em IA em lições diárias de 3 minutos. Um jogo cozy ambientado em uma Tóquio úmida e cheia de néon, onde você domina a IA para salvar Akihabara da Decadência Lógica.",
  keywords: [
    "IA",
    "Inteligência Artificial",
    "letramento em IA",
    "prompt engineering",
    "gamificado",
    "Duolingo da IA",
    "cozy game",
  ],
  authors: [{ name: "Vertical Protocol" }],
  icons: {
    icon: "/art/bip-idle.png",
  },
  openGraph: {
    title: "Vertical Protocol",
    description: "O Duolingo da IA — lições diárias de 3 minutos em uma Tóquio de néon.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#1a1726",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} antialiased bg-background text-foreground`}
      >
        {children}
      </body>
    </html>
  );
}
