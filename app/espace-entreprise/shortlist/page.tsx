"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Entry = { id: string; player_id: string; notes: string | null };
type Player = { id: string; pseudo: string; ville: string | null; photo_url: string | null };

export default function ShortlistPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [playersMap, setPlayersMap] = useState<Record<string, Player>>({});
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      router.push("/connexion");
      return;
    }
    const { data: rep } = await supabase.from("company_reps").select("company_id").eq("user_id", sessionData.session.user.id).single();
    if (!rep) {
      setLoading(false);
      return;
    }
    setCompanyId(rep.company_id);

    const { data: entriesData } = await supabase.from("shortlist_entries").select("id, player_id, notes").eq("company_id", rep.company_id);
    setEntries(entriesData ?? []);

    const playerIds = (entriesData ?? []).map((e) => e.player_id);
    if (playerIds.length > 0) {
      const { data: playersData } = await supabase.from("player_profiles").select("id, pseudo, ville, photo_url").in("id", playerIds);
      const map: Record<string, Player> = {};
      (playersData ?? []).forEach((p) => (map[p.id] = p));
      setPlayersMap(map);
    }

    setLoading(false);
  }

  async function handleSaveNotes(entryId: string) {
    const notes = notesDraft[entryId] ?? "";
    await supabase.from("shortlist_entries").update({ notes }).eq("id", entryId);
    await load();
  }

  async function handleRemove(entryId: string) {
    await supabase.from("shortlist_entries").delete().eq("id", entryId);
    await load();
  }

  if (loading) return <div className="px-6 py-24 text-center font-body text-white/50">Chargement…</div>;

  return (
    <div className="mx-auto max-w-3xl px-6 py-24">
      <Link href="/espace-entreprise" className="font-body text-sm text-white/50 hover:text-white">← Retour à mon espace</Link>
      <h1 className="mt-4 font-display text-4xl">Ma shortlist</h1>
      <p className="mt-3 font-body text-sm text-white/60">
        Vos joueurs suivis en privé — invisible par les autres entreprises et par les joueurs eux-mêmes.
      </p>

      <div className="mt-10 space-y-4">
        {entries.map((e) => {
          const player = playersMap[e.player_id];
          if (!player) return null;
          return (
            <div key={e.id} className="rounded-2xl border border-line bg-panel p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {player.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={player.photo_url} alt={player.pseudo} className="h-12 w-12 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ink font-display text-orange">
                      {player.pseudo.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-body font-semibold">{player.pseudo}</p>
                    <p className="font-body text-xs text-white/50">{player.ville}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/joueurs/${player.id}`} className="rounded-full border border-white/20 px-3 py-2 font-body text-xs hover:border-white/50">
                    Voir profil
                  </Link>
                  <button onClick={() => handleRemove(e.id)} className="rounded-full border border-white/20 px-3 py-2 font-body text-xs text-white/50 hover:border-orange hover:text-orange">
                    Retirer
                  </button>
                </div>
              </div>
              <textarea
                placeholder="Notes privées sur ce joueur..."
                rows={2}
                defaultValue={e.notes ?? ""}
                onChange={(ev) => setNotesDraft((prev) => ({ ...prev, [e.id]: ev.target.value }))}
                className="input mt-4"
              />
              <button
                onClick={() => handleSaveNotes(e.id)}
                className="mt-2 rounded-full border border-lime px-4 py-2 font-body text-xs font-semibold text-lime hover:bg-lime hover:text-ink"
              >
                Enregistrer la note
              </button>
            </div>
          );
        })}
        {entries.length === 0 && (
          <p className="font-body text-sm text-white/40">
            Aucun joueur dans ta shortlist — ajoute-en depuis la page Recrutement.
          </p>
        )}
      </div>
    </div>
  );
}
