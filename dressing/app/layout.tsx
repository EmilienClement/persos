import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import RegisterSW from "@/components/RegisterSW";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const serif = Playfair_Display({ subsets: ["latin"], variable: "--font-serif", display: "swap" });

export const metadata: Metadata = {
  title: "Dressing",
  description: "Mon dressing connecté",
  robots: { index: false, follow: false },
  icons: { apple: "/icon-192.png" },
  appleWebApp: { capable: true, title: "Dressing", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#efe7df",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${sans.variable} ${serif.variable}`}>
      <body>
        <RegisterSW />
        {children}
      </body>
    </html>
  );
}
