"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Profile = { id: string; role: string };

const roleLabel: Record<string, string> = {
  super_admin: "Super administrateur",
  admin: "Administrateur",
  responsable_joueurs: "Responsable joueurs",
  responsable_partenariats: "Responsable partenariats",
  responsable_competitions: "Responsable compétitions",
  responsable_communication: "Responsable communication",
  joueur: "Joueur",
  entreprise: "Entreprise",
};

const adminRoles = ["super_admin", "admin", "responsable_joueurs", "responsable_partenariats", "responsable_competitions", "responsable_communication"];

export default function AdminUtilisateursPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [emailToPromote, setEmailToPromote] = useState("");
  const [roleToAssign, setRoleToAssign] = useState("responsable_joueurs");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.push("/connexion");
        return;
      }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", sessionData.session.user.id).single();
      if (!profile || !["super_admin", "admin"].includes(profile.role)) {
        setAuthorized(false);
        setChecking(false);
        return;
      }
      setAuthorized(true);
      await loadAdmins();
      setChecking(false);
    }
    init();
  }, [router]);

  async function loadAdmins() {
    const { data } = await supabase.from("profiles").select("id, role").in("role", adminRoles);
    setProfiles(data ?? []);
  }

  async function handlePromote(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!emailToPromote) return;

    const { data: userId, error: rpcError } = await supabase.rpc("find_user_id_by_email", { p_email: emailToPromote });
    if (rpcError || !userId) {
      setError("Aucun compte trouvé avec cette adresse e-mail.");
      return;
    }

    const { error: updateError } = await supabase.from("profiles").update({ role: roleToAssign }).eq("id", userId);
    if (updateError) {
      setError("Erreur : " + updateError.message);
      return;
    }

    setEmailToPromote("");
    await loadAdmins();
  }

  async function handleChangeRole(profileId: string, newRole: string) {
    await supabase.from("profiles").update({ role: newRole }).eq("id", profileId);
    await loadAdmins();
  }

  if (checking) return <div className="px-6 py-24 text-center font-body text-white/50">Chargement…</div>;
  if (!authorized) return <div className="mx-auto max-w-lg px-6 py-32 text-center"><h1 className="font-display text-3xl text-orange">Accès refusé</h1></div>;

  return (
    <div className="mx-auto max-w-3xl px-6 py-24">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl">Utilisateurs & rôles</h1>
        <Link href="/admin" className="font-body text-sm text-white/50 hover:text-white">← Retour à l'admin</Link>
      </div>

      <section className="mt-10 rounded-2xl border border-line bg-panel p-6">
        <p className="font-display text-lg text-lime">Donner un rôle admin à un compte existant</p>
        <p className="mt-2 font-body text-xs text-white/50">La personne doit déjà avoir un compte GC ESPORT (joueur ou entreprise).</p>
        <form onSubmit={handlePromote} className="mt-4 grid gap-4 sm:grid-cols-3">
          <input type="email" required placeholder="E-mail du compte" value={emailToPromote} onChange={(e) => setEmailToPromote(e.target.value)} className="input sm:col-span-2" />
          <select value={roleToAssign} onChange={(e) => setRoleToAssign(e.target.value)} className="input">
            {adminRoles.map((r) => (
              <option key={r} value={r}>{roleLabel[r]}</option>
            ))}
          </select>
          {error && <p className="sm:col-span-3 font-body text-sm text-red-400">{error}</p>}
          <button type="submit" className="sm:col-span-3 rounded-full bg-orange px-6 py-3 font-body text-sm font-semibold text-ink hover:bg-lime">
            Attribuer ce rôle
          </button>
        </form>
      </section>

      <section className="mt-8">
        <p className="font-display text-lg text-lime">Comptes admin actuels</p>
        <div className="mt-4 space-y-2">
          {profiles.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-lg border border-line px-4 py-3">
              <span className="font-body text-sm text-white/60">{p.id.slice(0, 8)}…</span>
              <select value={p.role} onChange={(e) => handleChangeRole(p.id, e.target.value)} className="input w-auto py-2 text-xs">
                {adminRoles.map((r) => (
                  <option key={r} value={r}>{roleLabel[r]}</option>
                ))}
                <option value="joueur">Retirer (repasser joueur)</option>
              </select>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
