"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Poll = { id: string; question: string; actif: boolean };
type Option = { id: string; poll_id: string; texte: string };
type Vote = { poll_id: string; option_id: string; user_id: string };

export default function FanZonePage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [options, setOptions] = useState<Option[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [voting, setVoting] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data: sessionData } = await supabase.auth.getSession();
    setUserId(sessionData.session?.user.id ?? null);

    const { data: pollsData } = await supabase.from("polls").select("id, question, actif").eq("actif", true).order("created_at", { ascending: false });
    setPolls(pollsData ?? []);

    const pollIds = (pollsData ?? []).map((p) => p.id);
    if (pollIds.length > 0) {
      const { data: optionsData } = await supabase.from("poll_options").select("id, poll_id, texte").in("poll_id", pollIds);
      setOptions(optionsData ?? []);

      const { data: votesData } = await supabase.from("poll_votes").select("poll_id, option_id, user_id").in("poll_id", pollIds);
      setVotes(votesData ?? []);
    }

    setLoading(false);
  }

  async function handleVote(pollId: string, optionId: string) {
    if (!userId) return;
    setVoting(pollId);
    await supabase.from("poll_votes").insert({ poll_id: pollId, option_id: optionId, user_id: userId });
    setVoting(null);
    await load();
  }

  if (loading) return <div className="px-6 py-24 text-center font-body text-white/50">Chargement…</div>;

  return (
    <div className="mx-auto max-w-2xl px-6 py-24">
      <h1 className="font-display text-5xl">Fan Zone</h1>
      <p className="mt-4 font-body text-white/60">Donne ton avis sur la vie de GC ESPORT.</p>

      <div className="mt-14 space-y-10">
        {polls.length === 0 && <p className="font-body text-white/50">Aucun sondage en cours.</p>}

        {polls.map((poll) => {
          const pollOptions = options.filter((o) => o.poll_id === poll.id);
          const pollVotes = votes.filter((v) => v.poll_id === poll.id);
          const totalVotes = pollVotes.length;
          const myVote = pollVotes.find((v) => v.user_id === userId);

          return (
            <div key={poll.id} className="rounded-2xl border border-line bg-panel p-6">
              <p className="font-display text-xl text-lime">{poll.question}</p>
              <div className="mt-5 space-y-3">
                {pollOptions.map((opt) => {
                  const count = pollVotes.filter((v) => v.option_id === opt.id).length;
                  const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                  const isMine = myVote?.option_id === opt.id;
                  return (
                    <div key={opt.id}>
                      {myVote ? (
                        <div>
                          <div className="flex items-center justify-between font-body text-sm">
                            <span className={isMine ? "text-lime" : "text-white/70"}>{opt.texte}{isMine ? " ✓" : ""}</span>
                            <span className="text-white/40">{pct}%</span>
                          </div>
                          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-ink">
                            <div className="h-full rounded-full bg-gradient-to-r from-orange to-lime" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      ) : (
                        <button
                          disabled={!userId || voting === poll.id}
                          onClick={() => handleVote(poll.id, opt.id)}
                          className="w-full rounded-lg border border-white/20 px-4 py-3 text-left font-body text-sm hover:border-orange disabled:opacity-50"
                        >
                          {opt.texte}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              {!userId && <p className="mt-3 font-body text-xs text-white/40">Connecte-toi pour voter.</p>}
              {myVote && <p className="mt-3 font-body text-xs text-white/40">{totalVotes} vote(s) au total</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
