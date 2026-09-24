"use client";


import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getPlayerCardStats, getOverallScore } from "@/lib/playerStats";
import { notify, getUserIdFromPlayerId, getUserIdsFromCompanyId } from "@/lib/notify";
import { attemptFinalizeOffer } from "@/lib/recruitment";
import SocialLinks from "@/components/SocialLinks";

const ROSTER_MAX = 5;

type Edition = { id: string; nom: string; competition_id: string };
type PlayerRow = {
  id: string;
  pseudo: string;
  ville: string | null;
  niveau_declare: string | null;
  photo_url: string | null;
  overall: number;
  comportement_signale: boolean;
  reseaux_sociaux?: { twitter?: string; twitch?: string; youtube?: string; instagram?: string; discord?: string } | null;
  currentCompanyId?: string;
  currentCompanyNom?: string;
};
type Offer = {
  id: string;
  type: "recrutement_libre" | "transfert";
  player_id: string;
  company_id: string;
  ancienne_company_id: string | null;
  edition_id: string;
  statut: string;
  duree_mois: number | null;
  budget_propose: string | null;
  conditions?: string | null;
};

const offerStatutLabel: Record<string, string> = {
  en_attente_reponse_joueur: "En attente du joueur",
  refusee_joueur: "Refusée par le joueur",
  en_attente_ancienne_entreprise: "En attente de l'ancienne entreprise",
  refusee_ancienne_entreprise: "Refusée par l'ancienne entreprise",
  en_attente_validation_gcesport: "En attente de validation GC ESPORT",
  validee: "Validée",
  annulee: "Annulée",
};

function RecrutementEntrepriseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedPlayerId = searchParams.get("player");
  const [loading, setLoading] = useState(true);
  const [myCompanyId, setMyCompanyId] = useState<string | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);

  const [editions, setEditions] = useState<Edition[]>([]);
  const [competitionsMap, setCompetitionsMap] = useState<Record<string, string>>({});
  const [editionId, setEditionId] = useState("");

  const [joueursLibres, setJoueursLibres] = useState<PlayerRow[]>([]);
  const [joueursRecrutes, setJoueursRecrutes] = useState<PlayerRow[]>([]);
  const [autoOpened, setAutoOpened] = useState(false);
  const [effectifActuel, setEffectifActuel] = useState(0);

  const [offresRecues, setOffresRecues] = useState<Offer[]>([]);
  const [candidaturesRecues, setCandidaturesRecues] = useState<Offer[]>([]);
  const [candidaturesPlayersMap, setCandidaturesPlayersMap] = useState<Record<string, string>>({});
  const [mesOffres, setMesOffres] = useState<Offer[]>([]);
  const [playersMap, setPlayersMap] = useState<Record<string, string>>({});

  const [shortlistIds, setShortlistIds] = useState<Set<string>>(new Set());
  const [formPlayerId, setFormPlayerId] = useState<string | null>(null);
  const [formType, setFormType] = useState<"recrutement_libre" | "transfert">("recrutement_libre");
  const [formAncienneCompanyId, setFormAncienneCompanyId] = useState<string | null>(null);
  const [dureeMois, setDureeMois] = useState(6);
  const [budgetPropose, setBudgetPropose] = useState("");
  const [conditions, setConditions] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    if (editionId && myCompanyId) loadEditionData();
  }, [editionId, myCompanyId]);

  async function init() {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      router.push("/connexion");
      return;
    }

    setMyUserId(sessionData.session.user.id);

    const { data: rep } = await supabase
      .from("company_reps")
      .select("company_id")
      .eq("user_id", sessionData.session.user.id)
      .single();

    if (!rep) {
      setLoading(false);
      return;
    }
    setMyCompanyId(rep.company_id);

    const { data: editionsData } = await supabase.from("editions").select("id, nom, competition_id");
    setEditions(editionsData ?? []);
    if (editionsData && editionsData.length > 0) setEditionId(editionsData[0].id);

    const { data: compsData } = await supabase.from("competitions").select("id, nom");
    const cMap: Record<string, string> = {};
    (compsData ?? []).forEach((c) => (cMap[c.id] = c.nom));
    setCompetitionsMap(cMap);

    const { data: shortlistData } = await supabase.from("shortlist_entries").select("player_id").eq("company_id", rep.company_id);
    setShortlistIds(new Set((shortlistData ?? []).map((s) => s.player_id)));

    setLoading(false);
  }

  async function handleToggleShortlist(playerId: string) {
    if (!myCompanyId) return;
    if (shortlistIds.has(playerId)) {
      await supabase.from("shortlist_entries").delete().eq("company_id", myCompanyId).eq("player_id", playerId);
    } else {
      await supabase.from("shortlist_entries").insert({ company_id: myCompanyId, player_id: playerId });
    }
    const { data } = await supabase.from("shortlist_entries").select("player_id").eq("company_id", myCompanyId);
    setShortlistIds(new Set((data ?? []).map((s) => s.player_id)));
  }

  async function loadEditionData() {
    if (!myCompanyId) return;

    // Équipes de cette édition
    const { data: teams } = await supabase.from("teams").select("id, nom, company_id").eq("edition_id", editionId);
    const teamsData = teams ?? [];
    const myTeam = teamsData.find((t) => t.company_id === myCompanyId);
    const teamIds = teamsData.map((t) => t.id);

    let assignments: { team_id: string; player_id: string }[] = [];
    if (teamIds.length > 0) {
      const { data } = await supabase.from("team_assignments").select("team_id, player_id").in("team_id", teamIds);
      assignments = data ?? [];
    }

    setEffectifActuel(myTeam ? assignments.filter((a) => a.team_id === myTeam.id).length : 0);

    const teamToCompany: Record<string, string> = {};
    teamsData.forEach((t) => (teamToCompany[t.id] = t.company_id));
    const companyNames: Record<string, string> = {};
    teamsData.forEach((t) => (companyNames[t.company_id] = t.nom));

    const recrutedPlayerIds = new Set(assignments.map((a) => a.player_id));

    // Joueurs éligibles (libres)
    const { data: eligibles } = await supabase
      .from("player_profiles")
      .select("id, pseudo, ville, niveau_declare, photo_url, comportement_signale, reseaux_sociaux")
      .eq("statut", "eligible_draft");

    const libres = (eligibles ?? []).filter((p) => !recrutedPlayerIds.has(p.id));
    const recrutesParAutres = (eligibles ?? [])
      .filter((p) => recrutedPlayerIds.has(p.id))
      .map((p) => {
        const assignment = assignments.find((a) => a.player_id === p.id);
        const companyId = assignment ? teamToCompany[assignment.team_id] : undefined;
        return { ...p, currentCompanyId: companyId, currentCompanyNom: companyId ? companyNames[companyId] : undefined };
      })
      .filter((p) => p.currentCompanyId !== myCompanyId);

    const libresAvecNote = await Promise.all(
      libres.map(async (p) => ({ ...p, overall: getOverallScore(await getPlayerCardStats(p.id)) }))
    );
    const recrutesAvecNote = await Promise.all(
      recrutesParAutres.map(async (p) => ({ ...p, overall: getOverallScore(await getPlayerCardStats(p.id)) }))
    );

    setJoueursLibres(libresAvecNote);
    setJoueursRecrutes(recrutesAvecNote);

    if (preselectedPlayerId && !autoOpened) {
      const libre = libresAvecNote.find((p) => p.id === preselectedPlayerId);
      const recrute = recrutesAvecNote.find((p) => p.id === preselectedPlayerId);
      if (libre) {
        openForm(libre.id, "recrutement_libre");
        setAutoOpened(true);
      } else if (recrute) {
        openForm(recrute.id, "transfert", recrute.currentCompanyId);
        setAutoOpened(true);
      }
    }

    // Offres où je suis l'ancienne entreprise (à approuver)
    const { data: recues } = await supabase
      .from("recruitment_offers")
      .select("id, type, player_id, company_id, ancienne_company_id, edition_id, statut, duree_mois, budget_propose")
      .eq("ancienne_company_id", myCompanyId)
      .eq("statut", "en_attente_ancienne_entreprise");
    setOffresRecues(recues ?? []);

    // Candidatures spontanées reçues des joueurs
    const { data: candidaturesData } = await supabase
      .from("recruitment_offers")
      .select("id, type, player_id, company_id, ancienne_company_id, edition_id, statut, duree_mois, budget_propose, conditions")
      .eq("company_id", myCompanyId)
      .eq("statut", "en_attente_confirmation_entreprise");
    setCandidaturesRecues(candidaturesData ?? []);

    if (candidaturesData && candidaturesData.length > 0) {
      const candPlayerIds = candidaturesData.map((c) => c.player_id);
      const { data: candPlayersData } = await supabase.from("player_profiles").select("id, pseudo").in("id", candPlayerIds);
      const map: Record<string, string> = {};
      (candPlayersData ?? []).forEach((p) => (map[p.id] = p.pseudo));
      setCandidaturesPlayersMap(map);
    }

    // Mes offres envoyées
    const { data: envoyees } = await supabase
      .from("recruitment_offers")
      .select("id, type, player_id, company_id, ancienne_company_id, edition_id, statut, duree_mois, budget_propose")
      .eq("company_id", myCompanyId)
      .order("created_at", { ascending: false });
    setMesOffres(envoyees ?? []);

    const allPlayerIds = Array.from(
      new Set([...(recues ?? []).map((o) => o.player_id), ...(envoyees ?? []).map((o) => o.player_id)])
    );
    if (allPlayerIds.length > 0) {
      const { data: pData } = await supabase.from("player_profiles").select("id, pseudo").in("id", allPlayerIds);
      const pMap: Record<string, string> = {};
      (pData ?? []).forEach((p) => (pMap[p.id] = p.pseudo));
      setPlayersMap(pMap);
    }
  }

  function openForm(playerId: string, type: "recrutement_libre" | "transfert", ancienneCompanyId?: string) {
    setFormPlayerId(playerId);
    setFormType(type);
    setFormAncienneCompanyId(ancienneCompanyId ?? null);
    setDureeMois(6);
    setBudgetPropose("");
    setConditions("");
  }

  async function handleSubmitOffer(e: React.FormEvent) {
    e.preventDefault();
    if (!formPlayerId || !myCompanyId || !editionId) return;
    if (effectifActuel >= ROSTER_MAX) return;

    setSubmitting(true);
    await supabase.from("recruitment_offers").insert({
      type: formType,
      player_id: formPlayerId,
      company_id: myCompanyId,
      ancienne_company_id: formAncienneCompanyId,
      edition_id: editionId,
      duree_mois: dureeMois,
      budget_propose: budgetPropose,
      conditions,
      statut: "en_attente_reponse_joueur",
    });
    setSubmitting(false);
    setFormPlayerId(null);

    const uid = await getUserIdFromPlayerId(formPlayerId);
    await notify(
      uid,
      formType === "transfert" ? "Proposition de transfert" : "Proposition de recrutement",
      "Une entreprise t'a fait une proposition. Réponds depuis ton espace joueur."
    );

    await loadEditionData();
  }

  async function handleApproveDepart(offerId: string) {
    const offer = offresRecues.find((o) => o.id === offerId);
    if (!offer) return;

    const result = await attemptFinalizeOffer(offer, myUserId);
    if (!result.finalise) {
      alert(result.raison ?? "En attente de résolution par GC ESPORT.");
    }
    await loadEditionData();
  }

  async function handleRefuseDepart(offerId: string) {
    const offer = offresRecues.find((o) => o.id === offerId);
    await supabase.from("recruitment_offers").update({ statut: "refusee_ancienne_entreprise" }).eq("id", offerId);
    if (offer) {
      const userIds = await getUserIdsFromCompanyId(offer.company_id);
      for (const uid of userIds) {
        await notify(uid, "Transfert refusé", "L'ancienne entreprise a refusé de libérer ce joueur.");
      }
    }
    await loadEditionData();
  }

  async function handleAcceptCandidature(offer: Offer) {
    const result = await attemptFinalizeOffer(offer, myUserId);
    if (!result.finalise) alert(result.raison ?? "En attente de résolution par GC ESPORT.");
    await loadEditionData();
  }

  async function handleRefuseCandidature(offerId: string) {
    await supabase.from("recruitment_offers").update({ statut: "refusee_entreprise" }).eq("id", offerId);
    await loadEditionData();
  }

  if (loading) return <div className="px-6 py-24 text-center font-body text-white/50">Chargement…</div>;

  const complet = effectifActuel >= ROSTER_MAX;

  return (
    <div className="mx-auto max-w-5xl px-6 py-24">
      <Link href="/espace-entreprise" className="font-body text-sm text-white/50 hover:text-white">
        ← Retour à mon espace
      </Link>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-4xl">Recrutement</h1>
        <select value={editionId} onChange={(e) => setEditionId(e.target.value)} className="input w-auto">
          {editions.map((ed) => (
            <option key={ed.id} value={ed.id}>
              {competitionsMap[ed.competition_id] ?? "Compétition"} — {ed.nom}
            </option>
          ))}
        </select>
      </div>

      <div className={`mt-4 inline-block rounded-full border px-4 py-2 font-body text-sm ${complet ? "border-orange text-orange" : "border-lime text-lime"}`}>
        {effectifActuel} / {ROSTER_MAX} joueurs dans l'effectif
      </div>
      {complet && (
        <p className="mt-2 font-body text-xs text-white/50">
          Effectif complet — libérez une place (transfert sortant) pour recruter davantage.
        </p>
      )}

      {/* Candidatures spontanées de joueurs */}
      {candidaturesRecues.length > 0 && (
        <section className="mt-10 rounded-2xl border border-lime/40 bg-panel p-6">
          <p className="font-display text-lg text-lime">Candidatures spontanées reçues</p>
          <div className="mt-4 space-y-3">
            {candidaturesRecues.map((c) => (
              <div key={c.id} className="rounded-lg border border-line px-4 py-3">
                <p className="font-body text-sm font-semibold">{candidaturesPlayersMap[c.player_id] ?? "Joueur"}</p>
                {c.conditions && <p className="mt-1 font-body text-xs text-white/60">{c.conditions}</p>}
                <div className="mt-3 flex gap-2">
                  <button onClick={() => handleAcceptCandidature(c)} className="rounded-full bg-lime px-4 py-2 font-body text-xs font-semibold text-ink">
                    Accepter
                  </button>
                  <button onClick={() => handleRefuseCandidature(c.id)} className="rounded-full border border-white/20 px-4 py-2 font-body text-xs text-white/70">
                    Refuser
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Offres reçues sur mes joueurs */}
      {offresRecues.length > 0 && (
        <section className="mt-10 rounded-2xl border border-orange/40 bg-panel p-6">
          <p className="font-display text-lg text-orange">Offres de transfert sur vos joueurs</p>
          <div className="mt-4 space-y-3">
            {offresRecues.map((o) => (
              <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line px-4 py-3">
                <p className="font-body text-sm">
                  {playersMap[o.player_id] ?? "Joueur"} — {o.duree_mois} mois, {o.budget_propose}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => handleApproveDepart(o.id)} className="rounded-full bg-lime px-4 py-2 font-body text-xs font-semibold text-ink">
                    Approuver le départ
                  </button>
                  <button onClick={() => handleRefuseDepart(o.id)} className="rounded-full border border-white/20 px-4 py-2 font-body text-xs text-white/70">
                    Refuser
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Formulaire d'offre */}
      {formPlayerId && (
        <section className="mt-10 rounded-2xl border border-lime bg-panel p-6">
          <p className="font-display text-lg text-lime">
            {formType === "transfert" ? "Négocier un transfert" : "Proposition de recrutement"}
          </p>
          <form onSubmit={handleSubmitOffer} className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <label className="font-body text-xs text-white/60">Durée (mois)</label>
              <input type="number" min={1} value={dureeMois} onChange={(e) => setDureeMois(Number(e.target.value))} className="input mt-1" />
            </div>
            <div className="sm:col-span-2">
              <label className="font-body text-xs text-white/60">Budget proposé</label>
              <input placeholder="ex: 150 000 FCFA / mois" value={budgetPropose} onChange={(e) => setBudgetPropose(e.target.value)} className="input mt-1" />
            </div>
            <div className="sm:col-span-3">
              <label className="font-body text-xs text-white/60">Conditions complémentaires</label>
              <textarea rows={3} value={conditions} onChange={(e) => setConditions(e.target.value)} className="input mt-1" />
            </div>
            <div className="sm:col-span-3 flex gap-3">
              <button type="submit" disabled={submitting} className="rounded-full bg-orange px-6 py-3 font-body text-sm font-semibold text-ink hover:bg-lime disabled:opacity-50">
                Envoyer la proposition
              </button>
              <button type="button" onClick={() => setFormPlayerId(null)} className="rounded-full border border-white/20 px-6 py-3 font-body text-sm text-white/70">
                Annuler
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Joueurs libres */}
      <section className="mt-10">
        <p className="font-display text-lg text-lime">Joueurs libres</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {joueursLibres.map((p) => (
            <PlayerScoutCard
              key={p.id}
              player={p}
              badge="Libre"
              badgeColor="text-lime border-lime"
              actionLabel="Recruter"
              disabled={complet}
              onAction={() => openForm(p.id, "recrutement_libre")}
              inShortlist={shortlistIds.has(p.id)}
              onToggleShortlist={() => handleToggleShortlist(p.id)}
            />
          ))}
          {joueursLibres.length === 0 && <p className="font-body text-sm text-white/40">Aucun joueur libre pour le moment.</p>}
        </div>
      </section>

      {/* Joueurs recrutés ailleurs */}
      <section className="mt-10">
        <p className="font-display text-lg text-orange">Joueurs déjà recrutés</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {joueursRecrutes.map((p) => (
            <PlayerScoutCard
              key={p.id}
              player={p}
              badge={`Recruté — ${p.currentCompanyNom ?? "?"}`}
              badgeColor="text-orange border-orange"
              actionLabel="Négocier transfert"
              disabled={complet}
              onAction={() => openForm(p.id, "transfert", p.currentCompanyId)}
              inShortlist={shortlistIds.has(p.id)}
              onToggleShortlist={() => handleToggleShortlist(p.id)}
            />
          ))}
          {joueursRecrutes.length === 0 && <p className="font-body text-sm text-white/40">Aucun joueur recruté ailleurs pour le moment.</p>}
        </div>
      </section>

      {/* Mes offres envoyées */}
      {mesOffres.length > 0 && (
        <section className="mt-10">
          <p className="font-display text-lg text-lime">Vos propositions envoyées</p>
          <div className="mt-4 space-y-2">
            {mesOffres.map((o) => (
              <div key={o.id} className="flex items-center justify-between rounded-lg border border-line px-4 py-3 font-body text-sm">
                <span>{playersMap[o.player_id] ?? "Joueur"} — {o.type === "transfert" ? "Transfert" : "Recrutement"}</span>
                <span className="text-xs text-lime">{offerStatutLabel[o.statut] ?? o.statut}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function PlayerScoutCard({
  player,
  badge,
  badgeColor,
  actionLabel,
  disabled,
  onAction,
  inShortlist,
  onToggleShortlist,
}: {
  player: PlayerRow;
  badge: string;
  badgeColor: string;
  actionLabel: string;
  disabled: boolean;
  onAction: () => void;
  inShortlist: boolean;
  onToggleShortlist: () => void;
}) {
  return (
    <div className="rounded-2xl border border-line bg-panel p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {player.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={player.photo_url} alt={player.pseudo} className="h-12 w-12 rounded-full object-cover" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ink font-display text-orange">
              {player.pseudo.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-body font-semibold">{player.pseudo}</p>
            <p className="font-body text-xs text-white/50">{player.ville}</p>
            {player.comportement_signale && (
              <p className="mt-1 font-body text-[11px] text-orange">⚠ Comportement signalé</p>
            )}
            <div className="mt-2">
              <SocialLinks reseaux={player.reseaux_sociaux} />
            </div>
            <Link
              href={`/espace-entreprise/messages?player=${player.id}`}
              className="mt-2 inline-block font-body text-xs text-orange hover:underline"
            >
              💬 Contacter
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onToggleShortlist} aria-label="Shortlist" className="text-lg">
            {inShortlist ? "★" : "☆"}
          </button>
          <p className="font-display text-2xl text-lime">{player.overall}</p>
        </div>
      </div>
      <span className={`mt-3 inline-block rounded-full border px-2 py-0.5 font-body text-[11px] ${badgeColor}`}>{badge}</span>
      <div className="mt-4 flex gap-2">
        <Link href={`/joueurs/${player.id}`} className="flex-1 rounded-full border border-white/20 px-3 py-2 text-center font-body text-xs hover:border-white/50">
          Voir plus de stats
        </Link>
        <button
          onClick={onAction}
          disabled={disabled}
          className="flex-1 rounded-full bg-orange px-3 py-2 font-body text-xs font-semibold text-ink hover:bg-lime disabled:opacity-40"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}

export default function RecrutementEntreprisePage() {
  return (
    <Suspense fallback={<div className="px-6 py-24 text-center font-body text-white/50">Chargement…</div>}>
      <RecrutementEntrepriseContent />
    </Suspense>
  );
}
