"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getPlayerStatsSummary, getPlayerCardStats, type StatsSummary, type CardStats } from "@/lib/playerStats";
import PlayerCard from "@/components/PlayerCard";

type Player = {
  id: string;
  pseudo: string;
  nom: string | null;
  prenom: string | null;
  ville: string | null;
  date_naissance: string | null;
  niveau_declare: string | null;
  statut: string;
  photo_url: string | null;
  profil_public: boolean;
};
type Evaluation = {
  id: string;
  technique: number | null;
  tactique: number | null;
  adaptation: number | null;
  gestion_pression: number | null;
  esprit_sportif: number | null;
  observations: string | null;
  created_at: string;
};
type Engagement = { id: string; type_engagement: string; statut: string };
type DraftPick = { id: string; company_id: string; statut: string };

const statutLabel: Record<string, string> = {
  inscription_incomplete: "Inscription incomplète",
  en_attente_verification: "En attente de vérification",
  profil_verifie: "Profil vérifié",
  en_attente_evaluation: "En attente d'évaluation",
  eligible_draft: "Éligible au Draft",
  non_eligible: "Non éligible",
  suspendu: "Suspendu",
  retire: "Retiré",
};

export default function AdminJoueurDetailPage() {
  const router = useRouter();
  const params = useParams();
  const playerId = params.id as string;

  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [player, setPlayer] = useState<Player | null>(null);
  const [stats, setStats] = useState<StatsSummary | null>(null);
  const [cardStats, setCardStats] = useState<CardStats | null>(null);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [draftPicks, setDraftPicks] = useState<DraftPick[]>([]);
  const [companiesMap, setCompaniesMap] = useState<Record<string, string>>({});

  const [technique, setTechnique] = useState(10);
  const [tactique, setTactique] = useState(10);
  const [adaptation, setAdaptation] = useState(10);
  const [gestionPression, setGestionPression] = useState(10);
  const [espritSportif, setEspritSportif] = useState(10);
  const [observations, setObservations] = useState("");
  const [savingEval, setSavingEval] = useState(false);

  useEffect(() => {
    async function init() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.push("/connexion");
        return;
      }
      setUserId(sessionData.session.user.id);

      const { data: profile } = await supabase.from("profiles").select("role").eq("id", sessionData.session.user.id).single();
      const adminRoles = ["super_admin", "admin", "responsable_joueurs", "responsable_competitions"];
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
  }, [router, playerId]);

  async function loadAll() {
    const { data: playerData } = await supabase
      .from("player_profiles")
      .select("id, pseudo, nom, prenom, ville, date_naissance, niveau_declare, statut, photo_url, profil_public")
      .eq("id", playerId)
      .single();
    setPlayer(playerData);

    const statsData = await getPlayerStatsSummary(playerId);
    setStats(statsData);
    const cardStatsData = await getPlayerCardStats(playerId);
    setCardStats(cardStatsData);

    const { data: evalData } = await supabase
      .from("evaluations")
      .select("id, technique, tactique, adaptation, gestion_pression, esprit_sportif, observations, created_at")
      .eq("player_id", playerId)
      .order("created_at", { ascending: false });
    setEvaluations(evalData ?? []);

    const { data: engData } = await supabase
      .from("engagements")
      .select("id, type_engagement, statut")
      .eq("player_id", playerId);
    setEngagements(engData ?? []);

    const { data: picksData } = await supabase
      .from("draft_picks")
      .select("id, company_id, statut")
      .eq("player_id", playerId);
    setDraftPicks(picksData ?? []);

    const companyIds = Array.from(new Set((picksData ?? []).map((p) => p.company_id)));
    if (companyIds.length > 0) {
      const { data: companiesData } = await supabase.from("companies").select("id, nom").in("id", companyIds);
      const map: Record<string, string> = {};
      (companiesData ?? []).forEach((c) => (map[c.id] = c.nom));
      setCompaniesMap(map);
    }
  }

  async function handleUpdateStatut(statut: string) {
    if (!player) return;
    await supabase.from("player_profiles").update({ statut }).eq("id", player.id);
    await supabase.from("player_status_history").insert({
      player_id: player.id,
      ancien_statut: player.statut,
      nouveau_statut: statut,
      change_par: userId,
    });
    await loadAll();
  }

  async function handleAddEvaluation(e: React.FormEvent) {
    e.preventDefault();
    setSavingEval(true);
    await supabase.from("evaluations").insert({
      player_id: playerId,
      technique,
      tactique,
      adaptation,
      gestion_pression: gestionPression,
      esprit_sportif: espritSportif,
      observations,
      evalue_par: userId,
    });
    setObservations("");
    setSavingEval(false);
    await loadAll();
  }

  if (checking) return <div className="px-6 py-24 text-center font-body text-white/50">Chargement…</div>;
  if (!authorized) return <div className="mx-auto max-w-lg px-6 py-32 text-center"><h1 className="font-display text-3xl text-orange">Accès refusé</h1></div>;
  if (!player) return <div className="mx-auto max-w-lg px-6 py-32 text-center font-body text-white/50">Joueur introuvable.</div>;

  return (
    <div className="mx-auto max-w-3xl px-6 py-24">
      <Link href="/admin" className="font-body text-sm text-white/50 hover:text-white">← Retour à l'admin</Link>

      <div className="mt-6 flex items-center gap-5">
        {player.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={player.photo_url} alt={player.pseudo} className="h-20 w-20 rounded-full object-cover" />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-panel font-display text-2xl text-orange">
            {player.pseudo.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="font-display text-3xl">{player.pseudo}</h1>
          <p className="font-body text-sm text-white/50">{player.ville || "Ville non renseignée"}</p>
          {(player.nom || player.prenom) && (
            <p className="font-body text-xs text-white/30">
              {player.prenom} {player.nom} · privé
            </p>
          )}
          <p className="mt-1 font-body text-xs text-lime">{statutLabel[player.statut] ?? player.statut}</p>
        </div>
      </div>

      {/* Actions de statut */}
      <div className="mt-6 flex flex-wrap gap-2">
        {player.statut !== "profil_verifie" && (
          <button onClick={() => handleUpdateStatut("profil_verifie")} className="rounded-full bg-lime px-4 py-2 font-body text-xs font-semibold text-ink">
            Valider le profil
          </button>
        )}
        {player.statut !== "eligible_draft" && (
          <button onClick={() => handleUpdateStatut("eligible_draft")} className="rounded-full border border-lime px-4 py-2 font-body text-xs text-lime">
            Rendre éligible au Draft
          </button>
        )}
        {player.statut !== "non_eligible" && (
          <button onClick={() => handleUpdateStatut("non_eligible")} className="rounded-full border border-white/20 px-4 py-2 font-body text-xs text-white/70">
            Refuser
          </button>
        )}
        {player.statut !== "retire" && (
          <button onClick={() => handleUpdateStatut("retire")} className="rounded-full border border-white/20 px-4 py-2 font-body text-xs text-white/50">
            Retirer
          </button>
        )}
      </div>

      {/* Stats */}
      {stats && stats.matchsJoues > 0 && (
        <div className="mt-8 rounded-2xl border border-line bg-panel p-6">
          <p className="font-body text-xs uppercase tracking-wide text-white/40">Statistiques de matchs</p>
          <div className="mt-3 flex flex-wrap gap-x-8 gap-y-2 font-body text-sm">
            <span>{stats.matchsJoues} matchs</span>
            <span className="text-lime">{stats.victoires}V</span>
            <span className="text-white/60">{stats.nuls}N</span>
            <span className="text-white/40">{stats.defaites}D</span>
            <span>{stats.butsMarques} buts marqués</span>
            <span>{stats.butsEncaisses} encaissés</span>
          </div>
        </div>
      )}

      {cardStats && (
        <div className="mt-6">
          <PlayerCard stats={cardStats} />
        </div>
      )}

      {/* Ajouter une évaluation */}
      <section className="mt-8 rounded-2xl border border-line bg-panel p-6">
        <p className="font-display text-lg text-lime">Ajouter une évaluation</p>
        <p className="mt-1 font-body text-xs text-white/50">
          Nourrit directement la carte joueur ci-dessus (Technique, Vision, Esprit d'équipe).
        </p>
        <form onSubmit={handleAddEvaluation} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-5">
            <NoteField label="Technique" value={technique} onChange={setTechnique} />
            <NoteField label="Tactique" value={tactique} onChange={setTactique} />
            <NoteField label="Adaptation" value={adaptation} onChange={setAdaptation} />
            <NoteField label="Pression" value={gestionPression} onChange={setGestionPression} />
            <NoteField label="Esprit sportif" value={espritSportif} onChange={setEspritSportif} />
          </div>
          <textarea placeholder="Observations..." rows={2} value={observations} onChange={(e) => setObservations(e.target.value)} className="input" />
          <button type="submit" disabled={savingEval} className="rounded-full bg-orange px-6 py-3 font-body text-sm font-semibold text-ink hover:bg-lime disabled:opacity-50">
            {savingEval ? "Enregistrement…" : "Enregistrer l'évaluation"}
          </button>
        </form>

        {evaluations.length > 0 && (
          <div className="mt-6 space-y-2 border-t border-line pt-6">
            <p className="font-body text-xs uppercase tracking-wide text-white/40">Historique des évaluations</p>
            {evaluations.map((ev) => (
              <div key={ev.id} className="rounded-lg border border-line px-4 py-3">
                <p className="font-body text-xs text-white/50">
                  {new Date(ev.created_at).toLocaleDateString("fr-FR")} — Technique {ev.technique} · Tactique {ev.tactique} · Adaptation{" "}
                  {ev.adaptation} · Pression {ev.gestion_pression} · Esprit sportif {ev.esprit_sportif}
                </p>
                {ev.observations && <p className="mt-1 font-body text-xs text-white/70">{ev.observations}</p>}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Historique Draft */}
      {draftPicks.length > 0 && (
        <section className="mt-8">
          <p className="font-display text-lg text-lime">Historique Draft</p>
          <div className="mt-3 space-y-2">
            {draftPicks.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-line px-4 py-3 font-body text-sm">
                <span>{companiesMap[p.company_id] ?? "Entreprise"}</span>
                <span className="text-xs text-white/50">{p.statut}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Engagements */}
      {engagements.length > 0 && (
        <section className="mt-8">
          <p className="font-display text-lg text-lime">Engagements</p>
          <div className="mt-3 space-y-2">
            {engagements.map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-lg border border-line px-4 py-3 font-body text-sm">
                <span>{e.type_engagement}</span>
                <span className="text-xs text-white/50">{e.statut}</span>
              </div>
            ))}
          </div>
          <Link href="/admin/engagements" className="mt-3 inline-block font-body text-xs text-orange hover:underline">
            Gérer les engagements →
          </Link>
        </section>
      )}
    </div>
  );
}

function NoteField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="font-body text-xs text-white/60">{label}</label>
      <input type="number" min={0} max={20} value={value} onChange={(e) => onChange(Number(e.target.value))} className="input mt-1" />
    </div>
  );
}
