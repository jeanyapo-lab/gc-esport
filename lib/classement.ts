export type Team = { id: string; nom: string; groupe?: string | null };
export type Assignment = { team_id: string; player_id: string };
export type Match = {
  id: string;
  joueur1_id: string;
  joueur2_id: string;
  score_joueur1: number | null;
  score_joueur2: number | null;
  valide: boolean;
};

export type ClassementRow = {
  teamId: string;
  nom: string;
  matchsJoues: number;
  victoires: number;
  nuls: number;
  defaites: number;
  butsMarques: number;
  butsEncaisses: number;
  points: number;
};

// Calcule le classement d'une édition à partir des équipes, des
// affectations joueur-équipe et des matchs validés.
// Barème classique : victoire = 3 pts, nul = 1 pt, défaite = 0 pt.
export function computeClassement(teams: Team[], assignments: Assignment[], matches: Match[]): ClassementRow[] {
  const playerToTeam: Record<string, string> = {};
  assignments.forEach((a) => (playerToTeam[a.player_id] = a.team_id));

  const rows: Record<string, ClassementRow> = {};
  teams.forEach((t) => {
    rows[t.id] = {
      teamId: t.id,
      nom: t.nom,
      matchsJoues: 0,
      victoires: 0,
      nuls: 0,
      defaites: 0,
      butsMarques: 0,
      butsEncaisses: 0,
      points: 0,
    };
  });

  matches
    .filter((m) => m.valide && m.score_joueur1 !== null && m.score_joueur2 !== null)
    .forEach((m) => {
      const teamA = playerToTeam[m.joueur1_id];
      const teamB = playerToTeam[m.joueur2_id];
      if (!teamA || !teamB || !rows[teamA] || !rows[teamB]) return;

      const s1 = m.score_joueur1 as number;
      const s2 = m.score_joueur2 as number;

      rows[teamA].matchsJoues += 1;
      rows[teamB].matchsJoues += 1;
      rows[teamA].butsMarques += s1;
      rows[teamA].butsEncaisses += s2;
      rows[teamB].butsMarques += s2;
      rows[teamB].butsEncaisses += s1;

      if (s1 > s2) {
        rows[teamA].victoires += 1;
        rows[teamA].points += 3;
        rows[teamB].defaites += 1;
      } else if (s2 > s1) {
        rows[teamB].victoires += 1;
        rows[teamB].points += 3;
        rows[teamA].defaites += 1;
      } else {
        rows[teamA].nuls += 1;
        rows[teamB].nuls += 1;
        rows[teamA].points += 1;
        rows[teamB].points += 1;
      }
    });

  return Object.values(rows).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const diffA = a.butsMarques - a.butsEncaisses;
    const diffB = b.butsMarques - b.butsEncaisses;
    if (diffB !== diffA) return diffB - diffA;
    return b.butsMarques - a.butsMarques;
  });
}

// Même calcul, mais un classement séparé par groupe (Groupe A,
// Groupe B...). Les équipes sans groupe assigné sont regroupées
// sous "Groupe unique" — utile pour les compétitions en simple
// poule qui n'utilisent pas cette notion.
export function computeClassementParGroupe(
  teams: Team[],
  assignments: Assignment[],
  matches: Match[]
): Record<string, ClassementRow[]> {
  const groupes = Array.from(new Set(teams.map((t) => t.groupe?.trim() || "Groupe unique")));
  const result: Record<string, ClassementRow[]> = {};
  for (const g of groupes) {
    const teamsDuGroupe = teams.filter((t) => (t.groupe?.trim() || "Groupe unique") === g);
    result[g] = computeClassement(teamsDuGroupe, assignments, matches);
  }
  return result;
}
