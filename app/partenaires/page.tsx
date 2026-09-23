import { supabase } from "@/lib/supabase";

export const revalidate = 60;

export default async function PartenairesPage() {
  const { data: sponsors } = await supabase
    .from("sponsors")
    .select("id, nom, logo_url, type_partenariat, confirme")
    .eq("confirme", true)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-5xl px-6 py-24">
      <h1 className="font-display text-5xl">Partenaires & sponsors</h1>
      <p className="mt-4 max-w-xl font-body text-white/60">
        Ils soutiennent GC ESPORT et ses compétitions.
      </p>

      <div className="mt-14 grid gap-6 sm:grid-cols-3">
        {sponsors && sponsors.length > 0 ? (
          sponsors.map((s) => (
            <div key={s.id} className="rounded-2xl border border-line bg-panel p-6 text-center">
              {s.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.logo_url} alt={s.nom} className="mx-auto h-16 w-16 rounded-lg object-cover" />
              ) : (
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-lg bg-ink font-display text-orange">
                  {s.nom.slice(0, 2).toUpperCase()}
                </div>
              )}
              <p className="mt-4 font-body font-semibold">{s.nom}</p>
              {s.type_partenariat && <p className="mt-1 font-body text-xs text-lime">{s.type_partenariat}</p>}
            </div>
          ))
        ) : (
          <p className="font-body text-white/50">Aucun partenaire confirmé pour le moment.</p>
        )}
      </div>
    </div>
  );
}
