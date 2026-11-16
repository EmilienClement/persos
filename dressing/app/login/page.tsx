"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Login() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const { error } = await createClient().auth.signInWithPassword({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    if (error) {
      setError("Identifiants incorrects.");
      setBusy(false);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  const field: React.CSSProperties = {
    width: "100%", padding: "14px 12px", fontSize: 16, boxSizing: "border-box",
    border: "1px solid #1c1b19", background: "transparent", borderRadius: 0, marginTop: 12,
  };

  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24 }}>
      <form onSubmit={onSubmit} style={{ width: "100%", maxWidth: 340 }}>
        <h1 style={{ fontWeight: 400, letterSpacing: 2, margin: 0 }}>Dressing</h1>
        <input name="email" type="email" autoComplete="username" placeholder="Email" required style={field} />
        <input name="password" type="password" autoComplete="current-password" placeholder="Mot de passe" required style={field} />
        <button
          disabled={busy}
          style={{ ...field, background: "#1c1b19", color: "#f4f0e8", cursor: "pointer", opacity: busy ? 0.6 : 1 }}
        >
          {busy ? "…" : "Entrer"}
        </button>
        {error && <p role="alert" style={{ color: "#8a2b2b", marginTop: 12 }}>{error}</p>}
      </form>
    </main>
  );
}
