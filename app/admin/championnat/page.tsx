"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { computeClassement, type ClassementRow } from "@/lib/classement";

type Edition = { id: string; nom: string; competition_id: string };
type Competition = { id: string; nom: string };
type Team = { id: string; nom: string };
type Assignment = { team_id: string; player_id: string };
type Player = { id: string; pseudo: string };
type Match = {
  id: string;
  joueur1_id: string;
  joueur2_id: string;
  score_joueur1: number | null;
  score_joueur2: number | null;
  valide: boolean;
  date_match: string | null;
};

export default function AdminChampionnatPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const [editions, setEditions] = useState<Edition[]>([]);
  const [competitionsMap, setCompetitionsMap] = useState<Record<string, string>>({});
  const [selectedEditionId, setSelectedEditionId] = useState<string>("");

  const [teams, setTeams] = useState<Team[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [playersMap, setPlayersMap] = useState<Record<string, string>>({});
  const [playerTeamMap, setPlayerTeamMap] = useState<Record<string, string>>({});
  const [matches, setMatches] = useState<Match[]>([]);
  const [classement, setClassement] = useState<ClassementRow[]>([]);

  const [joueur1Id, setJoueur1Id] = useState("");
  const [joueur2Id, setJoueur2Id] = useState("");
  const [dateMatch, setDateMatch] = useState("");

  const [scoreEdits, setScoreEdits] = useState<Record<string, { s1: string; s2: string }>>({});

  useEffect(() => {
    async function init() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.push("/connexion");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", sessionData.session.user.id)
        .single();

      const adminRoles = ["super_admin", "admin", "responsable_competitions"];
      if (!profile || !adminRoles.includes(profile.role)) {
        setAuthorized(false);
        setChecking(false);
        return;
      }
      setAuthorized(true);

      const { data: editionsData } = await supabase.from("editions").select("id, nom, competition_id");
      setEditions(editionsData ?? []);

      const { data: compsData } = await supabase.from("competitions").select("id, nom");
      const cMap: Record<string, string> = {};
      (compsData ?? []).forEach((c) => (cMap[c.id] = c.nom));
      setCompetitionsMap(cMap);

      setChecking(false);
    }
    init();
  }, [router]);

  useEffect(() => {
    if (selectedEditionId) loadEditionData(selectedEditionId);
  }, [selectedEditionId]);

  async function loadEditionData(editionId: string) {
    const { data: teamsData } = await supabase.from("teams").select("id, nom").eq("edition_id", editionId);
    setTeams(teamsData ?? []);

    const teamIds = (teamsData ?? []).map((t) => t.id);
    let assignmentsData: Assignment[] = [];
    if (teamIds.length > 0) {
      const { data } = await supabase
        .from("team_assignments")
        .select("team_id, player_id")
        .in("team_id", teamIds);
      assignmentsData = data ?? [];
    }
    setAssignments(assignmentsData);

    const pTeamMap: Record<string, string> = {};
    assignmentsData.forEach((a) => (pTeamMap[a.player_id] = a.team_id));
    setPlayerTeamMap(pTeamMap);

    const playerIds = assignmentsData.map((a) => a.player_id);
    if (playerIds.length > 0) {
      const { data: playersData } = await supabase
        .from("player_profiles")
        .select("id, pseudo")
        .in("id", playerIds);
      const pMap: Record<string, string> = {};
      (playersData ?? []).forEach((p) => (pMap[p.id] = p.pseudo));
      setPlayersMap(pMap);
    }

    const { data: matchesData } = await supabase
      .from("matches")
      .select("id, joueur1_id, joueur2_id, score_joueur1, score_joueur2, valide, date_match")
      .eq("edition_id", editionId)
      .order("created_at", { ascending: false });
    setMatches(matchesData ?? []);

    setClassement(computeClassement(teamsData ?? [], assignmentsData, matchesData ?? []));
  }

  async function handleCreateMatch(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEditionId || !joueur1Id || !joueur2Id || joueur1Id === joueur2Id) return;

    await supabase.from("matches").insert({
      edition_id: selectedEditionId,
      joueur1_id: joueur1Id,
      joueur2_id: joueur2Id,
      date_match: dateMatch || null,
      valide: false,
    });

    setJoueur1Id("");
    setJoueur2Id("");
    setDateMatch("");
    await loadEditionData(selectedEditionId);
  }

  async function handleValidateScore(matchId: string) {
    const edit = scoreEdits[matchId];
    if (!edit) return;
    const s1 = parseInt(edit.s1, 10);
    const s2 = parseInt(edit.s2, 10);
    if (isNaN(s1) || isNaN(s2)) return;

    await supabase
      .from("matches")
      .update({ score_joueur1: s1, score_joueur2: s2, valide: true })
      .eq("id", matchId);

    await loadEditionData(selectedEditionId);
  }

  if (checking) return <div className="px-6 py-24 text-center font-body text-white/50">Chargement…</div>;

  if (!authorized) {
    return (
      <div className="mx-auto max-w-lg px-6 py-32 text-center">
        <h1 className="font-display text-3xl text-orange">Accès refusé</h1>
      </div>
    );
  }

  const playersOnTeams = Object.keys(playerTeamMap);

  return (
    <div className="mx-auto max-w-5xl px-6 py-24">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl">Championnat</h1>
        <Link href="/admin" className="font-body text-sm text-white/50 hover:text-white">
          ← Retour à l'admin
        </Link>
      </div>

      <div className="mt-8">
        <label className="font-body text-sm text-white/70">Édition</label>
        <select
          value={selectedEditionId}
          onChange={(e) => setSelectedEditionId(e.target.value)}
          className="input mt-2"
        >
          <option value="">— Choisir une édition —</option>
          {editions.map((ed) => (
            <option key={ed.id} value={ed.id}>
              {competitionsMap[ed.competition_id] ?? "Compétition"} — {ed.nom}
            </option>
          ))}
        </select>
      </div>

      {selectedEditionId && (
        <>
          {teams.length === 0 ? (
            <p className="mt-8 font-body text-sm text-white/40">
              Aucune équipe constituée pour cette édition — les équipes se créent automatiquement quand une
              affectation Draft est validée.
            </p>
          ) : (
            <>
              {/* Créer un match */}
              <section className="mt-10 rounded-2xl border border-line bg-panel p-6">
                <p className="font-display text-lg text-lime">Programmer un match</p>
                <form onSubmit={handleCreateMatch} className="mt-4 grid gap-4 sm:grid-cols-3">
                  <select value={joueur1Id} onChange={(e) => setJoueur1Id(e.target.value)} className="input" required>
                    <option value="">— Joueur 1 —</option>
                    {playersOnTeams.map((pid) => (
                      <option key={pid} value={pid}>
                        {playersMap[pid]} ({teams.find((t) => t.id === playerTeamMap[pid])?.nom})
                      </option>
                    ))}
                  </select>
                  <select value={joueur2Id} onChange={(e) => setJoueur2Id(e.target.value)} className="input" required>
                    <option value="">— Joueur 2 —</option>
                    {playersOnTeams.map((pid) => (
                      <option key={pid} value={pid}>
                        {playersMap[pid]} ({teams.find((t) => t.id === playerTeamMap[pid])?.nom})
                      </option>
                    ))}
                  </select>
                  <input
                    type="datetime-local"
                    value={dateMatch}
                    onChange={(e) => setDateMatch(e.target.value)}
                    className="input"
                  />
                  <button
                    type="submit"
                    className="sm:col-span-3 rounded-full bg-orange px-6 py-3 font-body text-sm font-semibold text-ink hover:bg-lime"
                  >
                    Programmer
                  </button>
                </form>
              </section>

              {/* Liste des matchs */}
              <section className="mt-8">
                <p className="font-display text-lg text-lime">Matchs</p>
                <div className="mt-4 space-y-3">
                  {matches.map((m) => (
                    <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-panel p-5">
                      <p className="font-body text-sm">
                        {playersMap[m.joueur1_id] ?? "—"} <span className="text-white/40">vs</span>{" "}
                        {playersMap[m.joueur2_id] ?? "—"}
                      </p>
                      {m.valide ? (
                        <p className="font-body text-sm text-lime">
                          {m.score_joueur1} — {m.score_joueur2} (validé)
                        </p>
                      ) : (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            placeholder="0"
                            className="input w-16 py-2 text-center"
                            value={scoreEdits[m.id]?.s1 ?? ""}
                            onChange={(e) =>
                              setScoreEdits((prev) => ({
                                ...prev,
                                [m.id]: { s1: e.target.value, s2: prev[m.id]?.s2 ?? "" },
                              }))
                            }
                          />
                          <span className="font-body text-white/40">—</span>
                          <input
                            type="number"
                            min={0}
                            placeholder="0"
                            className="input w-16 py-2 text-center"
                            value={scoreEdits[m.id]?.s2 ?? ""}
                            onChange={(e) =>
                              setScoreEdits((prev) => ({
                                ...prev,
                                [m.id]: { s1: prev[m.id]?.s1 ?? "", s2: e.target.value },
                              }))
                            }
                          />
                          <button
                            onClick={() => handleValidateScore(m.id)}
                            className="rounded-full bg-lime px-4 py-2 font-body text-xs font-semibold text-ink"
                          >
                            Valider
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  {matches.length === 0 && (
                    <p className="font-body text-sm text-white/40">Aucun match programmé.</p>
                  )}
                </div>
              </section>

              {/* Classement */}
              <section className="mt-10">
                <p className="font-display text-lg text-lime">Classement</p>
                <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-panel">
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
                      {classement.map((row) => (
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
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}
