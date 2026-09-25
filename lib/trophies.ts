import { supabase } from "./supabase";

export type Trophy = {
  id: string;
  edition_id: string;
  type: "equipe" | "joueur" | "entreprise";
  titre: string;
  team_id: string | null;
  player_id: string | null;
  company_id: string | null;
  date_obtention: string;
};

// Attribue un trophée à une équipe : crée le trophée "équipe" (visible
// sur le profil de l'entreprise) ET crédite automatiquement chaque
// joueur actuellement dans le roster de cette équipe (visible sur son
// profil joueur), en figeant l'instant présent — un transfert futur ne
// modifie pas rétroactivement qui a gagné ce trophée.
export async function attribuerTropheeEquipe(
  editionId: string,
  teamId: string,
  titre: string,
  dateObtention: string,
  attribuePar: string | null
): Promise<{ error?: string }> {
  const { data: team } = await supabase.from("teams").select("company_id").eq("id", teamId).single();
  if (!team) return { error: "Équipe introuvable." };

  const { error: teamError } = await supabase.from("trophies").insert({
    edition_id: editionId,
    type: "equipe",
    titre,
    team_id: teamId,
    company_id: team.company_id,
    date_obtention: dateObtention,
    attribue_par: attribuePar,
  });
  if (teamError) return { error: teamError.message };

  const { data: assignments } = await supabase.from("team_assignments").select("player_id").eq("team_id", teamId);
  const playerRows = (assignments ?? []).map((a) => ({
    edition_id: editionId,
    type: "joueur" as const,
    titre,
    team_id: teamId,
    player_id: a.player_id,
    date_obtention: dateObtention,
    attribue_par: attribuePar,
  }));
  if (playerRows.length > 0) {
    const { error: playersError } = await supabase.from("trophies").insert(playerRows);
    if (playersError) return { error: playersError.message };
  }

  return {};
}

export async function attribuerTropheeJoueur(
  editionId: string,
  playerId: string,
  titre: string,
  dateObtention: string,
  attribuePar: string | null
): Promise<{ error?: string }> {
  const { error } = await supabase.from("trophies").insert({
    edition_id: editionId,
    type: "joueur",
    titre,
    player_id: playerId,
    date_obtention: dateObtention,
    attribue_par: attribuePar,
  });
  if (error) return { error: error.message };
  return {};
}

export async function attribuerTropheeEntreprise(
  editionId: string,
  companyId: string,
  titre: string,
  dateObtention: string,
  attribuePar: string | null
): Promise<{ error?: string }> {
  const { error } = await supabase.from("trophies").insert({
    edition_id: editionId,
    type: "entreprise",
    titre,
    company_id: companyId,
    date_obtention: dateObtention,
    attribue_par: attribuePar,
  });
  if (error) return { error: error.message };
  return {};
}

export async function getTrophiesForPlayer(playerId: string): Promise<Trophy[]> {
  const { data } = await supabase
    .from("trophies")
    .select("id, edition_id, type, titre, team_id, player_id, company_id, date_obtention")
    .eq("player_id", playerId)
    .order("date_obtention", { ascending: false });
  return data ?? [];
}

export async function getTrophiesForCompany(companyId: string): Promise<Trophy[]> {
  const { data } = await supabase
    .from("trophies")
    .select("id, edition_id, type, titre, team_id, player_id, company_id, date_obtention")
    .eq("company_id", companyId)
    .order("date_obtention", { ascending: false });
  return data ?? [];
}
