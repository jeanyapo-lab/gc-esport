"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Evenement = { date: string; label: string; type: "edition_debut" | "edition_fin" | "match" };

const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export default function CalendrierPage() {
  const [loading, setLoading] = useState(true);
  const [evenements, setEvenements] = useState<Evenement[]>([]);
  const [moisAffiche, setMoisAffiche] = useState(new Date());

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data: editions } = await supabase
      .from("editions")
      .select("nom, date_debut, date_fin, competition_id");

    const competitionIds = Array.from(new Set((editions ?? []).map((e) => e.competition_id)));
    const { data: competitions } = await supabase.from("competitions").select("id, nom").in("id", competitionIds);
    const compMap: Record<string, string> = {};
    (competitions ?? []).forEach((c) => (compMap[c.id] = c.nom));

    const evs: Evenement[] = [];
    (editions ?? []).forEach((e) => {
      const nomComplet = `${compMap[e.competition_id] ?? "Compétition"} — ${e.nom}`;
      if (e.date_debut) evs.push({ date: e.date_debut, label: `Début : ${nomComplet}`, type: "edition_debut" });
      if (e.date_fin) evs.push({ date: e.date_fin, label: `Fin : ${nomComplet}`, type: "edition_fin" });
    });

    const { data: matches } = await supabase.from("matches").select("date_match").not("date_match", "is", null);
    (matches ?? []).forEach((m) => {
      if (m.date_match) evs.push({ date: m.date_match.slice(0, 10), label: "Match programmé", type: "match" });
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

  function evenementsDuJour(jour: number) {
    const dateStr = `${annee}-${String(mois + 1).padStart(2, "0")}-${String(jour).padStart(2, "0")}`;
    return evenements.filter((e) => e.date === dateStr);
  }

  const prochainsEvenements = [...evenements]
    .filter((e) => e.date >= new Date().toISOString().slice(0, 10))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8);

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
                const evs = jour ? evenementsDuJour(jour) : [];
                return (
                  <div
                    key={i}
                    className={`aspect-square rounded-lg border p-1 text-left font-body text-xs ${
                      jour ? "border-line" : "border-transparent"
                    } ${evs.length > 0 ? "border-orange/50 bg-orange/5" : ""}`}
                  >
                    {jour && (
                      <>
                        <span className="text-white/60">{jour}</span>
                        {evs.length > 0 && <div className="mt-1 h-1.5 w-1.5 rounded-full bg-orange" />}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <section className="mt-10">
            <p className="font-display text-lg text-lime">Prochains événements</p>
            <div className="mt-4 space-y-2">
              {prochainsEvenements.map((e, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-line px-4 py-3 font-body text-sm">
                  <span>{e.label}</span>
                  <span className="text-white/40">{new Date(e.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</span>
                </div>
              ))}
              {prochainsEvenements.length === 0 && (
                <p className="font-body text-sm text-white/40">Aucun événement à venir pour le moment.</p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
