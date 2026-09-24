import { supabase } from "@/lib/supabase";

export const revalidate = 60;

export default async function NotreEquipePage() {
  const { data: team } = await supabase
    .from("teams")
    .select("id, nom")
    .eq("est_equipe_gc", true)
    .maybeSingle();

  let joueurs: { id: string; pseudo: string; photo_url: string | null; titulaire: boolean; ville: string | null }[] = [];

  if (team) {
    const { data: assignments } = await supabase
      .from("team_assignments")
      .select("player_id, titulaire")
      .eq("team_id", team.id);

    const playerIds = (assignments ?? []).map((a) => a.player_id);
    if (playerIds.length > 0) {
      const { data: playersData } = await supabase
        .from("player_profiles")
        .select("id, pseudo, photo_url, ville")
        .in("id", playerIds);

      const playersMap: Record<string, { pseudo: string; photo_url: string | null; ville: string | null }> = {};
      (playersData ?? []).forEach((p) => (playersMap[p.id] = p));

      joueurs = (assignments ?? [])
        .filter((a) => playersMap[a.player_id])
        .map((a) => ({
          id: a.player_id,
          pseudo: playersMap[a.player_id].pseudo,
          photo_url: playersMap[a.player_id].photo_url,
          ville: playersMap[a.player_id].ville,
          titulaire: a.titulaire,
        }));
    }
  }

  const titulaires = joueurs.filter((j) => j.titulaire);
  const remplacants = joueurs.filter((j) => !j.titulaire);

  return (
    <div className="mx-auto max-w-5xl px-6 py-24">
      <p className="font-body text-sm uppercase tracking-[0.2em] text-lime">L'association sur le terrain</p>
      <h1 className="mt-4 font-display text-5xl">{team?.nom ?? "Notre équipe"}</h1>
      <p className="mt-4 max-w-2xl font-body text-white/60">
        L'équipe propre à GC ESPORT — des joueurs qui représentent directement l'association, indépendamment des
        entreprises participantes.
      </p>

      {!team ? (
        <p className="mt-14 font-body text-white/50">L'équipe GC ESPORT n'a pas encore été constituée.</p>
      ) : (
        <>
          <section className="mt-14">
            <p className="font-display text-2xl text-lime">Titulaires</p>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 md:grid-cols-3">
              {titulaires.map((j) => (
                <PlayerCardMini key={j.id} joueur={j} />
              ))}
              {titulaires.length === 0 && <p className="font-body text-white/40">Aucun titulaire pour le moment.</p>}
            </div>
          </section>

          {remplacants.length > 0 && (
            <section className="mt-14">
              <p className="font-display text-2xl text-white/60">Remplaçants</p>
              <div className="mt-6 grid gap-6 sm:grid-cols-2 md:grid-cols-3">
                {remplacants.map((j) => (
                  <PlayerCardMini key={j.id} joueur={j} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function PlayerCardMini({ joueur }: { joueur: { id: string; pseudo: string; photo_url: string | null; ville: string | null } }) {
  return (
    <a href={`/joueurs/${joueur.id}`} className="rounded-2xl border border-line bg-panel p-6 transition hover:border-orange">
      {joueur.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={joueur.photo_url} alt={joueur.pseudo} className="h-16 w-16 rounded-full object-cover" />
      ) : (
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ink font-display text-lg text-orange">
          {joueur.pseudo.slice(0, 2).toUpperCase()}
        </div>
      )}
      <p className="mt-4 font-body font-semibold">{joueur.pseudo}</p>
      <p className="font-body text-sm text-white/50">{joueur.ville}</p>
    </a>
  );
}
