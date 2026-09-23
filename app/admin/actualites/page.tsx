"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Article = { id: string; titre: string; contenu: string; image_url: string | null; publie: boolean };

export default function AdminActualitesPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);

  const [titre, setTitre] = useState("");
  const [contenu, setContenu] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    async function init() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.push("/connexion");
        return;
      }
      setUserId(sessionData.session.user.id);
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
    const { data } = await supabase.from("news").select("id, titre, contenu, image_url, publie").order("created_at", { ascending: false });
    setArticles(data ?? []);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!titre || !contenu) return;
    await supabase.from("news").insert({ titre, contenu, image_url: imageUrl || null, publie: false, auteur_id: userId });
    setTitre("");
    setContenu("");
    setImageUrl("");
    await loadAll();
  }

  async function handleTogglePublie(a: Article) {
    await supabase.from("news").update({ publie: !a.publie }).eq("id", a.id);
    await loadAll();
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cet article ?")) return;
    await supabase.from("news").delete().eq("id", id);
    await loadAll();
  }

  if (checking) return <div className="px-6 py-24 text-center font-body text-white/50">Chargement…</div>;
  if (!authorized) return <div className="mx-auto max-w-lg px-6 py-32 text-center"><h1 className="font-display text-3xl text-orange">Accès refusé</h1></div>;

  return (
    <div className="mx-auto max-w-3xl px-6 py-24">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl">Actualités</h1>
        <Link href="/admin" className="font-body text-sm text-white/50 hover:text-white">← Retour à l'admin</Link>
      </div>

      <section className="mt-10 rounded-2xl border border-line bg-panel p-6">
        <p className="font-display text-lg text-lime">Nouvel article</p>
        <form onSubmit={handleCreate} className="mt-4 space-y-4">
          <input placeholder="Titre" value={titre} onChange={(e) => setTitre(e.target.value)} className="input" required />
          <input placeholder="Image (URL, optionnel)" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="input" />
          <textarea placeholder="Contenu" rows={6} value={contenu} onChange={(e) => setContenu(e.target.value)} className="input" required />
          <button type="submit" className="rounded-full bg-orange px-6 py-3 font-body text-sm font-semibold text-ink hover:bg-lime">
            Créer l'article (brouillon)
          </button>
        </form>
      </section>

      <section className="mt-8 space-y-3">
        {articles.map((a) => (
          <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-panel p-5">
            <p className="font-body font-semibold">{a.titre}</p>
            <div className="flex gap-2">
              <button
                onClick={() => handleTogglePublie(a)}
                className={`rounded-full px-4 py-2 font-body text-xs font-semibold ${a.publie ? "bg-lime text-ink" : "border border-white/20 text-white/70"}`}
              >
                {a.publie ? "Publié" : "Publier"}
              </button>
              <button onClick={() => handleDelete(a.id)} className="rounded-full border border-white/20 px-4 py-2 font-body text-xs text-white/50 hover:border-orange hover:text-orange">
                Supprimer
              </button>
            </div>
          </div>
        ))}
        {articles.length === 0 && <p className="font-body text-sm text-white/40">Aucun article créé.</p>}
      </section>
    </div>
  );
}
