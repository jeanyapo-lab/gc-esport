"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getPlayerCardStats, getOverallScore } from "@/lib/playerStats";
import { notify, getUserIdFromPlayerId, getAdminUserIds } from "@/lib/notify";

type Team = { id: string; nom: string; edition_id: string };
type Edition = { id: string; nom: string; competition_id: string };
type Competition = { id: string; nom: string };
type Player = { id: string; pseudo: string; photo_url: string | null; ville: string | null };
type Termination = { id: string; player_id: string; statut: string };

export default function MonEquipePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [editionsMap, setEditionsMap] = useState<Record<string, string>>({});
  const [rosterByTeam, setRosterByTeam] = useState<Record<string, Player[]>>({});
  const [scores, setScores] = useState<Record<string, number>>({});
  const [terminations, setTerminations] = useState<Termination[]>([]);

  const [ruptureTeamId, setRuptureTeamId] = useState<string | null>(null);
  const [rupturePlayer, setRupturePlayer] = useState<Player | null>(null);
  const [ruptureMotif, setRuptureMotif] = useState("");
  const [ruptureFile, setRuptureFile] = useState<File | null>(null);
  const [ruptureSubmitting, setRuptureSubmitting] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      router.push("/connexion");
      return;
    }
    setUserId(sessionData.session.user.id);
    const { data: rep } = await supabase.from("company_reps").select("company_id").eq("user_id", sessionData.session.user.id).single();
    if (!rep) {
      setLoading(false);
      return;
    }
    setCompanyId(rep.company_id);

    const { data: terminationsData } = await supabase
      .from("contract_terminations")
      .select("id, player_id, statut")
      .eq("company_id", rep.company_id)
      .eq("statut", "en_attente_gcesport");
    setTerminations(terminationsData ?? []);

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

  function openRupture(teamId: string, player: Player) {
    setRuptureTeamId(teamId);
    setRupturePlayer(player);
    setRuptureMotif("");
    setRuptureFile(null);
  }

  function terminationEnCours(playerId: string) {
    return terminations.some((t) => t.player_id === playerId);
  }

  async function handleSubmitRupture(e: React.FormEvent) {
    e.preventDefault();
    if (!rupturePlayer || !ruptureTeamId || !companyId || !userId || !ruptureMotif.trim()) return;

    const team = teams.find((t) => t.id === ruptureTeamId);
    if (!team) return;

    setRuptureSubmitting(true);

    let justificatifUrl: string | null = null;
    if (ruptureFile) {
      const path = `${userId}/ruptures/${Date.now()}-${ruptureFile.name}`;
      const { error: uploadError } = await supabase.storage.from("documents").upload(path, ruptureFile);
      if (uploadError) {
        alert("Erreur lors de l'envoi du justificatif : " + uploadError.message);
        setRuptureSubmitting(false);
        return;
      }
      justificatifUrl = path;
    }

    const { error } = await supabase.from("contract_terminations").insert({
      team_id: ruptureTeamId,
      player_id: rupturePlayer.id,
      company_id: companyId,
      edition_id: team.edition_id,
      motif: ruptureMotif.trim(),
      justificatif_url: justificatifUrl,
      demandee_par: userId,
      statut: "en_attente_gcesport",
    });

    setRuptureSubmitting(false);

    if (error) {
      alert("La demande de rupture n'a pas pu être envoyée : " + error.message);
      return;
    }

    const playerUserId = await getUserIdFromPlayerId(rupturePlayer.id);
    await notify(
      playerUserId,
      "Demande de rupture de contrat",
      "Votre entreprise souhaite mettre fin à votre contrat. Vous pouvez apporter une réponse depuis votre espace — c'est GC ESPORT qui tranchera."
    );
    const adminIds = await getAdminUserIds();
    for (const uid of adminIds) {
      await notify(uid, "Demande de rupture de contrat", `Une entreprise demande à rompre le contrat de ${rupturePlayer.pseudo}. Ton arbitrage est nécessaire.`);
    }

    setRuptureTeamId(null);
    setRupturePlayer(null);
    await load();
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
                <div key={p.id} className="rounded-2xl border border-line bg-panel p-4">
                  <Link href={`/joueurs/${p.id}`} className="block transition hover:opacity-80">
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
                  {terminationEnCours(p.id) ? (
                    <p className="mt-3 font-body text-[11px] text-orange">Rupture en cours d'arbitrage par GC ESPORT</p>
                  ) : (
                    <button
                      onClick={() => openRupture(team.id, p)}
                      className="mt-3 w-full rounded-full border border-white/20 px-3 py-1.5 font-body text-[11px] text-white/50 hover:border-orange hover:text-orange"
                    >
                      Rompre le contrat
                    </button>
                  )}
                </div>
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

      {rupturePlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6">
          <div className="w-full max-w-md rounded-2xl border border-line bg-panel p-6">
            <p className="font-display text-lg text-orange">Rompre le contrat de {rupturePlayer.pseudo}</p>
            <p className="mt-2 font-body text-xs text-white/60">
              Le joueur sera notifié et pourra apporter une réponse. C'est GC ESPORT qui validera ou annulera la
              rupture — le joueur reste dans votre effectif tant que la décision n'est pas rendue.
            </p>
            <form onSubmit={handleSubmitRupture} className="mt-4 space-y-3">
              <textarea
                placeholder="Motif de la rupture..."
                rows={3}
                value={ruptureMotif}
                onChange={(e) => setRuptureMotif(e.target.value)}
                className="input"
                required
              />
              <div>
                <label className="font-body text-xs text-white/60">Justificatif (optionnel)</label>
                <input
                  type="file"
                  onChange={(e) => setRuptureFile(e.target.files?.[0] ?? null)}
                  className="mt-1 block w-full font-body text-xs text-white/60"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={ruptureSubmitting}
                  className="flex-1 rounded-full bg-orange px-4 py-2 font-body text-sm font-semibold text-ink hover:bg-lime disabled:opacity-50"
                >
                  {ruptureSubmitting ? "Envoi…" : "Envoyer à GC ESPORT"}
                </button>
                <button
                  type="button"
                  onClick={() => setRupturePlayer(null)}
                  className="rounded-full border border-white/20 px-4 py-2 font-body text-sm text-white/60"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
