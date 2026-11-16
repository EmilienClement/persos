import Nav from "@/components/Nav";

// Pages privées, rendues à la demande (jamais prérendues sans session).
export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="page">{children}</div>
      <Nav />
    </>
  );
}
