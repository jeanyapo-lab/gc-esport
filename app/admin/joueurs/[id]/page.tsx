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
  comportement_signale: boolean;
  comportement_motif: string | null;
  comportement_date: string | null;
};
type Evaluation = {
  id: string;
  precision_passes: number | null;
  tirs_cadres: number | null;
  tirs_tentes: number | null;
  dribbles_reussis_pct: number | null;
  passes_cles: number | null;
  adaptation: number | null;
  gestion_pression: number | null;
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

  const [precisionPasses, setPrecisionPasses] = useState("");
  const [tirsCadres, setTirsCadres] = useState("");
  const [tirsTentes, setTirsTentes] = useState("");
  const [dribblesReussisPct, setDribblesReussisPct] = useState("");
  const [passesCles, setPassesCles] = useState("");
  const [adaptation, setAdaptation] = useState(10);
  const [gestionPression, setGestionPression] = useState(10);
  const [observations, setObservations] = useState("");
  const [savingEval, setSavingEval] = useState(false);

  const [motifSignalement, setMotifSignalement] = useState("");

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
      .select(
        "id, pseudo, nom, prenom, ville, date_naissance, niveau_declare, statut, photo_url, profil_public, comportement_signale, comportement_motif, comportement_date"
      )
      .eq("id", playerId)
      .single();
    setPlayer(playerData);

    const statsData = await getPlayerStatsSummary(playerId);
    setStats(statsData);
    const cardStatsData = await getPlayerCardStats(playerId);
    setCardStats(cardStatsData);

    const { data: evalData } = await supabase
      .from("evaluations")
      .select(
        "id, precision_passes, tirs_cadres, tirs_tentes, dribbles_reussis_pct, passes_cles, adaptation, gestion_pression, observations, created_at"
      )
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
    setPrecisionPasses("");
    setTirsCadres("");
    setTirsTentes("");
    setDribblesReussisPct("");
    setPassesCles("");
    setObservations("");
    setSavingEval(false);
    await loadAll();
  }

  async function handleSignaler(e: React.FormEvent) {
    e.preventDefault();
    if (!motifSignalement.trim()) return;
    await supabase
      .from("player_profiles")
      .update({
        comportement_signale: true,
        comportement_motif: motifSignalement,
        comportement_date: new Date().toISOString(),
        comportement_par: userId,
      })
      .eq("id", playerId);
    setMotifSignalement("");
    await loadAll();
  }

  async function handleLeverSignalement() {
    if (!confirm("Lever ce signalement ?")) return;
    await supabase
      .from("player_profiles")
      .update({ comportement_signale: false, comportement_motif: null, comportement_date: null })
      .eq("id", playerId);
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
          {player.comportement_signale && (
            <p className="mt-1 font-body text-xs text-orange">⚠ Comportement signalé</p>
          )}
        </div>
      </div>

      {/* Actions de statut — reflètent le vrai parcours du joueur,
          pas juste "différent du statut cible" */}
      <div className="mt-6 flex flex-wrap gap-2">
        {!["profil_verifie", "eligible_draft"].includes(player.statut) && (
          <button onClick={() => handleUpdateStatut("profil_verifie")} className="rounded-full bg-lime px-4 py-2 font-body text-xs font-semibold text-ink">
            Valider le profil
          </button>
        )}
        {player.statut === "profil_verifie" && (
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
          Recopie les chiffres affichés par le jeu en fin de match (Technique et Vision sur la carte joueur en
          découlent automatiquement).
        </p>
        <form onSubmit={handleAddEvaluation} className="mt-4 space-y-4">
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
                  {new Date(ev.created_at).toLocaleDateString("fr-FR")} — Passes {ev.precision_passes}% · Dribbles{" "}
                  {ev.dribbles_reussis_pct}% · Tirs {ev.tirs_cadres}/{ev.tirs_tentes} · Passes clés {ev.passes_cles} ·
                  Adaptation {ev.adaptation} · Pression {ev.gestion_pression}
                </p>
                {ev.observations && <p className="mt-1 font-body text-xs text-white/70">{ev.observations}</p>}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Comportement */}
      <section className="mt-8 rounded-2xl border border-line bg-panel p-6">
        <p className="font-display text-lg text-lime">Comportement</p>
        {player.comportement_signale ? (
          <div className="mt-4 rounded-lg border border-orange/40 bg-orange/10 p-4">
            <p className="font-body text-sm text-orange">⚠ Signalé le {player.comportement_date ? new Date(player.comportement_date).toLocaleDateString("fr-FR") : ""}</p>
            <p className="mt-2 font-body text-sm text-white/70">{player.comportement_motif}</p>
            <button onClick={handleLeverSignalement} className="mt-3 rounded-full border border-white/20 px-4 py-2 font-body text-xs text-white/70">
              Lever le signalement
            </button>
          </div>
        ) : (
          <>
            <p className="mt-1 font-body text-xs text-white/50">✅ Rien à signaler pour le moment.</p>
            <form onSubmit={handleSignaler} className="mt-4 space-y-3">
              <textarea
                placeholder="Motif du signalement (comportement toxique, antijeu, triche...)"
                rows={2}
                value={motifSignalement}
                onChange={(e) => setMotifSignalement(e.target.value)}
                className="input"
              />
              <button type="submit" className="rounded-full border border-orange px-6 py-2 font-body text-sm font-semibold text-orange hover:bg-orange hover:text-ink">
                Signaler un comportement
              </button>
            </form>
          </>
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
      <input type="number" min={0} max={max} placeholder="0" value={value} onChange={(e) => onChange(e.target.value)} className="input mt-1" />
    </div>
  );
}
