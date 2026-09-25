"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getPlayerStatsSummary, getPlayerCardStats, type StatsSummary, type CardStats } from "@/lib/playerStats";
import PlayerCard from "@/components/PlayerCard";
import { notify, getAdminUserIds } from "@/lib/notify";

type PlayerProfile = {
  id: string;
  pseudo: string;
  ville: string | null;
  statut: string;
  niveau_declare: string | null;
};

type Termination = {
  id: string;
  motif: string;
  created_at: string;
  company_id: string;
};

const statutLabel: Record<string, string> = {
  inscription_incomplete: "Inscription incomplète",
  en_attente_verification: "En attente de vérification",
  profil_verifie: "Profil vérifié",
  en_attente_evaluation: "En attente d'évaluation",
  eligible_draft: "Éligible au Draft",
  non_eligible: "Non éligible",
  suspendu: "Suspendu",
  retire: "Retiré",
};

export default function EspaceJoueurPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [stats, setStats] = useState<StatsSummary | null>(null);
  const [cardStats, setCardStats] = useState<CardStats | null>(null);
  const [companiesMap, setCompaniesMap] = useState<Record<string, string>>({});
  const [terminations, setTerminations] = useState<Termination[]>([]);
  const [respondedIds, setRespondedIds] = useState<string[]>([]);
  const [reponseDraft, setReponseDraft] = useState<Record<string, string>>({});
  const [sendingReponse, setSendingReponse] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.push("/connexion");
        return;
      }

      const { data } = await supabase
        .from("player_profiles")
        .select("id, pseudo, ville, statut, niveau_declare")
        .eq("user_id", sessionData.session.user.id)
        .single();

      setProfile(data);

      if (data) {
        const statsData = await getPlayerStatsSummary(data.id);
        setStats(statsData);
        const cardStatsData = await getPlayerCardStats(data.id);
        setCardStats(cardStatsData);

        const { data: terminationsData } = await supabase
          .from("contract_terminations")
          .select("id, motif, created_at, company_id")
          .eq("player_id", data.id)
          .eq("statut", "en_attente_gcesport");
        setTerminations(terminationsData ?? []);

        const companyIds = Array.from(new Set((terminationsData ?? []).map((t) => t.company_id)));
        if (companyIds.length > 0) {
          const { data: companiesData } = await supabase.from("companies").select("id, nom").in("id", companyIds);
          const map: Record<string, string> = {};
          (companiesData ?? []).forEach((c) => (map[c.id] = c.nom));
          setCompaniesMap(map);
        }

        const terminationIds = (terminationsData ?? []).map((t) => t.id);
        if (terminationIds.length > 0) {
          const { data: responsesData } = await supabase
            .from("contract_termination_responses")
            .select("termination_id")
            .in("termination_id", terminationIds);
          setRespondedIds(Array.from(new Set((responsesData ?? []).map((r) => r.termination_id))));
        }
      }

      setLoading(false);
    }
    load();
  }, [router]);

  async function handleSendReponse(terminationId: string) {
    const reponse = (reponseDraft[terminationId] ?? "").trim();
    if (!reponse || !profile) return;
    setSendingReponse(terminationId);
    const { error } = await supabase.from("contract_termination_responses").insert({
      termination_id: terminationId,
      player_id: profile.id,
      reponse,
    });
    setSendingReponse(null);
    if (error) {
      alert("Ta réponse n'a pas pu être envoyée : " + error.message);
      return;
    }
    const adminIds = await getAdminUserIds();
    for (const uid of adminIds) {
      await notify(uid, "Droit de réponse — rupture de contrat", `${profile.pseudo} a répondu à une demande de rupture de contrat.`);
    }
    setRespondedIds((prev) => [...prev, terminationId]);
  }

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
          Salut, <span className="text-lime">{profile?.pseudo}</span>
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

      {terminations.length > 0 && (
        <div className="mt-8 space-y-4">
          {terminations.map((t) => (
            <div key={t.id} className="rounded-2xl border border-orange/50 bg-orange/5 p-6">
              <p className="font-display text-lg text-orange">Demande de rupture de contrat</p>
              <p className="mt-2 font-body text-sm text-white/70">
                {companiesMap[t.company_id] ?? "Une entreprise"} souhaite mettre fin à votre contrat. Motif indiqué :
              </p>
              <p className="mt-1 font-body text-sm italic text-white/60">« {t.motif} »</p>
              <p className="mt-3 font-body text-xs text-white/50">
                C'est GC ESPORT qui validera ou annulera cette rupture. Tu peux apporter ta version des faits
                ci-dessous — elle sera transmise directement à l'équipe GC ESPORT.
              </p>
              {respondedIds.includes(t.id) ? (
                <p className="mt-3 font-body text-xs text-lime">✓ Ta réponse a été envoyée à GC ESPORT.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  <textarea
                    placeholder="Ta réponse à l'attention de GC ESPORT..."
                    rows={3}
                    value={reponseDraft[t.id] ?? ""}
                    onChange={(e) => setReponseDraft((prev) => ({ ...prev, [t.id]: e.target.value }))}
                    className="input"
                  />
                  <button
                    onClick={() => handleSendReponse(t.id)}
                    disabled={sendingReponse === t.id}
                    className="rounded-full bg-orange px-4 py-2 font-body text-xs font-semibold text-ink hover:bg-lime disabled:opacity-50"
                  >
                    {sendingReponse === t.id ? "Envoi…" : "Envoyer à GC ESPORT"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-line bg-panel p-6">
          <p className="font-body text-xs uppercase tracking-wide text-white/40">Statut</p>
          <p className="mt-2 font-body text-lg text-lime">
            {profile ? statutLabel[profile.statut] ?? profile.statut : "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-panel p-6">
          <p className="font-body text-xs uppercase tracking-wide text-white/40">Ville</p>
          <p className="mt-2 font-body text-lg">{profile?.ville || "Non renseignée"}</p>
        </div>
      </div>

      {stats && stats.matchsJoues > 0 && (
        <div className="mt-6 rounded-2xl border border-line bg-panel p-6">
          <p className="font-body text-xs uppercase tracking-wide text-white/40">Statistiques vérifiées</p>
          <div className="mt-3 flex flex-wrap gap-x-8 gap-y-2 font-body text-sm">
            <span>{stats.matchsJoues} matchs</span>
            <span className="text-lime">{stats.victoires}V</span>
            <span className="text-white/60">{stats.nuls}N</span>
            <span className="text-white/40">{stats.defaites}D</span>
            <span>{stats.butsMarques} buts marqués</span>
            <span>{stats.butsEncaisses} encaissés</span>
          </div>
        </div>
      )}

      {cardStats && (
        <div className="mt-6">
          <PlayerCard stats={cardStats} />
        </div>
      )}

      <div className="mt-8 rounded-2xl border border-line bg-panel p-6">
        <p className="font-body text-sm text-white/60">
          {profile?.statut === "inscription_incomplete"
            ? "Ton profil n'est pas encore complet — complète-le pour passer en vérification."
            : "Ton profil est en attente de vérification par GC ESPORT. Une fois vérifié, tu pourras participer aux sessions d'évaluation (Combine) puis devenir éligible au Draft."}
        </p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {[
          { href: "/espace-joueur/profil", label: "Compléter mon profil", desc: "Jeu, niveau, disponibilités" },
          { href: "/espace-joueur/draft", label: "Mon Draft", desc: "Sélections reçues" },
          { href: "/espace-joueur/messages", label: "Messages", desc: "Échanger avec les entreprises" },
          { href: "/espace-joueur/offres", label: "Propositions", desc: "Recrutement et transferts" },
          { href: "/espace-joueur/candidature", label: "Candidature spontanée", desc: "Propose-toi à une entreprise" },
          { href: "/espace-joueur/engagements", label: "Mes engagements", desc: "Documents à signer" },
        ].map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="rounded-2xl border border-line bg-panel p-5 transition hover:border-orange"
          >
            <p className="font-display text-lg">{s.label}</p>
            <p className="mt-1 font-body text-xs text-white/50">{s.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
