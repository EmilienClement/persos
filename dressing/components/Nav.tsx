"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const I = (d: string) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

const TABS = [
  { href: "/", label: "Accueil", icon: I("M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4v-5h-6v5H5a1 1 0 0 1-1-1z") },
  { href: "/dressing", label: "Dressing", icon: I("M9 4 5 6 2.5 9.5 5.5 11V20h13v-9l3-1.5L19 6l-4-2a3 3 0 0 1-6 0z") },
  { href: "/styliste", label: "Styliste", icon: I("M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z") },
  { href: "/import", label: "Import", icon: I("M12 16V5m0 0-4 4m4-4 4 4M5 15v3a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3") },
  { href: "/plus", label: "Plus", icon: I("M5 12h.01M12 12h.01M19 12h.01") },
];

// « Plus » reste actif sur toutes les pages qu'il contient
const PLUS = ["/plus", "/achats", "/calendrier", "/valise", "/stats", "/wishlist", "/reglages"];

export default function Nav() {
  const path = usePathname();
  const isOn = (href: string) =>
    href === "/" ? path === "/" :
    href === "/plus" ? PLUS.some((p) => path.startsWith(p)) :
    href === "/import" ? path.startsWith("/import") || path.startsWith("/valider") :
    path.startsWith(href);

  return (
    <nav className="nav" aria-label="Navigation principale">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} aria-current={isOn(t.href) ? "page" : undefined} className={isOn(t.href) ? "on" : ""}>
          <i className="ic">{t.icon}</i>
          <span>{t.label}</span>
        </Link>
      ))}
    </nav>
  );
}
