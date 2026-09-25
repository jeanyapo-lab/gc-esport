"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type EvenementBase = {
  id: string;
  date: string; // YYYY-MM-DD
  heure: string | null; // HH:mm
  courte: string; // libellé court pour la case du calendrier
  competitionLabel: string;
};

type EvenementEdition = EvenementBase & {
  type: "edition_debut" | "edition_fin";
};

type EvenementChampionnat = EvenementBase & {
  type: "match_championnat";
  joueur1: string;
  joueur2: string;
  score1: number | null;
  score2: number | null;
  valide: boolean;
};

type EvenementBracket = EvenementBase & {
  type: "match_bracket";
  equipeA: string;
  equipeB: string;
  score1: number | null;
  score2: number | null;
  valide: boolean;
  tourLabel: string;
};

type Evenement = EvenementEdition | EvenementChampionnat | EvenementBracket;

const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function tourLabel(tour: number, maxTour: number): string {
  const restant = maxTour - tour;
  if (restant === 0) return "Finale";
  if (restant === 1) return "Demi-finale";
  if (restant === 2) return "Quart de finale";
  if (restant === 3) return "Huitième de finale";
  return `Tour ${tour}`;
}

function formatHeure(iso: string): string | null {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const hasTime = iso.includes("T") && !iso.endsWith("T00:00:00.000Z") ;
  if (!hasTime) return null;
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export default function CalendrierPage() {
  const [loading, setLoading] = useState(true);
  const [evenements, setEvenements] = useState<Evenement[]>([]);
  const [moisAffiche, setMoisAffiche] = useState(new Date());
  const [jourSelectionne, setJourSelectionne] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data: editions } = await supabase
      .from("editions")
      .select("id, nom, date_debut, date_fin, competition_id");

    const competitionIds = Array.from(new Set((editions ?? []).map((e) => e.competition_id)));
    const { data: competitions } = await supabase.from("competitions").select("id, nom").in("id", competitionIds);
    const compMap: Record<string, string> = {};
    (competitions ?? []).forEach((c) => (compMap[c.id] = c.nom));

    const editionLabelMap: Record<string, string> = {};
    (editions ?? []).forEach((e) => {
      editionLabelMap[e.id] = `${compMap[e.competition_id] ?? "Compétition"} — ${e.nom}`;
    });

    const evs: Evenement[] = [];

    (editions ?? []).forEach((e) => {
      const label = editionLabelMap[e.id] ?? "Compétition";
      if (e.date_debut) {
        evs.push({
          id: `ed-debut-${e.id}`,
          type: "edition_debut",
          date: e.date_debut.slice(0, 10),
          heure: null,
          courte: "Début",
          competitionLabel: label,
        });
      }
      if (e.date_fin) {
        evs.push({
          id: `ed-fin-${e.id}`,
          type: "edition_fin",
          date: e.date_fin.slice(0, 10),
          heure: null,
          courte: "Fin",
          competitionLabel: label,
        });
      }
    });

    // Matchs du championnat (poules / ligue) — un contre un
    const { data: matches } = await supabase
      .from("matches")
      .select("id, edition_id, joueur1_id, joueur2_id, score_joueur1, score_joueur2, valide, date_match")
      .not("date_match", "is", null);

    const playerIds = Array.from(
      new Set((matches ?? []).flatMap((m) => [m.joueur1_id, m.joueur2_id]).filter(Boolean))
    ) as string[];
    let pseudoMap: Record<string, string> = {};
    if (playerIds.length > 0) {
      const { data: playersData } = await supabase.from("player_profiles").select("id, pseudo").in("id", playerIds);
      pseudoMap = Object.fromEntries((playersData ?? []).map((p) => [p.id, p.pseudo]));
    }

    (matches ?? []).forEach((m) => {
      if (!m.date_match) return;
      const j1 = pseudoMap[m.joueur1_id] ?? "Joueur";
      const j2 = pseudoMap[m.joueur2_id] ?? "Joueur";
      evs.push({
        id: `match-${m.id}`,
        type: "match_championnat",
        date: m.date_match.slice(0, 10),
        heure: formatHeure(m.date_match),
        courte: `${j1} vs ${j2}`,
        competitionLabel: editionLabelMap[m.edition_id] ?? "Championnat",
        joueur1: j1,
        joueur2: j2,
        score1: m.score_joueur1,
        score2: m.score_joueur2,
        valide: m.valide,
      });
    });

    // Matchs du bracket (élimination directe) — équipe contre équipe
    const { data: bracketMatches } = await supabase
      .from("bracket_matches")
      .select("id, edition_id, tour, team_a_id, team_b_id, score_a, score_b, valide, date_match")
      .not("date_match", "is", null);

    const teamIds = Array.from(
      new Set((bracketMatches ?? []).flatMap((m) => [m.team_a_id, m.team_b_id]).filter(Boolean))
    ) as string[];
    let teamMap: Record<string, string> = {};
    if (teamIds.length > 0) {
      const { data: teamsData } = await supabase.from("teams").select("id, nom").in("id", teamIds);
      teamMap = Object.fromEntries((teamsData ?? []).map((t) => [t.id, t.nom]));
    }

    const maxTourByEdition: Record<string, number> = {};
    (bracketMatches ?? []).forEach((m) => {
      maxTourByEdition[m.edition_id] = Math.max(maxTourByEdition[m.edition_id] ?? 0, m.tour);
    });

    (bracketMatches ?? []).forEach((m) => {
      if (!m.date_match) return;
      const eqA = m.team_a_id ? teamMap[m.team_a_id] ?? "Équipe à déterminer" : "Équipe à déterminer";
      const eqB = m.team_b_id ? teamMap[m.team_b_id] ?? "Équipe à déterminer" : "Équipe à déterminer";
      evs.push({
        id: `bracket-${m.id}`,
        type: "match_bracket",
        date: m.date_match.slice(0, 10),
        heure: formatHeure(m.date_match),
        courte: `${eqA} vs ${eqB}`,
        competitionLabel: editionLabelMap[m.edition_id] ?? "Compétition",
        equipeA: eqA,
        equipeB: eqB,
        score1: m.score_a,
        score2: m.score_b,
        valide: m.valide,
        tourLabel: tourLabel(m.tour, maxTourByEdition[m.edition_id] ?? m.tour),
      });
    });

    setEvenements(evs);
    setLoading(false);
  }

  const annee = moisAffiche.getFullYear();
  const mois = moisAffiche.getMonth();
  const premierJour = new Date(annee, mois, 1);
  const dernierJour = new Date(annee, mois + 1, 0);
  const decalage = (premierJour.getDay() + 6) % 7; // lundi = 0

  const jours: (number | null)[] = [];
  for (let i = 0; i < decalage; i++) jours.push(null);
  for (let d = 1; d <= dernierJour.getDate(); d++) jours.push(d);

  function dateStrDuJour(jour: number) {
    return `${annee}-${String(mois + 1).padStart(2, "0")}-${String(jour).padStart(2, "0")}`;
  }

  function evenementsDuJour(dateStr: string) {
    return evenements.filter((e) => e.date === dateStr);
  }

  const prochainsEvenements = [...evenements]
    .filter((e) => e.date >= new Date().toISOString().slice(0, 10))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8);

  const evenementsJourSelectionne = jourSelectionne ? evenementsDuJour(jourSelectionne) : [];

  return (
    <div className="mx-auto max-w-5xl px-6 py-24">
      <h1 className="font-display text-5xl">Calendrier</h1>
      <p className="mt-4 font-body text-white/60">Les dates clés des compétitions GC ESPORT.</p>

      {loading ? (
        <p className="mt-14 font-body text-white/50">Chargement…</p>
      ) : (
        <>
          <div className="mt-14 rounded-2xl border border-line bg-panel p-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setMoisAffiche(new Date(annee, mois - 1, 1))}
                className="rounded-full border border-white/20 px-4 py-2 font-body text-sm hover:border-white/50"
              >
                ← Précédent
              </button>
              <p className="font-display text-xl">
                {MOIS[mois]} {annee}
              </p>
              <button
                onClick={() => setMoisAffiche(new Date(annee, mois + 1, 1))}
                className="rounded-full border border-white/20 px-4 py-2 font-body text-sm hover:border-white/50"
              >
                Suivant →
              </button>
            </div>

            <div className="mt-6 grid grid-cols-7 gap-2 text-center font-body text-xs text-white/40">
              {JOURS.map((j) => (
                <div key={j}>{j}</div>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-7 gap-2">
              {jours.map((jour, i) => {
                const dateStr = jour ? dateStrDuJour(jour) : null;
                const evs = dateStr ? evenementsDuJour(dateStr) : [];
                const cliquable = jour !== null && evs.length > 0;
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={!cliquable}
                    onClick={() => dateStr && setJourSelectionne(dateStr)}
                    className={`aspect-square rounded-lg border p-1 text-left font-body text-[10px] leading-tight ${
                      jour ? "border-line" : "border-transparent"
                    } ${evs.length > 0 ? "border-orange/50 bg-orange/5 hover:border-orange" : ""} ${
                      cliquable ? "cursor-pointer" : "cursor-default"
                    }`}
                  >
                    {jour && (
                      <>
                        <span className="text-white/60">{jour}</span>
                        <div className="mt-1 space-y-0.5">
                          {evs.slice(0, 2).map((e) => (
                            <p key={e.id} className="truncate text-orange">
                              {e.type === "edition_debut" || e.type === "edition_fin" ? e.courte : e.heure ? `${e.heure} ${e.courte}` : e.courte}
                            </p>
                          ))}
                          {evs.length > 2 && <p className="text-white/40">+{evs.length - 2}</p>}
                        </div>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <section className="mt-10">
            <p className="font-display text-lg text-lime">Prochains événements</p>
            <div className="mt-4 space-y-2">
              {prochainsEvenements.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setJourSelectionne(e.date)}
                  className="flex w-full items-center justify-between rounded-lg border border-line px-4 py-3 text-left font-body text-sm hover:border-orange"
                >
                  <span>{e.type === "edition_debut" || e.type === "edition_fin" ? `${e.courte} : ${e.competitionLabel}` : e.courte}</span>
                  <span className="text-white/40">
                    {new Date(e.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                    {e.heure ? ` · ${e.heure}` : ""}
                  </span>
                </button>
              ))}
              {prochainsEvenements.length === 0 && (
                <p className="font-body text-sm text-white/40">Aucun événement à venir pour le moment.</p>
              )}
            </div>
          </section>
        </>
      )}

      {jourSelectionne && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6" onClick={() => setJourSelectionne(null)}>
          <div
            className="w-full max-w-lg rounded-2xl border border-line bg-panel p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="font-display text-lg text-lime">
                {new Date(jourSelectionne).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
              <button onClick={() => setJourSelectionne(null)} className="font-body text-sm text-white/50 hover:text-white">
                Fermer
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {evenementsJourSelectionne.map((e) => (
                <div key={e.id} className="rounded-xl border border-line p-4">
                  <p className="font-body text-xs uppercase tracking-wide text-white/40">{e.competitionLabel}</p>

                  {(e.type === "edition_debut" || e.type === "edition_fin") && (
                    <p className="mt-2 font-body text-sm text-white/80">
                      {e.type === "edition_debut" ? "Début de la compétition" : "Fin de la compétition"}
                    </p>
                  )}

                  {e.type === "match_championnat" && (
                    <>
                      <p className="mt-2 font-body text-xs text-orange">Match du championnat</p>
                      <div className="mt-2 flex items-center justify-between font-body text-sm">
                        <span className={e.valide && (e.score1 ?? 0) > (e.score2 ?? 0) ? "font-semibold text-lime" : ""}>{e.joueur1}</span>
                        <span className="text-white/40">
                          {e.valide ? `${e.score1} – ${e.score2}` : "vs"}
                        </span>
                        <span className={e.valide && (e.score2 ?? 0) > (e.score1 ?? 0) ? "font-semibold text-lime" : ""}>{e.joueur2}</span>
                      </div>
                    </>
                  )}

                  {e.type === "match_bracket" && (
                    <>
                      <p className="mt-2 font-body text-xs text-orange">{e.tourLabel}</p>
                      <div className="mt-2 flex items-center justify-between font-body text-sm">
                        <span className={e.valide && (e.score1 ?? 0) > (e.score2 ?? 0) ? "font-semibold text-lime" : ""}>{e.equipeA}</span>
                        <span className="text-white/40">
                          {e.valide ? `${e.score1} – ${e.score2}` : "vs"}
                        </span>
                        <span className={e.valide && (e.score2 ?? 0) > (e.score1 ?? 0) ? "font-semibold text-lime" : ""}>{e.equipeB}</span>
                      </div>
                    </>
                  )}

                  {e.heure && <p className="mt-2 font-body text-xs text-white/50">Heure : {e.heure}</p>}
                </div>
              ))}
            </div>

            <Link
              href="/classements"
              onClick={() => setJourSelectionne(null)}
              className="mt-5 inline-block font-body text-xs text-white/50 hover:text-white"
            >
              Voir le classement complet →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
