import { supabase } from "./supabase";

export type BracketMatch = {
  id: string;
  tour: number;
  position: number;
  team_a_id: string | null;
  team_b_id: string | null;
  score_a: number | null;
  score_b: number | null;
  vainqueur_team_id: string | null;
  valide: boolean;
};

// Mélange aléatoirement un tableau (tirage au sort)
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Génère un tableau complet à élimination directe à partir des
// équipes engagées sur une édition, avec tirage au sort et gestion
// automatique des "byes" si le nombre d'équipes n'est pas une
// puissance de 2.
export async function generateBracket(editionId: string, teamIds: string[]) {
  if (teamIds.length < 2) {
    throw new Error("Il faut au moins 2 équipes pour générer un tableau.");
  }

  const shuffled = shuffle(teamIds);
  let bracketSize = 2;
  while (bracketSize < shuffled.length) bracketSize *= 2;

  const slots: (string | null)[] = [...shuffled];
  while (slots.length < bracketSize) slots.push(null); // bye

  const numRounds = Math.log2(bracketSize);

  // Tour 1 : appariement réel, avec avancement automatique des byes
  const round1Rows = [];
  for (let i = 0; i < bracketSize / 2; i++) {
    const a = slots[i * 2];
    const b = slots[i * 2 + 1];
    const isBye = !a || !b;
    round1Rows.push({
      edition_id: editionId,
      tour: 1,
      position: i,
      team_a_id: a,
      team_b_id: b,
      valide: isBye,
      vainqueur_team_id: isBye ? a || b : null,
    });
  }
  await supabase.from("bracket_matches").insert(round1Rows);

  // Tours suivants : emplacements vides, à remplir au fur et à mesure
  for (let t = 2; t <= numRounds; t++) {
    const matchesInRound = bracketSize / Math.pow(2, t);
    const rows = [];
    for (let i = 0; i < matchesInRound; i++) {
      rows.push({ edition_id: editionId, tour: t, position: i, valide: false });
    }
    await supabase.from("bracket_matches").insert(rows);
  }

  // Propage les vainqueurs automatiques (byes) vers le tour 2
  const { data: allMatches } = await supabase
    .from("bracket_matches")
    .select("id, tour, position, vainqueur_team_id, valide")
    .eq("edition_id", editionId);

  for (const m of allMatches ?? []) {
    if (m.valide && m.vainqueur_team_id) {
      await advanceWinner(editionId, m.tour, m.position, m.vainqueur_team_id);
    }
  }
}

// Fait avancer le vainqueur d'un match vers le tour suivant
async function advanceWinner(editionId: string, tour: number, position: number, winnerTeamId: string) {
  const nextTour = tour + 1;
  const nextPosition = Math.floor(position / 2);
  const slotIsA = position % 2 === 0;

  const { data: nextMatch } = await supabase
    .from("bracket_matches")
    .select("id")
    .eq("edition_id", editionId)
    .eq("tour", nextTour)
    .eq("position", nextPosition)
    .maybeSingle();

  if (!nextMatch) return; // c'était la finale, rien à propager

  await supabase
    .from("bracket_matches")
    .update(slotIsA ? { team_a_id: winnerTeamId } : { team_b_id: winnerTeamId })
    .eq("id", nextMatch.id);
}

// Valide le score d'un match du bracket et fait avancer le vainqueur
export async function validateBracketMatch(match: BracketMatch, editionId: string, scoreA: number, scoreB: number) {
  const winnerTeamId = scoreA > scoreB ? match.team_a_id : match.team_b_id;

  await supabase
    .from("bracket_matches")
    .update({ score_a: scoreA, score_b: scoreB, valide: true, vainqueur_team_id: winnerTeamId })
    .eq("id", match.id);

  if (winnerTeamId) {
    await advanceWinner(editionId, match.tour, match.position, winnerTeamId);
  }
}

// Réajustement manuel : l'admin peut réaffecter directement l'équipe
// d'un côté du match (utile pour corriger une erreur de tirage, ou
// construire le tableau à la main plutôt que de le tirer au sort).
export async function reassignBracketTeam(
  matchId: string,
  slot: "a" | "b",
  teamId: string | null
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("bracket_matches")
    .update(slot === "a" ? { team_a_id: teamId } : { team_b_id: teamId })
    .eq("id", matchId);
  if (error) return { error: error.message };
  return {};
}

// Annule la validation d'un match déjà joué (score + vainqueur) pour
// pouvoir le corriger. Si le vainqueur avait déjà été propagé au tour
// suivant et que CE match suivant n'est pas encore validé, l'emplacement
// concerné est aussi vidé pour rester cohérent ; s'il est déjà validé,
// l'opération est refusée pour ne pas casser un résultat en aval.
export async function resetBracketMatch(match: BracketMatch, editionId: string): Promise<{ error?: string }> {
  const nextTour = match.tour + 1;
  const nextPosition = Math.floor(match.position / 2);
  const slotIsA = match.position % 2 === 0;

  const { data: nextMatch } = await supabase
    .from("bracket_matches")
    .select("id, valide")
    .eq("edition_id", editionId)
    .eq("tour", nextTour)
    .eq("position", nextPosition)
    .maybeSingle();

  if (nextMatch?.valide) {
    return { error: "Le tour suivant a déjà été validé pour ce match — annule d'abord le résultat du tour suivant." };
  }

  if (nextMatch) {
    await supabase
      .from("bracket_matches")
      .update(slotIsA ? { team_a_id: null } : { team_b_id: null })
      .eq("id", nextMatch.id);
  }

  const { error } = await supabase
    .from("bracket_matches")
    .update({ score_a: null, score_b: null, valide: false, vainqueur_team_id: null })
    .eq("id", match.id);
  if (error) return { error: error.message };
  return {};
}
