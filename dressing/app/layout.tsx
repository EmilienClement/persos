import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Dressing",
  description: "Mon dressing connecté",
  robots: { index: false, follow: false },
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
      <body style={{ margin: 0, background: "#f4f0e8", color: "#1c1b19", fontFamily: "Georgia, serif" }}>
        {children}
      </body>
    </html>
  );
}
