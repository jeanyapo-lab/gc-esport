"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getPlayerStatsSummaries, getPlayerCardStats, type StatsSummary, type CardStats } from "@/lib/playerStats";
import { notify, getUserIdsFromCompanyId } from "@/lib/notify";
import { downloadCSV } from "@/lib/csv";
import { logAction } from "@/lib/auditLog";
import { getLastViewed } from "@/lib/adminViews";

type Player = {
  id: string;
  pseudo: string;
  ville: string | null;
  statut: string;
  created_at: string;
  user_id: string;
};

type Company = {
  id: string;
  nom: string;
  secteur_activite: string | null;
  statut: string;
  created_at: string;
};

const playerStatutLabel: Record<string, string> = {
  inscription_incomplete: "Inscription incomplète",
  en_attente_verification: "En attente de vérification",
  profil_verifie: "Profil vérifié",
  en_attente_evaluation: "En attente d'évaluation",
  eligible_draft: "Éligible au Draft",
  non_eligible: "Non éligible",
  suspendu: "Suspendu",
  retire: "Retiré",
};

const companyStatutLabel: Record<string, string> = {
  prospect: "Prospect",
  demande_recue: "Demande reçue",
  en_discussion: "En discussion",
  engagement_en_attente: "Engagement en attente",
  participante_confirmee: "Participante confirmée",
  retiree: "Retirée",
  suspendue: "Suspendue",
};

