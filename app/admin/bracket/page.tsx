"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { generateBracket, validateBracketMatch, type BracketMatch } from "@/lib/bracket";

type Edition = { id: string; nom: string; competition_id: string };
type Competition = { id: string; nom: string; format: string };
type Team = { id: string; nom: string };

export default function AdminBracketPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const [editions, setEditions] = useState<Edition[]>([]);
  const [competitionsMap, setCompetitionsMap] = useState<Record<string, Competition>>({});
  const [editionId, setEditionId] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<BracketMatch[]>([]);
  const [generating, setGenerating] = useState(false);
  const [scoreEdits, setScoreEdits] = useState<Record<string, { a: string; b: string }>>({});
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function init() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.push("/connexion");
        return;
      }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", sessionData.session.user.id).single();
      const adminRoles = ["super_admin", "admin", "responsable_competitions"];
      if (!profile || !adminRoles.includes(profile.role)) {
        setAuthorized(false);
        setChecking(false);
        return;
      }
      setAuthorized(true);

      const { data: editionsData } = await supabase.from("editions").select("id, nom, competition_id");
      setEditions(editionsData ?? []);

      const { data: compsData } = await supabase.from("competitions").select("id, nom, format");
      const cMap: Record<string, Competition> = {};
      (compsData ?? []).forEach((c) => (cMap[c.id] = c));
      setCompetitionsMap(cMap);

      setChecking(false);
    }
    init();
  }, [router]);

  useEffect(() => {
    if (editionId) loadEditionData();
  }, [editionId]);

  async function loadEditionData() {
    const { data: teamsData } = await supabase.from("teams").select("id, nom").eq("edition_id", editionId);
    setTeams(teamsData ?? []);
    setSelectedTeamIds(new Set((teamsData ?? []).map((t) => t.id)));

    const { data: matchesData } = await supabase
      .from("bracket_matches")
      .select("id, tour, position, team_a_id, team_b_id, score_a, score_b, vainqueur_team_id, valide")
      .eq("edition_id", editionId)
      .order("tour", { ascending: true })
      .order("position", { ascending: true });
    setMatches(matchesData ?? []);
  }

  function toggleTeamSelection(teamId: string) {
    setSelectedTeamIds((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) next.delete(teamId);
      else next.add(teamId);
      return next;
    });
  }

  async function handleGenerate() {
    const qualifies = teams.filter((t) => selectedTeamIds.has(t.id));
    if (qualifies.length < 2) {
      alert("Sélectionne au moins 2 équipes qualifiées pour générer un tableau.");
      return;
    }
    if (matches.length > 0 && !confirm("Un tableau existe déjà pour cette édition. Le régénérer effacera l'actuel. Continuer ?")) {
      return;
    }
    setGenerating(true);
    if (matches.length > 0) {
      await supabase.from("bracket_matches").delete().eq("edition_id", editionId);
    }
    await generateBracket(
      editionId,
      qualifies.map((t) => t.id)
    );
    setGenerating(false);
    await loadEditionData();
  }

  async function handleValidate(match: BracketMatch) {
    const edit = scoreEdits[match.id];
    if (!edit) return;
    const a = parseInt(edit.a, 10);
    const b = parseInt(edit.b, 10);
    if (isNaN(a) || isNaN(b) || a === b) {
      alert("Merci de saisir deux scores différents (pas d'égalité possible en élimination directe).");
      return;
    }
    await validateBracketMatch(match, editionId, a, b);
    await loadEditionData();
  }

  function teamNom(id: string | null) {
    if (!id) return "—";
    return teams.find((t) => t.id === id)?.nom ?? "Équipe";
  }

  if (checking) return <div className="px-6 py-24 text-center font-body text-white/50">Chargement…</div>;
  if (!authorized) return <div className="mx-auto max-w-lg px-6 py-32 text-center"><h1 className="font-display text-3xl text-orange">Accès refusé</h1></div>;

  const rounds = Array.from(new Set(matches.map((m) => m.tour))).sort((a, b) => a - b);
  const selectedEdition = editions.find((e) => e.id === editionId);
  const selectedCompetition = selectedEdition ? competitionsMap[selectedEdition.competition_id] : null;

  return (
    <div className="mx-auto max-w-6xl px-6 py-24">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl">Bracket</h1>
        <Link href="/admin" className="font-body text-sm text-white/50 hover:text-white">← Retour à l'admin</Link>
      </div>
      <p className="mt-3 font-body text-sm text-white/60">Tableau à élimination directe.</p>

      <div className="mt-8">
        <label className="font-body text-sm text-white/70">Édition</label>
        <select value={editionId} onChange={(e) => setEditionId(e.target.value)} className="input mt-2">
          <option value="">— Choisir une édition —</option>
          {editions.map((ed) => (
            <option key={ed.id} value={ed.id}>
              {competitionsMap[ed.competition_id]?.nom ?? "Compétition"} — {ed.nom}
            </option>
          ))}
        </select>
      </div>

      {editionId && (
        <>
          {selectedCompetition && selectedCompetition.format !== "elimination_directe" && (
            <p className="mt-4 font-body text-xs text-orange">
              Cette compétition est en format « {selectedCompetition.format} », pas « Élimination directe ». Tu peux
              quand même générer un bracket ici si besoin.
            </p>
          )}

          <section className="mt-6 rounded-2xl border border-line bg-panel p-6">
            <p className="font-display text-lg text-lime">Équipes qualifiées</p>
            <p className="mt-1 font-body text-xs text-white/50">
              Coche les équipes qui participent au tableau à élimination directe — utile si elles doivent d'abord
              sortir d'une phase de groupes.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {teams.map((t) => (
                <label key={t.id} className="flex items-center gap-3 rounded-lg border border-line px-4 py-2 font-body text-sm">
                  <input type="checkbox" checked={selectedTeamIds.has(t.id)} onChange={() => toggleTeamSelection(t.id)} />
                  {t.nom}
                </label>
              ))}
              {teams.length === 0 && <p className="font-body text-sm text-white/40">Aucune équipe sur cette édition.</p>}
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="mt-4 rounded-full bg-orange px-6 py-3 font-body text-sm font-semibold text-ink hover:bg-lime disabled:opacity-50"
            >
              {generating ? "Génération…" : matches.length > 0 ? "Régénérer le tableau" : "Générer le tableau"}
            </button>
          </section>

          {matches.length > 0 && (
            <div className="mt-10 flex gap-6 overflow-x-auto pb-6">
              {rounds.map((tour) => (
                <div key={tour} className="flex min-w-[240px] flex-col justify-around gap-4">
                  <p className="text-center font-body text-xs uppercase tracking-wide text-white/40">
                    {tour === rounds[rounds.length - 1] ? "Finale" : `Tour ${tour}`}
                  </p>
                  {matches
                    .filter((m) => m.tour === tour)
                    .map((m) => (
                      <div key={m.id} className="rounded-2xl border border-line bg-panel p-4">
                        <div className="space-y-2">
                          <div
                            className={`flex items-center justify-between rounded-lg px-3 py-2 font-body text-sm ${
                              m.vainqueur_team_id === m.team_a_id ? "bg-lime/10 text-lime" : "text-white/70"
                            }`}
                          >
                            <span>{teamNom(m.team_a_id)}</span>
                            {m.valide && <span>{m.score_a}</span>}
                          </div>
                          <div
                            className={`flex items-center justify-between rounded-lg px-3 py-2 font-body text-sm ${
                              m.vainqueur_team_id === m.team_b_id ? "bg-lime/10 text-lime" : "text-white/70"
                            }`}
                          >
                            <span>{teamNom(m.team_b_id)}</span>
                            {m.valide && <span>{m.score_b}</span>}
                          </div>
                        </div>

                        {!m.valide && m.team_a_id && m.team_b_id && (
                          <div className="mt-3 flex items-center gap-2">
                            <input
                              type="number"
                              min={0}
                              placeholder="0"
                              className="input w-14 py-1 text-center text-xs"
                              value={scoreEdits[m.id]?.a ?? ""}
                              onChange={(e) => setScoreEdits((prev) => ({ ...prev, [m.id]: { a: e.target.value, b: prev[m.id]?.b ?? "" } }))}
                            />
                            <span className="text-white/40">—</span>
                            <input
                              type="number"
                              min={0}
                              placeholder="0"
                              className="input w-14 py-1 text-center text-xs"
                              value={scoreEdits[m.id]?.b ?? ""}
                              onChange={(e) => setScoreEdits((prev) => ({ ...prev, [m.id]: { a: prev[m.id]?.a ?? "", b: e.target.value } }))}
                            />
                            <button
                              onClick={() => handleValidate(m)}
                              className="rounded-full bg-lime px-3 py-1 font-body text-xs font-semibold text-ink"
                            >
                              Valider
                            </button>
                          </div>
                        )}
                        {!m.team_a_id || !m.team_b_id ? (
                          <p className="mt-2 font-body text-xs text-white/30">En attente du tour précédent</p>
                        ) : null}
                      </div>
                    ))}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
