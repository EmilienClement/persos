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

  return (
    <main className="login">
      <form onSubmit={onSubmit} className="form">
        <p className="eyebrow">Bienvenue</p>
        <h1>Dressing</h1>
        <input name="email" type="email" autoComplete="username" placeholder="Email" required />
        <input name="password" type="password" autoComplete="current-password" placeholder="Mot de passe" required />
        <button className="btn" disabled={busy}>
          {busy ? "…" : "Entrer"}
        </button>
        {error && <p role="alert" className="warn">{error}</p>}
      </form>
    </main>
  );
}
