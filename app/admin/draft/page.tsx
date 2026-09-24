"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { notify, getUserIdFromPlayerId, getUserIdsFromCompanyId } from "@/lib/notify";
import { logAction } from "@/lib/auditLog";

type Competition = { id: string; nom: string };
type DraftEdition = {
  id: string;
  nom: string;
  date_draft: string | null;
  nb_tours: number | null;
  statut: string;
  edition_id: string;
};
type Company = { id: string; nom: string; statut: string };
type OrderRow = { id: string; company_id: string; position: number; effectif_recherche: number };
type Pick = {
  id: string;
  company_id: string;
  player_id: string;
  statut: string;
  tour: number;
};
type Player = { id: string; pseudo: string; statut: string };

const draftStatutLabel: Record<string, string> = {
  preparation: "En préparation",
  en_cours: "En cours",
  suspendue: "Suspendue",
  terminee: "Terminée",
  annulee: "Annulée",
};

const pickStatutLabel: Record<string, string> = {
  selection_provisoire: "Sélection provisoire",
  en_attente_reponse_joueur: "En attente du joueur",
  acceptee_par_joueur: "Acceptée par le joueur",
  en_attente_confirmation_entreprise: "En attente entreprise",
  en_attente_validation_gcesport: "À valider par GC ESPORT",
  affectation_confirmee: "Affectation confirmée",
  refusee: "Refusée",
  annulee: "Annulée",
  expiree: "Expirée",
};

