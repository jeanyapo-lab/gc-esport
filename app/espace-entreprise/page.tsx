"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Company = {
  nom: string;
  secteur_activite: string | null;
  statut: string;
};

const statutLabel: Record<string, string> = {
  prospect: "Prospect",
  demande_recue: "Demande reçue",
  en_discussion: "En discussion",
  engagement_en_attente: "Engagement en attente",
  participante_confirmee: "Participante confirmée",
  retiree: "Retirée",
  suspendue: "Suspendue",
};

export default function EspaceEntreprisePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<Company | null>(null);

  useEffect(() => {
    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.push("/connexion");
        return;
      }

      const { data: rep } = await supabase
        .from("company_reps")
        .select("company_id")
        .eq("user_id", sessionData.session.user.id)
        .single();

      if (rep) {
        const { data: companyData } = await supabase
          .from("companies")
          .select("nom, secteur_activite, statut")
          .eq("id", rep.company_id)
          .single();
        setCompany(companyData);
      }

      setLoading(false);
    }
    load();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  if (loading) {
    return <div className="px-6 py-24 text-center font-body text-white/50">Chargement…</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-24">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl">
          <span className="text-lime">{company?.nom}</span>
        </h1>
        <div className="flex items-center gap-4">
          <Link href="/parametres" className="font-body text-sm text-white/50 hover:text-white">
            Paramètres
          </Link>
          <button
            onClick={handleLogout}
            className="font-body text-sm text-white/50 hover:text-white"
          >
            Se déconnecter
          </button>
        </div>
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-line bg-panel p-6">
          <p className="font-body text-xs uppercase tracking-wide text-white/40">Statut</p>
          <p className="mt-2 font-body text-lg text-lime">
            {company ? statutLabel[company.statut] ?? company.statut : "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-panel p-6">
          <p className="font-body text-xs uppercase tracking-wide text-white/40">Secteur</p>
          <p className="mt-2 font-body text-lg">{company?.secteur_activite || "Non renseigné"}</p>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-line bg-panel p-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-body text-white/60">
          Votre entreprise est en statut « {company ? statutLabel[company.statut] ?? company.statut : "…"} ».
          Une fois votre participation validée par GC ESPORT, vous aurez accès
          au scouting des joueurs et à la participation au Draft.
        </p>
        <div className="flex flex-wrap shrink-0 gap-3">
          <Link
            href="/espace-entreprise/shortlist"
            className="rounded-full border border-white/20 px-6 py-3 text-center font-body text-sm font-semibold text-white transition hover:border-white/50"
          >
            Shortlist
          </Link>
          <Link
            href="/espace-entreprise/representants"
            className="rounded-full border border-white/20 px-6 py-3 text-center font-body text-sm font-semibold text-white transition hover:border-white/50"
          >
            Représentants
          </Link>
          <Link
            href="/espace-entreprise/recrutement"
            className="rounded-full bg-lime px-6 py-3 text-center font-body text-sm font-semibold text-ink transition hover:bg-orange"
          >
            Recrutement
          </Link>
          <Link
            href="/espace-entreprise/engagements"
            className="rounded-full border border-white/20 px-6 py-3 text-center font-body text-sm font-semibold text-white transition hover:border-white/50"
          >
            Nos engagements
          </Link>
          <Link
            href="/espace-entreprise/draft"
            className="rounded-full border border-lime px-6 py-3 text-center font-body text-sm font-semibold text-lime transition hover:bg-lime hover:text-ink"
          >
            Le Draft
          </Link>
          <Link
            href="/espace-entreprise/profil"
            className="rounded-full bg-orange px-6 py-3 text-center font-body text-sm font-semibold text-ink transition hover:bg-lime"
          >
            Compléter le profil
          </Link>
        </div>
      </div>
    </div>
  );
}
