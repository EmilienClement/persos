import type { Metadata, Viewport } from "next";
import "./globals.css";
import RegisterSW from "@/components/RegisterSW";

export const metadata: Metadata = {
  title: "Dressing",
  description: "Mon dressing connecté",
  robots: { index: false, follow: false },
  icons: { apple: "/icon-192.png" },
  appleWebApp: { capable: true, title: "Dressing", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#1c1b19",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <RegisterSW />
        {children}
      </body>
    </html>
  );
}
