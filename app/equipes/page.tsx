import { supabase } from "@/lib/supabase";
import { getPlayerCardStats, getOverallScore } from "@/lib/playerStats";

export const revalidate = 60;

export default async function EquipesPage() {
  const { data: teams } = await supabase
    .from("teams")
    .select("id, nom, company_id, edition_id")
    .order("created_at", { ascending: false });

  const companyIds = Array.from(new Set((teams ?? []).map((t) => t.company_id)));
  const { data: companies } = await supabase.from("companies").select("id, nom, logo_url").in("id", companyIds);
  const companyMap: Record<string, { nom: string; logo_url: string | null }> = {};
  (companies ?? []).forEach((c) => (companyMap[c.id] = c));

  const teamIds = (teams ?? []).map((t) => t.id);
  let assignments: { team_id: string; player_id: string }[] = [];
  if (teamIds.length > 0) {
    const { data } = await supabase.from("team_assignments").select("team_id, player_id").in("team_id", teamIds);
    assignments = data ?? [];
  }
  const playerIds = Array.from(new Set(assignments.map((a) => a.player_id)));
  let playersMap: Record<string, string> = {};
  if (playerIds.length > 0) {
    const { data } = await supabase.from("player_profiles").select("id, pseudo").in("id", playerIds);
    (data ?? []).forEach((p) => (playersMap[p.id] = p.pseudo));
  }

  // Vitrines publiées par les entreprises (distinctes des équipes de compétition ci-dessus)
  const { data: squads } = await supabase.from("squads").select("id, nom, company_id").eq("publie", true);
  const squadCompanyIds = Array.from(new Set((squads ?? []).map((s) => s.company_id)));
  const { data: squadCompanies } = await supabase.from("companies").select("id, nom, logo_url").in("id", squadCompanyIds);
  const squadCompanyMap: Record<string, { nom: string; logo_url: string | null }> = {};
  (squadCompanies ?? []).forEach((c) => (squadCompanyMap[c.id] = c));

  const squadIds = (squads ?? []).map((s) => s.id);
  let squadMembers: { squad_id: string; player_id: string }[] = [];
  if (squadIds.length > 0) {
    const { data } = await supabase.from("squad_members").select("squad_id, player_id").in("squad_id", squadIds);
    squadMembers = data ?? [];
  }
  const squadPlayerIds = Array.from(new Set(squadMembers.map((m) => m.player_id)));
  let squadPlayersMap: Record<string, string> = {};
  let squadScoresMap: Record<string, number> = {};
  if (squadPlayerIds.length > 0) {
    const { data } = await supabase.from("player_profiles").select("id, pseudo").in("id", squadPlayerIds);
    (data ?? []).forEach((p) => (squadPlayersMap[p.id] = p.pseudo));
    const scoreEntries = await Promise.all(
      squadPlayerIds.map(async (id) => [id, getOverallScore(await getPlayerCardStats(id))] as const)
    );
    squadScoresMap = Object.fromEntries(scoreEntries);
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-24">
      <h1 className="font-display text-5xl">Équipes</h1>
      <p className="mt-4 max-w-xl font-body text-white/60">
        Les équipes constituées par les entreprises participantes.
      </p>

      <div className="mt-14 grid gap-6 sm:grid-cols-2">
        {teams && teams.length > 0 ? (
          teams.map((t) => {
            const company = companyMap[t.company_id];
            const players = assignments.filter((a) => a.team_id === t.id).map((a) => playersMap[a.player_id]);
            return (
              <div key={t.id} className="rounded-2xl border border-line bg-panel p-6">
                <div className="flex items-center gap-3">
                  {company?.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={company.logo_url} alt={company.nom} className="h-12 w-12 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-ink font-display text-orange">
                      {company?.nom?.slice(0, 2).toUpperCase() ?? "??"}
                    </div>
                  )}
                  <div>
                    <p className="font-display text-lg">{t.nom}</p>
                    <p className="font-body text-xs text-white/40">{company?.nom}</p>
                  </div>
                </div>
                {players.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {players.map((p, i) => (
                      <span key={i} className="rounded-full border border-white/20 px-3 py-1 font-body text-xs text-white/70">
                        {p}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <p className="font-body text-white/50">Aucune équipe constituée pour le moment.</p>
        )}
      </div>

      {squads && squads.length > 0 && (
        <section className="mt-20">
          <h2 className="font-display text-3xl">Vitrines des entreprises</h2>
          <p className="mt-3 max-w-xl font-body text-white/60">
            Des groupes de joueurs mis en avant par les entreprises, en dehors de leur équipe de compétition.
          </p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {squads.map((s) => {
              const company = squadCompanyMap[s.company_id];
              const members = squadMembers.filter((m) => m.squad_id === s.id).map((m) => m.player_id);
              const note = members.length > 0 ? Math.round(members.reduce((sum, id) => sum + (squadScoresMap[id] ?? 0), 0) / members.length) : 0;
              return (
                <div key={s.id} className="rounded-2xl border border-line bg-panel p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {company?.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={company.logo_url} alt={company.nom} className="h-10 w-10 rounded-lg object-cover" />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-ink font-display text-sm text-orange">
                          {company?.nom?.slice(0, 2).toUpperCase() ?? "??"}
                        </div>
                      )}
                      <div>
                        <p className="font-display text-lg">{s.nom}</p>
                        <p className="font-body text-xs text-white/40">{company?.nom}</p>
                      </div>
                    </div>
                    <p className="font-display text-2xl text-lime">{note}</p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {members.map((pid) => (
                      <span key={pid} className="rounded-full border border-white/20 px-3 py-1 font-body text-xs text-white/70">
                        {squadPlayersMap[pid] ?? "Joueur"} · {squadScoresMap[pid] ?? 0}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
