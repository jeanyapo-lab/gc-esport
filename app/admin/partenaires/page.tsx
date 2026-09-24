"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Sponsor = {
  id: string;
  nom: string;
  logo_url: string | null;
  type_partenariat: string | null;
  confirme: boolean;
};

export default function AdminPartenairesPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);

  const [nom, setNom] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [type, setType] = useState("");

  useEffect(() => {
    async function init() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.push("/connexion");
        return;
      }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", sessionData.session.user.id).single();
      const adminRoles = ["super_admin", "admin", "responsable_partenariats", "responsable_communication"];
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
    const { data } = await supabase.from("sponsors").select("id, nom, logo_url, type_partenariat, confirme").order("created_at", { ascending: false });
    setSponsors(data ?? []);
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    const ext = file.name.split(".").pop();
    const path = `sponsors/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadError) {
      alert("Erreur lors de l'envoi du logo : " + uploadError.message);
      setUploadingLogo(false);
      return;
    }
    const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(path);
    setLogoUrl(publicUrlData.publicUrl);
    setUploadingLogo(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!nom) return;
    await supabase.from("sponsors").insert({ nom, logo_url: logoUrl || null, type_partenariat: type || null, confirme: false });
    setNom("");
    setLogoUrl("");
    setType("");
    await loadAll();
  }

  async function handleToggleConfirme(s: Sponsor) {
    await supabase.from("sponsors").update({ confirme: !s.confirme }).eq("id", s.id);
    await loadAll();
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce partenaire ?")) return;
    await supabase.from("sponsors").delete().eq("id", id);
    await loadAll();
  }

  if (checking) return <div className="px-6 py-24 text-center font-body text-white/50">Chargement…</div>;
  if (!authorized) return <div className="mx-auto max-w-lg px-6 py-32 text-center"><h1 className="font-display text-3xl text-orange">Accès refusé</h1></div>;

  return (
    <div className="mx-auto max-w-4xl px-6 py-24">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl">Partenaires</h1>
        <Link href="/admin" className="font-body text-sm text-white/50 hover:text-white">← Retour à l'admin</Link>
      </div>

      <section className="mt-10 rounded-2xl border border-line bg-panel p-6">
        <p className="font-display text-lg text-lime">Ajouter un partenaire</p>
        <form onSubmit={handleCreate} className="mt-4 grid gap-4 sm:grid-cols-3">
          <input placeholder="Nom" value={nom} onChange={(e) => setNom(e.target.value)} className="input" required />
          <div className="flex items-center gap-3">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Logo" className="h-12 w-12 rounded-lg object-cover" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-ink text-xs text-white/30">Aucun</div>
            )}
            <label className="cursor-pointer rounded-full border border-white/20 px-4 py-2 font-body text-xs hover:border-white/50">
              {uploadingLogo ? "Envoi…" : "Choisir un logo"}
              <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" disabled={uploadingLogo} />
            </label>
          </div>
          <input placeholder="Type de partenariat" value={type} onChange={(e) => setType(e.target.value)} className="input" />
          <button type="submit" className="sm:col-span-3 rounded-full bg-orange px-6 py-3 font-body text-sm font-semibold text-ink hover:bg-lime">
            Ajouter
          </button>
        </form>
      </section>

      <section className="mt-8 space-y-3">
        {sponsors.map((s) => (
          <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-panel p-5">
            <div className="flex items-center gap-3">
              {s.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.logo_url} alt={s.nom} className="h-10 w-10 rounded-lg object-cover" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-ink text-xs text-white/30">?</div>
              )}
              <div>
                <p className="font-body font-semibold">{s.nom}</p>
                <p className="font-body text-xs text-white/50">{s.type_partenariat}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleToggleConfirme(s)}
                className={`rounded-full px-4 py-2 font-body text-xs font-semibold ${s.confirme ? "bg-lime text-ink" : "border border-white/20 text-white/70"}`}
              >
                {s.confirme ? "Confirmé" : "Confirmer"}
              </button>
              <button onClick={() => handleDelete(s.id)} className="rounded-full border border-white/20 px-4 py-2 font-body text-xs text-white/50 hover:border-orange hover:text-orange">
                Supprimer
              </button>
            </div>
          </div>
        ))}
        {sponsors.length === 0 && <p className="font-body text-sm text-white/40">Aucun partenaire créé.</p>}
      </section>
    </div>
  );
}
