import { supabase } from "@/lib/supabase";
import Reveal from "@/components/Reveal";
import GlitchTitle from "@/components/GlitchTitle";
import TrophyIcon from "@/components/Trophy";

export const revalidate = 60;

const typeLabel: Record<string, string> = { equipe: "Équipe", joueur: "Joueur", entreprise: "Entreprise" };

export default async function PalmaresPage() {
  const { data: trophiesData } = await supabase
    .from("trophies")
    .select("id, edition_id, type, titre, team_id, player_id, company_id, date_obtention")
    .order("date_obtention", { ascending: false });

  const trophies = trophiesData ?? [];

  const editionIds = Array.from(new Set(trophies.map((t) => t.edition_id)));
  const { data: editionsData } = editionIds.length
    ? await supabase.from("editions").select("id, nom, competition_id").in("id", editionIds)
    : { data: [] as any[] };
  const competitionIds = Array.from(new Set((editionsData ?? []).map((e) => e.competition_id)));
  const { data: competitionsData } = competitionIds.length
    ? await supabase.from("competitions").select("id, nom").in("id", competitionIds)
    : { data: [] as any[] };
  const compMap: Record<string, string> = {};
  (competitionsData ?? []).forEach((c) => (compMap[c.id] = c.nom));
  const editionMap: Record<string, string> = {};
  (editionsData ?? []).forEach((e) => (editionMap[e.id] = `${compMap[e.competition_id] ?? "Compétition"} — ${e.nom}`));

  const teamIds = Array.from(new Set(trophies.map((t) => t.team_id).filter(Boolean))) as string[];
  const { data: teamsData } = teamIds.length ? await supabase.from("teams").select("id, nom").in("id", teamIds) : { data: [] as any[] };
  const teamMap = Object.fromEntries((teamsData ?? []).map((t) => [t.id, t.nom]));

  const playerIds = Array.from(new Set(trophies.map((t) => t.player_id).filter(Boolean))) as string[];
  const { data: playersData } = playerIds.length
    ? await supabase.from("player_profiles").select("id, pseudo").in("id", playerIds)
    : { data: [] as any[] };
  const playerMap = Object.fromEntries((playersData ?? []).map((p) => [p.id, p.pseudo]));

  const companyIds = Array.from(new Set(trophies.map((t) => t.company_id).filter(Boolean))) as string[];
  const { data: companiesData } = companyIds.length
    ? await supabase.from("companies").select("id, nom").in("id", companyIds)
    : { data: [] as any[] };
  const companyMap = Object.fromEntries((companiesData ?? []).map((c) => [c.id, c.nom]));

  function cibleLabel(t: (typeof trophies)[number]) {
    if (t.team_id) return teamMap[t.team_id] ?? "Équipe";
    if (t.player_id) return playerMap[t.player_id] ?? "Joueur";
    if (t.company_id) return companyMap[t.company_id] ?? "Entreprise";
    return "—";
  }

  // Regroupe par édition/championnat, comme une véritable bibliothèque de champions
  const parEdition: Record<string, typeof trophies> = {};
  trophies.forEach((t) => {
    parEdition[t.edition_id] = [...(parEdition[t.edition_id] ?? []), t];
  });
  const editionsAffichees = Object.keys(parEdition).sort((a, b) => {
    const da = parEdition[a][0]?.date_obtention ?? "";
    const db = parEdition[b][0]?.date_obtention ?? "";
    return db.localeCompare(da);
  });

  return (
    <div className="mx-auto max-w-4xl px-6 py-24">
      <h1 className="font-display text-5xl"><GlitchTitle text="Palmarès" /></h1>
      <p className="mt-4 max-w-xl font-body text-white/60">
        Le Hall of Fame GC ESPORT — tous les champions, édition après édition.
      </p>

      <div className="mt-14 space-y-10">
        {editionsAffichees.map((edId, edIndex) => {
          // Les trophées "joueur" liés à un team_id sont ceux crédités
          // automatiquement au roster d'une équipe championne : on les
          // regroupe visuellement sous le trophée d'équipe correspondant
          // plutôt que de les lister à part.
          const items = parEdition[edId];
          const tropheesEquipe = items.filter((t) => t.type === "equipe");
          const tropheesEntreprise = items.filter((t) => t.type === "entreprise");
          const tropheesJoueurDirect = items.filter((t) => t.type === "joueur" && !t.team_id);

          return (
            <Reveal key={edId} delay={Math.min(edIndex, 6) * 80}>
            <section className="rounded-2xl border border-line bg-panel p-6">
              <p className="font-display text-xl text-lime">{editionMap[edId] ?? "Compétition"}</p>

              <div className="mt-5 space-y-4">
                {tropheesEquipe.map((t) => {
                  const roster = items.filter((r) => r.type === "joueur" && r.team_id === t.team_id);
                  return (
                    <div key={t.id} className="gc-neon-card rounded-xl border border-orange/30 bg-orange/5 p-4">
                      <p className="font-body text-sm">
                        <TrophyIcon /> <span className="font-semibold text-orange">{t.titre}</span> — {cibleLabel(t)}
                      </p>
                      <p className="mt-1 font-body text-xs text-white/50">
                        {new Date(t.date_obtention).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                      </p>
                      {roster.length > 0 && (
                        <p className="mt-2 font-body text-xs text-white/60">
                          Roster : {roster.map((r) => playerMap[r.player_id as string] ?? "Joueur").join(", ")}
                        </p>
                      )}
                    </div>
                  );
                })}

                {tropheesEntreprise.map((t) => (
                  <div key={t.id} className="rounded-xl border border-line p-4">
                    <p className="font-body text-sm">
                      <TrophyIcon /> <span className="font-semibold text-orange">{t.titre}</span> — {cibleLabel(t)}{" "}
                      <span className="text-white/40">(Entreprise)</span>
                    </p>
                    <p className="mt-1 font-body text-xs text-white/50">
                      {new Date(t.date_obtention).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                ))}

                {tropheesJoueurDirect.map((t) => (
                  <div key={t.id} className="rounded-xl border border-line p-4">
                    <p className="font-body text-sm">
                      <TrophyIcon /> <span className="font-semibold text-orange">{t.titre}</span> — {cibleLabel(t)}{" "}
                      <span className="text-white/40">(Joueur)</span>
                    </p>
                    <p className="mt-1 font-body text-xs text-white/50">
                      {new Date(t.date_obtention).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                ))}
              </div>
            </section>
            </Reveal>
          );
        })}
        {editionsAffichees.length === 0 && (
          <p className="font-body text-white/50">Aucun trophée n'a encore été attribué — les futurs champions apparaîtront ici.</p>
        )}
      </div>
    </div>
  );
}
