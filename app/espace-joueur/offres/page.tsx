"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { notify, getUserIdsFromCompanyId } from "@/lib/notify";
import { attemptFinalizeOffer } from "@/lib/recruitment";

type Offer = {
  id: string;
  type: "recrutement_libre" | "transfert";
  company_id: string;
  ancienne_company_id: string | null;
  edition_id: string;
  player_id: string;
  statut: string;
  duree_mois: number | null;
  budget_propose: string | null;
  conditions: string | null;
};

export default function OffresJoueurPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<Offer[]>([]);
  const [autres, setAutres] = useState<Offer[]>([]);
  const [companiesMap, setCompaniesMap] = useState<Record<string, string>>({});
  const [acting, setActing] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [blocageMsg, setBlocageMsg] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      router.push("/connexion");
      return;
    }

    setUserId(sessionData.session.user.id);

    const { data: player } = await supabase
      .from("player_profiles")
      .select("id")
      .eq("user_id", sessionData.session.user.id)
      .single();

    if (!player) {
      setLoading(false);
      return;
    }

    const { data: offers } = await supabase
      .from("recruitment_offers")
      .select("id, type, company_id, ancienne_company_id, edition_id, player_id, statut, duree_mois, budget_propose, conditions")
      .eq("player_id", player.id)
      .order("created_at", { ascending: false });

    setPending((offers ?? []).filter((o) => o.statut === "en_attente_reponse_joueur"));
    setAutres((offers ?? []).filter((o) => o.statut !== "en_attente_reponse_joueur"));

    const companyIds = Array.from(new Set((offers ?? []).map((o) => o.company_id)));
    if (companyIds.length > 0) {
      const { data: companiesData } = await supabase.from("companies").select("id, nom").in("id", companyIds);
      const map: Record<string, string> = {};
      (companiesData ?? []).forEach((c) => (map[c.id] = c.nom));
      setCompaniesMap(map);
    }

    setLoading(false);
  }

  async function handleRespond(offer: Offer, accepte: boolean) {
    setActing(offer.id);
    setBlocageMsg(null);

    if (!accepte) {
      await supabase.from("recruitment_offers").update({ statut: "refusee_joueur" }).eq("id", offer.id);
      const userIds = await getUserIdsFromCompanyId(offer.company_id);
      for (const uid of userIds) {
        await notify(uid, "Proposition refusée", "Le joueur a refusé votre proposition.");
      }
      setActing(null);
      await load();
      return;
    }

    if (offer.type === "transfert") {
      // Il faut encore l'accord de l'ancienne entreprise avant de finaliser
      await supabase.from("recruitment_offers").update({ statut: "en_attente_ancienne_entreprise" }).eq("id", offer.id);
      const userIds = await getUserIdsFromCompanyId(offer.company_id);
      for (const uid of userIds) {
        await notify(uid, "Proposition acceptée", "Le joueur a accepté — en attente de l'accord de son entreprise actuelle.");
      }
    } else {
      // Recrutement libre : rien d'autre à attendre, on finalise tout de suite
      const result = await attemptFinalizeOffer(offer, userId);
      if (!result.finalise) setBlocageMsg(result.raison ?? "En attente de résolution par GC ESPORT.");
    }

    setActing(null);
    await load();
  }

  if (loading) return <div className="px-6 py-24 text-center font-body text-white/50">Chargement…</div>;

  return (
    <div className="mx-auto max-w-2xl px-6 py-24">
      <Link href="/espace-joueur" className="font-body text-sm text-white/50 hover:text-white">
        ← Retour à mon espace
      </Link>
      <h1 className="mt-4 font-display text-4xl">Propositions</h1>

      <section className="mt-10">
        <p className="font-display text-lg text-lime">En attente de ta réponse</p>
        {blocageMsg && (
          <p className="mt-3 rounded-lg border border-orange/40 bg-orange/10 px-4 py-3 font-body text-sm text-orange">
            {blocageMsg}
          </p>
        )}
        <div className="mt-4 space-y-4">
          {pending.map((o) => (
            <div key={o.id} className="rounded-2xl border border-line bg-panel p-6">
              <p className="font-body">
                <span className="text-lime">{companiesMap[o.company_id] ?? "Une entreprise"}</span> te propose un{" "}
                {o.type === "transfert" ? "transfert" : "recrutement"}.
              </p>
              <p className="mt-2 font-body text-sm text-white/60">
                Durée : {o.duree_mois} mois · Budget : {o.budget_propose || "non précisé"}
              </p>
              {o.conditions && <p className="mt-1 font-body text-xs text-white/50">{o.conditions}</p>}
              <div className="mt-4 flex gap-3">
                <button
                  disabled={acting === o.id}
                  onClick={() => handleRespond(o, true)}
                  className="rounded-full bg-lime px-5 py-2 font-body text-sm font-semibold text-ink disabled:opacity-50"
                >
                  Accepter
                </button>
                <button
                  disabled={acting === o.id}
                  onClick={() => handleRespond(o, false)}
                  className="rounded-full border border-white/20 px-5 py-2 font-body text-sm text-white/70 disabled:opacity-50"
                >
                  Refuser
                </button>
                <Link
                  href={`/espace-joueur/messages?company=${o.company_id}`}
                  className="rounded-full border border-white/20 px-5 py-2 font-body text-sm text-white/70 hover:border-white/50"
                >
                  💬 Discuter
                </Link>
              </div>
            </div>
          ))}
          {pending.length === 0 && <p className="font-body text-sm text-white/40">Aucune proposition en attente.</p>}
        </div>
      </section>

      {autres.length > 0 && (
        <section className="mt-10">
          <p className="font-display text-lg text-white/60">Historique</p>
          <div className="mt-4 space-y-2">
            {autres.map((o) => (
              <div key={o.id} className="flex items-center justify-between rounded-lg border border-line px-4 py-3 font-body text-sm">
                <span>{companiesMap[o.company_id] ?? "—"}</span>
                <span className="text-xs text-white/50">{o.statut}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
