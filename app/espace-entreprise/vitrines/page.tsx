"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getPlayerCardStats, getOverallScore } from "@/lib/playerStats";

const MAX_VITRINES = 2;

type Player = { id: string; pseudo: string; photo_url: string | null };
type Squad = { id: string; nom: string; publie: boolean };

export default function VitrinesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);

  const [recruitedPlayers, setRecruitedPlayers] = useState<Player[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [squads, setSquads] = useState<Squad[]>([]);
  const [membersMap, setMembersMap] = useState<Record<string, string[]>>({}); // squad_id -> player_id[]

  const [nomVitrine, setNomVitrine] = useState("");
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);

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

    // Joueurs recrutés = présents dans une des équipes de compétition de l'entreprise
    const { data: teams } = await supabase.from("teams").select("id").eq("company_id", rep.company_id);
    const teamIds = (teams ?? []).map((t) => t.id);
    let playerIds: string[] = [];
    if (teamIds.length > 0) {
      const { data: assignments } = await supabase.from("team_assignments").select("player_id").in("team_id", teamIds);
      playerIds = Array.from(new Set((assignments ?? []).map((a) => a.player_id)));
    }

    if (playerIds.length > 0) {
      const { data: playersData } = await supabase.from("player_profiles").select("id, pseudo, photo_url").in("id", playerIds);
      setRecruitedPlayers(playersData ?? []);

      const scoreEntries = await Promise.all(
        (playersData ?? []).map(async (p) => [p.id, getOverallScore(await getPlayerCardStats(p.id))] as const)
      );
      setScores(Object.fromEntries(scoreEntries));
    }

    const { data: squadsData } = await supabase.from("squads").select("id, nom, publie").eq("company_id", rep.company_id);
    setSquads(squadsData ?? []);

    const squadIds = (squadsData ?? []).map((s) => s.id);
    if (squadIds.length > 0) {
      const { data: membersData } = await supabase.from("squad_members").select("squad_id, player_id").in("squad_id", squadIds);
      const map: Record<string, string[]> = {};
      (membersData ?? []).forEach((m) => {
        map[m.squad_id] = [...(map[m.squad_id] ?? []), m.player_id];
      });
      setMembersMap(map);
    }

    setLoading(false);
  }

  function togglePlayer(id: string) {
    setSelectedPlayerIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId || !nomVitrine.trim() || selectedPlayerIds.size === 0) return;
    setCreating(true);

    const { data: squad } = await supabase.from("squads").insert({ company_id: companyId, nom: nomVitrine }).select().single();

    if (squad) {
      await supabase.from("squad_members").insert(Array.from(selectedPlayerIds).map((player_id) => ({ squad_id: squad.id, player_id })));
    }

    setNomVitrine("");
    setSelectedPlayerIds(new Set());
    setCreating(false);
    await load();
  }

  async function handleTogglePublie(squad: Squad) {
    await supabase.from("squads").update({ publie: !squad.publie }).eq("id", squad.id);
    await load();
  }

  async function handleDelete(squadId: string) {
    if (!confirm("Supprimer cette vitrine ?")) return;
    await supabase.from("squads").delete().eq("id", squadId);
    await load();
  }

  function playerInfo(id: string) {
    return recruitedPlayers.find((p) => p.id === id);
  }

  function squadNote(squadId: string) {
    const members = membersMap[squadId] ?? [];
    if (members.length === 0) return 0;
    const total = members.reduce((sum, pid) => sum + (scores[pid] ?? 0), 0);
    return Math.round(total / members.length);
  }

  if (loading) return <div className="px-6 py-24 text-center font-body text-white/50">Chargement…</div>;

  return (
    <div className="mx-auto max-w-3xl px-6 py-24">
      <Link href="/espace-entreprise" className="font-body text-sm text-white/50 hover:text-white">← Retour à mon espace</Link>
      <h1 className="mt-4 font-display text-4xl">Vitrines d'équipe</h1>
      <p className="mt-3 font-body text-sm text-white/60">
        Composez un groupe nommé à partir de vos joueurs recrutés, et publiez-le pour qu'il apparaisse sur la page
        publique{" "}
        <Link href="/equipes" className="text-orange hover:underline">Équipes</Link>
        . Distinct de votre équipe de compétition — jusqu'à {MAX_VITRINES} vitrines.
      </p>

      <section className="mt-10 space-y-4">
        {squads.map((s) => (
          <div key={s.id} className="rounded-2xl border border-line bg-panel p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display text-lg">{s.nom}</p>
                <p className="font-body text-xs text-white/50">Note vitrine : {squadNote(s.id)}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleTogglePublie(s)}
                  className={`rounded-full px-4 py-2 font-body text-xs font-semibold ${s.publie ? "bg-lime text-ink" : "border border-white/20 text-white/70"}`}
                >
                  {s.publie ? "Publiée" : "Publier"}
                </button>
                <button onClick={() => handleDelete(s.id)} className="rounded-full border border-white/10 px-4 py-2 font-body text-xs text-white/30 hover:border-orange hover:text-orange">
                  Supprimer
                </button>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {(membersMap[s.id] ?? []).map((pid) => (
                <span key={pid} className="rounded-full border border-white/20 px-3 py-1 font-body text-xs">
                  {playerInfo(pid)?.pseudo ?? "Joueur"} · {scores[pid] ?? 0}
                </span>
              ))}
            </div>
          </div>
        ))}
        {squads.length === 0 && <p className="font-body text-sm text-white/40">Aucune vitrine créée pour le moment.</p>}
      </section>

      {squads.length < MAX_VITRINES && (
        <section className="mt-10 rounded-2xl border border-line bg-panel p-6">
          <p className="font-display text-lg text-lime">Créer une nouvelle vitrine</p>
          {recruitedPlayers.length === 0 ? (
            <p className="mt-3 font-body text-sm text-white/40">
              Aucun joueur recruté pour le moment — recrutez d'abord via le Draft ou le recrutement libre.
            </p>
          ) : (
            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              <input
                placeholder="Nom de la vitrine (ex: GC Duo Alpha)"
                value={nomVitrine}
                onChange={(e) => setNomVitrine(e.target.value)}
                className="input"
                required
              />
              <div className="space-y-2">
                {recruitedPlayers.map((p) => (
                  <label key={p.id} className="flex items-center gap-3 rounded-lg border border-line px-4 py-2 font-body text-sm">
                    <input type="checkbox" checked={selectedPlayerIds.has(p.id)} onChange={() => togglePlayer(p.id)} />
                    {p.pseudo} <span className="text-white/40">· note {scores[p.id] ?? 0}</span>
                  </label>
                ))}
              </div>
              <button type="submit" disabled={creating || selectedPlayerIds.size === 0} className="rounded-full bg-orange px-6 py-3 font-body text-sm font-semibold text-ink hover:bg-lime disabled:opacity-50">
                {creating ? "Création…" : "Créer la vitrine"}
              </button>
            </form>
          )}
        </section>
      )}
    </div>
  );
}
