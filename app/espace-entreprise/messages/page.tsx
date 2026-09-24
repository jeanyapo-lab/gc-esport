"use client";


import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getOrCreateConversation } from "@/lib/messaging";

type Conversation = { id: string; player_id: string };
type Player = { id: string; pseudo: string; photo_url: string | null };
type Message = { id: string; sender_id: string; contenu: string; created_at: string };

function EntrepriseMessagesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [playersMap, setPlayersMap] = useState<Record<string, Player>>({});
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [texte, setTexte] = useState("");
  const [sending, setSending] = useState(false);
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [motifSignalement, setMotifSignalement] = useState("");

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      router.push("/connexion");
      return;
    }
    setUserId(sessionData.session.user.id);

    const { data: rep } = await supabase.from("company_reps").select("company_id").eq("user_id", sessionData.session.user.id).single();
    if (!rep) {
      setLoading(false);
      return;
    }
    setCompanyId(rep.company_id);

    const playerIdParam = searchParams.get("player");
    if (playerIdParam) {
      const convId = await getOrCreateConversation(playerIdParam, rep.company_id);
      if (convId) setSelectedConvId(convId);
    }

    await loadConversations(rep.company_id);
    setLoading(false);
  }

  async function loadConversations(cId: string) {
    const { data: convs } = await supabase.from("conversations").select("id, player_id").eq("company_id", cId);
    setConversations(convs ?? []);

    const playerIds = Array.from(new Set((convs ?? []).map((c) => c.player_id)));
    if (playerIds.length > 0) {
      const { data: playersData } = await supabase.from("player_profiles").select("id, pseudo, photo_url").in("id", playerIds);
      const map: Record<string, Player> = {};
      (playersData ?? []).forEach((p) => (map[p.id] = p));
      setPlayersMap(map);
    }
  }

  async function openConversation(convId: string) {
    setSelectedConvId(convId);
    const { data } = await supabase.from("messages").select("id, sender_id, contenu, created_at").eq("conversation_id", convId).order("created_at", { ascending: true });
    setMessages(data ?? []);
    await supabase.from("messages").update({ lu: true }).eq("conversation_id", convId).neq("sender_id", userId ?? "");
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedConvId || !texte.trim() || !userId) return;
    setSending(true);
    await supabase.from("messages").insert({ conversation_id: selectedConvId, sender_id: userId, contenu: texte.trim() });
    setTexte("");
    setSending(false);
    await openConversation(selectedConvId);
  }

  async function handleReport(messageId: string) {
    if (!motifSignalement.trim() || !userId) return;
    await supabase.from("message_reports").insert({ message_id: messageId, reporter_id: userId, motif: motifSignalement.trim() });
    setReportingId(null);
    setMotifSignalement("");
    alert("Message signalé à GC ESPORT.");
  }

  if (loading) return <div className="px-6 py-24 text-center font-body text-white/50">Chargement…</div>;

  return (
    <div className="mx-auto max-w-4xl px-6 py-24">
      <Link href="/espace-entreprise" className="font-body text-sm text-white/50 hover:text-white">← Retour à mon espace</Link>
      <h1 className="mt-4 font-display text-4xl">Messages</h1>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        <div className="space-y-2 md:col-span-1">
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => openConversation(c.id)}
              className={`w-full rounded-lg border px-4 py-3 text-left font-body text-sm ${selectedConvId === c.id ? "border-orange bg-orange/10" : "border-line hover:border-white/40"}`}
            >
              {playersMap[c.player_id]?.pseudo ?? "Joueur"}
            </button>
          ))}
          {conversations.length === 0 && <p className="font-body text-sm text-white/40">Aucune conversation pour le moment.</p>}
        </div>

        <div className="md:col-span-2">
          {selectedConvId ? (
            <div className="flex h-[500px] flex-col rounded-2xl border border-line bg-panel p-4">
              <div className="flex-1 space-y-3 overflow-y-auto">
                {messages.map((m) => (
                  <div key={m.id} className={`max-w-[80%] ${m.sender_id === userId ? "ml-auto text-right" : ""}`}>
                    <div className={`inline-block rounded-lg px-3 py-2 font-body text-sm ${m.sender_id === userId ? "bg-orange text-ink" : "bg-ink text-white/80"}`}>
                      {m.contenu}
                    </div>
                    {m.sender_id !== userId && (
                      <div>
                        {reportingId === m.id ? (
                          <div className="mt-1 flex gap-1">
                            <input
                              placeholder="Motif du signalement"
                              value={motifSignalement}
                              onChange={(e) => setMotifSignalement(e.target.value)}
                              className="input py-1 text-xs"
                            />
                            <button onClick={() => handleReport(m.id)} className="rounded-full bg-orange px-2 py-1 font-body text-[10px] text-ink">
                              Envoyer
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setReportingId(m.id)} className="mt-1 font-body text-[10px] text-white/30 hover:text-orange">
                            Signaler
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {messages.length === 0 && <p className="font-body text-sm text-white/40">Aucun message. Lance la conversation.</p>}
              </div>
              <form onSubmit={handleSend} className="mt-3 flex gap-2">
                <input value={texte} onChange={(e) => setTexte(e.target.value)} placeholder="Ton message..." className="input flex-1" />
                <button type="submit" disabled={sending} className="rounded-full bg-orange px-5 py-2 font-body text-sm font-semibold text-ink hover:bg-lime disabled:opacity-50">
                  Envoyer
                </button>
              </form>
            </div>
          ) : (
            <p className="font-body text-sm text-white/40">Choisis une conversation à gauche.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EntrepriseMessagesPage() {
  return (
    <Suspense fallback={<div className="px-6 py-24 text-center font-body text-white/50">Chargement…</div>}>
      <EntrepriseMessagesContent />
    </Suspense>
  );
}
