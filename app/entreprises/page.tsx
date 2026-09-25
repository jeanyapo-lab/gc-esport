import { supabase } from "@/lib/supabase";
import { normalizeUrl } from "@/lib/url";

export const revalidate = 60;

export default async function EntreprisesPage() {
  const { data: entreprises } = await supabase
    .from("companies")
    .select("id, nom, secteur_activite, presentation, logo_url, site_web")
    .eq("statut", "participante_confirmee")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-6xl px-6 py-24">
      <h1 className="font-display text-5xl">Entreprises participantes</h1>
      <p className="mt-4 max-w-xl font-body text-white/60">
        Les entreprises qui soutiennent GC ESPORT et font jouer leurs
        couleurs à travers le Draft.
      </p>

      <div className="mt-14 grid gap-6 sm:grid-cols-2">
        {entreprises && entreprises.length > 0 ? (
          entreprises.map((e) => (
            <a
              key={e.id}
              href={e.site_web ? normalizeUrl(e.site_web) : undefined}
              target={e.site_web ? "_blank" : undefined}
              rel="noopener noreferrer"
              className="rounded-2xl border border-line bg-panel p-8 transition hover:border-orange"
            >
              <div className="flex items-center gap-4">
                {e.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={e.logo_url}
                    alt={e.nom}
                    className="h-14 w-14 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-ink font-display text-lg text-orange">
                    {e.nom.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-display text-xl">{e.nom}</p>
                  {e.secteur_activite && (
                    <p className="font-body text-xs text-white/40">{e.secteur_activite}</p>
                  )}
                </div>
              </div>
              {e.presentation && (
                <p className="mt-4 font-body text-sm text-white/60">{e.presentation}</p>
              )}
            </a>
          ))
        ) : (
          <p className="font-body text-white/50">
            Aucune entreprise participante confirmée pour le moment.
          </p>
        )}
      </div>
    </div>
  );
}
