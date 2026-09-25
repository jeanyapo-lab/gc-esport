"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Edition = { id: string; nom: string; competition_id: string };
type Session = { id: string; nom: string; date_session: string | null; edition_id: string };
type Player = { id: string; pseudo: string };
type Match = {
  id: string;
  joueur1_id: string;
  joueur2_id: string;
  score_joueur1: number | null;
  score_joueur2: number | null;
  valide: boolean;
};
type Evaluation = {
  id: string;
  player_id: string;
  precision_passes: number | null;
  tirs_cadres: number | null;
  tirs_tentes: number | null;
  dribbles_reussis_pct: number | null;
  passes_cles: number | null;
  adaptation: number | null;
  gestion_pression: number | null;
  observations: string | null;
};

export default function AdminCombinePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [editions, setEditions] = useState<Edition[]>([]);
  const [competitionsMap, setCompetitionsMap] = useState<Record<string, string>>({});
  const [players, setPlayers] = useState<Player[]>([]);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);

  // Formulaire nouvelle session
  const [editionId, setEditionId] = useState("");
  const [nomSession, setNomSession] = useState("");
  const [dateSession, setDateSession] = useState("");

  // Formulaire nouveau match
  const [joueur1Id, setJoueur1Id] = useState("");
  const [joueur2Id, setJoueur2Id] = useState("");
  const [scoreEdits, setScoreEdits] = useState<Record<string, { s1: string; s2: string }>>({});

  // Formulaire évaluation — chiffres tels qu'affichés par le jeu
  const [evalPlayerId, setEvalPlayerId] = useState("");
  const [precisionPasses, setPrecisionPasses] = useState("");
  const [tirsCadres, setTirsCadres] = useState("");
  const [tirsTentes, setTirsTentes] = useState("");
  const [dribblesReussisPct, setDribblesReussisPct] = useState("");
  const [passesCles, setPassesCles] = useState("");
  const [adaptation, setAdaptation] = useState(10);
  const [gestionPression, setGestionPression] = useState(10);
  const [observations, setObservations] = useState("");

  useEffect(() => {
    async function init() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.push("/connexion");
        return;
      }
      setUserId(sessionData.session.user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", sessionData.session.user.id)
        .single();

      const adminRoles = ["super_admin", "admin", "responsable_joueurs", "responsable_competitions"];
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

      const { data: playersData } = await supabase.from("player_profiles").select("id, pseudo");
      setPlayers(playersData ?? []);

      const { data: sessionsData } = await supabase
        .from("combine_sessions")
        .select("id, nom, date_session, edition_id")
        .order("date_session", { ascending: false });
      setSessions(sessionsData ?? []);

      setChecking(false);
    }
    init();
  }, [router]);

  useEffect(() => {
    if (selectedSessionId) loadSessionData(selectedSessionId);
  }, [selectedSessionId]);

  async function loadSessionData(sessionId: string) {
    const { data: matchesData } = await supabase
      .from("matches")
      .select("id, joueur1_id, joueur2_id, score_joueur1, score_joueur2, valide")
      .eq("combine_session_id", sessionId)
      .order("created_at", { ascending: false });
    setMatches(matchesData ?? []);

    const { data: evaluationsData } = await supabase
      .from("evaluations")
      .select(
        "id, player_id, precision_passes, tirs_cadres, tirs_tentes, dribbles_reussis_pct, passes_cles, adaptation, gestion_pression, observations"
      )
      .eq("combine_session_id", sessionId)
      .order("created_at", { ascending: false });
    setEvaluations(evaluationsData ?? []);
  }

  async function refreshSessions() {
    const { data: sessionsData } = await supabase
      .from("combine_sessions")
      .select("id, nom, date_session, edition_id")
      .order("date_session", { ascending: false });
    setSessions(sessionsData ?? []);
  }

  async function handleCreateSession(e: React.FormEvent) {
    e.preventDefault();
    if (!editionId || !nomSession) return;

    const { error } = await supabase.from("combine_sessions").insert({
      edition_id: editionId,
      nom: nomSession,
      date_session: dateSession || null,
    });
    if (error) {
      alert("La session n'a pas pu être créée : " + error.message);
      return;
    }

    setNomSession("");
    setDateSession("");
    await refreshSessions();
  }

  async function handleCreateMatch(e: React.FormEvent) {
    e.preventDefault();

    if (!joueur1Id || !joueur2Id) {
      alert("Choisis un joueur dans les deux menus déroulants.");
      return;
    }
    if (joueur1Id === joueur2Id) {
      alert(
        "Il faut deux joueurs différents pour programmer un match. " +
          (players.length < 2
            ? "Il n'y a qu'un seul joueur inscrit pour le moment — il en faut au moins deux."
            : "Choisis un joueur différent dans le deuxième menu.")
      );
      return;
    }

    const { error } = await supabase.from("matches").insert({
      combine_session_id: selectedSessionId,
      joueur1_id: joueur1Id,
      joueur2_id: joueur2Id,
      valide: false,
    });
    if (error) {
      alert("Le match n'a pas pu être programmé : " + error.message);
      return;
    }

    setJoueur1Id("");
    setJoueur2Id("");
    await loadSessionData(selectedSessionId);
  }

  async function handleValidateMatch(match: Match) {
    const edit = scoreEdits[match.id];
    if (!edit) return;
    const s1 = parseInt(edit.s1, 10);
    const s2 = parseInt(edit.s2, 10);
    if (isNaN(s1) || isNaN(s2)) return;

    const { error: matchError } = await supabase
      .from("matches")
      .update({ score_joueur1: s1, score_joueur2: s2, valide: true })
      .eq("id", match.id);
    if (matchError) {
      alert("Le score n'a pas pu être validé : " + matchError.message);
      return;
    }

    // Enregistre les statistiques vérifiées pour les deux joueurs
    const { error: statsError } = await supabase.from("player_stats").insert([
      {
        player_id: match.joueur1_id,
        match_id: match.id,
        matchs_joues: 1,
        victoires: s1 > s2 ? 1 : 0,
        nuls: s1 === s2 ? 1 : 0,
        defaites: s1 < s2 ? 1 : 0,
        buts_marques: s1,
        buts_encaisses: s2,
        verifie_par: userId,
      },
      {
        player_id: match.joueur2_id,
        match_id: match.id,
        matchs_joues: 1,
        victoires: s2 > s1 ? 1 : 0,
        nuls: s1 === s2 ? 1 : 0,
        defaites: s2 < s1 ? 1 : 0,
        buts_marques: s2,
        buts_encaisses: s1,
        verifie_par: userId,
      },
    ]);
    if (statsError) {
      alert("Les statistiques n'ont pas pu être enregistrées : " + statsError.message);
      return;
    }

    await loadSessionData(selectedSessionId);
  }

  async function handleCreateEvaluation(e: React.FormEvent) {
    e.preventDefault();
    if (!evalPlayerId) return;

    const { error } = await supabase.from("evaluations").insert({
      player_id: evalPlayerId,
      combine_session_id: selectedSessionId,
      precision_passes: precisionPasses ? Number(precisionPasses) : null,
      tirs_cadres: tirsCadres ? Number(tirsCadres) : null,
      tirs_tentes: tirsTentes ? Number(tirsTentes) : null,
      dribbles_reussis_pct: dribblesReussisPct ? Number(dribblesReussisPct) : null,
      passes_cles: passesCles ? Number(passesCles) : null,
      adaptation,
      gestion_pression: gestionPression,
      observations,
      evalue_par: userId,
    });
    if (error) {
      alert("L'évaluation n'a pas pu être enregistrée : " + error.message);
      return;
    }

    setEvalPlayerId("");
    setObservations("");
    setPrecisionPasses("");
    setTirsCadres("");
    setTirsTentes("");
    setDribblesReussisPct("");
    setPassesCles("");
    setAdaptation(10);
    setGestionPression(10);
    await loadSessionData(selectedSessionId);
  }

  function playerPseudo(id: string) {
    return players.find((p) => p.id === id)?.pseudo ?? "—";
  }

  if (checking) return <div className="px-6 py-24 text-center font-body text-white/50">Chargement…</div>;

  if (!authorized) {
    return (
      <div className="mx-auto max-w-lg px-6 py-32 text-center">
        <h1 className="font-display text-3xl text-orange">Accès refusé</h1>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-24">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl">Combine</h1>
        <Link href="/admin" className="font-body text-sm text-white/50 hover:text-white">
          ← Retour à l'admin
        </Link>
      </div>
      <p className="mt-3 font-body text-sm text-white/60">
        Sessions d'évaluation des joueurs avant qu'ils deviennent éligibles au Draft.
      </p>

      {/* Créer une session */}
      <section className="mt-10 rounded-2xl border border-line bg-panel p-6">
        <p className="font-display text-lg text-lime">Créer une session d'évaluation</p>
        <form onSubmit={handleCreateSession} className="mt-4 grid gap-4 sm:grid-cols-3">
          <select value={editionId} onChange={(e) => setEditionId(e.target.value)} className="input" required>
            <option value="">— Édition —</option>
            {editions.map((ed) => (
              <option key={ed.id} value={ed.id}>
                {competitionsMap[ed.competition_id] ?? "Compétition"} — {ed.nom}
              </option>
            ))}
          </select>
          <input
            placeholder="Nom de la session"
            value={nomSession}
            onChange={(e) => setNomSession(e.target.value)}
            className="input"
            required
          />
          <input type="date" value={dateSession} onChange={(e) => setDateSession(e.target.value)} className="input" />
          <button
            type="submit"
            className="sm:col-span-3 rounded-full bg-orange px-6 py-3 font-body text-sm font-semibold text-ink hover:bg-lime"
          >
            Créer la session
          </button>
        </form>
      </section>

      {/* Sélection de session */}
      <div className="mt-8">
        <label className="font-body text-sm text-white/70">Session à gérer</label>
        <select
          value={selectedSessionId}
          onChange={(e) => setSelectedSessionId(e.target.value)}
          className="input mt-2"
        >
          <option value="">— Choisir une session —</option>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nom} {s.date_session ? "— " + s.date_session : ""}
            </option>
          ))}
        </select>
      </div>

      {selectedSessionId && (
        <>
          {/* Matchs */}
          <section className="mt-10 rounded-2xl border border-line bg-panel p-6">
            <p className="font-display text-lg text-lime">Matchs</p>
            <form onSubmit={handleCreateMatch} className="mt-4 grid gap-4 sm:grid-cols-3">
              <select value={joueur1Id} onChange={(e) => setJoueur1Id(e.target.value)} className="input" required>
                <option value="">— Joueur 1 —</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.pseudo}
                  </option>
                ))}
              </select>
              <select value={joueur2Id} onChange={(e) => setJoueur2Id(e.target.value)} className="input" required>
                <option value="">— Joueur 2 —</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.pseudo}
                  </option>
                ))}
              </select>
              <button type="submit" className="rounded-full bg-lime px-6 py-3 font-body text-sm font-semibold text-ink">
                Programmer
              </button>
            </form>

            <div className="mt-6 space-y-3">
              {matches.map((m) => (
                <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line px-4 py-3">
                  <p className="font-body text-sm">
                    {playerPseudo(m.joueur1_id)} <span className="text-white/40">vs</span> {playerPseudo(m.joueur2_id)}
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
                          setScoreEdits((prev) => ({ ...prev, [m.id]: { s1: e.target.value, s2: prev[m.id]?.s2 ?? "" } }))
                        }
                      />
                      <span className="text-white/40">—</span>
                      <input
                        type="number"
                        min={0}
                        placeholder="0"
                        className="input w-16 py-2 text-center"
                        value={scoreEdits[m.id]?.s2 ?? ""}
                        onChange={(e) =>
                          setScoreEdits((prev) => ({ ...prev, [m.id]: { s1: prev[m.id]?.s1 ?? "", s2: e.target.value } }))
                        }
                      />
                      <button
                        onClick={() => handleValidateMatch(m)}
                        className="rounded-full bg-orange px-4 py-2 font-body text-xs font-semibold text-ink"
                      >
                        Valider
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {matches.length === 0 && <p className="font-body text-sm text-white/40">Aucun match programmé.</p>}
            </div>
          </section>

          {/* Évaluations */}
          <section className="mt-8 rounded-2xl border border-line bg-panel p-6">
            <p className="font-display text-lg text-lime">Évaluation du match</p>
            <p className="mt-1 font-body text-xs text-white/50">
              Recopie les chiffres affichés par le jeu en fin de match (Technique et Vision sur la carte joueur en
              découlent automatiquement).
            </p>
            <form onSubmit={handleCreateEvaluation} className="mt-4 space-y-4">
              <select value={evalPlayerId} onChange={(e) => setEvalPlayerId(e.target.value)} className="input" required>
                <option value="">— Joueur à évaluer —</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.pseudo}
                  </option>
                ))}
              </select>
              <div className="grid gap-4 sm:grid-cols-3">
                <StatField label="Précision des passes (%)" value={precisionPasses} onChange={setPrecisionPasses} max={100} />
                <StatField label="Dribbles réussis (%)" value={dribblesReussisPct} onChange={setDribblesReussisPct} max={100} />
                <StatField label="Passes clés" value={passesCles} onChange={setPassesCles} />
                <StatField label="Tirs cadrés" value={tirsCadres} onChange={setTirsCadres} />
                <StatField label="Tirs tentés" value={tirsTentes} onChange={setTirsTentes} />
              </div>
              <div>
                <p className="font-body text-xs uppercase tracking-wide text-white/40">Jugement de l'admin (sur 20)</p>
                <div className="mt-2 grid gap-4 sm:grid-cols-2">
                  <NoteField label="Adaptation" value={adaptation} onChange={setAdaptation} />
                  <NoteField label="Gestion pression" value={gestionPression} onChange={setGestionPression} />
                </div>
              </div>
              <textarea
                placeholder="Observations..."
                rows={3}
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                className="input"
              />
              <button type="submit" className="rounded-full bg-lime px-6 py-3 font-body text-sm font-semibold text-ink">
                Enregistrer l'évaluation
              </button>
            </form>

            <div className="mt-6 space-y-3">
              {evaluations.map((ev) => (
                <div key={ev.id} className="rounded-lg border border-line px-4 py-3">
                  <p className="font-body text-sm font-semibold">{playerPseudo(ev.player_id)}</p>
                  <p className="mt-1 font-body text-xs text-white/50">
                    Passes {ev.precision_passes}% · Dribbles {ev.dribbles_reussis_pct}% · Tirs {ev.tirs_cadres}/
                    {ev.tirs_tentes} · Passes clés {ev.passes_cles} · Adaptation {ev.adaptation} · Pression{" "}
                    {ev.gestion_pression}
                  </p>
                  {ev.observations && <p className="mt-2 font-body text-xs text-white/70">{ev.observations}</p>}
                </div>
              ))}
              {evaluations.length === 0 && (
                <p className="font-body text-sm text-white/40">Aucune évaluation pour le moment.</p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function StatField({
  label,
  value,
  onChange,
  max,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  max?: number;
}) {
  return (
    <div>
      <label className="font-body text-xs text-white/60">{label}</label>
      <input
        type="number"
        min={0}
        max={max}
        placeholder="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input mt-1"
      />
    </div>
  );
}

function NoteField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="font-body text-xs text-white/60">{label}</label>
      <input
        type="number"
        min={0}
        max={20}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="input mt-1"
      />
    </div>
  );
}
