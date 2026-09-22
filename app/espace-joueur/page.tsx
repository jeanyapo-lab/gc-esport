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

      <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-line bg-panel p-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-body text-white/60">
          {profile?.statut === "inscription_incomplete"
            ? "Ton profil n'est pas encore complet — complète-le pour passer en vérification."
            : "Ton profil est en attente de vérification par GC ESPORT. Une fois vérifié, tu pourras participer aux sessions d'évaluation (Combine) puis devenir éligible au Draft."}
        </p>
        <div className="flex flex-wrap shrink-0 gap-3">
          <Link
            href="/espace-joueur/engagements"
            className="rounded-full border border-white/20 px-6 py-3 text-center font-body text-sm font-semibold text-white transition hover:border-white/50"
          >
            Mes engagements
          </Link>
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
