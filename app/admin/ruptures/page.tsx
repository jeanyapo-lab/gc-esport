"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { notify, getUserIdFromPlayerId, getUserIdsFromCompanyId } from "@/lib/notify";
import { logAction } from "@/lib/auditLog";

type Termination = {
  id: string;
  team_id: string | null;
  player_id: string;
  company_id: string;
  edition_id: string;
  motif: string;
  justificatif_url: string | null;
  statut: string;
  created_at: string;
};
type Response = { id: string; termination_id: string; reponse: string; created_at: string };

const statutLabel: Record<string, string> = {
  en_attente_gcesport: "En attente d'arbitrage",
  validee: "Rupture validée",
  annulee: "Rupture annulée",
};

export default function AdminRupturesPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState(false);

  const [terminations, setTerminations] = useState<Termination[]>([]);
  const [responsesByTermination, setResponsesByTermination] = useState<Record<string, Response[]>>({});
  const [playersMap, setPlayersMap] = useState<Record<string, string>>({});
  const [companiesMap, setCompaniesMap] = useState<Record<string, string>>({});

  useEffect(() => {
    async function init() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.push("/connexion");
        return;
      }
      setUserId(sessionData.session.user.id);
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", sessionData.session.user.id).single();
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
    const { data: terminationsData } = await supabase
      .from("contract_terminations")
      .select("id, team_id, player_id, company_id, edition_id, motif, justificatif_url, statut, created_at")
      .order("created_at", { ascending: false });
    setTerminations(terminationsData ?? []);

    const ids = (terminationsData ?? []).map((t) => t.id);
    if (ids.length > 0) {
      const { data: responsesData } = await supabase
        .from("contract_termination_responses")
        .select("id, termination_id, reponse, created_at")
        .in("termination_id", ids);
      const map: Record<string, Response[]> = {};
      (responsesData ?? []).forEach((r) => {
        map[r.termination_id] = [...(map[r.termination_id] ?? []), r];
      });
      setResponsesByTermination(map);
    }

    const playerIds = Array.from(new Set((terminationsData ?? []).map((t) => t.player_id)));
    if (playerIds.length > 0) {
      const { data: pData } = await supabase.from("player_profiles").select("id, pseudo").in("id", playerIds);
      setPlayersMap(Object.fromEntries((pData ?? []).map((p) => [p.id, p.pseudo])));
    }

    const companyIds = Array.from(new Set((terminationsData ?? []).map((t) => t.company_id)));
    if (companyIds.length > 0) {
      const { data: cData } = await supabase.from("companies").select("id, nom").in("id", companyIds);
      setCompaniesMap(Object.fromEntries((cData ?? []).map((c) => [c.id, c.nom])));
    }
  }

  async function handleViewJustificatif(path: string) {
    const { data } = await supabase.storage.from("documents").createSignedUrl(path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  async function handleValider(t: Termination) {
    if (!confirm(`Confirmer la rupture du contrat de ${playersMap[t.player_id] ?? "ce joueur"} ? Il sera retiré de l'équipe.`)) return;

    if (t.team_id) {
      await supabase.from("team_assignments").delete().eq("team_id", t.team_id).eq("player_id", t.player_id);
    }

    await supabase
      .from("contract_terminations")
      .update({ statut: "validee", traite_par: userId, traite_date: new Date().toISOString() })
      .eq("id", t.id);

    await logAction(userId, "rupture_contrat_validee", "contract_terminations", t.id, {
      player_id: t.player_id,
      company_id: t.company_id,
    });

    const playerUserId = await getUserIdFromPlayerId(t.player_id);
    await notify(playerUserId, "Rupture de contrat validée", "GC ESPORT a validé la rupture de ton contrat. Tu n'es plus rattaché à cette entreprise.");
    const companyUserIds = await getUserIdsFromCompanyId(t.company_id);
    for (const uid of companyUserIds) {
      await notify(uid, "Rupture de contrat validée", "GC ESPORT a validé la rupture de contrat demandée.");
    }

    await loadAll();
  }

  async function handleAnnuler(t: Termination) {
    const motif = prompt("Pourquoi annules-tu cette demande de rupture ? (optionnel, sera transmis aux deux parties)") ?? "";

    await supabase
      .from("contract_terminations")
      .update({ statut: "annulee", traite_par: userId, traite_date: new Date().toISOString(), motif_annulation: motif || null })
      .eq("id", t.id);

    await logAction(userId, "rupture_contrat_annulee", "contract_terminations", t.id, {
      player_id: t.player_id,
      company_id: t.company_id,
    });

    const playerUserId = await getUserIdFromPlayerId(t.player_id);
    await notify(playerUserId, "Rupture de contrat annulée", "GC ESPORT n'a pas validé la demande de rupture — ton contrat continue.");
    const companyUserIds = await getUserIdsFromCompanyId(t.company_id);
    for (const uid of companyUserIds) {
      await notify(uid, "Rupture de contrat annulée", "GC ESPORT n'a pas validé votre demande de rupture.");
    }

    await loadAll();
  }

  if (checking) return <div className="px-6 py-24 text-center font-body text-white/50">Chargement…</div>;
  if (!authorized) return <div className="mx-auto max-w-lg px-6 py-32 text-center"><h1 className="font-display text-3xl text-orange">Accès refusé</h1></div>;

  const enAttente = terminations.filter((t) => t.statut === "en_attente_gcesport");
  const traitees = terminations.filter((t) => t.statut !== "en_attente_gcesport");

  return (
    <div className="mx-auto max-w-4xl px-6 py-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl">Ruptures de contrat</h1>
          <p className="mt-2 font-body text-sm text-white/60">
            Une entreprise qui souhaite rompre le contrat d'un joueur passe par ici. Le joueur peut apporter une
            réponse ; seul GC ESPORT valide ou annule la rupture.
          </p>
        </div>
        <Link href="/admin" className="font-body text-sm text-white/50 hover:text-white">← Retour à l'admin</Link>
      </div>

      <section className="mt-10">
        <p className="font-display text-lg text-orange">En attente d'arbitrage</p>
        <div className="mt-4 space-y-4">
          {enAttente.map((t) => (
            <div key={t.id} className="rounded-2xl border border-orange/40 bg-orange/5 p-6">
              <p className="font-body font-semibold">
                {companiesMap[t.company_id] ?? "Entreprise"} souhaite rompre le contrat de {playersMap[t.player_id] ?? "ce joueur"}
              </p>
              <p className="mt-1 font-body text-xs text-white/50">{new Date(t.created_at).toLocaleDateString("fr-FR")}</p>
              <p className="mt-3 font-body text-sm italic text-white/70">« {t.motif} »</p>
              {t.justificatif_url && (
                <button
                  onClick={() => handleViewJustificatif(t.justificatif_url as string)}
                  className="mt-3 rounded-full border border-white/20 px-3 py-1 font-body text-xs hover:border-white/50"
                >
                  Voir le justificatif
                </button>
              )}

              <div className="mt-4 border-t border-line pt-4">
                <p className="font-body text-xs font-semibold text-white/60">Droit de réponse du joueur</p>
                {(responsesByTermination[t.id] ?? []).length > 0 ? (
                  (responsesByTermination[t.id] ?? []).map((r) => (
                    <p key={r.id} className="mt-2 font-body text-sm text-white/80">« {r.reponse} »</p>
                  ))
                ) : (
                  <p className="mt-2 font-body text-xs text-white/40">Le joueur n'a pas encore répondu.</p>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => handleValider(t)}
                  className="rounded-full bg-orange px-4 py-2 font-body text-xs font-semibold text-ink hover:bg-lime"
                >
                  Valider la rupture
                </button>
                <button
                  onClick={() => handleAnnuler(t)}
                  className="rounded-full border border-white/20 px-4 py-2 font-body text-xs text-white/70 hover:border-white/50"
                >
                  Annuler la demande
                </button>
              </div>
            </div>
          ))}
          {enAttente.length === 0 && <p className="font-body text-sm text-white/40">Rien à arbitrer pour le moment.</p>}
        </div>
      </section>

      {traitees.length > 0 && (
        <section className="mt-10">
          <p className="font-display text-lg text-white/50">Historique</p>
          <div className="mt-4 space-y-2">
            {traitees.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg border border-line px-4 py-3 font-body text-sm text-white/60">
                <span>{companiesMap[t.company_id] ?? "—"} → {playersMap[t.player_id] ?? "—"}</span>
                <span className="text-xs">{statutLabel[t.statut] ?? t.statut}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
