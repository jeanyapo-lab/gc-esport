"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Rep = { id: string; user_id: string; fonction: string | null };

export default function RepresentantsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [reps, setReps] = useState<Rep[]>([]);

  const [email, setEmail] = useState("");
  const [fonction, setFonction] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      router.push("/connexion");
      return;
    }
    setMyUserId(sessionData.session.user.id);

    const { data: rep } = await supabase.from("company_reps").select("company_id").eq("user_id", sessionData.session.user.id).single();
    if (!rep) {
      setLoading(false);
      return;
    }
    setCompanyId(rep.company_id);

    const { data: repsData } = await supabase.from("company_reps").select("id, user_id, fonction").eq("company_id", rep.company_id);
    setReps(repsData ?? []);

    setLoading(false);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email || !companyId) return;
    setAdding(true);

    const { data: foundUserId, error: rpcError } = await supabase.rpc("find_user_id_by_email", { p_email: email });

    if (rpcError || !foundUserId) {
      setError("Aucun compte trouvé avec cette adresse e-mail. La personne doit d'abord créer un compte sur GC ESPORT.");
      setAdding(false);
      return;
    }

    const { error: insertError } = await supabase.from("company_reps").insert({
      company_id: companyId,
      user_id: foundUserId,
      fonction: fonction || "Représentant",
    });

    if (insertError) {
      setError(insertError.message.includes("duplicate") ? "Cette personne est déjà représentante de votre entreprise." : "Erreur : " + insertError.message);
      setAdding(false);
      return;
    }

    setEmail("");
    setFonction("");
    setAdding(false);
    await load();
  }

  async function handleRemove(repId: string, repUserId: string) {
    if (repUserId === myUserId) {
      alert("Tu ne peux pas te retirer toi-même.");
      return;
    }
    if (!confirm("Retirer ce représentant ?")) return;
    await supabase.from("company_reps").delete().eq("id", repId);
    await load();
  }

  if (loading) return <div className="px-6 py-24 text-center font-body text-white/50">Chargement…</div>;

  return (
    <div className="mx-auto max-w-xl px-6 py-24">
      <Link href="/espace-entreprise" className="font-body text-sm text-white/50 hover:text-white">← Retour à mon espace</Link>
      <h1 className="mt-4 font-display text-4xl">Représentants</h1>
      <p className="mt-3 font-body text-sm text-white/60">
        Les personnes autorisées à gérer le compte de votre entreprise.
      </p>

      <div className="mt-8 space-y-3">
        {reps.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-lg border border-line px-4 py-3 font-body text-sm">
            <span>{r.fonction || "Représentant"} {r.user_id === myUserId && <span className="text-lime">(toi)</span>}</span>
            {r.user_id !== myUserId && (
              <button onClick={() => handleRemove(r.id, r.user_id)} className="text-xs text-white/40 hover:text-orange">
                Retirer
              </button>
            )}
          </div>
        ))}
      </div>

      <section className="mt-10 rounded-2xl border border-line bg-panel p-6">
        <p className="font-display text-lg text-lime">Ajouter un représentant</p>
        <p className="mt-2 font-body text-xs text-white/50">
          La personne doit déjà avoir un compte sur GC ESPORT (peu importe son rôle).
        </p>
        <form onSubmit={handleAdd} className="mt-4 space-y-4">
          <input type="email" required placeholder="E-mail de connexion de la personne" value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
          <input placeholder="Fonction (ex: Responsable RH)" value={fonction} onChange={(e) => setFonction(e.target.value)} className="input" />
          {error && <p className="font-body text-sm text-red-400">{error}</p>}
          <button type="submit" disabled={adding} className="rounded-full bg-orange px-6 py-3 font-body text-sm font-semibold text-ink hover:bg-lime disabled:opacity-50">
            {adding ? "Ajout…" : "Ajouter"}
          </button>
        </form>
      </section>
    </div>
  );
}
