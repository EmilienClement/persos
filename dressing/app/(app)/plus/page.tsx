import Link from "next/link";

const LINKS = [
  { href: "/achats", t: "Propositions d’achat", d: "Ce qui te manque, classé par priorité." },
  { href: "/calendrier", t: "Calendrier", d: "Tenues planifiées et historique." },
  { href: "/valise", t: "Valise", d: "Destination et durée, selon la météo prévue." },
  { href: "/stats", t: "Statistiques", d: "Coût par port, pièces jamais portées, couleurs." },
  { href: "/wishlist", t: "Wishlist", d: "Envies et import par lien produit." },
  { href: "/reglages", t: "Réglages", d: "Ville, profil de goûts, sauvegarde." },
];

export default function Plus() {
  return (
    <>
      <p className="eyebrow">Plus</p>
      <h1>Le reste</h1>
      <ul className="menu">
        {LINKS.map((l) => (
          <li key={l.href}>
            <Link href={l.href}><strong>{l.t}</strong><span>{l.d}</span></Link>
          </li>
        ))}
      </ul>
    </>
  );
}
