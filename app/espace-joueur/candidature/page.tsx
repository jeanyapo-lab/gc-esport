"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { notify, getUserIdsFromCompanyId } from "@/lib/notify";

type Company = { id: string; nom: string; secteur_activite: string | null; logo_url: string | null };
type Edition = { id: string; nom: string; competition_id: string };
type Competition = { id: string; nom: string };
type Candidature = { id: string; company_id: string; statut: string };

export default function CandidaturePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [playerId, setPlayerId] = useState<string | null>(null);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [editions, setEditions] = useState<Edition[]>([]);
  const [competitionsMap, setCompetitionsMap] = useState<Record<string, string>>({});
  const [mesCandidatures, setMesCandidatures] = useState<Candidature[]>([]);

  const [companyId, setCompanyId] = useState("");
  const [editionId, setEditionId] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      router.push("/connexion");
      return;
    }

    const { data: player } = await supabase.from("player_profiles").select("id").eq("user_id", sessionData.session.user.id).single();
    if (!player) {
      setLoading(false);
      return;
    }
    setPlayerId(player.id);

    const { data: companiesData } = await supabase
      .from("companies")
      .select("id, nom, secteur_activite, logo_url")
      .eq("statut", "participante_confirmee");
    setCompanies(companiesData ?? []);

    const { data: editionsData } = await supabase.from("editions").select("id, nom, competition_id");
    setEditions(editionsData ?? []);
    const compIds = Array.from(new Set((editionsData ?? []).map((e) => e.competition_id)));
    if (compIds.length > 0) {
      const { data: compsData } = await supabase.from("competitions").select("id, nom").in("id", compIds);
      const map: Record<string, string> = {};
      (compsData ?? []).forEach((c) => (map[c.id] = c.nom));
      setCompetitionsMap(map);
    }

    const { data: candidaturesData } = await supabase
      .from("recruitment_offers")
      .select("id, company_id, statut")
      .eq("player_id", player.id)
      .eq("statut", "en_attente_confirmation_entreprise");
    setMesCandidatures(candidaturesData ?? []);

    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!playerId || !companyId || !editionId) return;
    setSending(true);

    await supabase.from("recruitment_offers").insert({
      type: "recrutement_libre",
      player_id: playerId,
      company_id: companyId,
      edition_id: editionId,
      statut: "en_attente_confirmation_entreprise",
      conditions: message || null,
    });

    const userIds = await getUserIdsFromCompanyId(companyId);
    for (const uid of userIds) {
      await notify(uid, "Nouvelle candidature", "Un joueur a soumis une candidature spontanée.");
    }

    setCompanyId("");
    setMessage("");
    setSending(false);
    await load();
  }

  const companiesDejaContactees = new Set(mesCandidatures.map((c) => c.company_id));

  if (loading) return <div className="px-6 py-24 text-center font-body text-white/50">Chargement…</div>;

  return (
    <div className="mx-auto max-w-2xl px-6 py-24">
      <Link href="/espace-joueur" className="font-body text-sm text-white/50 hover:text-white">← Retour à mon espace</Link>
      <h1 className="mt-4 font-display text-4xl">Candidature spontanée</h1>
      <p className="mt-3 font-body text-sm text-white/60">
        Propose-toi directement à une entreprise confirmée — pas besoin d'attendre le Draft ou une proposition.
      </p>

      <form onSubmit={handleSubmit} className="mt-10 space-y-4">
        <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="input" required>
          <option value="">— Choisir une entreprise —</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id} disabled={companiesDejaContactees.has(c.id)}>
              {c.nom} {companiesDejaContactees.has(c.id) ? "(déjà contactée)" : ""}
            </option>
          ))}
        </select>
        <select value={editionId} onChange={(e) => setEditionId(e.target.value)} className="input" required>
          <option value="">— Choisir une édition —</option>
          {editions.map((ed) => (
            <option key={ed.id} value={ed.id}>
              {competitionsMap[ed.competition_id] ?? "Compétition"} — {ed.nom}
            </option>
          ))}
        </select>
        <textarea
          placeholder="Un mot sur toi, ta motivation..."
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="input"
        />
        <button type="submit" disabled={sending} className="rounded-full bg-orange px-6 py-3 font-body text-sm font-semibold text-ink hover:bg-lime disabled:opacity-50">
          {sending ? "Envoi…" : "Envoyer ma candidature"}
        </button>
      </form>

      {mesCandidatures.length > 0 && (
        <section className="mt-10">
          <p className="font-display text-lg text-lime">Candidatures en attente</p>
          <div className="mt-4 space-y-2">
            {mesCandidatures.map((c) => (
              <div key={c.id} className="rounded-lg border border-line px-4 py-3 font-body text-sm">
                {companies.find((co) => co.id === c.company_id)?.nom ?? "Entreprise"} — en attente de réponse
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
