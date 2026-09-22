import Link from "next/link";
import { supabase } from "@/lib/supabase";

export const revalidate = 60;

export default async function JoueursPage() {
  const { data: joueurs } = await supabase
    .from("player_profiles")
    .select("id, pseudo, ville, niveau_declare, photo_url")
    .eq("profil_public", true)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-6xl px-6 py-24">
      <h1 className="font-display text-5xl">Joueurs</h1>
      <p className="mt-4 max-w-xl font-body text-white/60">
        Les profils publics des joueurs inscrits sur GC ESPORT.
      </p>

      <div className="mt-14 grid gap-6 sm:grid-cols-2 md:grid-cols-3">
        {joueurs && joueurs.length > 0 ? (
          joueurs.map((j) => (
            <Link
              key={j.id}
              href={`/joueurs/${j.id}`}
              className="rounded-2xl border border-line bg-panel p-6 transition hover:border-orange"
            >
              {j.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={j.photo_url} alt={j.pseudo} className="h-14 w-14 rounded-full object-cover" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-ink font-display text-lg text-orange">
                  {j.pseudo?.slice(0, 2).toUpperCase()}
                </div>
              )}
              <p className="mt-4 font-body font-semibold">{j.pseudo}</p>
              <p className="font-body text-sm text-white/50">{j.ville}</p>
              {j.niveau_declare && (
                <p className="mt-2 font-body text-xs text-lime">{j.niveau_declare}</p>
              )}
            </Link>
          ))
        ) : (
          <p className="font-body text-white/50">
            Aucun profil public pour le moment — les joueurs inscrits apparaîtront ici.
          </p>
        )}
      </div>
    </div>
  );
}
