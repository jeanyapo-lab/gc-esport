import { supabase } from "@/lib/supabase";

// Résout un ou plusieurs user_id (colonne "acteur" dans les historiques :
// audit_log.user_id, player_status_history.change_par,
// evaluations.evalue_par, contract_terminations.traite_par, etc.) vers un
// nom affichable, quel que soit le type de compte :
//   1. profiles.nom (nom renseigné manuellement, surtout utile pour les admins)
//   2. player_profiles.pseudo (si l'acteur est un joueur)
//   3. companies.nom (+ fonction) via company_reps (si l'acteur est un représentant d'entreprise)
//   4. "GC ESPORT (admin)" en dernier recours
export async function resolveActorNames(
  userIds: Array<string | null | undefined>
): Promise<Record<string, string>> {
  const ids = Array.from(new Set(userIds.filter(Boolean))) as string[];
  const map: Record<string, string> = {};
  if (ids.length === 0) return map;

  const { data: profilesData } = await supabase.from("profiles").select("id, nom").in("id", ids);
  (profilesData ?? []).forEach((p) => {
    if (p.nom) map[p.id] = p.nom;
  });

  const remainingAfterProfiles = ids.filter((id) => !map[id]);
  if (remainingAfterProfiles.length > 0) {
    const { data: playersData } = await supabase
      .from("player_profiles")
      .select("user_id, pseudo")
      .in("user_id", remainingAfterProfiles);
    (playersData ?? []).forEach((p) => {
      map[p.user_id] = p.pseudo;
    });
  }

  const remainingAfterPlayers = ids.filter((id) => !map[id]);
  if (remainingAfterPlayers.length > 0) {
    const { data: repsData } = await supabase
      .from("company_reps")
      .select("user_id, fonction, company_id")
      .in("user_id", remainingAfterPlayers);

    const companyIds = Array.from(new Set((repsData ?? []).map((r) => r.company_id)));
    let companiesMap: Record<string, string> = {};
    if (companyIds.length > 0) {
      const { data: companiesData } = await supabase.from("companies").select("id, nom").in("id", companyIds);
      companiesMap = Object.fromEntries((companiesData ?? []).map((c) => [c.id, c.nom]));
    }
    (repsData ?? []).forEach((r) => {
      const nomEntreprise = companiesMap[r.company_id] ?? "Entreprise";
      map[r.user_id] = r.fonction ? `${nomEntreprise} (${r.fonction})` : nomEntreprise;
    });
  }

  ids.forEach((id) => {
    if (!map[id]) map[id] = "GC ESPORT (admin)";
  });

  return map;
}