export default function AdminDraftPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState(false);

  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [draftEditions, setDraftEditions] = useState<DraftEdition[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);

  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [orderRows, setOrderRows] = useState<OrderRow[]>([]);
  const [picks, setPicks] = useState<Pick[]>([]);

  // Formulaire nouvelle édition de Draft
  const [competitionId, setCompetitionId] = useState("");
  const [nomDraft, setNomDraft] = useState("");
  const [dateDraft, setDateDraft] = useState("");
  const [nbTours, setNbTours] = useState(3);

  // Formulaire ajout entreprise à l'ordre
  const [companyToAdd, setCompanyToAdd] = useState("");
  const [effectif, setEffectif] = useState(3);

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

      const adminRoles = ["super_admin", "admin", "responsable_competitions", "responsable_joueurs"];
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
    const { data: comps } = await supabase.from("competitions").select("id, nom");
    setCompetitions(comps ?? []);

    const { data: drafts } = await supabase
      .from("draft_editions")
      .select("id, nom, date_draft, nb_tours, statut, edition_id")
      .order("created_at", { ascending: false });
    setDraftEditions(drafts ?? []);

    const { data: comps2 } = await supabase
      .from("companies")
      .select("id, nom, statut")
      .eq("statut", "participante_confirmee");
    setCompanies(comps2 ?? []);

    const { data: pls } = await supabase
      .from("player_profiles")
      .select("id, pseudo, statut")
      .in("statut", ["profil_verifie", "eligible_draft"]);
    setPlayers(pls ?? []);
  }

  async function loadDraftDetail(draftId: string) {
    setSelectedDraftId(draftId);
    const { data: order } = await supabase
      .from("draft_order")
      .select("id, company_id, position, effectif_recherche")
      .eq("draft_edition_id", draftId)
      .order("position", { ascending: true });
    setOrderRows(order ?? []);

    const { data: picksData } = await supabase
      .from("draft_picks")
      .select("id, company_id, player_id, statut, tour")
      .eq("draft_edition_id", draftId)
      .order("created_at", { ascending: false });
    setPicks(picksData ?? []);
  }

  async function handleCreateDraft(e: React.FormEvent) {
    e.preventDefault();
    if (!competitionId) return;

    let { data: existingEdition } = await supabase
      .from("editions")
      .select("id")
      .eq("competition_id", competitionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let editionId = existingEdition?.id;

    if (!editionId) {
      const { data: newEdition } = await supabase
        .from("editions")
        .insert({
          competition_id: competitionId,
          nom: "Édition " + new Date().getFullYear(),
          statut: "preparation",
        })
        .select()
        .single();
      editionId = newEdition?.id;
    }

    if (!editionId) return;

    await supabase.from("draft_editions").insert({
      edition_id: editionId,
      nom: nomDraft,
      date_draft: dateDraft || null,
      nb_tours: nbTours,
      ordre_methode: "classement_inverse",
      statut: "preparation",
    });

    setNomDraft("");
    setDateDraft("");
    await loadAll();
  }

  async function handleAddCompanyToOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDraftId || !companyToAdd) return;

    const nextPosition = orderRows.length > 0 ? Math.max(...orderRows.map((o) => o.position)) + 1 : 1;

    await supabase.from("draft_order").insert({
      draft_edition_id: selectedDraftId,
      company_id: companyToAdd,
      position: nextPosition,
      effectif_recherche: effectif,
    });

    setCompanyToAdd("");
    await loadDraftDetail(selectedDraftId);
  }

  async function handleStartDraft(draftId: string) {
    await supabase.from("draft_editions").update({ statut: "en_cours" }).eq("id", draftId);
    await loadAll();
    await loadDraftDetail(draftId);
  }

  async function handleChangeDraftStatut(draftId: string, statut: string) {
    await supabase.from("draft_editions").update({ statut }).eq("id", draftId);
    await loadAll();
    if (selectedDraftId === draftId) await loadDraftDetail(draftId);
  }

  async function handleUpdateEffectif(orderRowId: string, effectif: number) {
    await supabase.from("draft_order").update({ effectif_recherche: effectif }).eq("id", orderRowId);
    if (selectedDraftId) await loadDraftDetail(selectedDraftId);
  }

  async function handleRemoveFromOrder(orderRowId: string) {
    if (!confirm("Retirer cette entreprise de l'ordre de sélection ?")) return;
    const { error } = await supabase.from("draft_order").delete().eq("id", orderRowId);
    if (error) {
      alert("Erreur : " + error.message);
      return;
    }
    if (selectedDraftId) await loadDraftDetail(selectedDraftId);
  }

  async function handleAnnulerPick(pickId: string) {
    if (!confirm("Annuler cette sélection ? Le joueur redeviendra disponible.")) return;
    await supabase.from("draft_picks").update({ statut: "annulee" }).eq("id", pickId);
    if (selectedDraftId) await loadDraftDetail(selectedDraftId);
  }

  async function handlePromoteEligible(playerId: string) {
    await supabase.from("player_profiles").update({ statut: "eligible_draft" }).eq("id", playerId);
    await loadAll();
  }

  async function handleValidateAffectation(pick: Pick) {
    if (!selectedDraftId) return;
    const draft = draftEditions.find((d) => d.id === selectedDraftId);
    if (!draft) return;

    let { data: team } = await supabase
      .from("teams")
      .select("id")
      .eq("edition_id", draft.edition_id)
      .eq("company_id", pick.company_id)
      .maybeSingle();

    let teamId = team?.id;

    if (teamId) {
      const { count } = await supabase
        .from("team_assignments")
        .select("*", { count: "exact", head: true })
        .eq("team_id", teamId);
      if ((count ?? 0) >= 5) {
        alert("Effectif complet (5 joueurs max) pour cette entreprise sur cette édition.");
        return;
      }
    }

    if (!teamId) {
      const company = companies.find((c) => c.id === pick.company_id);
      const { data: newTeam } = await supabase
        .from("teams")
        .insert({
          edition_id: draft.edition_id,
          company_id: pick.company_id,
          nom: (company?.nom ?? "Équipe") + " Esports",
        })
        .select()
        .single();
      teamId = newTeam?.id;
    }

    if (!teamId) return;

    await supabase.from("team_assignments").insert({
      team_id: teamId,
      player_id: pick.player_id,
      titulaire: true,
    });

    await supabase.from("draft_picks").update({ statut: "affectation_confirmee" }).eq("id", pick.id);
    await logAction(userId, "validation_affectation_draft", "draft_picks", pick.id, {
      player_id: pick.player_id,
      company_id: pick.company_id,
    });

    const playerUserId = await getUserIdFromPlayerId(pick.player_id);
    await notify(playerUserId, "Affectation confirmée", "Ton affectation au Draft a été validée par GC ESPORT.");
    const companyUserIds = await getUserIdsFromCompanyId(pick.company_id);
    for (const uid of companyUserIds) {
      await notify(uid, "Affectation confirmée", "Votre sélection au Draft a été validée par GC ESPORT.");
    }

    await loadDraftDetail(selectedDraftId);
  }

  function companyNom(id: string) {
    return companies.find((c) => c.id === id)?.nom ?? "—";
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

  const eligiblesEnAttente = players.filter((p) => p.statut === "profil_verifie");
  const eligiblesDraft = players.filter((p) => p.statut === "eligible_draft");

  return (
    <div className="mx-auto max-w-5xl px-6 py-24">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl">Draft</h1>
        <Link href="/admin" className="font-body text-sm text-white/50 hover:text-white">
          ← Retour à l'admin
        </Link>
      </div>

      {/* Créer une édition de Draft */}
      <section className="mt-10 rounded-2xl border border-line bg-panel p-6">
        <p className="font-display text-lg text-lime">Créer une édition du Draft</p>
        <form onSubmit={handleCreateDraft} className="mt-4 grid gap-4 sm:grid-cols-2">
          <select value={competitionId} onChange={(e) => setCompetitionId(e.target.value)} className="input" required>
            <option value="">— Compétition —</option>
            {competitions.map((c) => (
              <option key={c.id} value={c.id}>{c.nom}</option>
            ))}
          </select>
          <input
            placeholder="Nom du Draft (ex: Draft Saison 1)"
            value={nomDraft}
            onChange={(e) => setNomDraft(e.target.value)}
            className="input"
            required
          />
          <input type="date" value={dateDraft} onChange={(e) => setDateDraft(e.target.value)} className="input" />
          <input
            type="number"
            min={1}
            value={nbTours}
            onChange={(e) => setNbTours(Number(e.target.value))}
            className="input"
            placeholder="Nombre de tours"
          />
          <button type="submit" className="sm:col-span-2 rounded-full bg-orange px-6 py-3 font-body text-sm font-semibold text-ink hover:bg-lime">
            Créer
          </button>
        </form>
      </section>

      {/* Éligibilité */}
      <section className="mt-8 rounded-2xl border border-line bg-panel p-6">
        <p className="font-display text-lg text-lime">Éligibilité au Draft</p>
        <p className="mt-1 font-body text-xs text-white/50">
          {eligiblesEnAttente.length} joueur(s) vérifié(s) en attente de promotion · {eligiblesDraft.length} déjà éligible(s)
        </p>
        <div className="mt-4 space-y-2">
          {eligiblesEnAttente.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-lg border border-line px-4 py-2">
              <span className="font-body text-sm">{p.pseudo}</span>
              <button
                onClick={() => handlePromoteEligible(p.id)}
                className="rounded-full bg-lime px-3 py-1 font-body text-xs font-semibold text-ink"
              >
                Rendre éligible
              </button>
            </div>
          ))}
          {eligiblesEnAttente.length === 0 && (
            <p className="font-body text-sm text-white/40">Aucun joueur en attente.</p>
          )}
        </div>
      </section>

      {/* Liste des éditions de Draft */}
      <section className="mt-8">
        <p className="font-display text-lg text-lime">Éditions du Draft</p>
        <div className="mt-4 space-y-3">
          {draftEditions.map((d) => (
            <div key={d.id} className="rounded-2xl border border-line bg-panel p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-body font-semibold">{d.nom}</p>
                  <p className="font-body text-xs text-white/50">
                    {draftStatutLabel[d.statut] ?? d.statut}
                    {d.date_draft ? " · " + d.date_draft : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => loadDraftDetail(d.id)}
                    className="rounded-full border border-white/20 px-4 py-2 font-body text-xs hover:border-white/50"
                  >
                    Gérer
                  </button>
                  {d.statut === "preparation" && (
                    <button
                      onClick={() => handleStartDraft(d.id)}
                      className="rounded-full bg-orange px-4 py-2 font-body text-xs font-semibold text-ink hover:bg-lime"
                    >
                      Démarrer
                    </button>
                  )}
                  <select
                    value={d.statut}
                    onChange={(e) => handleChangeDraftStatut(d.id, e.target.value)}
                    className="input w-auto py-2 text-xs"
                  >
                    {Object.entries(draftStatutLabel).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedDraftId === d.id && (
                <div className="mt-6 space-y-6 border-t border-line pt-6">
                  {/* Ordre de sélection */}
                  <div>
                    <p className="font-body text-sm font-semibold text-white/80">Ordre de sélection</p>
                    <div className="mt-3 space-y-2">
                      {orderRows.map((o) => (
                        <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line px-4 py-2 font-body text-sm">
                          <span>#{o.position} — {companyNom(o.company_id)}</span>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={2}
                              max={5}
                              defaultValue={o.effectif_recherche}
                              onBlur={(e) => {
                                const v = Number(e.target.value);
                                if (v !== o.effectif_recherche) handleUpdateEffectif(o.id, v);
                              }}
                              className="input w-16 py-1 text-center text-xs"
                            />
                            <span className="text-xs text-white/40">recherchés</span>
                            <button
                              onClick={() => handleRemoveFromOrder(o.id)}
                              className="rounded-full border border-white/20 px-2 py-1 text-xs text-white/50 hover:border-orange hover:text-orange"
                            >
                              Retirer
                            </button>
                          </div>
                        </div>
                      ))}
                      {orderRows.length === 0 && <p className="font-body text-sm text-white/40">Aucune entreprise ajoutée.</p>}
                    </div>
                    <form onSubmit={handleAddCompanyToOrder} className="mt-3 flex flex-wrap gap-3">
                      <select value={companyToAdd} onChange={(e) => setCompanyToAdd(e.target.value)} className="input flex-1" required>
                        <option value="">— Entreprise —</option>
                        {companies
                          .filter((c) => !orderRows.some((o) => o.company_id === c.id))
                          .map((c) => (
                            <option key={c.id} value={c.id}>{c.nom}</option>
                          ))}
                      </select>
                      <input
                        type="number"
                        min={2}
                        max={5}
                        value={effectif}
                        onChange={(e) => setEffectif(Number(e.target.value))}
                        className="input w-32"
                      />
                      <button type="submit" className="rounded-full bg-lime px-4 py-2 font-body text-xs font-semibold text-ink">
                        Ajouter
                      </button>
                    </form>
                  </div>

                  {/* Picks */}
                  <div>
                    <p className="font-body text-sm font-semibold text-white/80">Sélections</p>
                    <div className="mt-3 space-y-2">
                      {picks.map((p) => (
                        <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line px-4 py-2 font-body text-sm">
                          <span>
                            {companyNom(p.company_id)} → {playerPseudo(p.player_id)}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-lime">{pickStatutLabel[p.statut] ?? p.statut}</span>
                            {p.statut === "en_attente_validation_gcesport" && (
                              <button
                                onClick={() => handleValidateAffectation(p)}
                                className="rounded-full bg-orange px-3 py-1 text-xs font-semibold text-ink"
                              >
                                Valider l'affectation
                              </button>
                            )}
                            {p.statut !== "annulee" && (
                              <button
                                onClick={() => handleAnnulerPick(p.id)}
                                className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/50 hover:border-orange hover:text-orange"
                              >
                                Annuler
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      {picks.length === 0 && <p className="font-body text-sm text-white/40">Aucune sélection pour le moment.</p>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          {draftEditions.length === 0 && (
            <p className="font-body text-sm text-white/40">Aucune édition de Draft créée pour le moment.</p>
          )}
        </div>
      </section>
    </div>
  );
}
