import { supabase } from "@/lib/supabase";
import { computeClassement } from "@/lib/classement";

export const revalidate = 60;

export default async function ClassementsPage() {
  const { data: editions } = await supabase
    .from("editions")
    .select("id, nom, competition_id")
    .order("created_at", { ascending: false });

  const { data: competitions } = await supabase.from("competitions").select("id, nom");
  const competitionsMap: Record<string, string> = {};
  (competitions ?? []).forEach((c) => (competitionsMap[c.id] = c.nom));

  const sections = await Promise.all(
    (editions ?? []).map(async (ed) => {
      const { data: teams } = await supabase.from("teams").select("id, nom").eq("edition_id", ed.id);
      const teamIds = (teams ?? []).map((t) => t.id);

      let assignments: { team_id: string; player_id: string }[] = [];
      if (teamIds.length > 0) {
        const { data } = await supabase.from("team_assignments").select("team_id, player_id").in("team_id", teamIds);
        assignments = data ?? [];
      }

      const { data: matches } = await supabase
        .from("matches")
        .select("id, joueur1_id, joueur2_id, score_joueur1, score_joueur2, valide")
        .eq("edition_id", ed.id)
        .eq("valide", true);

      const playerIds = Array.from(
        new Set([...(matches ?? []).map((m) => m.joueur1_id), ...(matches ?? []).map((m) => m.joueur2_id)])
      );
      let playersMap: Record<string, string> = {};
      if (playerIds.length > 0) {
        const { data: playersData } = await supabase.from("player_profiles").select("id, pseudo").in("id", playerIds);
        (playersData ?? []).forEach((p) => (playersMap[p.id] = p.pseudo));
      }

      const classement = computeClassement(teams ?? [], assignments, matches ?? []);

      const { data: bracketMatches } = await supabase
        .from("bracket_matches")
        .select("id, tour, position, team_a_id, team_b_id, score_a, score_b, vainqueur_team_id, valide")
        .eq("edition_id", ed.id)
        .order("tour", { ascending: true })
        .order("position", { ascending: true });

      const teamsMap: Record<string, string> = {};
      (teams ?? []).forEach((t) => (teamsMap[t.id] = t.nom));

      return {
        edition: ed,
        competitionNom: competitionsMap[ed.competition_id] ?? "Compétition",
        classement,
        matches: matches ?? [],
        playersMap,
        bracketMatches: bracketMatches ?? [],
        teamsMap,
      };
    })
  );

  const sectionsAvecEquipes = sections.filter((s) => s.classement.length > 0 || s.bracketMatches.length > 0);

  return (
    <div className="mx-auto max-w-5xl px-6 py-24">
      <h1 className="font-display text-5xl">Classements & résultats</h1>
      <p className="mt-4 max-w-xl font-body text-white/60">
        Le classement des équipes et les derniers résultats de chaque édition.
      </p>

      {sectionsAvecEquipes.length === 0 ? (
        <p className="mt-14 font-body text-white/50">
          Aucun classement disponible pour le moment — revenez une fois le championnat lancé.
        </p>
      ) : (
        <div className="mt-14 space-y-16">
          {sectionsAvecEquipes.map((s) => (
            <section key={s.edition.id}>
              <h2 className="font-display text-2xl">
                {s.competitionNom} — <span className="text-lime">{s.edition.nom}</span>
              </h2>

              {s.bracketMatches.length > 0 && (
                <div className="mt-6 flex gap-6 overflow-x-auto pb-4">
                  {Array.from(new Set(s.bracketMatches.map((m) => m.tour)))
                    .sort((a, b) => a - b)
                    .map((tour, i, allTours) => (
                      <div key={tour} className="flex min-w-[220px] flex-col justify-around gap-4">
                        <p className="text-center font-body text-xs uppercase tracking-wide text-white/40">
                          {i === allTours.length - 1 ? "Finale" : `Tour ${tour}`}
                        </p>
                        {s.bracketMatches
                          .filter((m) => m.tour === tour)
                          .map((m) => (
                            <div key={m.id} className="space-y-1 rounded-2xl border border-line bg-panel p-3">
                              <div className={`flex items-center justify-between rounded-lg px-3 py-2 font-body text-sm ${m.vainqueur_team_id === m.team_a_id ? "bg-lime/10 text-lime" : "text-white/70"}`}>
                                <span>{m.team_a_id ? s.teamsMap[m.team_a_id] ?? "Équipe" : "À déterminer"}</span>
                                {m.valide && <span>{m.score_a}</span>}
                              </div>
                              <div className={`flex items-center justify-between rounded-lg px-3 py-2 font-body text-sm ${m.vainqueur_team_id === m.team_b_id ? "bg-lime/10 text-lime" : "text-white/70"}`}>
                                <span>{m.team_b_id ? s.teamsMap[m.team_b_id] ?? "Équipe" : "À déterminer"}</span>
                                {m.valide && <span>{m.score_b}</span>}
                              </div>
                            </div>
                          ))}
                      </div>
                    ))}
                </div>
              )}

              {s.classement.length > 0 && (
                <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-panel">
                  <table className="w-full font-body text-sm">
                    <thead>
                      <tr className="border-b border-line text-left text-xs uppercase text-white/40">
                        <th className="px-4 py-3">Équipe</th>
                        <th className="px-3 py-3 text-center">J</th>
                        <th className="px-3 py-3 text-center">V</th>
                        <th className="px-3 py-3 text-center">N</th>
                        <th className="px-3 py-3 text-center">D</th>
                        <th className="px-3 py-3 text-center">BM</th>
                        <th className="px-3 py-3 text-center">BE</th>
                        <th className="px-3 py-3 text-center">Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.classement.map((row) => (
                        <tr key={row.teamId} className="border-b border-line last:border-0">
                          <td className="px-4 py-3">{row.nom}</td>
                          <td className="px-3 py-3 text-center text-white/60">{row.matchsJoues}</td>
                          <td className="px-3 py-3 text-center text-white/60">{row.victoires}</td>
                          <td className="px-3 py-3 text-center text-white/60">{row.nuls}</td>
                          <td className="px-3 py-3 text-center text-white/60">{row.defaites}</td>
                          <td className="px-3 py-3 text-center text-white/60">{row.butsMarques}</td>
                          <td className="px-3 py-3 text-center text-white/60">{row.butsEncaisses}</td>
                          <td className="px-3 py-3 text-center font-semibold text-lime">{row.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {s.matches.length > 0 && (
                <div className="mt-6 space-y-2">
                  <p className="font-body text-xs uppercase tracking-wide text-white/40">Derniers résultats</p>
                  {s.matches.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between rounded-lg border border-line px-4 py-3 font-body text-sm"
                    >
                      <span>
                        {s.playersMap[m.joueur1_id] ?? "—"} <span className="text-white/40">vs</span>{" "}
                        {s.playersMap[m.joueur2_id] ?? "—"}
                      </span>
                      <span className="text-lime">
                        {m.score_joueur1} — {m.score_joueur2}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
