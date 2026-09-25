"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getPlayerStatsSummary, getPlayerCardStats, type StatsSummary, type CardStats } from "@/lib/playerStats";
import PlayerCard from "@/components/PlayerCard";
import SocialLinks from "@/components/SocialLinks";
import { getTrophiesForPlayer, type Trophy } from "@/lib/trophies";
import TrophyIcon from "@/components/Trophy";

type Joueur = {
  id: string;
  pseudo: string;
  ville: string | null;
  niveau_declare: string | null;
  photo_url: string | null;
  palmares: string | null;
  experience_competitive: string | null;
  profil_public: boolean;
  statut: string;
  reseaux_sociaux: any;
};

export default function JoueurDetailPage({ params }: { params: { id: string } }) {
  const [loading, setLoading] = useState(true);
  const [joueur, setJoueur] = useState<Joueur | null>(null);
  const [stats, setStats] = useState<StatsSummary | null>(null);
  const [cardStats, setCardStats] = useState<CardStats | null>(null);
  const [gameAccount, setGameAccount] = useState<{ plateforme: string | null; games?: { nom?: string } } | null>(null);
  const [trophies, setTrophies] = useState<Trophy[]>([]);
  const [editionLabels, setEditionLabels] = useState<Record<string, string>>({});

  useEffect(() => {
    async function load() {
      // Le client garde la session de connexion : un visiteur anonyme ne
      // voit que les profils publics (règle de sécurité côté base), tandis
      // qu'une entreprise ou un admin connecté peut aussi consulter les
      // joueurs éligibles au Draft même si leur profil n'est pas encore
      // public — nécessaire pour le recrutement.
      const { data } = await supabase
        .from("player_profiles")
        .select(
          "id, pseudo, ville, niveau_declare, photo_url, palmares, experience_competitive, profil_public, statut, reseaux_sociaux"
        )
        .eq("id", params.id)
        .maybeSingle();

      setJoueur(data);

      if (data) {
        const statsData = await getPlayerStatsSummary(data.id);
        setStats(statsData);
        const cardStatsData = await getPlayerCardStats(data.id);
        setCardStats(cardStatsData);

        const { data: gameAccountData } = await supabase
          .from("player_game_accounts")
          .select("plateforme, games(nom)")
          .eq("player_id", data.id)
          .limit(1)
          .maybeSingle();
        setGameAccount(gameAccountData as any);

        const trophiesData = await getTrophiesForPlayer(data.id);
        setTrophies(trophiesData);
        const editionIds = Array.from(new Set(trophiesData.map((t) => t.edition_id)));
        if (editionIds.length > 0) {
          const { data: editionsData } = await supabase.from("editions").select("id, nom, competition_id").in("id", editionIds);
          const compIds = Array.from(new Set((editionsData ?? []).map((e) => e.competition_id)));
          const { data: compsData } = await supabase.from("competitions").select("id, nom").in("id", compIds);
          const compMap: Record<string, string> = {};
          (compsData ?? []).forEach((c) => (compMap[c.id] = c.nom));
          const map: Record<string, string> = {};
          (editionsData ?? []).forEach((e) => (map[e.id] = `${compMap[e.competition_id] ?? "Compétition"} — ${e.nom}`));
          setEditionLabels(map);
        }
      }

      setLoading(false);
    }
    load();
  }, [params.id]);

  if (loading) {
    return <div className="px-6 py-24 text-center font-body text-white/50">Chargement…</div>;
  }

  if (!joueur) {
    return (
      <div className="mx-auto max-w-lg px-6 py-32 text-center">
        <h1 className="font-display text-3xl text-orange">Profil introuvable</h1>
        <p className="mt-4 font-body text-white/60">
          Ce profil n'existe pas, ou n'est pas accessible depuis ton compte actuel.
        </p>
        <Link href="/joueurs" className="mt-6 inline-block font-body text-sm text-white/50 hover:text-white">
          ← Tous les joueurs
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-24">
      <Link href="/joueurs" className="font-body text-sm text-white/50 hover:text-white">
        ← Tous les joueurs
      </Link>

      <div className="mt-6 flex items-center gap-6">
        {joueur.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={joueur.photo_url} alt={joueur.pseudo} className="h-24 w-24 rounded-full object-cover" />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-panel font-display text-3xl text-orange">
            {joueur.pseudo?.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="font-display text-4xl">{joueur.pseudo}</h1>
          <p className="font-body text-white/50">{joueur.ville}</p>
          {joueur.niveau_declare && <p className="mt-1 font-body text-sm text-lime">{joueur.niveau_declare}</p>}
          {trophies.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {trophies.map((t) => (
                <span
                  key={t.id}
                  title={`${t.titre} — ${editionLabels[t.edition_id] ?? ""} (${new Date(t.date_obtention).toLocaleDateString("fr-FR")})`}
                  className="rounded-full border border-orange/40 bg-orange/10 px-2 py-0.5 font-body text-[11px] text-orange"
                >
                  <TrophyIcon /> {t.titre}
                </span>
              ))}
            </div>
          )}
          <div className="mt-3">
            <SocialLinks reseaux={joueur.reseaux_sociaux} />
          </div>
        </div>
      </div>

      {trophies.length > 0 && (
        <div className="mt-8">
          <p className="font-body text-xs uppercase tracking-wide text-white/40">Palmarès</p>
          <div className="mt-2 space-y-1">
            {trophies.map((t) => (
              <p key={t.id} className="font-body text-sm text-white/70">
                <TrophyIcon /> {t.titre} — {editionLabels[t.edition_id] ?? "Compétition"} ·{" "}
                <span className="text-white/40">{new Date(t.date_obtention).toLocaleDateString("fr-FR")}</span>
              </p>
            ))}
          </div>
        </div>
      )}

      {!joueur.profil_public && (
        <p className="mt-4 font-body text-xs text-orange">
          Ce profil n'est pas encore public — tu le vois car ce joueur est éligible au Draft.
        </p>
      )}

      {stats && (
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <StatBlock label="Matchs joués (vérifiés)" value={stats.matchsJoues} />
          <StatBlock label="Victoires" value={stats.victoires} />
          <StatBlock label="Buts marqués" value={stats.butsMarques} />
        </div>
      )}

      {stats && stats.matchsJoues > 0 && (
        <p className="mt-4 font-body text-xs text-white/40">
          {stats.victoires}V · {stats.nuls}N · {stats.defaites}D — {stats.butsMarques} buts marqués,{" "}
          {stats.butsEncaisses} encaissés
        </p>
      )}

      {cardStats && (
        <div className="mt-8">
          <PlayerCard stats={cardStats} />
        </div>
      )}

      {gameAccount && (
        <p className="mt-8 font-body text-sm text-white/60">
          Joue sur <span className="text-white">{gameAccount.games?.nom}</span>
          {gameAccount.plateforme ? ` (${gameAccount.plateforme})` : ""}
        </p>
      )}

      {joueur.experience_competitive && (
        <div className="mt-8">
          <p className="font-body text-xs uppercase tracking-wide text-white/40">Expérience compétitive</p>
          <p className="mt-2 font-body text-white/70">{joueur.experience_competitive}</p>
        </div>
      )}

      {joueur.palmares && (
        <div className="mt-6">
          <p className="font-body text-xs uppercase tracking-wide text-white/40">Palmarès</p>
          <p className="mt-2 font-body text-white/70">{joueur.palmares}</p>
        </div>
      )}
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-line bg-panel p-6 text-center">
      <p className="font-display text-3xl text-orange">{value}</p>
      <p className="mt-1 font-body text-xs text-white/50">{label}</p>
    </div>
  );
}
