"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function ConnexionPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError("E-mail ou mot de passe incorrect.");
      setLoading(false);
      return;
    }

    const userId = data.user.id;
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    setLoading(false);

    const adminRoles = [
      "super_admin",
      "admin",
      "responsable_joueurs",
      "responsable_partenariats",
      "responsable_competitions",
      "responsable_communication",
    ];

    if (profile?.role && adminRoles.includes(profile.role)) {
      router.push("/admin");
    } else if (profile?.role === "entreprise") {
      router.push("/espace-entreprise");
    } else if (profile?.role === "joueur") {
      router.push("/espace-joueur");
    } else {
      router.push("/");
    }
  }

  return (
    <div className="mx-auto max-w-md px-6 py-24">
      <h1 className="font-display text-4xl">Connexion</h1>
      <p className="mt-3 font-body text-sm text-white/60">
        Accède à ton espace GC ESPORT.
      </p>

      <form onSubmit={handleSubmit} className="mt-10 space-y-5">
        <div>
          <label className="font-body text-sm text-white/70">E-mail</label>
          <div className="mt-2">
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
            />
          </div>
        </div>
        <div>
          <label className="font-body text-sm text-white/70">Mot de passe</label>
          <div className="mt-2">
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
            />
          </div>
        </div>

        {error && <p className="font-body text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-orange px-7 py-3 font-body font-semibold text-ink transition hover:bg-lime disabled:opacity-50"
        >
          {loading ? "Connexion…" : "Se connecter"}
        </button>
      </form>

      <p className="mt-8 font-body text-sm text-white/50">
        Pas encore de compte ?{" "}
        <Link href="/inscription" className="text-orange hover:underline">
          Inscris-toi
        </Link>
      </p>
    </div>
  );
}
