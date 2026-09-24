"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Team = { id: string; nom: string };
type Player = { id: string; pseudo: string; photo_url: string | null };
type Assignment = { id: string; player_id: string; titulaire: boolean };

export default function AdminEquipeGCPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const [team, setTeam] = useState<Team | null>(null);
  const [nomEquipe, setNomEquipe] = useState("GC ESPORT");
  const [creating, setCreating] = useState(false);

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState("");

  useEffect(() => {
    async function init() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.push("/connexion");
        return;
      }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", sessionData.session.user.id).single();
      const adminRoles = ["super_admin", "admin", "responsable_competitions", "responsable_joueurs"];
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
    const { data: teamData } = await supabase
      .from("teams")
      .select("id, nom")
      .eq("est_equipe_gc", true)
      .maybeSingle();
    setTeam(teamData);

    const { data: playersData } = await supabase.from("player_profiles").select("id, pseudo, photo_url").order("pseudo");
    setAllPlayers(playersData ?? []);

    if (teamData) {
      const { data: assignData } = await supabase
        .from("team_assignments")
        .select("id, player_id, titulaire")
        .eq("team_id", teamData.id);
      setAssignments(assignData ?? []);
    }
  }

  async function handleCreateTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!nomEquipe.trim()) return;
    setCreating(true);
    await supabase.from("teams").insert({
      nom: nomEquipe,
      est_equipe_gc: true,
      company_id: null,
      edition_id: null,
    });
    setCreating(false);
    await loadAll();
  }

  async function handleAddPlayer(e: React.FormEvent) {
    e.preventDefault();
    if (!team || !selectedPlayerId) return;
    await supabase.from("team_assignments").insert({ team_id: team.id, player_id: selectedPlayerId, titulaire: true });
    setSelectedPlayerId("");
    await loadAll();
  }

  async function handleRemovePlayer(assignmentId: string) {
    await supabase.from("team_assignments").delete().eq("id", assignmentId);
    await loadAll();
  }

  async function handleToggleTitulaire(assignment: Assignment) {
    await supabase.from("team_assignments").update({ titulaire: !assignment.titulaire }).eq("id", assignment.id);
    await loadAll();
  }

  function playerInfo(id: string) {
    return allPlayers.find((p) => p.id === id);
  }

  if (checking) return <div className="px-6 py-24 text-center font-body text-white/50">Chargement…</div>;
  if (!authorized) return <div className="mx-auto max-w-lg px-6 py-32 text-center"><h1 className="font-display text-3xl text-orange">Accès refusé</h1></div>;

  const assignedIds = new Set(assignments.map((a) => a.player_id));
  const availablePlayers = allPlayers.filter((p) => !assignedIds.has(p.id));

  return (
    <div className="mx-auto max-w-3xl px-6 py-24">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl">Équipe GC ESPORT</h1>
        <Link href="/admin" className="font-body text-sm text-white/50 hover:text-white">← Retour à l'admin</Link>
      </div>
      <p className="mt-3 font-body text-sm text-white/60">
        Le roster propre à l'association, indépendant des entreprises participantes — visible sur{" "}
        <Link href="/notre-equipe" className="text-orange hover:underline">/notre-equipe</Link>.
      </p>

      {!team ? (
        <section className="mt-10 rounded-2xl border border-line bg-panel p-6">
          <p className="font-display text-lg text-lime">Créer l'équipe</p>
          <form onSubmit={handleCreateTeam} className="mt-4 flex gap-3">
            <input value={nomEquipe} onChange={(e) => setNomEquipe(e.target.value)} className="input flex-1" />
            <button type="submit" disabled={creating} className="rounded-full bg-orange px-6 py-3 font-body text-sm font-semibold text-ink hover:bg-lime disabled:opacity-50">
              {creating ? "Création…" : "Créer"}
            </button>
          </form>
        </section>
      ) : (
        <>
          <section className="mt-10 rounded-2xl border border-line bg-panel p-6">
            <p className="font-display text-lg text-lime">Ajouter un joueur</p>
            <form onSubmit={handleAddPlayer} className="mt-4 flex gap-3">
              <select value={selectedPlayerId} onChange={(e) => setSelectedPlayerId(e.target.value)} className="input flex-1">
                <option value="">— Choisir un joueur —</option>
                {availablePlayers.map((p) => (
                  <option key={p.id} value={p.id}>{p.pseudo}</option>
                ))}
              </select>
              <button type="submit" className="rounded-full bg-lime px-6 py-3 font-body text-sm font-semibold text-ink">
                Ajouter
              </button>
            </form>
          </section>

          <section className="mt-8 space-y-3">
            <p className="font-display text-lg text-lime">Effectif ({assignments.length})</p>
            {assignments.map((a) => {
              const p = playerInfo(a.player_id);
              return (
                <div key={a.id} className="flex items-center justify-between rounded-2xl border border-line bg-panel p-4">
                  <div className="flex items-center gap-3">
                    {p?.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.photo_url} alt={p.pseudo} className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ink font-display text-sm text-orange">
                        {p?.pseudo?.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <p className="font-body text-sm font-semibold">{p?.pseudo ?? "Joueur"}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleTitulaire(a)}
                      className={`rounded-full px-3 py-1 font-body text-xs ${a.titulaire ? "bg-lime text-ink" : "border border-white/20 text-white/60"}`}
                    >
                      {a.titulaire ? "Titulaire" : "Remplaçant"}
                    </button>
                    <button onClick={() => handleRemovePlayer(a.id)} className="rounded-full border border-white/10 px-3 py-1 font-body text-xs text-white/30 hover:border-orange hover:text-orange">
                      Retirer
                    </button>
                  </div>
                </div>
              );
            })}
            {assignments.length === 0 && <p className="font-body text-sm text-white/40">Aucun joueur pour le moment.</p>}
          </section>
        </>
      )}
    </div>
  );
}
