"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Poll = { id: string; question: string; actif: boolean };

export default function AdminSondagesPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [polls, setPolls] = useState<Poll[]>([]);

  const [question, setQuestion] = useState("");
  const [optionsText, setOptionsText] = useState("");

  useEffect(() => {
    async function init() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.push("/connexion");
        return;
      }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", sessionData.session.user.id).single();
      const adminRoles = ["super_admin", "admin", "responsable_communication"];
      if (!profile || !adminRoles.includes(profile.role)) {
        setAuthorized(false);
        setChecking(false);
        return;
      }
      setAuthorized(true);
      await loadAll();
      setChecking(false);
    }
    init();
  }, [router]);

  async function loadAll() {
    const { data } = await supabase.from("polls").select("id, question, actif").order("created_at", { ascending: false });
    setPolls(data ?? []);
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
        {polls.map((p) => (
          <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-panel p-5">
            <p className="font-body font-semibold">{p.question}</p>
            <button
              onClick={() => handleToggleActif(p)}
              className={`rounded-full px-4 py-2 font-body text-xs font-semibold ${p.actif ? "bg-lime text-ink" : "border border-white/20 text-white/70"}`}
            >
              {p.actif ? "Actif" : "Inactif"}
            </button>
          </div>
        ))}
        {polls.length === 0 && <p className="font-body text-sm text-white/40">Aucun sondage créé.</p>}
      </section>
    </div>
  );
}
