"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Engagement = { id: string; type_engagement: string; statut: string; template_url: string | null; motif_refus: string | null };
type Doc = { id: string; engagement_id: string; fichier_url: string };

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
  en_attente_signature: "En attente de votre document",
  valide: "Validé",
  refuse: "Refusé — à refaire",
  expire: "Expiré",
  annule: "Annulé",
};

export default function EntrepriseEngagementsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [docsByEngagement, setDocsByEngagement] = useState<Record<string, Doc[]>>({});
  const [uploadingId, setUploadingId] = useState<string | null>(null);

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

    const { data: rep } = await supabase
      .from("company_reps")
      .select("company_id")
      .eq("user_id", sessionData.session.user.id)
      .single();

    if (!rep) {
      setLoading(false);
      return;
    }

    const { data: engagementsData } = await supabase
      .from("engagements")
      .select("id, type_engagement, statut, template_url, motif_refus")
      .eq("company_id", rep.company_id)
      .order("date_emission", { ascending: false });
    setEngagements(engagementsData ?? []);

    const ids = (engagementsData ?? []).map((e) => e.id);
    if (ids.length > 0) {
      const { data: docsData } = await supabase
        .from("documents")
        .select("id, engagement_id, fichier_url")
        .in("engagement_id", ids);
      const map: Record<string, Doc[]> = {};
      (docsData ?? []).forEach((d) => {
        map[d.engagement_id] = [...(map[d.engagement_id] ?? []), d];
      });
      setDocsByEngagement(map);
    }

    setLoading(false);
  }

  async function handleUpload(engagementId: string, file: File) {
    if (!userId) return;
    setUploadingId(engagementId);

    const ext = file.name.split(".").pop();
    const path = `${userId}/${engagementId}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from("documents").upload(path, file);

    if (!uploadError) {
      await supabase.from("documents").insert({ engagement_id: engagementId, fichier_url: path });
      await supabase.from("engagements").update({ statut: "en_attente_signature", motif_refus: null }).eq("id", engagementId);
    }

    setUploadingId(null);
    await load();
  }

  if (loading) return <div className="px-6 py-24 text-center font-body text-white/50">Chargement…</div>;

  return (
    <div className="mx-auto max-w-2xl px-6 py-24">
      <Link href="/espace-entreprise" className="font-body text-sm text-white/50 hover:text-white">
        ← Retour à mon espace
      </Link>
      <h1 className="mt-4 font-display text-4xl">Nos engagements</h1>
      <p className="mt-3 font-body text-sm text-white/60">
        Documents à consulter et à signer pour participer aux compétitions GC ESPORT.
      </p>

      <div className="mt-10 space-y-4">
        {engagements.map((e) => {
          const docs = docsByEngagement[e.id] ?? [];
          return (
            <div key={e.id} className="rounded-2xl border border-line bg-panel p-6">
              <p className="font-body font-semibold">{typeLabels[e.type_engagement] ?? e.type_engagement}</p>
              <p className="mt-1 font-body text-xs text-lime">{statutLabels[e.statut] ?? e.statut}</p>

              {e.template_url && (
                <a
                  href={e.template_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block font-body text-xs text-orange hover:underline"
                >
                  Télécharger le modèle à signer →
                </a>
              )}

              {e.statut === "refuse" && e.motif_refus && (
                <p className="mt-3 rounded-lg border border-orange/40 bg-orange/10 px-4 py-3 font-body text-xs text-orange">
                  Motif du refus : {e.motif_refus}
                </p>
              )}

              {docs.length > 0 && e.statut !== "refuse" ? (
                <p className="mt-3 font-body text-xs text-white/50">
                  Document déposé — en attente de validation par GC ESPORT.
                </p>
              ) : (
                e.statut !== "valide" && (
                  <label className="mt-4 inline-block cursor-pointer rounded-full border border-white/20 px-5 py-2 font-body text-sm hover:border-white/50">
                    {uploadingId === e.id ? "Envoi…" : docs.length > 0 ? "Redéposer le document corrigé" : "Déposer le document signé"}
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      disabled={uploadingId === e.id}
                      onChange={(ev) => {
                        const file = ev.target.files?.[0];
                        if (file) handleUpload(e.id, file);
                      }}
                    />
                  </label>
                )
              )}
            </div>
          );
        })}
        {engagements.length === 0 && (
          <p className="font-body text-sm text-white/40">Aucun engagement pour le moment.</p>
        )}
      </div>
    </div>
  );
}