export default function AdminPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [statsMap, setStatsMap] = useState<Record<string, StatsSummary>>({});
  const [cardStatsMap, setCardStatsMap] = useState<Record<string, CardStats>>({});
  const [tab, setTab] = useState<"joueurs" | "entreprises">("joueurs");

  const [indicateurs, setIndicateurs] = useState({
    selectionsEnAttente: 0,
    affectationsConfirmees: 0,
    equipesConstituees: 0,
    competitionsEnCours: 0,
  });
  const [badges, setBadges] = useState({ messages: 0, recrutement: 0, engagements: 0, signalements: 0, sondages: 0, ruptures: 0 });

  useEffect(() => {
    async function init() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.push("/connexion");
        return;
      }

      const uid = sessionData.session.user.id;
      setUserId(uid);

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", uid)
        .single();

      const adminRoles = [
        "super_admin",
        "admin",
        "responsable_joueurs",
        "responsable_partenariats",
        "responsable_competitions",
        "responsable_communication",
      ];

      if (!profile || !adminRoles.includes(profile.role)) {
        setAuthorized(false);
        setChecking(false);
        return;
      }

      setAuthorized(true);
      await loadData(uid);
      setChecking(false);
    }
    init();
  }, [router]);

  async function loadData(uidParam?: string) {
    const uid = uidParam ?? userId;
    const { data: playersData } = await supabase
      .from("player_profiles")
      .select("id, pseudo, ville, statut, created_at, user_id")
      .order("created_at", { ascending: false });
    setPlayers(playersData ?? []);

    const stats = await getPlayerStatsSummaries((playersData ?? []).map((p) => p.id));
    setStatsMap(stats);

    const cardStatsEntries = await Promise.all(
      (playersData ?? []).map(async (p) => [p.id, await getPlayerCardStats(p.id)] as const)
    );
    setCardStatsMap(Object.fromEntries(cardStatsEntries));

    const { data: companiesData } = await supabase
      .from("companies")
      .select("id, nom, secteur_activite, statut, created_at")
      .order("created_at", { ascending: false });
    setCompanies(companiesData ?? []);

    const [
      { count: selectionsEnAttente },
      { count: affectationsConfirmees },
      { count: equipesConstituees },
      { count: competitionsEnCours },
    ] = await Promise.all([
      supabase
        .from("draft_picks")
        .select("*", { count: "exact", head: true })
        .eq("statut", "en_attente_reponse_joueur"),
      supabase
        .from("draft_picks")
        .select("*", { count: "exact", head: true })
        .eq("statut", "affectation_confirmee"),
      supabase.from("teams").select("*", { count: "exact", head: true }),
      supabase
        .from("competitions")
        .select("*", { count: "exact", head: true })
        .in("statut", ["inscriptions_ouvertes", "en_cours"]),
    ]);

    setIndicateurs({
      selectionsEnAttente: selectionsEnAttente ?? 0,
      affectationsConfirmees: affectationsConfirmees ?? 0,
      equipesConstituees: equipesConstituees ?? 0,
      competitionsEnCours: competitionsEnCours ?? 0,
    });

    const [{ count: messagesNonLus }, { count: recrutementBloques }, { data: engagementsEnAttente }, { count: signalementsEnAttente }, { data: pollsActifs }, { count: ruptureEnAttente }] = await Promise.all([
      supabase.from("contact_messages").select("*", { count: "exact", head: true }).eq("lu", false),
      supabase.from("recruitment_offers").select("*", { count: "exact", head: true }).eq("statut", "en_attente_validation_gcesport"),
      supabase.from("engagements").select("id").eq("statut", "en_attente_signature"),
      supabase.from("message_reports").select("*", { count: "exact", head: true }).eq("statut", "en_attente"),
      supabase.from("polls").select("id").eq("actif", true),
      supabase.from("contract_terminations").select("*", { count: "exact", head: true }).eq("statut", "en_attente_gcesport"),
    ]);

    let votesSondages = 0;
    const pollIds = (pollsActifs ?? []).map((p) => p.id);
    if (pollIds.length > 0) {
      const lastViewedSondages = await getLastViewed(uid ?? null, "sondages");
      const { count } = await supabase
        .from("poll_votes")
        .select("*", { count: "exact", head: true })
        .in("poll_id", pollIds)
        .gt("created_at", lastViewedSondages);
      votesSondages = count ?? 0;
    }

    // Parmi les engagements "en attente de signature", seuls ceux avec
    // un document réellement déposé ont besoin d'une action admin.
    let engagementsAvecDocument = 0;
    const engagementIds = (engagementsEnAttente ?? []).map((e) => e.id);
    if (engagementIds.length > 0) {
      const { data: docs } = await supabase.from("documents").select("engagement_id").in("engagement_id", engagementIds);
      engagementsAvecDocument = new Set((docs ?? []).map((d) => d.engagement_id)).size;
    }

    setBadges({
      messages: messagesNonLus ?? 0,
      recrutement: recrutementBloques ?? 0,
      engagements: engagementsAvecDocument,
      signalements: signalementsEnAttente ?? 0,
      sondages: votesSondages,
      ruptures: ruptureEnAttente ?? 0,
    });
  }

  async function updatePlayerStatut(player: Player, nouveauStatut: string) {
    await supabase.from("player_profiles").update({ statut: nouveauStatut }).eq("id", player.id);
    await supabase.from("player_status_history").insert({
      player_id: player.id,
      ancien_statut: player.statut,
      nouveau_statut: nouveauStatut,
      change_par: userId,
    });
    await notify(
      player.user_id,
      nouveauStatut === "profil_verifie" ? "Profil vérifié" : "Mise à jour de ton profil",
      nouveauStatut === "profil_verifie"
        ? "Ton profil a été vérifié par GC ESPORT."
        : `Le statut de ton profil est maintenant : ${playerStatutLabel[nouveauStatut] ?? nouveauStatut}.`
    );
    await loadData();
  }

  async function updateCompanyStatut(company: Company, nouveauStatut: string) {
    await supabase.from("companies").update({ statut: nouveauStatut }).eq("id", company.id);
    const userIds = await getUserIdsFromCompanyId(company.id);
    for (const uid of userIds) {
      await notify(
        uid,
        nouveauStatut === "participante_confirmee" ? "Participation confirmée" : "Mise à jour de votre statut",
        nouveauStatut === "participante_confirmee"
          ? "Votre entreprise est confirmée comme participante GC ESPORT."
          : `Le statut de votre entreprise est maintenant : ${nouveauStatut}.`
      );
    }
    await loadData();
  }

  async function handleDeletePlayer(player: Player) {
    if (!confirm(`Supprimer définitivement ${player.pseudo} ? Cette action est irréversible.`)) return;
    const { error } = await supabase.from("player_profiles").delete().eq("id", player.id);
    if (error) {
      alert(
        "Suppression impossible : ce joueur a un historique lié (matchs, Draft, engagements...). " +
          "Utilise plutôt \"Retirer\" pour désactiver son profil sans perdre les données."
      );
      return;
    }
    await logAction(userId, "suppression_joueur", "player_profiles", player.id, { pseudo: player.pseudo });
    await loadData();
  }

  async function handleDeleteCompany(company: Company) {
    if (!confirm(`Supprimer définitivement ${company.nom} ? Cette action est irréversible.`)) return;
    const { error } = await supabase.from("companies").delete().eq("id", company.id);
    if (error) {
      alert(
        "Suppression impossible : cette entreprise a un historique lié (équipes, Draft, engagements...). " +
          "Utilise plutôt \"Retirer\" pour la désactiver sans perdre les données."
      );
      return;
    }
    await logAction(userId, "suppression_entreprise", "companies", company.id, { nom: company.nom });
    await loadData();
  }

  if (checking) {
    return <div className="px-6 py-24 text-center font-body text-white/50">Chargement…</div>;
  }

  if (!authorized) {
    return (
      <div className="mx-auto max-w-lg px-6 py-32 text-center">
        <h1 className="font-display text-3xl text-orange">Accès refusé</h1>
        <p className="mt-4 font-body text-white/60">
          Cette page est réservée à l'équipe GC ESPORT.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-24">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">Administration</h1>
          <p className="mt-3 font-body text-sm text-white/60">
            Validation des profils joueurs et des entreprises.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/parametres" className="font-body text-sm text-white/50 hover:text-white">
            Paramètres
          </Link>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.push("/");
            }}
            className="font-body text-sm text-white/50 hover:text-white"
          >
            Se déconnecter
          </button>
        </div>
      </div>

      {/* Sections de gestion */}
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { href: "/admin/equipe-gc", label: "Équipe GC ESPORT", desc: "Le roster propre à l'association" },
          { href: "/admin/draft", label: "Draft", desc: "Éditions, ordre de sélection, validations" },
          { href: "/admin/championnat", label: "Championnat", desc: "Matchs, scores, classement (poules/ligue)" },
          { href: "/admin/bracket", label: "Bracket", desc: "Tableau à élimination directe" },
          { href: "/admin/combine", label: "Combine", desc: "Sessions d'évaluation des joueurs" },
          { href: "/admin/recrutement", label: "Recrutement", desc: "Recrutements libres et transferts", badge: badges.recrutement },
          { href: "/admin/ruptures", label: "Ruptures de contrat", desc: "Arbitrage entreprise ↔ joueur", badge: badges.ruptures },
          { href: "/admin/engagements", label: "Engagements", desc: "Documents et consentements", badge: badges.engagements },
          { href: "/admin/competitions", label: "Compétitions", desc: "Jeux, compétitions, éditions" },
          { href: "/admin/partenaires", label: "Partenaires", desc: "Sponsors de GC ESPORT" },
          { href: "/admin/actualites", label: "Actualités", desc: "Articles publiés sur le site" },
          { href: "/admin/sondages", label: "Sondages", desc: "Fan Zone", badge: badges.sondages },
          { href: "/admin/utilisateurs", label: "Utilisateurs", desc: "Rôles et permissions admin" },
          { href: "/admin/audit", label: "Journal d'audit", desc: "Actions sensibles enregistrées" },
          { href: "/admin/messages", label: "Messages", desc: "Messages reçus via le formulaire de contact", badge: badges.messages },
          { href: "/admin/signalements", label: "Signalements", desc: "Messages signalés entre joueurs et entreprises", badge: badges.signalements },
        ].map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="relative rounded-2xl border border-line bg-panel p-5 transition hover:border-orange"
          >
            {!!s.badge && (
              <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-orange px-1.5 font-body text-xs font-bold text-ink">
                {s.badge}
              </span>
            )}
            <p className="font-display text-lg">{s.label}</p>
            <p className="mt-1 font-body text-xs text-white/50">{s.desc}</p>
          </Link>
        ))}
      </div>

      {/* Indicateurs */}
      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Joueurs inscrits" value={players.length} />
        <StatCard
          label="Profils vérifiés"
          value={players.filter((p) => p.statut === "profil_verifie" || p.statut === "eligible_draft").length}
        />
        <StatCard label="Éligibles au Draft" value={players.filter((p) => p.statut === "eligible_draft").length} />
        <StatCard label="Entreprises inscrites" value={companies.length} />
        <StatCard
          label="Entreprises confirmées"
          value={companies.filter((c) => c.statut === "participante_confirmee").length}
        />
        <StatCard label="Sélections en attente" value={indicateurs.selectionsEnAttente} />
        <StatCard label="Affectations confirmées" value={indicateurs.affectationsConfirmees} />
        <StatCard label="Équipes constituées" value={indicateurs.equipesConstituees} />
        <StatCard label="Compétitions en cours" value={indicateurs.competitionsEnCours} />
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-b border-line">
        <div className="flex gap-4">
          <button
            onClick={() => setTab("joueurs")}
            className={`px-4 py-3 font-body text-sm font-semibold ${
              tab === "joueurs" ? "border-b-2 border-orange text-white" : "text-white/50"
            }`}
          >
            Joueurs ({players.length})
          </button>
          <button
            onClick={() => setTab("entreprises")}
            className={`px-4 py-3 font-body text-sm font-semibold ${
              tab === "entreprises" ? "border-b-2 border-orange text-white" : "text-white/50"
            }`}
          >
            Entreprises ({companies.length})
          </button>
        </div>
        <button
          onClick={() =>
            tab === "joueurs"
              ? downloadCSV(
                  "joueurs-gc-esport.csv",
                  players.map((p) => ({ pseudo: p.pseudo, ville: p.ville, statut: p.statut }))
                )
              : downloadCSV(
                  "entreprises-gc-esport.csv",
                  companies.map((c) => ({ nom: c.nom, secteur: c.secteur_activite, statut: c.statut }))
                )
          }
          className="mb-2 rounded-full border border-white/20 px-4 py-2 font-body text-xs text-white/60 hover:border-white/50"
        >
          Exporter en CSV
        </button>
      </div>

      {tab === "joueurs" && (
        <div className="mt-8 space-y-4">
          {players.length === 0 && (
            <p className="font-body text-white/50">Aucun joueur inscrit pour le moment.</p>
          )}
          {players.map((p) => (
            <div
              key={p.id}
              className="flex flex-col gap-4 rounded-2xl border border-line bg-panel p-6 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <Link href={`/admin/joueurs/${p.id}`} className="font-body font-semibold hover:text-orange hover:underline">
                  {p.pseudo}
                </Link>
                <p className="font-body text-sm text-white/50">{p.ville || "Ville non renseignée"}</p>
                <p className="mt-1 font-body text-xs text-lime">
                  {playerStatutLabel[p.statut] ?? p.statut}
                </p>
                {statsMap[p.id]?.matchsJoues > 0 && (
                  <p className="mt-1 font-body text-xs text-white/40">
                    {statsMap[p.id].matchsJoues} matchs · {statsMap[p.id].victoires}V {statsMap[p.id].nuls}N{" "}
                    {statsMap[p.id].defaites}D
                  </p>
                )}
                {cardStatsMap[p.id] && (
                  <p className="mt-1 font-body text-[11px] text-white/30">
                    ATT {cardStatsMap[p.id].attaque} · DEF {cardStatsMap[p.id].defense} · TEC{" "}
                    {cardStatsMap[p.id].technique} · VIS {cardStatsMap[p.id].vision} · REG{" "}
                    {cardStatsMap[p.id].regularite}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                {!["profil_verifie", "eligible_draft"].includes(p.statut) && (
                  <button
                    onClick={() => updatePlayerStatut(p, "profil_verifie")}
                    className="rounded-full bg-lime px-4 py-2 font-body text-xs font-semibold text-ink hover:opacity-90"
                  >
                    Valider
                  </button>
                )}
                {p.statut !== "non_eligible" && (
                  <button
                    onClick={() => updatePlayerStatut(p, "non_eligible")}
                    className="rounded-full border border-white/20 px-4 py-2 font-body text-xs text-white/70 hover:border-white/50"
                  >
                    Refuser
                  </button>
                )}
                {p.statut !== "retire" && (
                  <button
                    onClick={() => updatePlayerStatut(p, "retire")}
                    className="rounded-full border border-white/20 px-4 py-2 font-body text-xs text-white/50 hover:border-white/50"
                  >
                    Retirer
                  </button>
                )}
                <button
                  onClick={() => handleDeletePlayer(p)}
                  className="rounded-full border border-white/10 px-4 py-2 font-body text-xs text-white/30 hover:border-orange hover:text-orange"
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "entreprises" && (
        <div className="mt-8 space-y-4">
          {companies.length === 0 && (
            <p className="font-body text-white/50">Aucune entreprise inscrite pour le moment.</p>
          )}
          {companies.map((c) => (
            <div
              key={c.id}
              className="flex flex-col gap-4 rounded-2xl border border-line bg-panel p-6 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <Link href={`/admin/entreprises/${c.id}`} className="font-body font-semibold hover:text-orange hover:underline">
                  {c.nom}
                </Link>
                <p className="font-body text-sm text-white/50">
                  {c.secteur_activite || "Secteur non renseigné"}
                </p>
                <p className="mt-1 font-body text-xs text-lime">
                  {companyStatutLabel[c.statut] ?? c.statut}
                </p>
              </div>
              <div className="flex gap-2">
                {c.statut !== "participante_confirmee" && (
                  <button
                    onClick={() => updateCompanyStatut(c, "participante_confirmee")}
                    className="rounded-full bg-lime px-4 py-2 font-body text-xs font-semibold text-ink hover:opacity-90"
                  >
                    Confirmer
                  </button>
                )}
                {c.statut !== "retiree" && (
                  <button
                    onClick={() => updateCompanyStatut(c, "retiree")}
                    className="rounded-full border border-white/20 px-4 py-2 font-body text-xs text-white/70 hover:border-white/50"
                  >
                    Refuser
                  </button>
                )}
                <button
                  onClick={() => handleDeleteCompany(c)}
                  className="rounded-full border border-white/10 px-4 py-2 font-body text-xs text-white/30 hover:border-orange hover:text-orange"
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-line bg-panel p-5">
      <p className="font-display text-3xl text-orange">{value}</p>
      <p className="mt-1 font-body text-xs text-white/50">{label}</p>
    </div>
  );
}
