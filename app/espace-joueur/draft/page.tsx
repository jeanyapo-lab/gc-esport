"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { notify, getUserIdsFromCompanyId } from "@/lib/notify";

type Pick = { id: string; company_id: string; statut: string };

export default function JoueurDraftPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [pending, setPending] = useState<Pick[]>([]);
  const [confirmed, setConfirmed] = useState<Pick[]>([]);
  const [companiesMap, setCompaniesMap] = useState<Record<string, string>>({});
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      router.push("/connexion");
      return;
    }

    const { data: player } = await supabase
      .from("player_profiles")
      .select("id")
      .eq("user_id", sessionData.session.user.id)
      .single();

    if (!player) {
      setLoading(false);
      return;
    }
    setPlayerId(player.id);

    const { data: picks } = await supabase
      .from("draft_picks")
      .select("id, company_id, statut")
      .eq("player_id", player.id);

    const pendingPicks = (picks ?? []).filter((p) => p.statut === "en_attente_reponse_joueur");
    const confirmedPicks = (picks ?? []).filter(
      (p) => p.statut === "affectation_confirmee" || p.statut === "en_attente_validation_gcesport" || p.statut === "acceptee_par_joueur"
    );
    setPending(pendingPicks);
    setConfirmed(confirmedPicks);

    const companyIds = (picks ?? []).map((p) => p.company_id);
    if (companyIds.length > 0) {
      const { data: companiesData } = await supabase.from("companies").select("id, nom").in("id", companyIds);
      const map: Record<string, string> = {};
      (companiesData ?? []).forEach((c) => (map[c.id] = c.nom));
      setCompaniesMap(map);
    }

    setLoading(false);
  }

  async function handleRespond(pickId: string, accepte: boolean) {
    setActing(pickId);
    const pick = pending.find((p) => p.id === pickId);
    await supabase
      .from("draft_picks")
      .update({ statut: accepte ? "en_attente_validation_gcesport" : "refusee" })
      .eq("id", pickId);

    if (pick) {
      const userIds = await getUserIdsFromCompanyId(pick.company_id);
      for (const uid of userIds) {
        await notify(
          uid,
          accepte ? "Sélection acceptée" : "Sélection refusée",
          accepte ? "Le joueur a accepté votre sélection au Draft." : "Le joueur a refusé votre sélection au Draft."
        );
      }
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
      <h1 className="mt-4 font-display text-4xl">Mon Draft</h1>

      <section className="mt-10">
        <p className="font-display text-lg text-lime">Sélections en attente de ta réponse</p>
        <div className="mt-4 space-y-4">
          {pending.map((p) => (
            <div key={p.id} className="rounded-2xl border border-line bg-panel p-6">
              <p className="font-body">
                <span className="text-lime">{companiesMap[p.company_id] ?? "Une entreprise"}</span> souhaite te
                sélectionner.
              </p>
              <div className="mt-4 flex gap-3">
                <button
                  disabled={acting === p.id}
                  onClick={() => handleRespond(p.id, true)}
                  className="rounded-full bg-lime px-5 py-2 font-body text-sm font-semibold text-ink disabled:opacity-50"
                >
                  Accepter
                </button>
                <button
                  disabled={acting === p.id}
                  onClick={() => handleRespond(p.id, false)}
                  className="rounded-full border border-white/20 px-5 py-2 font-body text-sm text-white/70 hover:border-white/50 disabled:opacity-50"
                >
                  Refuser
                </button>
              </div>
            </div>
          ))}
          {pending.length === 0 && (
            <p className="font-body text-sm text-white/40">Aucune sélection en attente pour le moment.</p>
          )}
        </div>
      </section>

      <section className="mt-10">
        <p className="font-display text-lg text-lime">Tes affectations</p>
        <div className="mt-4 space-y-2">
          {confirmed.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-lg border border-line px-4 py-3 font-body text-sm">
              <span>{companiesMap[p.company_id] ?? "—"}</span>
              <span className="text-xs text-lime">
                {p.statut === "affectation_confirmee" ? "Confirmée" : "En cours de validation"}
              </span>
            </div>
          ))}
          {confirmed.length === 0 && (
            <p className="font-body text-sm text-white/40">Aucune affectation pour le moment.</p>
          )}
        </div>
      </section>
    </div>
  );
}
