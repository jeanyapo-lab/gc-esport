"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function ParametresPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [retourHref, setRetourHref] = useState("/");
  const [userId, setUserId] = useState<string | null>(null);

  const [nom, setNom] = useState("");
  const [nomMsg, setNomMsg] = useState<string | null>(null);
  const [nomSaving, setNomSaving] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [emailMsg, setEmailMsg] = useState<string | null>(null);
  const [emailSaving, setEmailSaving] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.push("/connexion");
        return;
      }
      setEmail(sessionData.session.user.email ?? "");
      setUserId(sessionData.session.user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, nom")
        .eq("id", sessionData.session.user.id)
        .single();

      const adminRoles = ["super_admin", "admin", "responsable_joueurs", "responsable_partenariats", "responsable_competitions", "responsable_communication"];
      if (profile?.role && adminRoles.includes(profile.role)) setRetourHref("/admin");
      else if (profile?.role === "entreprise") setRetourHref("/espace-entreprise");
      else if (profile?.role === "joueur") setRetourHref("/espace-joueur");
      setNom(profile?.nom ?? "");

      setLoading(false);
    }
    load();
  }, [router]);

  async function handleUpdateNom(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setNomMsg(null);
    setNomSaving(true);
    const { error } = await supabase.from("profiles").update({ nom: nom.trim() || null }).eq("id", userId);
    setNomSaving(false);
    if (error) {
      setNomMsg("Erreur : " + error.message);
    } else {
      setNomMsg("Nom mis à jour.");
    }
  }

  async function handleUpdateEmail(e: React.FormEvent) {
    e.preventDefault();
    setEmailMsg(null);
    setEmailSaving(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setEmailSaving(false);
    if (error) {
      setEmailMsg("Erreur : " + error.message);
    } else {
      setEmailMsg("Un e-mail de confirmation vient d'être envoyé à la nouvelle adresse. Le changement prendra effet une fois confirmé.");
      setNewEmail("");
    }
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMsg(null);
    setPasswordError(null);

    if (newPassword.length < 6) {
      setPasswordError("Le mot de passe doit faire au moins 6 caractères.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setPasswordSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordSaving(false);

    if (error) {
      setPasswordError("Erreur : " + error.message);
    } else {
      setPasswordMsg("Mot de passe mis à jour avec succès.");
      setNewPassword("");
      setConfirmPassword("");
    }
  }

  if (loading) return <div className="px-6 py-24 text-center font-body text-white/50">Chargement…</div>;

  return (
    <div className="mx-auto max-w-xl px-6 py-24">
      <Link href={retourHref} className="font-body text-sm text-white/50 hover:text-white">
        ← Retour à mon espace
      </Link>
      <h1 className="mt-4 font-display text-4xl">Paramètres du compte</h1>
      <p className="mt-3 font-body text-sm text-white/60">Connecté avec {email}</p>

      <section className="mt-10 rounded-2xl border border-line bg-panel p-6">
        <p className="font-display text-lg text-lime">Nom affiché</p>
        <p className="mt-2 font-body text-xs text-white/50">
          Ce nom apparaît dans les historiques et journaux (audit, statuts, évaluations...) à côté de chaque action
          que tu effectues, pour qu'on sache toujours qui a fait quoi.
        </p>
        <form onSubmit={handleUpdateNom} className="mt-4 space-y-4">
          <input
            type="text"
            placeholder="Ton nom (ex: Jean-Marc Yapo)"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            className="input"
          />
          {nomMsg && <p className="font-body text-sm text-lime">{nomMsg}</p>}
          <button
            type="submit"
            disabled={nomSaving}
            className="rounded-full bg-orange px-6 py-3 font-body text-sm font-semibold text-ink hover:bg-lime disabled:opacity-50"
          >
            {nomSaving ? "Enregistrement…" : "Enregistrer le nom"}
          </button>
        </form>
      </section>

      <section className="mt-8 rounded-2xl border border-line bg-panel p-6">
        <p className="font-display text-lg text-lime">Changer d'adresse e-mail</p>
        <form onSubmit={handleUpdateEmail} className="mt-4 space-y-4">
          <input
            type="email"
            required
            placeholder="nouvelle-adresse@exemple.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="input"
          />
          {emailMsg && <p className="font-body text-sm text-lime">{emailMsg}</p>}
          <button
            type="submit"
            disabled={emailSaving}
            className="rounded-full bg-orange px-6 py-3 font-body text-sm font-semibold text-ink hover:bg-lime disabled:opacity-50"
          >
            {emailSaving ? "Envoi…" : "Mettre à jour l'e-mail"}
          </button>
        </form>
      </section>

      <section className="mt-8 rounded-2xl border border-line bg-panel p-6">
        <p className="font-display text-lg text-lime">Changer de mot de passe</p>
        <form onSubmit={handleUpdatePassword} className="mt-4 space-y-4">
          <input
            type="password"
            required
            placeholder="Nouveau mot de passe"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="input"
          />
          <input
            type="password"
            required
            placeholder="Confirmer le nouveau mot de passe"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="input"
          />
          {passwordError && <p className="font-body text-sm text-red-400">{passwordError}</p>}
          {passwordMsg && <p className="font-body text-sm text-lime">{passwordMsg}</p>}
          <button
            type="submit"
            disabled={passwordSaving}
            className="rounded-full bg-orange px-6 py-3 font-body text-sm font-semibold text-ink hover:bg-lime disabled:opacity-50"
          >
            {passwordSaving ? "Enregistrement…" : "Mettre à jour le mot de passe"}
          </button>
        </form>
      </section>

      <p className="mt-8 font-body text-xs text-white/40">
        Pour supprimer ton compte, contacte GC ESPORT directement via la page{" "}
        <Link href="/contact" className="text-orange hover:underline">
          Contact
        </Link>
        .
      </p>
    </div>
  );
}
