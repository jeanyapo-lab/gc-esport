"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Player = {
  id: string;
  pseudo: string;
  ville: string | null;
  statut: string;
  created_at: string;
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
  const [tab, setTab] = useState<"joueurs" | "entreprises">("joueurs");

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
      await loadData();
      setChecking(false);
    }
    init();
  }, [router]);

  async function loadData() {
    const { data: playersData } = await supabase
      .from("player_profiles")
      .select("id, pseudo, ville, statut, created_at")
      .order("created_at", { ascending: false });
    setPlayers(playersData ?? []);

    const { data: companiesData } = await supabase
      .from("companies")
      .select("id, nom, secteur_activite, statut, created_at")
      .order("created_at", { ascending: false });
    setCompanies(companiesData ?? []);
  }

  async function updatePlayerStatut(player: Player, nouveauStatut: string) {
    await supabase.from("player_profiles").update({ statut: nouveauStatut }).eq("id", player.id);
    await supabase.from("player_status_history").insert({
      player_id: player.id,
      ancien_statut: player.statut,
      nouveau_statut: nouveauStatut,
      change_par: userId,
    });
    await loadData();
  }

  async function updateCompanyStatut(company: Company, nouveauStatut: string) {
    await supabase.from("companies").update({ statut: nouveauStatut }).eq("id", company.id);
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">Administration</h1>
          <p className="mt-3 font-body text-sm text-white/60">
            Validation des profils joueurs et des entreprises.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/admin/draft"
            className="rounded-full bg-orange px-6 py-3 font-body text-sm font-semibold text-ink hover:bg-lime"
          >
            Gérer le Draft →
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

      <div className="mt-10 flex gap-4 border-b border-line">
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
                <p className="font-body font-semibold">{p.pseudo}</p>
                <p className="font-body text-sm text-white/50">{p.ville || "Ville non renseignée"}</p>
                <p className="mt-1 font-body text-xs text-lime">
                  {playerStatutLabel[p.statut] ?? p.statut}
                </p>
              </div>
              <div className="flex gap-2">
                {p.statut !== "profil_verifie" && (
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
                <p className="font-body font-semibold">{c.nom}</p>
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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
