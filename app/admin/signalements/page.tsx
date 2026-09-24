"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Report = {
  id: string;
  message_id: string;
  reporter_id: string;
  motif: string;
  statut: string;
  created_at: string;
};
type MessageInfo = { contenu: string; sender_id: string };

export default function AdminSignalementsPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [messagesMap, setMessagesMap] = useState<Record<string, MessageInfo>>({});

  useEffect(() => {
    async function init() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.push("/connexion");
        return;
      }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", sessionData.session.user.id).single();
      const adminRoles = ["super_admin", "admin", "responsable_joueurs", "responsable_partenariats"];
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
    const { data: reportsData } = await supabase
      .from("message_reports")
      .select("id, message_id, reporter_id, motif, statut, created_at")
      .order("created_at", { ascending: false });
    setReports(reportsData ?? []);

    const messageIds = Array.from(new Set((reportsData ?? []).map((r) => r.message_id)));
    if (messageIds.length > 0) {
      const { data: messagesData } = await supabase.from("messages").select("id, contenu, sender_id").in("id", messageIds);
      const map: Record<string, MessageInfo> = {};
      (messagesData ?? []).forEach((m) => (map[m.id] = m));
      setMessagesMap(map);
    }
  }

  async function handleTraite(reportId: string) {
    await supabase.from("message_reports").update({ statut: "traite" }).eq("id", reportId);
    await loadAll();
  }

  if (checking) return <div className="px-6 py-24 text-center font-body text-white/50">Chargement…</div>;
  if (!authorized) return <div className="mx-auto max-w-lg px-6 py-32 text-center"><h1 className="font-display text-3xl text-orange">Accès refusé</h1></div>;

  return (
    <div className="mx-auto max-w-3xl px-6 py-24">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl">Signalements</h1>
        <Link href="/admin" className="font-body text-sm text-white/50 hover:text-white">← Retour à l'admin</Link>
      </div>
      <p className="mt-3 font-body text-sm text-white/60">Messages signalés par des joueurs ou des entreprises.</p>

      <div className="mt-10 space-y-3">
        {reports.map((r) => (
          <div key={r.id} className={`rounded-2xl border p-6 ${r.statut === "traite" ? "border-line bg-panel opacity-60" : "border-orange/40 bg-orange/5"}`}>
            <p className="font-body text-xs text-white/40">{new Date(r.created_at).toLocaleString("fr-FR")}</p>
            <p className="mt-2 font-body text-sm text-orange">Motif : {r.motif}</p>
            <p className="mt-2 rounded-lg bg-ink px-4 py-3 font-body text-sm text-white/70">
              {messagesMap[r.message_id]?.contenu ?? "Message introuvable (peut-être supprimé)"}
            </p>
            {r.statut !== "traite" && (
              <button onClick={() => handleTraite(r.id)} className="mt-3 rounded-full border border-white/20 px-4 py-2 font-body text-xs text-white/60">
                Marquer comme traité
              </button>
            )}
          </div>
        ))}
        {reports.length === 0 && <p className="font-body text-sm text-white/40">Aucun signalement pour le moment.</p>}
      </div>
    </div>
  );
}
