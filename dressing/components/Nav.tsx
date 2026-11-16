"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Aujourd’hui" },
  { href: "/dressing", label: "Dressing" },
  { href: "/styliste", label: "Styliste" },
  { href: "/import", label: "Import" },
  { href: "/plus", label: "Plus" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <nav className="nav" aria-label="Navigation principale">
      {TABS.map((t) => {
        const on = t.href === "/" ? path === "/" : path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} aria-current={on ? "page" : undefined} className={on ? "on" : ""}>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
