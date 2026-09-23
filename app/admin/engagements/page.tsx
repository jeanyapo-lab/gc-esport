"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Engagement = {
  id: string;
  type_engagement: string;
  statut: string;
  player_id: string | null;
  company_id: string | null;
  date_emission: string | null;
  date_validation: string | null;
};
type Player = { id: string; pseudo: string };
type Company = { id: string; nom: string };
type Doc = { id: string; engagement_id: string; fichier_url: string; created_at: string };

const typeLabels: Record<string, string> = {
  reglement_competition: "Règlement de la compétition",
  charte_joueur: "Charte du joueur",
  engagement_entreprise: "Engagement de l'entreprise",
  accord_affectation: "Accord d'affectation joueur–entreprise",
  autorisation_image: "Autorisation de diffusion d'image",
  consentement_parental: "Consentement parental (mineur)",
  autre: "Autre document",
};

const statutLabels: Record<string, string> = {
  a_preparer: "À préparer",
  en_attente_signature: "En attente de signature",
  valide: "Validé",
  refuse: "Refusé",
  expire: "Expiré",
  annule: "Annulé",
};

export default function AdminEngagementsPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const [players, setPlayers] = useState<Player[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [docsByEngagement, setDocsByEngagement] = useState<Record<string, Doc[]>>({});

  const [cible, setCible] = useState<"joueur" | "entreprise">("joueur");
  const [cibleId, setCibleId] = useState("");
  const [type, setType] = useState("charte_joueur");

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

      const adminRoles = ["super_admin", "admin", "responsable_competitions", "responsable_partenariats", "responsable_joueurs"];
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
    const { data: playersData } = await supabase.from("player_profiles").select("id, pseudo");
    setPlayers(playersData ?? []);

    const { data: companiesData } = await supabase.from("companies").select("id, nom");
    setCompanies(companiesData ?? []);

    const { data: engagementsData } = await supabase
      .from("engagements")
      .select("id, type_engagement, statut, player_id, company_id, date_emission, date_validation")
      .order("date_emission", { ascending: false });
    setEngagements(engagementsData ?? []);

    const engagementIds = (engagementsData ?? []).map((e) => e.id);
    if (engagementIds.length > 0) {
      const { data: docsData } = await supabase
        .from("documents")
        .select("id, engagement_id, fichier_url, created_at")
        .in("engagement_id", engagementIds);
      const map: Record<string, Doc[]> = {};
      (docsData ?? []).forEach((d) => {
        map[d.engagement_id] = [...(map[d.engagement_id] ?? []), d];
      });
      setDocsByEngagement(map);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!cibleId) return;

    await supabase.from("engagements").insert({
      type_engagement: type,
      player_id: cible === "joueur" ? cibleId : null,
      company_id: cible === "entreprise" ? cibleId : null,
      statut: "en_attente_signature",
      date_emission: new Date().toISOString(),
    });

    setCibleId("");
    await loadAll();
  }

  async function handleUpdateStatut(id: string, statut: string) {
    await supabase
      .from("engagements")
      .update({ statut, date_validation: statut === "valide" ? new Date().toISOString() : null })
      .eq("id", id);
    await loadAll();
  }

  async function handleViewDoc(path: string) {
    const { data } = await supabase.storage.from("documents").createSignedUrl(path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  function cibleLabel(e: Engagement) {
    if (e.player_id) return players.find((p) => p.id === e.player_id)?.pseudo ?? "Joueur";
    if (e.company_id) return companies.find((c) => c.id === e.company_id)?.nom ?? "Entreprise";
    return "—";
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
        <h1 className="font-display text-4xl">Engagements & documents</h1>
        <Link href="/admin" className="font-body text-sm text-white/50 hover:text-white">
          ← Retour à l'admin
        </Link>
      </div>

      <section className="mt-10 rounded-2xl border border-line bg-panel p-6">
        <p className="font-display text-lg text-lime">Créer un engagement</p>
        <form onSubmit={handleCreate} className="mt-4 grid gap-4 sm:grid-cols-3">
          <select
            value={cible}
            onChange={(e) => {
              setCible(e.target.value as "joueur" | "entreprise");
              setCibleId("");
            }}
            className="input"
          >
            <option value="joueur">Joueur</option>
            <option value="entreprise">Entreprise</option>
          </select>
          <select value={cibleId} onChange={(e) => setCibleId(e.target.value)} className="input" required>
            <option value="">— Choisir —</option>
            {(cible === "joueur" ? players : companies).map((c) => (
              <option key={c.id} value={c.id}>
                {"pseudo" in c ? c.pseudo : c.nom}
              </option>
            ))}
          </select>
          <select value={type} onChange={(e) => setType(e.target.value)} className="input">
            {Object.entries(typeLabels).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="sm:col-span-3 rounded-full bg-orange px-6 py-3 font-body text-sm font-semibold text-ink hover:bg-lime"
          >
            Créer l'engagement
          </button>
        </form>
      </section>

      <section className="mt-8 space-y-3">
        {engagements.map((e) => {
          const docs = docsByEngagement[e.id] ?? [];
          return (
            <div key={e.id} className="rounded-2xl border border-line bg-panel p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-body font-semibold">{cibleLabel(e)}</p>
                  <p className="font-body text-xs text-white/50">{typeLabels[e.type_engagement] ?? e.type_engagement}</p>
                  <p className="mt-1 font-body text-xs text-lime">{statutLabels[e.statut] ?? e.statut}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {docs.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => handleViewDoc(d.fichier_url)}
                      className="rounded-full border border-white/20 px-3 py-1 font-body text-xs hover:border-white/50"
                    >
                      Voir le document
                    </button>
                  ))}
                  {docs.length === 0 && (
                    <span className="font-body text-xs text-white/30">Aucun document déposé</span>
                  )}
                  {e.statut !== "valide" && (
                    <button
                      onClick={() => handleUpdateStatut(e.id, "valide")}
                      className="rounded-full bg-lime px-3 py-1 font-body text-xs font-semibold text-ink"
                    >
                      Valider
                    </button>
                  )}
                  {e.statut !== "refuse" && (
                    <button
                      onClick={() => handleUpdateStatut(e.id, "refuse")}
                      className="rounded-full border border-white/20 px-3 py-1 font-body text-xs text-white/70 hover:border-white/50"
                    >
                      Refuser
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {engagements.length === 0 && (
          <p className="font-body text-sm text-white/40">Aucun engagement créé pour le moment.</p>
        )}
      </section>
    </div>
  );
}
