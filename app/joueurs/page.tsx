import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getPlayerCardStats, getOverallScore } from "@/lib/playerStats";
import JoueurCTA from "@/components/JoueurCTA";

export const revalidate = 60;

export default async function JoueursPage({
  searchParams,
}: {
  searchParams: { q?: string; ville?: string; niveau?: string };
}) {
  let query = supabase
    .from("player_profiles")
    .select("id, pseudo, ville, niveau_declare, photo_url")
    .eq("profil_public", true)
    .neq("statut", "retire")
    .order("created_at", { ascending: false });

  if (searchParams.q) query = query.ilike("pseudo", `%${searchParams.q}%`);
  if (searchParams.ville) query = query.ilike("ville", `%${searchParams.ville}%`);
  if (searchParams.niveau) query = query.ilike("niveau_declare", `%${searchParams.niveau}%`);

  const { data: joueurs } = await query;

  const scoreEntries = await Promise.all(
    (joueurs ?? []).map(async (j) => [j.id, getOverallScore(await getPlayerCardStats(j.id))] as const)
  );
  const scores = Object.fromEntries(scoreEntries);

  return (
    <div className="mx-auto max-w-6xl px-6 py-24">
      <h1 className="font-display text-5xl">Joueurs</h1>
      <p className="mt-4 max-w-xl font-body text-white/60">
        Les profils publics des joueurs inscrits sur GC ESPORT.
      </p>

      <form className="mt-10 grid gap-3 sm:grid-cols-4">
        <input type="text" name="q" placeholder="Pseudo" defaultValue={searchParams.q} className="input sm:col-span-2" />
        <input type="text" name="ville" placeholder="Ville" defaultValue={searchParams.ville} className="input" />
        <input type="text" name="niveau" placeholder="Niveau" defaultValue={searchParams.niveau} className="input" />
        <button type="submit" className="sm:col-span-4 rounded-full border border-lime px-6 py-2 font-body text-sm font-semibold text-lime hover:bg-lime hover:text-ink">
          Filtrer
        </button>
      </form>

      <div className="mt-14 grid gap-6 sm:grid-cols-2 md:grid-cols-3">
        {joueurs && joueurs.length > 0 ? (
          joueurs.map((j) => (
            <div key={j.id} className="rounded-2xl border border-line bg-panel p-6 transition hover:border-orange">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {j.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={j.photo_url} alt={j.pseudo} className="h-14 w-14 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-ink font-display text-lg text-orange">
                      {j.pseudo?.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-body font-semibold">{j.pseudo}</p>
                    <p className="font-body text-sm text-white/50">{j.ville}</p>
                  </div>
                </div>
                <p className="font-display text-2xl text-lime">{scores[j.id] ?? 0}</p>
              </div>
              {j.niveau_declare && <p className="mt-3 font-body text-xs text-lime">{j.niveau_declare}</p>}

              <div className="mt-4 flex gap-2">
                <Link
                  href={`/joueurs/${j.id}`}
                  className="flex-1 rounded-full border border-white/20 px-3 py-2 text-center font-body text-xs hover:border-white/50"
                >
                  Voir plus de stats
                </Link>
                <JoueurCTA playerId={j.id} />
              </div>
            </div>
          ))
        ) : (
          <p className="font-body text-white/50">
            Aucun profil public pour le moment — les joueurs inscrits apparaîtront ici.
          </p>
        )}
      </div>
    </div>
  );
}
