"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { markSectionViewed } from "@/lib/adminViews";

type Poll = { id: string; question: string; actif: boolean };
type PollOption = { id: string; poll_id: string; texte: string };
type VoteDetail = {
  id: string;
  poll_id: string;
  option_id: string;
  created_at: string;
  user_id: string | null;
  anon_id: string | null;
  pseudo?: string | null;
};

export default function AdminSondagesPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [optionsByPoll, setOptionsByPoll] = useState<Record<string, PollOption[]>>({});
  const [votesByPoll, setVotesByPoll] = useState<Record<string, VoteDetail[]>>({});
  const [expandedPoll, setExpandedPoll] = useState<string | null>(null);

  const [question, setQuestion] = useState("");
  const [optionsText, setOptionsText] = useState("");

  useEffect(() => {
    async function init() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.push("/connexion");
        return;
      }
      const uid = sessionData.session.user.id;
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", uid).single();
      const adminRoles = ["super_admin", "admin", "responsable_communication"];
      if (!profile || !adminRoles.includes(profile.role)) {
        setAuthorized(false);
        setChecking(false);
        return;
      }
      setAuthorized(true);
      await loadAll();
      // La rubrique est désormais consultée : les votes reçus jusqu'ici
      // ne compteront plus dans le badge de notification du tableau de bord.
      await markSectionViewed(uid, "sondages");
      setChecking(false);
    }
    init();
  }, [router]);

  async function loadAll() {
    const { data } = await supabase.from("polls").select("id, question, actif").order("created_at", { ascending: false });
    setPolls(data ?? []);

    const pollIds = (data ?? []).map((p) => p.id);
    if (pollIds.length === 0) return;

    const { data: optionsData } = await supabase
      .from("poll_options")
      .select("id, poll_id, texte")
      .in("poll_id", pollIds);
    const optMap: Record<string, PollOption[]> = {};
    (optionsData ?? []).forEach((o) => {
      optMap[o.poll_id] = [...(optMap[o.poll_id] ?? []), o];
    });
    setOptionsByPoll(optMap);

    const { data: votesData } = await supabase
      .from("poll_votes")
      .select("id, poll_id, option_id, created_at, user_id, anon_id")
      .in("poll_id", pollIds)
      .order("created_at", { ascending: false });

    // Retrouve le pseudo des votants connectés qui sont aussi joueurs sur la plateforme
    const userIds = Array.from(new Set((votesData ?? []).map((v) => v.user_id).filter(Boolean))) as string[];
    let pseudoByUserId: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: pls } = await supabase.from("player_profiles").select("user_id, pseudo").in("user_id", userIds);
      pseudoByUserId = Object.fromEntries((pls ?? []).map((p) => [p.user_id, p.pseudo]));
    }

    const voteMap: Record<string, VoteDetail[]> = {};
    (votesData ?? []).forEach((v) => {
      const withPseudo = { ...v, pseudo: v.user_id ? pseudoByUserId[v.user_id] ?? "Compte connecté" : null };
      voteMap[v.poll_id] = [...(voteMap[v.poll_id] ?? []), withPseudo];
    });
    setVotesByPoll(voteMap);
  }

  function toggleExpand(pollId: string) {
    setExpandedPoll(expandedPoll === pollId ? null : pollId);
  }

  function optionLabel(pollId: string, optionId: string) {
    return optionsByPoll[pollId]?.find((o) => o.id === optionId)?.texte ?? "—";
  }

  function voteCountForOption(pollId: string, optionId: string) {
    return (votesByPoll[pollId] ?? []).filter((v) => v.option_id === optionId).length;
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const opts = optionsText.split("\n").map((o) => o.trim()).filter(Boolean);
    if (!question || opts.length < 2) {
      alert("Il faut une question et au moins 2 options (une par ligne).");
      return;
    }

    const { data: poll } = await supabase.from("polls").insert({ question, actif: true }).select().single();
    if (poll) {
      await supabase.from("poll_options").insert(opts.map((texte) => ({ poll_id: poll.id, texte })));
    }

    setQuestion("");
    setOptionsText("");
    await loadAll();
  }

  async function handleToggleActif(poll: Poll) {
    await supabase.from("polls").update({ actif: !poll.actif }).eq("id", poll.id);
    await loadAll();
  }

  async function handleDeletePoll(poll: Poll) {
    if (!confirm(`Supprimer définitivement le sondage « ${poll.question} » ? Tous les votes reçus seront aussi supprimés. Cette action est irréversible.`)) return;
    const { error } = await supabase.from("polls").delete().eq("id", poll.id);
    if (error) {
      alert("Erreur lors de la suppression : " + error.message);
      return;
    }
    if (expandedPoll === poll.id) setExpandedPoll(null);
    await loadAll();
  }

  if (checking) return <div className="px-6 py-24 text-center font-body text-white/50">Chargement…</div>;
  if (!authorized) return <div className="mx-auto max-w-lg px-6 py-32 text-center"><h1 className="font-display text-3xl text-orange">Accès refusé</h1></div>;

  return (
    <div className="mx-auto max-w-2xl px-6 py-24">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl">Sondages</h1>
        <Link href="/admin" className="font-body text-sm text-white/50 hover:text-white">← Retour à l'admin</Link>
      </div>

      <section className="mt-10 rounded-2xl border border-line bg-panel p-6">
        <p className="font-display text-lg text-lime">Créer un sondage</p>
        <form onSubmit={handleCreate} className="mt-4 space-y-4">
          <input placeholder="Question" value={question} onChange={(e) => setQuestion(e.target.value)} className="input" required />
          <textarea
            placeholder={"Une option par ligne, ex :\nOption A\nOption B\nOption C"}
            rows={4}
            value={optionsText}
            onChange={(e) => setOptionsText(e.target.value)}
            className="input"
            required
          />
          <button type="submit" className="rounded-full bg-orange px-6 py-3 font-body text-sm font-semibold text-ink hover:bg-lime">
            Créer le sondage
          </button>
        </form>
      </section>

      <section className="mt-8 space-y-3">
        {polls.map((p) => {
          const options = optionsByPoll[p.id] ?? [];
          const votes = votesByPoll[p.id] ?? [];
          const totalVotes = votes.length;
          return (
            <div key={p.id} className="rounded-2xl border border-line bg-panel p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-body font-semibold">{p.question}</p>
                  <p className="mt-1 font-body text-xs text-white/50">{totalVotes} vote(s) au total</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleExpand(p.id)}
                    className="rounded-full border border-white/20 px-4 py-2 font-body text-xs hover:border-white/50"
                  >
                    {expandedPoll === p.id ? "Masquer les votes" : "Voir les votes"}
                  </button>
                  <button
                    onClick={() => handleToggleActif(p)}
                    className={`rounded-full px-4 py-2 font-body text-xs font-semibold ${p.actif ? "bg-lime text-ink" : "border border-white/20 text-white/70"}`}
                  >
                    {p.actif ? "Actif" : "Inactif"}
                  </button>
                  <button
                    onClick={() => handleDeletePoll(p)}
                    className="rounded-full border border-white/20 px-4 py-2 font-body text-xs text-white/50 hover:border-red-500 hover:text-red-500"
                  >
                    Supprimer
                  </button>
                </div>
              </div>

              {expandedPoll === p.id && (
                <div className="mt-5 space-y-4 border-t border-line pt-5">
                  <div className="space-y-2">
                    {options.map((o) => {
                      const n = voteCountForOption(p.id, o.id);
                      const pct = totalVotes > 0 ? Math.round((n / totalVotes) * 100) : 0;
                      return (
                        <div key={o.id}>
                          <div className="flex items-center justify-between font-body text-sm">
                            <span>{o.texte}</span>
                            <span className="text-white/50">{n} vote(s) · {pct}%</span>
                          </div>
                          <div className="mt-1 h-2 rounded-full bg-white/10">
                            <div className="h-2 rounded-full bg-lime" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                    {options.length === 0 && <p className="font-body text-sm text-white/40">Aucune option.</p>}
                  </div>

                  <div>
                    <p className="font-body text-xs font-semibold text-white/60">Détail des votes</p>
                    <div className="mt-2 max-h-64 space-y-1 overflow-y-auto">
                      {votes.map((v) => (
                        <div key={v.id} className="flex items-center justify-between rounded-lg border border-line px-3 py-2 font-body text-xs">
                          <span>
                            {v.pseudo ? v.pseudo : "Fan anonyme"} → {optionLabel(p.id, v.option_id)}
                          </span>
                          <span className="text-white/40">{new Date(v.created_at).toLocaleString("fr-FR")}</span>
                        </div>
                      ))}
                      {votes.length === 0 && <p className="font-body text-xs text-white/40">Aucun vote pour le moment.</p>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {polls.length === 0 && <p className="font-body text-sm text-white/40">Aucun sondage créé.</p>}
      </section>
    </div>
  );
}
