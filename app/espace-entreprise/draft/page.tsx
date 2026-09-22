"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type OrderRow = { company_id: string; position: number; effectif_recherche: number };
type Pick = { id: string; company_id: string; player_id: string; statut: string };
type Player = { id: string; pseudo: string; niveau_declare: string | null };

const pickStatutLabel: Record<string, string> = {
  en_attente_reponse_joueur: "En attente du joueur",
  acceptee_par_joueur: "Acceptée par le joueur",
  en_attente_validation_gcesport: "En attente de validation GC ESPORT",
  affectation_confirmee: "Affectation confirmée",
  refusee: "Refusée par le joueur",
};

export default function EntrepriseDraftPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [myCompanyId, setMyCompanyId] = useState<string | null>(null);
  const [draftEditionId, setDraftEditionId] = useState<string | null>(null);
  const [draftNom, setDraftNom] = useState("");
  const [order, setOrder] = useState<OrderRow[]>([]);
  const [activePicks, setActivePicks] = useState<Pick[]>([]);
  const [myPicks, setMyPicks] = useState<Pick[]>([]);
  const [companiesMap, setCompaniesMap] = useState<Record<string, string>>({});
  const [eligiblePlayers, setEligiblePlayers] = useState<Player[]>([]);
  const [playersMap, setPlayersMap] = useState<Record<string, string>>({});
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      router.push("/connexion");
      return;
    }
    const userId = sessionData.session.user.id;

    const { data: rep } = await supabase
      .from("company_reps")
      .select("company_id")
      .eq("user_id", userId)
      .single();

    if (!rep) {
      setLoading(false);
      return;
    }
    setMyCompanyId(rep.company_id);

    const { data: myOrderRow } = await supabase
      .from("draft_order")
      .select("draft_edition_id")
      .eq("company_id", rep.company_id);

    if (!myOrderRow || myOrderRow.length === 0) {
      setLoading(false);
      return;
    }

    const draftIds = myOrderRow.map((r) => r.draft_edition_id);
    const { data: activeDraft } = await supabase
      .from("draft_editions")
      .select("id, nom")
      .in("id", draftIds)
      .eq("statut", "en_cours")
      .maybeSingle();

    if (!activeDraft) {
      setLoading(false);
      return;
    }
    setDraftEditionId(activeDraft.id);
    setDraftNom(activeDraft.nom);

    const { data: orderData } = await supabase
      .from("draft_order")
      .select("company_id, position, effectif_recherche")
      .eq("draft_edition_id", activeDraft.id)
      .order("position", { ascending: true });
    setOrder(orderData ?? []);

    const companyIds = (orderData ?? []).map((o) => o.company_id);
    const { data: companiesData } = await supabase.from("companies").select("id, nom").in("id", companyIds);
    const map: Record<string, string> = {};
    (companiesData ?? []).forEach((c) => (map[c.id] = c.nom));
    setCompaniesMap(map);

    const { data: picksData } = await supabase
      .from("draft_picks")
      .select("id, company_id, player_id, statut")
      .eq("draft_edition_id", activeDraft.id)
      .not("statut", "in", "(refusee,annulee)");
    setActivePicks(picksData ?? []);
    setMyPicks((picksData ?? []).filter((p) => p.company_id === rep.company_id));

    const pickedPlayerIds = (picksData ?? []).map((p) => p.player_id);
    const { data: eligibleData } = await supabase
      .from("player_profiles")
      .select("id, pseudo, niveau_declare")
      .eq("statut", "eligible_draft");
    setEligiblePlayers((eligibleData ?? []).filter((p) => !pickedPlayerIds.includes(p.id)));

    const allInvolvedIds = Array.from(new Set([...(eligibleData ?? []).map((p) => p.id), ...pickedPlayerIds]));
    if (allInvolvedIds.length > 0) {
      const { data: allPlayers } = await supabase
        .from("player_profiles")
        .select("id, pseudo")
        .in("id", allInvolvedIds);
      const pMap: Record<string, string> = {};
      (allPlayers ?? []).forEach((p) => (pMap[p.id] = p.pseudo));
      setPlayersMap(pMap);
    }

    setLoading(false);
  }

  async function handlePick(playerId: string) {
    if (!draftEditionId || !myCompanyId) return;
    setPicking(true);
    await supabase.from("draft_picks").insert({
      draft_edition_id: draftEditionId,
      company_id: myCompanyId,
      player_id: playerId,
      tour: myPicks.length + 1,
      statut: "en_attente_reponse_joueur",
    });
    setPicking(false);
    await load();
  }

  if (loading) return <div className="px-6 py-24 text-center font-body text-white/50">Chargement…</div>;

  if (!draftEditionId) {
    return (
      <div className="mx-auto max-w-lg px-6 py-32 text-center">
        <h1 className="font-display text-3xl text-lime">Aucun Draft en cours</h1>
        <p className="mt-4 font-body text-white/60">
          Reviens ici quand une édition du Draft à laquelle vous participez sera lancée.
        </p>
      </div>
    );
  }

  // Détermine à qui c'est le tour : le moins de picks actifs, puis position
  const picksCountByCompany: Record<string, number> = {};
  order.forEach((o) => (picksCountByCompany[o.company_id] = 0));
  activePicks.forEach((p) => {
    picksCountByCompany[p.company_id] = (picksCountByCompany[p.company_id] ?? 0) + 1;
  });

  const remaining = order
    .filter((o) => (picksCountByCompany[o.company_id] ?? 0) < o.effectif_recherche)
    .sort((a, b) => {
      const diff = (picksCountByCompany[a.company_id] ?? 0) - (picksCountByCompany[b.company_id] ?? 0);
      return diff !== 0 ? diff : a.position - b.position;
    });

  const whoseTurn = remaining[0]?.company_id;
  const isMyTurn = whoseTurn === myCompanyId;
  const draftTermine = remaining.length === 0;

  return (
    <div className="mx-auto max-w-4xl px-6 py-24">
      <h1 className="font-display text-4xl">{draftNom}</h1>

      {draftTermine ? (
        <p className="mt-6 font-body text-lime">Le Draft est terminé — tous les effectifs sont complets.</p>
      ) : (
        <div className="mt-6 rounded-2xl border border-line bg-panel p-6">
          {isMyTurn ? (
            <p className="font-body text-lime">C'est votre tour de sélectionner un joueur.</p>
          ) : (
            <p className="font-body text-white/70">
              En attente — c'est au tour de <span className="text-lime">{companiesMap[whoseTurn] ?? "…"}</span>.
            </p>
          )}
        </div>
      )}

      {isMyTurn && !draftTermine && (
        <section className="mt-8">
          <p className="font-display text-lg text-lime">Joueurs éligibles</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {eligiblePlayers.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-2xl border border-line bg-panel p-5">
                <div>
                  <p className="font-body font-semibold">{p.pseudo}</p>
                  {p.niveau_declare && <p className="font-body text-xs text-white/50">{p.niveau_declare}</p>}
                </div>
                <button
                  disabled={picking}
                  onClick={() => handlePick(p.id)}
                  className="rounded-full bg-orange px-4 py-2 font-body text-xs font-semibold text-ink hover:bg-lime disabled:opacity-50"
                >
                  Sélectionner
                </button>
              </div>
            ))}
            {eligiblePlayers.length === 0 && (
              <p className="font-body text-sm text-white/40">Aucun joueur éligible disponible.</p>
            )}
          </div>
        </section>
      )}

      <section className="mt-10">
        <p className="font-display text-lg text-lime">Vos sélections</p>
        <div className="mt-4 space-y-2">
          {myPicks.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-lg border border-line px-4 py-3 font-body text-sm">
              <span>{playersMap[p.player_id] ?? "Joueur"}</span>
              <span className="text-xs text-lime">{pickStatutLabel[p.statut] ?? p.statut}</span>
            </div>
          ))}
          {myPicks.length === 0 && <p className="font-body text-sm text-white/40">Aucune sélection pour le moment.</p>}
        </div>
      </section>
    </div>
  );
}
