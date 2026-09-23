"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Game = { id: string; nom: string; actif: boolean };
type Competition = {
  id: string;
  nom: string;
  description: string | null;
  game_id: string;
  format: string;
  places_max: number | null;
  statut: string;
};
type Edition = {
  id: string;
  nom: string;
  competition_id: string;
  date_debut_inscriptions: string | null;
  date_fin_inscriptions: string | null;
  date_debut: string | null;
  date_fin: string | null;
  statut: string;
};

const statutLabel: Record<string, string> = {
  preparation: "En préparation",
  inscriptions_ouvertes: "Inscriptions ouvertes",
  en_cours: "En cours",
  terminee: "Terminée",
  annulee: "Annulée",
};

export default function AdminCompetitionsPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const [games, setGames] = useState<Game[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [editions, setEditions] = useState<Edition[]>([]);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<string | null>(null);

  // Formulaire nouveau jeu
  const [nouveauJeu, setNouveauJeu] = useState("");

  // Formulaire nouvelle compétition
  const [nomComp, setNomComp] = useState("");
  const [descComp, setDescComp] = useState("");
  const [gameIdComp, setGameIdComp] = useState("");
  const [formatComp, setFormatComp] = useState("poules");
  const [placesMax, setPlacesMax] = useState("");

  // Formulaire nouvelle édition
  const [nomEdition, setNomEdition] = useState("");
  const [dateDebutInscriptions, setDateDebutInscriptions] = useState("");
  const [dateFinInscriptions, setDateFinInscriptions] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");

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
      await loadAll();
      setChecking(false);
    }
    init();
  }, [router]);

  async function loadAll() {
    const { data: gamesData } = await supabase.from("games").select("id, nom, actif").order("nom");
    setGames(gamesData ?? []);

    const { data: compsData } = await supabase
      .from("competitions")
      .select("id, nom, description, game_id, format, places_max, statut")
      .order("created_at", { ascending: false });
    setCompetitions(compsData ?? []);

    const { data: editionsData } = await supabase
      .from("editions")
      .select("id, nom, competition_id, date_debut_inscriptions, date_fin_inscriptions, date_debut, date_fin, statut")
      .order("created_at", { ascending: false });
    setEditions(editionsData ?? []);
  }

  async function handleCreateGame(e: React.FormEvent) {
    e.preventDefault();
    if (!nouveauJeu) return;
    await supabase.from("games").insert({ nom: nouveauJeu, actif: true });
    setNouveauJeu("");
    await loadAll();
  }

  async function handleCreateCompetition(e: React.FormEvent) {
    e.preventDefault();
    if (!nomComp || !gameIdComp) return;
    await supabase.from("competitions").insert({
      nom: nomComp,
      description: descComp || null,
      game_id: gameIdComp,
      format: formatComp,
      places_max: placesMax ? Number(placesMax) : null,
      statut: "preparation",
    });
    setNomComp("");
    setDescComp("");
    setPlacesMax("");
    await loadAll();
  }

  async function handleUpdateCompetitionStatut(id: string, statut: string) {
    await supabase.from("competitions").update({ statut }).eq("id", id);
    await loadAll();
  }

  async function handleCreateEdition(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCompetitionId || !nomEdition) return;
    await supabase.from("editions").insert({
      competition_id: selectedCompetitionId,
      nom: nomEdition,
      date_debut_inscriptions: dateDebutInscriptions || null,
      date_fin_inscriptions: dateFinInscriptions || null,
      date_debut: dateDebut || null,
      date_fin: dateFin || null,
      statut: "preparation",
    });
    setNomEdition("");
    setDateDebutInscriptions("");
    setDateFinInscriptions("");
    setDateDebut("");
    setDateFin("");
    await loadAll();
  }

  async function handleUpdateEditionStatut(id: string, statut: string) {
    await supabase.from("editions").update({ statut }).eq("id", id);
    await loadAll();
  }

  function gameNom(id: string) {
    return games.find((g) => g.id === id)?.nom ?? "—";
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
        <h1 className="font-display text-4xl">Compétitions</h1>
        <Link href="/admin" className="font-body text-sm text-white/50 hover:text-white">
          ← Retour à l'admin
        </Link>
      </div>

      {/* Jeux */}
      <section className="mt-10 rounded-2xl border border-line bg-panel p-6">
        <p className="font-display text-lg text-lime">Jeux / disciplines</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {games.map((g) => (
            <span key={g.id} className="rounded-full border border-white/20 px-3 py-1 font-body text-xs">
              {g.nom}
            </span>
          ))}
        </div>
        <form onSubmit={handleCreateGame} className="mt-4 flex gap-3">
          <input
            placeholder="ex: League of Legends"
            value={nouveauJeu}
            onChange={(e) => setNouveauJeu(e.target.value)}
            className="input flex-1"
          />
          <button type="submit" className="rounded-full bg-lime px-5 py-2 font-body text-sm font-semibold text-ink">
            Ajouter un jeu
          </button>
        </form>
      </section>

      {/* Créer une compétition */}
      <section className="mt-8 rounded-2xl border border-line bg-panel p-6">
        <p className="font-display text-lg text-lime">Créer une compétition</p>
        <form onSubmit={handleCreateCompetition} className="mt-4 grid gap-4 sm:grid-cols-2">
          <input
            placeholder="Nom de la compétition"
            value={nomComp}
            onChange={(e) => setNomComp(e.target.value)}
            className="input"
            required
          />
          <select value={gameIdComp} onChange={(e) => setGameIdComp(e.target.value)} className="input" required>
            <option value="">— Jeu —</option>
            {games.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nom}
              </option>
            ))}
          </select>
          <select value={formatComp} onChange={(e) => setFormatComp(e.target.value)} className="input">
            <option value="poules">Poules</option>
            <option value="elimination_directe">Élimination directe</option>
            <option value="ligue">Ligue</option>
          </select>
          <input
            type="number"
            placeholder="Places max (laisser vide = illimité)"
            value={placesMax}
            onChange={(e) => setPlacesMax(e.target.value)}
            className="input"
          />
          <textarea
            placeholder="Description"
            rows={3}
            value={descComp}
            onChange={(e) => setDescComp(e.target.value)}
            className="input sm:col-span-2"
          />
          <button type="submit" className="sm:col-span-2 rounded-full bg-orange px-6 py-3 font-body text-sm font-semibold text-ink hover:bg-lime">
            Créer la compétition
          </button>
        </form>
      </section>

      {/* Liste des compétitions */}
      <section className="mt-8">
        <p className="font-display text-lg text-lime">Compétitions existantes</p>
        <div className="mt-4 space-y-3">
          {competitions.map((c) => (
            <div key={c.id} className="rounded-2xl border border-line bg-panel p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-body font-semibold">{c.nom}</p>
                  <p className="font-body text-xs text-white/50">
                    {gameNom(c.game_id)} · {c.format} {c.places_max ? `· ${c.places_max} places max` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedCompetitionId(selectedCompetitionId === c.id ? null : c.id)}
                    className="rounded-full border border-white/20 px-4 py-2 font-body text-xs hover:border-white/50"
                  >
                    Éditions
                  </button>
                  <select
                    value={c.statut}
                    onChange={(e) => handleUpdateCompetitionStatut(c.id, e.target.value)}
                    className="input w-auto py-2 text-xs"
                  >
                    {Object.entries(statutLabel).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedCompetitionId === c.id && (
                <div className="mt-6 space-y-4 border-t border-line pt-6">
                  <p className="font-body text-sm font-semibold text-white/80">Éditions / saisons</p>
                  <div className="space-y-2">
                    {editions
                      .filter((ed) => ed.competition_id === c.id)
                      .map((ed) => (
                        <div key={ed.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line px-4 py-2 font-body text-sm">
                          <span>{ed.nom}</span>
                          <select
                            value={ed.statut}
                            onChange={(e) => handleUpdateEditionStatut(ed.id, e.target.value)}
                            className="input w-auto py-1 text-xs"
                          >
                            {Object.entries(statutLabel).map(([k, label]) => (
                              <option key={k} value={k}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    {editions.filter((ed) => ed.competition_id === c.id).length === 0 && (
                      <p className="font-body text-sm text-white/40">Aucune édition créée.</p>
                    )}
                  </div>

                  <form onSubmit={handleCreateEdition} className="grid gap-3 sm:grid-cols-2">
                    <input
                      placeholder="Nom de l'édition (ex: Saison 1 - 2027)"
                      value={nomEdition}
                      onChange={(e) => setNomEdition(e.target.value)}
                      className="input sm:col-span-2"
                      required
                    />
                    <div>
                      <label className="font-body text-xs text-white/50">Inscriptions du</label>
                      <input type="date" value={dateDebutInscriptions} onChange={(e) => setDateDebutInscriptions(e.target.value)} className="input mt-1" />
                    </div>
                    <div>
                      <label className="font-body text-xs text-white/50">au</label>
                      <input type="date" value={dateFinInscriptions} onChange={(e) => setDateFinInscriptions(e.target.value)} className="input mt-1" />
                    </div>
                    <div>
                      <label className="font-body text-xs text-white/50">Compétition du</label>
                      <input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} className="input mt-1" />
                    </div>
                    <div>
                      <label className="font-body text-xs text-white/50">au</label>
                      <input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} className="input mt-1" />
                    </div>
                    <button type="submit" className="sm:col-span-2 rounded-full bg-lime px-6 py-3 font-body text-sm font-semibold text-ink">
                      Créer l'édition
                    </button>
                  </form>
                </div>
              )}
            </div>
          ))}
          {competitions.length === 0 && <p className="font-body text-sm text-white/40">Aucune compétition créée.</p>}
        </div>
      </section>
    </div>
  );
}
