"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function MotDePasseOubliePage() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSending(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window !== "undefined" ? `${window.location.origin}/reinitialiser-mot-de-passe` : undefined,
    });

    setSending(false);

    if (resetError) {
      setError("Une erreur est survenue : " + resetError.message);
      return;
    }
    setSent(true);
  }

  return (
    <div className="mx-auto max-w-md px-6 py-24">
      <h1 className="font-display text-4xl">Mot de passe oublié</h1>
      <p className="mt-3 font-body text-sm text-white/60">
        Indique ton e-mail de connexion, on t'envoie un lien pour choisir un nouveau mot de passe.
      </p>

      {sent ? (
        <div className="mt-10 rounded-2xl border border-lime/40 bg-lime/10 p-6">
          <p className="font-body text-sm text-lime">
            Si un compte existe avec cette adresse, un e-mail vient de t'être envoyé. Clique sur le lien qu'il
            contient pour choisir un nouveau mot de passe.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-10 space-y-5">
          <input
            required
            type="email"
            placeholder="ton-email@exemple.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
          />
          {error && <p className="font-body text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={sending}
            className="w-full rounded-full bg-orange px-7 py-3 font-body font-semibold text-ink transition hover:bg-lime disabled:opacity-50"
          >
            {sending ? "Envoi…" : "Envoyer le lien"}
          </button>
        </form>
      )}

      <p className="mt-8 font-body text-sm text-white/50">
        <Link href="/connexion" className="text-orange hover:underline">
          ← Retour à la connexion
        </Link>
      </p>
    </div>
  );
}
