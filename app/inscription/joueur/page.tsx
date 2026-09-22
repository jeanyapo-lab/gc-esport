"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function InscriptionJoueurPage() {
  const router = useRouter();
  const [pseudo, setPseudo] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ville, setVille] = useState("");
  const [dateNaissance, setDateNaissance] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: "joueur",
          pseudo,
          ville,
          date_naissance: dateNaissance,
        },
      },
    });

    if (signUpError) {
      setError(traduireErreur(signUpError.message));
      setLoading(false);
      return;
    }

    setLoading(false);

    if (!data.session) {
      // Confirmation par e-mail requise avant de pouvoir se connecter
      setNeedsConfirmation(true);
      return;
    }

    router.push("/espace-joueur");
  }

  if (needsConfirmation) {
    return (
      <div className="mx-auto max-w-xl px-6 py-32 text-center">
        <h1 className="font-display text-3xl text-lime">Vérifie tes e-mails</h1>
        <p className="mt-6 font-body text-white/70">
          Un lien de confirmation vient de t'être envoyé à {email}. Clique
          dessus pour activer ton compte, puis reviens te connecter.
        </p>
        <Link href="/connexion" className="mt-8 inline-block font-body text-orange hover:underline">
          Aller à la connexion →
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-6 py-24">
      <h1 className="font-display text-4xl">Inscription joueur</h1>
      <p className="mt-3 font-body text-sm text-white/60">
        Quelques informations pour créer ton profil gaming.
      </p>

      <form onSubmit={handleSubmit} className="mt-10 space-y-5">
        <Field label="Pseudo gaming">
          <input
            required
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Ville">
          <input value={ville} onChange={(e) => setVille(e.target.value)} className="input" />
        </Field>
        <Field label="Date de naissance">
          <input
            type="date"
            value={dateNaissance}
            onChange={(e) => setDateNaissance(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="E-mail">
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Mot de passe">
          <input
            required
            minLength={6}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
          />
        </Field>

        {error && <p className="font-body text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-orange px-7 py-3 font-body font-semibold text-ink transition hover:bg-lime disabled:opacity-50"
        >
          {loading ? "Création en cours…" : "Créer mon compte joueur"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="font-body text-sm text-white/70">{label}</label>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function traduireErreur(message: string) {
  if (message.includes("already registered")) return "Cette adresse e-mail est déjà utilisée.";
  if (message.includes("Password")) return "Le mot de passe doit faire au moins 6 caractères.";
  return "Une erreur est survenue : " + message;
}
