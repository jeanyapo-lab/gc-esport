"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ReinitialiserMotDePassePage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Le mot de passe doit faire au moins 6 caractères.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);

    if (updateError) {
      setError("Erreur : " + updateError.message + " — le lien a peut-être expiré, redemande-en un nouveau.");
      return;
    }

    setDone(true);
    setTimeout(() => router.push("/connexion"), 2000);
  }

  return (
    <div className="mx-auto max-w-md px-6 py-24">
      <h1 className="font-display text-4xl">Nouveau mot de passe</h1>
      <p className="mt-3 font-body text-sm text-white/60">Choisis ton nouveau mot de passe.</p>

      {done ? (
        <div className="mt-10 rounded-2xl border border-lime/40 bg-lime/10 p-6">
          <p className="font-body text-sm text-lime">Mot de passe mis à jour ! Redirection vers la connexion…</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-10 space-y-5">
          <input
            required
            type="password"
            placeholder="Nouveau mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
          />
          <input
            required
            type="password"
            placeholder="Confirmer le mot de passe"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="input"
          />
          {error && <p className="font-body text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-full bg-orange px-7 py-3 font-body font-semibold text-ink transition hover:bg-lime disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : "Mettre à jour le mot de passe"}
          </button>
        </form>
      )}
    </div>
  );
}
