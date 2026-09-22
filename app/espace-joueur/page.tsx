"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type PlayerProfile = {
  pseudo: string;
  ville: string | null;
  statut: string;
  niveau_declare: string | null;
};

const statutLabel: Record<string, string> = {
  inscription_incomplete: "Inscription incomplète",
  en_attente_verification: "En attente de vérification",
  profil_verifie: "Profil vérifié",
  en_attente_evaluation: "En attente d'évaluation",
  eligible_draft: "Éligible au Draft",
  non_eligible: "Non éligible",
  suspendu: "Suspendu",
  retire: "Retiré",
};

export default function EspaceJoueurPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);

  useEffect(() => {
    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.push("/connexion");
        return;
      }

      const { data } = await supabase
        .from("player_profiles")
        .select("pseudo, ville, statut, niveau_declare")
        .eq("user_id", sessionData.session.user.id)
        .single();

      setProfile(data);
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  if (loading) {
    return <div className="px-6 py-24 text-center font-body text-white/50">Chargement…</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-24">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl">
          Salut, <span className="text-lime">{profile?.pseudo}</span>
        </h1>
        <button
          onClick={handleLogout}
          className="font-body text-sm text-white/50 hover:text-white"
        >
          Se déconnecter
        </button>
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-line bg-panel p-6">
          <p className="font-body text-xs uppercase tracking-wide text-white/40">Statut</p>
          <p className="mt-2 font-body text-lg text-lime">
            {profile ? statutLabel[profile.statut] ?? profile.statut : "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-panel p-6">
          <p className="font-body text-xs uppercase tracking-wide text-white/40">Ville</p>
          <p className="mt-2 font-body text-lg">{profile?.ville || "Non renseignée"}</p>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-line bg-panel p-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-body text-white/60">
          {profile?.statut === "inscription_incomplete"
            ? "Ton profil n'est pas encore complet — complète-le pour passer en vérification."
            : "Ton profil est en attente de vérification par GC ESPORT. Une fois vérifié, tu pourras participer aux sessions d'évaluation (Combine) puis devenir éligible au Draft."}
        </p>
        <div className="flex shrink-0 gap-3">
          <Link
            href="/espace-joueur/draft"
            className="rounded-full border border-lime px-6 py-3 text-center font-body text-sm font-semibold text-lime transition hover:bg-lime hover:text-ink"
          >
            Mon Draft
          </Link>
          <Link
            href="/espace-joueur/profil"
            className="rounded-full bg-orange px-6 py-3 text-center font-body text-sm font-semibold text-ink transition hover:bg-lime"
          >
            Compléter mon profil
          </Link>
        </div>
      </div>
    </div>
  );
}
