"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Message = { id: string; nom: string; email: string; message: string; lu: boolean; created_at: string };

export default function AdminMessagesPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

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
    const { data } = await supabase.from("contact_messages").select("id, nom, email, message, lu, created_at").order("created_at", { ascending: false });
    setMessages(data ?? []);
  }

  async function handleMarkRead(id: string) {
    await supabase.from("contact_messages").update({ lu: true }).eq("id", id);
    await loadAll();
  }

  if (checking) return <div className="px-6 py-24 text-center font-body text-white/50">Chargement…</div>;
  if (!authorized) return <div className="mx-auto max-w-lg px-6 py-32 text-center"><h1 className="font-display text-3xl text-orange">Accès refusé</h1></div>;

  return (
    <div className="mx-auto max-w-3xl px-6 py-24">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl">Messages de contact</h1>
        <Link href="/admin" className="font-body text-sm text-white/50 hover:text-white">← Retour à l'admin</Link>
      </div>

      <div className="mt-10 space-y-3">
        {messages.map((m) => (
          <div key={m.id} className={`rounded-2xl border p-6 ${m.lu ? "border-line bg-panel" : "border-orange/40 bg-orange/5"}`}>
            <div className="flex items-center justify-between">
              <p className="font-body font-semibold">{m.nom} <span className="text-white/40">— {m.email}</span></p>
              <p className="font-body text-xs text-white/30">{new Date(m.created_at).toLocaleDateString("fr-FR")}</p>
            </div>
            <p className="mt-3 font-body text-sm text-white/70">{m.message}</p>
            {!m.lu && (
              <button onClick={() => handleMarkRead(m.id)} className="mt-3 rounded-full border border-white/20 px-4 py-1 font-body text-xs text-white/60">
                Marquer comme lu
              </button>
            )}
          </div>
        ))}
        {messages.length === 0 && <p className="font-body text-sm text-white/40">Aucun message pour le moment.</p>}
      </div>
    </div>
  );
}
