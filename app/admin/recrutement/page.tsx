"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const ROSTER_MAX = 5;

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
};

const statutLabel: Record<string, string> = {
  en_attente_reponse_joueur: "En attente du joueur",
  refusee_joueur: "Refusée par le joueur",
  en_attente_ancienne_entreprise: "En attente de l'ancienne entreprise",
  refusee_ancienne_entreprise: "Refusée par l'ancienne entreprise",
  en_attente_validation_gcesport: "À valider",
  validee: "Validée",
  annulee: "Annulée",
};

export default function AdminRecrutementPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const [offers, setOffers] = useState<Offer[]>([]);
  const [playersMap, setPlayersMap] = useState<Record<string, { pseudo: string; dateNaissance: string | null }>>({});
  const [companiesMap, setCompaniesMap] = useState<Record<string, string>>({});
  const [consentValide, setConsentValide] = useState<Record<string, boolean>>({});

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

      const adminRoles = ["super_admin", "admin", "responsable_competitions", "responsable_joueurs", "responsable_partenariats"];
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
    const { data: offersData } = await supabase
      .from("recruitment_offers")
      .select("id, type, player_id, company_id, ancienne_company_id, edition_id, statut, duree_mois, budget_propose")
      .order("created_at", { ascending: false });
    setOffers(offersData ?? []);

    const playerIds = Array.from(new Set((offersData ?? []).map((o) => o.player_id)));
    if (playerIds.length > 0) {
      const { data: pData } = await supabase.from("player_profiles").select("id, pseudo, date_naissance").in("id", playerIds);
      const pMap: Record<string, { pseudo: string; dateNaissance: string | null }> = {};
      (pData ?? []).forEach((p) => (pMap[p.id] = { pseudo: p.pseudo, dateNaissance: p.date_naissance }));
      setPlayersMap(pMap);

      const { data: consents } = await supabase
        .from("engagements")
        .select("player_id, statut")
        .eq("type_engagement", "consentement_parental")
        .in("player_id", playerIds);
      const cMap: Record<string, boolean> = {};
      (consents ?? []).forEach((c) => {
        if (c.statut === "valide") cMap[c.player_id] = true;
      });
      setConsentValide(cMap);
    }

    const companyIds = Array.from(
      new Set([...(offersData ?? []).map((o) => o.company_id), ...(offersData ?? []).map((o) => o.ancienne_company_id).filter(Boolean)])
    ) as string[];
    if (companyIds.length > 0) {
      const { data: cData } = await supabase.from("companies").select("id, nom").in("id", companyIds);
      const map: Record<string, string> = {};
      (cData ?? []).forEach((c) => (map[c.id] = c.nom));
      setCompaniesMap(map);
    }
  }

  function estMineur(playerId: string) {
    const dn = playersMap[playerId]?.dateNaissance;
    if (!dn) return false;
    const age = Math.floor((Date.now() - new Date(dn).getTime()) / (365.25 * 24 * 3600 * 1000));
    return age < 18;
  }

  async function handleCreerConsentement(playerId: string) {
    await supabase.from("engagements").insert({
      type_engagement: "consentement_parental",
      player_id: playerId,
      statut: "en_attente_signature",
      date_emission: new Date().toISOString(),
    });
    alert("Engagement de consentement parental créé — à faire déposer et valider via /admin/engagements.");
  }

  async function handleValider(offer: Offer) {
    // Vérifie le consentement parental si nécessaire
    if (estMineur(offer.player_id) && !consentValide[offer.player_id]) {
      alert("Ce joueur est mineur : le consentement parental doit être validé avant de finaliser cette offre.");
      return;
    }

    // Vérifie l'effectif de l'entreprise destinataire
    let { data: team } = await supabase
      .from("teams")
      .select("id")
      .eq("edition_id", offer.edition_id)
      .eq("company_id", offer.company_id)
      .maybeSingle();

    let teamId = team?.id;

    if (teamId) {
      const { count } = await supabase
        .from("team_assignments")
        .select("*", { count: "exact", head: true })
        .eq("team_id", teamId);
      if ((count ?? 0) >= ROSTER_MAX) {
        alert(`Effectif complet (${ROSTER_MAX} joueurs max) pour cette entreprise sur cette édition.`);
        return;
      }
    }

    if (!teamId) {
      const companyNom = companiesMap[offer.company_id] ?? "Équipe";
      const { data: newTeam } = await supabase
        .from("teams")
        .insert({ edition_id: offer.edition_id, company_id: offer.company_id, nom: companyNom + " Esports" })
        .select()
        .single();
      teamId = newTeam?.id;
    }
    if (!teamId) return;

    // Si transfert : retirer l'ancienne affectation
    if (offer.type === "transfert" && offer.ancienne_company_id) {
      const { data: oldTeam } = await supabase
        .from("teams")
        .select("id")
        .eq("edition_id", offer.edition_id)
        .eq("company_id", offer.ancienne_company_id)
        .maybeSingle();
      if (oldTeam) {
        await supabase.from("team_assignments").delete().eq("team_id", oldTeam.id).eq("player_id", offer.player_id);
      }
    }

    await supabase.from("team_assignments").insert({ team_id: teamId, player_id: offer.player_id, titulaire: true });
    await supabase.from("recruitment_offers").update({ statut: "validee" }).eq("id", offer.id);

    await loadAll();
  }

  async function handleRefuser(offerId: string) {
    await supabase.from("recruitment_offers").update({ statut: "annulee" }).eq("id", offerId);
    await loadAll();
  }

  if (checking) return <div className="px-6 py-24 text-center font-body text-white/50">Chargement…</div>;

  if (!authorized) {
    return (
      <div className="mx-auto max-w-lg px-6 py-32 text-center">
        <h1 className="font-display text-3xl text-orange">Accès refusé</h1>
      </div>
    );
  }

  const aValider = offers.filter((o) => o.statut === "en_attente_validation_gcesport");
  const enCours = offers.filter((o) => !["en_attente_validation_gcesport", "validee", "annulee", "refusee_joueur", "refusee_ancienne_entreprise"].includes(o.statut));
  const terminees = offers.filter((o) => ["validee", "annulee", "refusee_joueur", "refusee_ancienne_entreprise"].includes(o.statut));

  return (
    <div className="mx-auto max-w-5xl px-6 py-24">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl">Recrutement & transferts</h1>
        <Link href="/admin" className="font-body text-sm text-white/50 hover:text-white">
          ← Retour à l'admin
        </Link>
      </div>

      <section className="mt-10">
        <p className="font-display text-lg text-orange">À valider</p>
        <div className="mt-4 space-y-3">
          {aValider.map((o) => {
            const mineur = estMineur(o.player_id);
            const consentOk = consentValide[o.player_id];
            const bloque = mineur && !consentOk;
            return (
              <div key={o.id} className="rounded-2xl border border-line bg-panel p-6">
                <p className="font-body font-semibold">
                  {playersMap[o.player_id]?.pseudo ?? "Joueur"} → {companiesMap[o.company_id] ?? "Entreprise"}
                  {o.type === "transfert" && ` (depuis ${companiesMap[o.ancienne_company_id ?? ""] ?? "?"})`}
                </p>
                <p className="mt-1 font-body text-xs text-white/50">
                  {o.duree_mois} mois · {o.budget_propose || "budget non précisé"}
                </p>
                {mineur && (
                  <p className={`mt-2 font-body text-xs ${bloque ? "text-orange" : "text-lime"}`}>
                    {bloque
                      ? "⚠ Joueur mineur — consentement parental requis avant validation."
                      : "✓ Joueur mineur — consentement parental validé."}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => handleValider(o)}
                    disabled={bloque}
                    className="rounded-full bg-lime px-4 py-2 font-body text-xs font-semibold text-ink disabled:opacity-40"
                  >
                    Valider
                  </button>
                  <button onClick={() => handleRefuser(o.id)} className="rounded-full border border-white/20 px-4 py-2 font-body text-xs text-white/70">
                    Refuser
                  </button>
                  {mineur && !consentOk && (
                    <button
                      onClick={() => handleCreerConsentement(o.player_id)}
                      className="rounded-full border border-orange px-4 py-2 font-body text-xs text-orange"
                    >
                      Créer le consentement parental
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {aValider.length === 0 && <p className="font-body text-sm text-white/40">Rien à valider pour le moment.</p>}
        </div>
      </section>

      {enCours.length > 0 && (
        <section className="mt-10">
          <p className="font-display text-lg text-lime">En cours</p>
          <div className="mt-4 space-y-2">
            {enCours.map((o) => (
              <div key={o.id} className="flex items-center justify-between rounded-lg border border-line px-4 py-3 font-body text-sm">
                <span>{playersMap[o.player_id]?.pseudo ?? "Joueur"} → {companiesMap[o.company_id] ?? "—"}</span>
                <span className="text-xs text-white/50">{statutLabel[o.statut] ?? o.statut}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {terminees.length > 0 && (
        <section className="mt-10">
          <p className="font-display text-lg text-white/50">Historique</p>
          <div className="mt-4 space-y-2">
            {terminees.map((o) => (
              <div key={o.id} className="flex items-center justify-between rounded-lg border border-line px-4 py-3 font-body text-sm text-white/60">
                <span>{playersMap[o.player_id]?.pseudo ?? "Joueur"} → {companiesMap[o.company_id] ?? "—"}</span>
                <span className="text-xs">{statutLabel[o.statut] ?? o.statut}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
