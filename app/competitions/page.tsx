import { supabase } from "@/lib/supabase";

export const revalidate = 60;

export default async function CompetitionsPage() {
  const { data: competitions } = await supabase
    .from("competitions")
    .select("id, nom, description, format, statut, game_id")
    .order("created_at", { ascending: false });

  const statutLabel: Record<string, string> = {
    preparation: "En préparation",
    inscriptions_ouvertes: "Inscriptions ouvertes",
    en_cours: "En cours",
    terminee: "Terminée",
    annulee: "Annulée",
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-24">
      <h1 className="font-display text-5xl">Compétitions</h1>
      <p className="mt-4 max-w-xl font-body text-white/60">
        Retrouvez ici toutes les compétitions organisées par GC ESPORT.
      </p>

      <div className="mt-14 grid gap-6 md:grid-cols-2">
        {competitions && competitions.length > 0 ? (
          competitions.map((c) => (
            <div key={c.id} className="rounded-2xl border border-line bg-panel p-8">
              <div className="flex items-center justify-between">
                <p className="font-display text-xl">{c.nom}</p>
                <span className="rounded-full border border-lime/40 px-3 py-1 font-body text-xs text-lime">
                  {statutLabel[c.statut] ?? c.statut}
                </span>
              </div>
              {c.description && (
                <p className="mt-3 font-body text-sm text-white/60">{c.description}</p>
              )}
              <p className="mt-4 font-body text-xs uppercase tracking-wide text-white/40">
                Format : {c.format}
              </p>
            </div>
          ))
        ) : (
          <p className="font-body text-white/50">
            Aucune compétition publiée pour le moment — revenez bientôt.
          </p>
        )}
      </div>
    </div>
  );
}
