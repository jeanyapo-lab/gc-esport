"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getPlayerCardStats, getOverallScore } from "@/lib/playerStats";

type Team = { id: string; nom: string; edition_id: string };
type Edition = { id: string; nom: string; competition_id: string };
type Competition = { id: string; nom: string };
type Player = { id: string; pseudo: string; photo_url: string | null; ville: string | null };

export default function MonEquipePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [editionsMap, setEditionsMap] = useState<Record<string, string>>({});
  const [rosterByTeam, setRosterByTeam] = useState<Record<string, Player[]>>({});
  const [scores, setScores] = useState<Record<string, number>>({});

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

    const { data: teamsData } = await supabase.from("teams").select("id, nom, edition_id").eq("company_id", rep.company_id);
    setTeams(teamsData ?? []);

    const editionIds = Array.from(new Set((teamsData ?? []).map((t) => t.edition_id).filter(Boolean)));
    if (editionIds.length > 0) {
      const { data: editionsData } = await supabase.from("editions").select("id, nom, competition_id").in("id", editionIds);
      const compIds = Array.from(new Set((editionsData ?? []).map((e) => e.competition_id)));
      const { data: compsData } = await supabase.from("competitions").select("id, nom").in("id", compIds);
      const compMap: Record<string, string> = {};
      (compsData ?? []).forEach((c) => (compMap[c.id] = c.nom));
      const eMap: Record<string, string> = {};
      (editionsData ?? []).forEach((e) => (eMap[e.id] = `${compMap[e.competition_id] ?? "Compétition"} — ${e.nom}`));
      setEditionsMap(eMap);
    }

    const roster: Record<string, Player[]> = {};
    const allScores: Record<string, number> = {};
    for (const team of teamsData ?? []) {
      const { data: assignments } = await supabase.from("team_assignments").select("player_id").eq("team_id", team.id);
      const playerIds = (assignments ?? []).map((a) => a.player_id);
      if (playerIds.length > 0) {
        const { data: playersData } = await supabase.from("player_profiles").select("id, pseudo, photo_url, ville").in("id", playerIds);
        roster[team.id] = playersData ?? [];
        for (const p of playersData ?? []) {
          allScores[p.id] = getOverallScore(await getPlayerCardStats(p.id));
        }
      } else {
        roster[team.id] = [];
      }
    }
    setRosterByTeam(roster);
    setScores(allScores);

    setLoading(false);
  }

  if (loading) return <div className="px-6 py-24 text-center font-body text-white/50">Chargement…</div>;

  return (
    <div className="mx-auto max-w-4xl px-6 py-24">
      <Link href="/espace-entreprise" className="font-body text-sm text-white/50 hover:text-white">← Retour à mon espace</Link>
      <h1 className="mt-4 font-display text-4xl">Mon équipe</h1>
      <p className="mt-3 font-body text-sm text-white/60">
        Vos joueurs confirmés, édition par édition. Un joueur rejoint automatiquement cette liste une fois son
        recrutement finalisé.
      </p>

      <div className="mt-10 space-y-10">
        {teams.map((team) => (
          <section key={team.id}>
            <p className="font-display text-lg text-lime">{editionsMap[team.edition_id] ?? team.nom}</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {(rosterByTeam[team.id] ?? []).map((p) => (
                <Link key={p.id} href={`/joueurs/${p.id}`} className="rounded-2xl border border-line bg-panel p-4 transition hover:border-orange">
                  <div className="flex items-center gap-3">
                    {p.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.photo_url} alt={p.pseudo} className="h-12 w-12 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ink font-display text-sm text-orange">
                        {p.pseudo.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-body text-sm font-semibold">{p.pseudo}</p>
                      <p className="font-body text-xs text-white/40">{p.ville}</p>
                    </div>
                  </div>
                  <p className="mt-2 font-display text-lg text-lime">{scores[p.id] ?? 0}</p>
                </Link>
              ))}
              {(rosterByTeam[team.id] ?? []).length === 0 && (
                <p className="font-body text-sm text-white/40">Aucun joueur confirmé pour cette édition.</p>
              )}
            </div>
          </section>
        ))}
        {teams.length === 0 && <p className="font-body text-white/50">Aucune équipe pour le moment — recrutez via le Draft ou le recrutement libre.</p>}
      </div>

      <div className="mt-10 rounded-2xl border border-line bg-panel p-6">
        <p className="font-body text-sm text-white/60">
          Vous voulez composer un groupe nommé à mettre en avant publiquement ?{" "}
          <Link href="/espace-entreprise/vitrines" className="text-orange hover:underline">
            Voir les vitrines d'équipe →
          </Link>
        </p>
      </div>
    </div>
  );
}
