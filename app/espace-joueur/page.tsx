"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getPlayerStatsSummary, getPlayerCardStats, type StatsSummary, type CardStats } from "@/lib/playerStats";
import PlayerCard from "@/components/PlayerCard";

type PlayerProfile = {
  id: string;
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
  const [stats, setStats] = useState<StatsSummary | null>(null);
  const [cardStats, setCardStats] = useState<CardStats | null>(null);

  useEffect(() => {
    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.push("/connexion");
        return;
      }

      const { data } = await supabase
        .from("player_profiles")
        .select("id, pseudo, ville, statut, niveau_declare")
        .eq("user_id", sessionData.session.user.id)
        .single();

      setProfile(data);

      if (data) {
        const statsData = await getPlayerStatsSummary(data.id);
        setStats(statsData);
        const cardStatsData = await getPlayerCardStats(data.id);
        setCardStats(cardStatsData);
      }

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
        <div className="flex items-center gap-4">
          <Link href="/parametres" className="font-body text-sm text-white/50 hover:text-white">
            Paramètres
          </Link>
          <button
            onClick={handleLogout}
            className="font-body text-sm text-white/50 hover:text-white"
          >
            Se déconnecter
          </button>
        </div>
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

      {stats && stats.matchsJoues > 0 && (
        <div className="mt-6 rounded-2xl border border-line bg-panel p-6">
          <p className="font-body text-xs uppercase tracking-wide text-white/40">Statistiques vérifiées</p>
          <div className="mt-3 flex flex-wrap gap-x-8 gap-y-2 font-body text-sm">
            <span>{stats.matchsJoues} matchs</span>
            <span className="text-lime">{stats.victoires}V</span>
            <span className="text-white/60">{stats.nuls}N</span>
            <span className="text-white/40">{stats.defaites}D</span>
            <span>{stats.butsMarques} buts marqués</span>
            <span>{stats.butsEncaisses} encaissés</span>
          </div>
        </div>
      )}

      {cardStats && (
        <div className="mt-6">
          <PlayerCard stats={cardStats} />
        </div>
      )}

      <div className="mt-8 rounded-2xl border border-line bg-panel p-6">
        <p className="font-body text-sm text-white/60">
          {profile?.statut === "inscription_incomplete"
            ? "Ton profil n'est pas encore complet — complète-le pour passer en vérification."
            : "Ton profil est en attente de vérification par GC ESPORT. Une fois vérifié, tu pourras participer aux sessions d'évaluation (Combine) puis devenir éligible au Draft."}
        </p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {[
          { href: "/espace-joueur/profil", label: "Compléter mon profil", desc: "Jeu, niveau, disponibilités" },
          { href: "/espace-joueur/draft", label: "Mon Draft", desc: "Sélections reçues" },
          { href: "/espace-joueur/offres", label: "Propositions", desc: "Recrutement et transferts" },
          { href: "/espace-joueur/engagements", label: "Mes engagements", desc: "Documents à signer" },
        ].map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="rounded-2xl border border-line bg-panel p-5 transition hover:border-orange"
          >
            <p className="font-display text-lg">{s.label}</p>
            <p className="mt-1 font-body text-xs text-white/50">{s.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
