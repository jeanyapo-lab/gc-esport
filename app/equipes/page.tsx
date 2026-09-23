import { supabase } from "@/lib/supabase";

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
    </div>
  );
}
