import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getPlayerStatsSummary, getPlayerCardStats } from "@/lib/playerStats";
import PlayerCard from "@/components/PlayerCard";
import SocialLinks from "@/components/SocialLinks";

export const revalidate = 60;

export default async function JoueurDetailPage({ params }: { params: { id: string } }) {
  const { data: joueur } = await supabase
    .from("player_profiles")
    .select(
      "id, pseudo, ville, niveau_declare, photo_url, palmares, experience_competitive, profil_public, statut, reseaux_sociaux"
    )
    .eq("id", params.id)
    .single();

  if (!joueur || !joueur.profil_public) {
    notFound();
  }

  const stats = await getPlayerStatsSummary(joueur.id);
  const cardStats = await getPlayerCardStats(joueur.id);

  const { data: gameAccount } = await supabase
    .from("player_game_accounts")
    .select("plateforme, games(nom)")
    .eq("player_id", joueur.id)
    .limit(1)
    .maybeSingle();

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
          <div className="mt-3">
            <SocialLinks reseaux={joueur.reseaux_sociaux} />
          </div>
        </div>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <StatBlock label="Matchs joués (vérifiés)" value={stats.matchsJoues} />
        <StatBlock label="Victoires" value={stats.victoires} />
        <StatBlock label="Buts marqués" value={stats.butsMarques} />
      </div>

      {stats.matchsJoues > 0 && (
        <p className="mt-4 font-body text-xs text-white/40">
          {stats.victoires}V · {stats.nuls}N · {stats.defaites}D — {stats.butsMarques} buts marqués,{" "}
          {stats.butsEncaisses} encaissés
        </p>
      )}

      <div className="mt-8">
        <PlayerCard stats={cardStats} />
      </div>

      {gameAccount && (
        <p className="mt-8 font-body text-sm text-white/60">
          Joue sur <span className="text-white">{(gameAccount as any).games?.nom}</span>
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
