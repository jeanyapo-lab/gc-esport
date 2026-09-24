"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Company = {
  id: string;
  nom: string;
  secteur_activite: string | null;
  presentation: string | null;
  logo_url: string | null;
  contact_email: string | null;
  statut: string;
};
type Rep = { id: string; fonction: string | null };
type Team = { id: string; nom: string; edition_id: string };
type Engagement = { id: string; type_engagement: string; statut: string };
type DraftPick = { id: string; player_id: string; statut: string };

const statutLabel: Record<string, string> = {
  prospect: "Prospect",
  demande_recue: "Demande reçue",
  en_discussion: "En discussion",
  engagement_en_attente: "Engagement en attente",
  participante_confirmee: "Participante confirmée",
  retiree: "Retirée",
  suspendue: "Suspendue",
};

export default function AdminEntrepriseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const companyId = params.id as string;

  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const [company, setCompany] = useState<Company | null>(null);
  const [reps, setReps] = useState<Rep[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [draftPicks, setDraftPicks] = useState<DraftPick[]>([]);
  const [playersMap, setPlayersMap] = useState<Record<string, string>>({});
  const [teamAssignmentsCount, setTeamAssignmentsCount] = useState<Record<string, number>>({});

  useEffect(() => {
    async function init() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.push("/connexion");
        return;
      }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", sessionData.session.user.id).single();
      const adminRoles = ["super_admin", "admin", "responsable_partenariats", "responsable_competitions"];
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
  }, [router, companyId]);

  async function loadAll() {
    const { data: companyData } = await supabase
      .from("companies")
      .select("id, nom, secteur_activite, presentation, logo_url, contact_email, statut")
      .eq("id", companyId)
      .single();
    setCompany(companyData);

    const { data: repsData } = await supabase.from("company_reps").select("id, fonction").eq("company_id", companyId);
    setReps(repsData ?? []);

    const { data: teamsData } = await supabase.from("teams").select("id, nom, edition_id").eq("company_id", companyId);
    setTeams(teamsData ?? []);

    const teamIds = (teamsData ?? []).map((t) => t.id);
    if (teamIds.length > 0) {
      const { data: assignData } = await supabase.from("team_assignments").select("team_id, player_id").in("team_id", teamIds);
      const counts: Record<string, number> = {};
      (assignData ?? []).forEach((a) => (counts[a.team_id] = (counts[a.team_id] ?? 0) + 1));
      setTeamAssignmentsCount(counts);
    }

    const { data: engData } = await supabase.from("engagements").select("id, type_engagement, statut").eq("company_id", companyId);
    setEngagements(engData ?? []);

    const { data: picksData } = await supabase.from("draft_picks").select("id, player_id, statut").eq("company_id", companyId);
    setDraftPicks(picksData ?? []);

    const playerIds = Array.from(new Set((picksData ?? []).map((p) => p.player_id)));
    if (playerIds.length > 0) {
      const { data: playersData } = await supabase.from("player_profiles").select("id, pseudo").in("id", playerIds);
      const map: Record<string, string> = {};
      (playersData ?? []).forEach((p) => (map[p.id] = p.pseudo));
      setPlayersMap(map);
    }
  }

  async function handleUpdateStatut(statut: string) {
    if (!company) return;
    await supabase.from("companies").update({ statut }).eq("id", company.id);
    await loadAll();
  }

  if (checking) return <div className="px-6 py-24 text-center font-body text-white/50">Chargement…</div>;
  if (!authorized) return <div className="mx-auto max-w-lg px-6 py-32 text-center"><h1 className="font-display text-3xl text-orange">Accès refusé</h1></div>;
  if (!company) return <div className="mx-auto max-w-lg px-6 py-32 text-center font-body text-white/50">Entreprise introuvable.</div>;

  return (
    <div className="mx-auto max-w-3xl px-6 py-24">
      <Link href="/admin" className="font-body text-sm text-white/50 hover:text-white">← Retour à l'admin</Link>

      <div className="mt-6 flex items-center gap-5">
        {company.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={company.logo_url} alt={company.nom} className="h-20 w-20 rounded-lg object-cover" />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-panel font-display text-2xl text-orange">
            {company.nom.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="font-display text-3xl">{company.nom}</h1>
          <p className="font-body text-sm text-white/50">{company.secteur_activite || "Secteur non renseigné"}</p>
          <p className="mt-1 font-body text-xs text-lime">{statutLabel[company.statut] ?? company.statut}</p>
        </div>
      </div>

      {company.presentation && <p className="mt-6 font-body text-sm text-white/70">{company.presentation}</p>}
      {company.contact_email && <p className="mt-2 font-body text-xs text-white/40">{company.contact_email}</p>}

      <div className="mt-6 flex flex-wrap gap-2">
        {company.statut !== "participante_confirmee" && (
          <button onClick={() => handleUpdateStatut("participante_confirmee")} className="rounded-full bg-lime px-4 py-2 font-body text-xs font-semibold text-ink">
            Confirmer la participation
          </button>
        )}
        {company.statut !== "retiree" && (
          <button onClick={() => handleUpdateStatut("retiree")} className="rounded-full border border-white/20 px-4 py-2 font-body text-xs text-white/70">
            Retirer
          </button>
        )}
      </div>

      <section className="mt-8">
        <p className="font-display text-lg text-lime">Représentants ({reps.length})</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {reps.map((r) => (
            <span key={r.id} className="rounded-full border border-white/20 px-3 py-1 font-body text-xs">
              {r.fonction || "Représentant"}
            </span>
          ))}
          {reps.length === 0 && <p className="font-body text-sm text-white/40">Aucun représentant.</p>}
        </div>
      </section>

      {teams.length > 0 && (
        <section className="mt-8">
          <p className="font-display text-lg text-lime">Équipes</p>
          <div className="mt-3 space-y-2">
            {teams.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg border border-line px-4 py-3 font-body text-sm">
                <span>{t.nom}</span>
                <span className="text-xs text-white/50">{teamAssignmentsCount[t.id] ?? 0} joueur(s)</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {draftPicks.length > 0 && (
        <section className="mt-8">
          <p className="font-display text-lg text-lime">Historique Draft & recrutement</p>
          <div className="mt-3 space-y-2">
            {draftPicks.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-line px-4 py-3 font-body text-sm">
                <span>{playersMap[p.player_id] ?? "Joueur"}</span>
                <span className="text-xs text-white/50">{p.statut}</span>
              </div>
            ))}
          </div>
        </section>
      )}

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
