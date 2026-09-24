import { supabase } from "@/lib/supabase";
import ArticleEngagement from "@/components/ArticleEngagement";

export const revalidate = 60;

export default async function ActualitesPage() {
  const { data: articles } = await supabase
    .from("news")
    .select("id, titre, contenu, image_url, created_at")
    .eq("publie", true)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-3xl px-6 py-24">
      <h1 className="font-display text-5xl">Actualités</h1>
      <p className="mt-4 font-body text-white/60">Les dernières nouvelles de GC ESPORT.</p>

      <div className="mt-14 space-y-10">
        {articles && articles.length > 0 ? (
          articles.map((a) => (
            <article key={a.id} className="border-b border-line pb-10 last:border-0">
              {a.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.image_url} alt={a.titre} className="mb-5 w-full rounded-2xl object-cover" style={{ maxHeight: 320 }} />
              )}
              <p className="font-body text-xs text-white/40">
                {new Date(a.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
              </p>
              <h2 className="mt-2 font-display text-2xl">{a.titre}</h2>
              <p className="mt-3 whitespace-pre-line font-body text-white/70">{a.contenu}</p>
              <ArticleEngagement newsId={a.id} />
            </article>
          ))
        ) : (
          <p className="font-body text-white/50">Aucune actualité publiée pour le moment.</p>
        )}
      </div>
    </div>
  );
}
