import { supabase } from "./supabase";

export type StatsSummary = {
  matchsJoues: number;
  victoires: number;
  nuls: number;
  defaites: number;
  butsMarques: number;
  butsEncaisses: number;
};

const empty: StatsSummary = {
  matchsJoues: 0,
  victoires: 0,
  nuls: 0,
  defaites: 0,
  butsMarques: 0,
  butsEncaisses: 0,
};

export async function getPlayerStatsSummary(playerId: string): Promise<StatsSummary> {
  const { data } = await supabase
    .from("player_stats")
    .select("matchs_joues, victoires, nuls, defaites, buts_marques, buts_encaisses")
    .eq("player_id", playerId);

  const summary = { ...empty };
  (data ?? []).forEach((row) => {
    summary.matchsJoues += row.matchs_joues ?? 0;
    summary.victoires += row.victoires ?? 0;
    summary.nuls += row.nuls ?? 0;
    summary.defaites += row.defaites ?? 0;
    summary.butsMarques += row.buts_marques ?? 0;
    summary.butsEncaisses += row.buts_encaisses ?? 0;
  });
  return summary;
}

export type CardStats = {
  attaque: number;
  defense: number;
  technique: number;
  vision: number;
  regularite: number;
};

// Technique et Vision sont calculées à partir de statistiques
// réellement affichées par le jeu en fin de match (saisies par
// l'admin dans le Combine) — plus une note "à l'instinct".
export async function getPlayerCardStats(playerId: string): Promise<CardStats> {
  const stats = await getPlayerStatsSummary(playerId);

  const { data: evals } = await supabase
    .from("evaluations")
    .select("precision_passes, tirs_cadres, tirs_tentes, dribbles_reussis_pct, passes_cles")
    .eq("player_id", playerId);

  const rows = evals ?? [];

  function avg(nums: number[]): number {
    if (nums.length === 0) return 0;
    return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
  }

  const passPcts = rows.map((r) => r.precision_passes).filter((v): v is number => v !== null && v !== undefined);
  const dribblePcts = rows
    .map((r) => r.dribbles_reussis_pct)
    .filter((v): v is number => v !== null && v !== undefined);
  const shotAccuracies = rows
    .filter((r) => r.tirs_tentes && r.tirs_tentes > 0)
    .map((r) => Math.round(((r.tirs_cadres ?? 0) / (r.tirs_tentes as number)) * 100));

  // Technique = moyenne de trois indicateurs objectifs du jeu
  const technique = avg([...passPcts, ...dribblePcts, ...shotAccuracies]);

  // Vision = passes clés par match, ramenées sur 100
  // (repère : 5 passes clés de moyenne par match = 100)
  const passesClesValues = rows.map((r) => r.passes_cles).filter((v): v is number => v !== null && v !== undefined);
  const avgPassesCles =
    passesClesValues.length > 0 ? passesClesValues.reduce((a, b) => a + b, 0) / passesClesValues.length : 0;
  const vision = Math.min(100, Math.round(avgPassesCles * 20));

  const attaque =
    stats.matchsJoues > 0 ? Math.min(100, Math.round((stats.butsMarques / stats.matchsJoues) * 25)) : 0;

  const defense =
    stats.matchsJoues > 0
      ? Math.max(0, Math.min(100, Math.round(100 - (stats.butsEncaisses / stats.matchsJoues) * 20)))
      : 0;

  const regularite =
    stats.matchsJoues > 0
      ? Math.round(((stats.victoires + stats.nuls * 0.5) / stats.matchsJoues) * 100)
      : 0;

  return { attaque, defense, technique, vision, regularite };
}

export function getOverallScore(stats: CardStats): number {
  return Math.round((stats.attaque + stats.defense + stats.technique + stats.vision + stats.regularite) / 5);
}

export async function getPlayerStatsSummaries(playerIds: string[]): Promise<Record<string, StatsSummary>> {
  const map: Record<string, StatsSummary> = {};
  playerIds.forEach((id) => (map[id] = { ...empty }));
  if (playerIds.length === 0) return map;

  const { data } = await supabase
    .from("player_stats")
    .select("player_id, matchs_joues, victoires, nuls, defaites, buts_marques, buts_encaisses")
    .in("player_id", playerIds);

  (data ?? []).forEach((row) => {
    const s = map[row.player_id];
    if (!s) return;
    s.matchsJoues += row.matchs_joues ?? 0;
    s.victoires += row.victoires ?? 0;
    s.nuls += row.nuls ?? 0;
    s.defaites += row.defaites ?? 0;
    s.butsMarques += row.buts_marques ?? 0;
    s.butsEncaisses += row.buts_encaisses ?? 0;
  });
  return map;
}
