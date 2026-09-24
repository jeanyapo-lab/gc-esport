"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type LogEntry = {
  id: string;
  user_id: string | null;
  action: string;
  entite: string | null;
  entite_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

const actionLabels: Record<string, string> = {
  suppression_joueur: "Suppression joueur",
  suppression_entreprise: "Suppression entreprise",
  suppression_competition: "Suppression compétition",
  suppression_edition: "Suppression édition",
  validation_affectation_draft: "Validation affectation Draft",
  validation_recrutement_libre: "Validation recrutement",
  validation_transfert: "Validation transfert",
  engagement_valide: "Engagement validé",
  engagement_refuse: "Engagement refusé",
};

export default function AdminAuditPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [filtreEntite, setFiltreEntite] = useState("");

  useEffect(() => {
    async function init() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.push("/connexion");
        return;
      }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", sessionData.session.user.id).single();
      const adminRoles = ["super_admin", "admin", "responsable_competitions", "responsable_joueurs", "responsable_partenariats"];
      if (!profile || !adminRoles.includes(profile.role)) {
        setAuthorized(false);
        setChecking(false);
        return;
      }
      setAuthorized(true);

      const { data } = await supabase
        .from("audit_log")
        .select("id, user_id, action, entite, entite_id, details, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      setEntries(data ?? []);

      setChecking(false);
    }
    init();
  }, [router]);

  if (checking) return <div className="px-6 py-24 text-center font-body text-white/50">Chargement…</div>;
  if (!authorized) return <div className="mx-auto max-w-lg px-6 py-32 text-center"><h1 className="font-display text-3xl text-orange">Accès refusé</h1></div>;

  const entites = Array.from(new Set(entries.map((e) => e.entite).filter(Boolean))) as string[];
  const filtered = filtreEntite ? entries.filter((e) => e.entite === filtreEntite) : entries;

  return (
    <div className="mx-auto max-w-4xl px-6 py-24">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl">Journal d'audit</h1>
        <Link href="/admin" className="font-body text-sm text-white/50 hover:text-white">← Retour à l'admin</Link>
      </div>
      <p className="mt-3 font-body text-sm text-white/60">
        Les 100 dernières actions sensibles enregistrées — suppressions, validations de recrutement, affectations Draft, engagements.
      </p>

      {entites.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            onClick={() => setFiltreEntite("")}
            className={`rounded-full px-4 py-2 font-body text-xs ${!filtreEntite ? "bg-lime text-ink" : "border border-white/20 text-white/60"}`}
          >
            Tout
          </button>
          {entites.map((e) => (
            <button
              key={e}
              onClick={() => setFiltreEntite(e)}
              className={`rounded-full px-4 py-2 font-body text-xs ${filtreEntite === e ? "bg-lime text-ink" : "border border-white/20 text-white/60"}`}
            >
              {e}
            </button>
          ))}
        </div>
      )}

      <div className="mt-8 space-y-2">
        {filtered.map((entry) => (
          <div key={entry.id} className="rounded-lg border border-line bg-panel px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="font-body text-sm font-semibold">{actionLabels[entry.action] ?? entry.action}</p>
              <p className="font-body text-xs text-white/40">
                {new Date(entry.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
              </p>
            </div>
            {entry.details && (
              <p className="mt-1 font-body text-xs text-white/50">{JSON.stringify(entry.details)}</p>
            )}
          </div>
        ))}
        {filtered.length === 0 && <p className="font-body text-sm text-white/40">Aucune action enregistrée pour le moment.</p>}
      </div>
    </div>
  );
}
