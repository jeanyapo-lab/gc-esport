"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { attribuerTropheeEquipe, attribuerTropheeJoueur, attribuerTropheeEntreprise, type Trophy } from "@/lib/trophies";
import { notify, getUserIdFromPlayerId, getUserIdsFromCompanyId } from "@/lib/notify";

type Edition = { id: string; nom: string; competition_id: string; date_fin: string | null };
type Competition = { id: string; nom: string };
type Team = { id: string; nom: string; company_id: string };
type Player = { id: string; pseudo: string };
type Company = { id: string; nom: string };

const typeLabel: Record<string, string> = { equipe: "Équipe", joueur: "Joueur", entreprise: "Entreprise" };

export default function AdminPalmaresPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState(false);

  const [editions, setEditions] = useState<Edition[]>([]);
  const [competitionsMap, setCompetitionsMap] = useState<Record<string, string>>({});
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [trophies, setTrophies] = useState<Trophy[]>([]);

  const [editionId, setEditionId] = useState("");
  const [type, setType] = useState<"equipe" | "joueur" | "entreprise">("equipe");
  const [cibleId, setCibleId] = useState("");
  const [titre, setTitre] = useState("Champion");
  const [dateObtention, setDateObtention] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function init() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.push("/connexion");
        return;
      }
      setUserId(sessionData.session.user.id);
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", sessionData.session.user.id).single();
      const adminRoles = ["super_admin", "admin", "responsable_competitions"];
      if (!profile || !adminRoles.includes(profile.role)) {
        setAuthorized(false);
        setChecking(false);
        return;
      }
      setAuthorized(true);

      const { data: editionsData } = await supabase
        .from("editions")
        .select("id, nom, competition_id, date_fin")
        .order("created_at", { ascending: false });
      setEditions(editionsData ?? []);

      const { data: compsData } = await supabase.from("competitions").select("id, nom");
      setCompetitionsMap(Object.fromEntries((compsData ?? []).map((c) => [c.id, c.nom])));

      const { data: companiesData } = await supabase.from("companies").select("id, nom");
      setCompanies(companiesData ?? []);

      await loadTrophies();
      setChecking(false);
    }
    init();
  }, [router]);

  useEffect(() => {
    if (editionId) {
      loadTeamsAndPlayers();
      const ed = editions.find((e) => e.id === editionId);
      setDateObtention(ed?.date_fin ?? new Date().toISOString().slice(0, 10));
    }
  }, [editionId]);

  async function loadTrophies() {
    const { data } = await supabase
      .from("trophies")
      .select("id, edition_id, type, titre, team_id, player_id, company_id, date_obtention")
      .order("date_obtention", { ascending: false });
    setTrophies(data ?? []);
  }

  async function loadTeamsAndPlayers() {
    const { data: teamsData } = await supabase.from("teams").select("id, nom, company_id").eq("edition_id", editionId);
    setTeams(teamsData ?? []);

    const teamIds = (teamsData ?? []).map((t) => t.id);
    if (teamIds.length > 0) {
      const { data: assignments } = await supabase.from("team_assignments").select("player_id").in("team_id", teamIds);
      const playerIds = Array.from(new Set((assignments ?? []).map((a) => a.player_id)));
      if (playerIds.length > 0) {
        const { data: playersData } = await supabase.from("player_profiles").select("id, pseudo").in("id", playerIds);
        setPlayers(playersData ?? []);
      } else {
        setPlayers([]);
      }
    } else {
      setPlayers([]);
    }
  }

  function editionLabel(edId: string) {
    const ed = editions.find((e) => e.id === edId);
    if (!ed) return "—";
    return `${competitionsMap[ed.competition_id] ?? "Compétition"} — ${ed.nom}`;
  }

  function cibleLabel(t: Trophy) {
    if (t.team_id) return teams.find((tm) => tm.id === t.team_id)?.nom ?? "Équipe";
    if (t.player_id) return players.find((p) => p.id === t.player_id)?.pseudo ?? "Joueur";
    if (t.company_id) return companies.find((c) => c.id === t.company_id)?.nom ?? "Entreprise";
    return "—";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editionId || !cibleId || !titre.trim()) return;
    setSubmitting(true);

    let result: { error?: string } = {};
    if (type === "equipe") {
      result = await attribuerTropheeEquipe(editionId, cibleId, titre.trim(), dateObtention, userId);
    } else if (type === "joueur") {
      result = await attribuerTropheeJoueur(editionId, cibleId, titre.trim(), dateObtention, userId);
    } else {
      result = await attribuerTropheeEntreprise(editionId, cibleId, titre.trim(), dateObtention, userId);
    }

    setSubmitting(false);

    if (result.error) {
      alert("Erreur : " + result.error);
      return;
    }

    // Notifications
    if (type === "equipe") {
      const team = teams.find((t) => t.id === cibleId);
      if (team) {
        const userIds = await getUserIdsFromCompanyId(team.company_id);
        for (const uid of userIds) {
          await notify(uid, "🏆 Trophée remporté !", `« ${titre} » — ${editionLabel(editionId)}`);
        }
      }
    } else if (type === "joueur") {
      const uid = await getUserIdFromPlayerId(cibleId);
      await notify(uid, "🏆 Trophée remporté !", `« ${titre} » — ${editionLabel(editionId)}`);
    } else {
      const userIds = await getUserIdsFromCompanyId(cibleId);
      for (const uid of userIds) {
        await notify(uid, "🏆 Trophée remporté !", `« ${titre} » — ${editionLabel(editionId)}`);
      }
    }

    setCibleId("");
    setTitre("Champion");
    await loadTrophies();
  }

  async function handleDelete(id: string) {
    if (!confirm("Retirer ce trophée ? Cette action est irréversible.")) return;
    await supabase.from("trophies").delete().eq("id", id);
    await loadTrophies();
  }

  if (checking) return <div className="px-6 py-24 text-center font-body text-white/50">Chargement…</div>;
  if (!authorized) return <div className="mx-auto max-w-lg px-6 py-32 text-center"><h1 className="font-display text-3xl text-orange">Accès refusé</h1></div>;

  return (
    <div className="mx-auto max-w-4xl px-6 py-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl">Palmarès</h1>
          <p className="mt-2 font-body text-sm text-white/60">
            Attribue un trophée à une équipe (crédité automatiquement à l'entreprise et à chaque joueur du roster),
            à un joueur, ou à une entreprise directement.
          </p>
        </div>
        <Link href="/admin" className="font-body text-sm text-white/50 hover:text-white">← Retour à l'admin</Link>
      </div>

      <section className="mt-10 rounded-2xl border border-line bg-panel p-6">
        <p className="font-display text-lg text-lime">Attribuer un trophée</p>
        <form onSubmit={handleSubmit} className="mt-4 grid gap-4 sm:grid-cols-2">
          <select value={editionId} onChange={(e) => setEditionId(e.target.value)} className="input sm:col-span-2" required>
            <option value="">— Édition / championnat —</option>
            {editions.map((ed) => (
              <option key={ed.id} value={ed.id}>{editionLabel(ed.id)}</option>
            ))}
          </select>

          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value as any);
              setCibleId("");
            }}
            className="input"
          >
            <option value="equipe">Équipe</option>
            <option value="joueur">Joueur</option>
            <option value="entreprise">Entreprise</option>
          </select>

          <select value={cibleId} onChange={(e) => setCibleId(e.target.value)} className="input" required>
            <option value="">— Choisir —</option>
            {type === "equipe" && teams.map((t) => <option key={t.id} value={t.id}>{t.nom}</option>)}
            {type === "joueur" && players.map((p) => <option key={p.id} value={p.id}>{p.pseudo}</option>)}
            {type === "entreprise" && companies.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>

          <input
            placeholder="Titre du trophée (ex : Champion, Vice-champion, MVP)"
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            className="input"
            required
          />
          <input type="date" value={dateObtention} onChange={(e) => setDateObtention(e.target.value)} className="input" required />

          <button
            type="submit"
            disabled={submitting}
            className="sm:col-span-2 rounded-full bg-orange px-6 py-3 font-body text-sm font-semibold text-ink hover:bg-lime disabled:opacity-50"
          >
            {submitting ? "Attribution…" : "🏆 Attribuer le trophée"}
          </button>
        </form>
      </section>

      <section className="mt-10">
        <p className="font-display text-lg text-lime">Trophées attribués</p>
        <div className="mt-4 space-y-2">
          {trophies.map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-lg border border-line px-4 py-3 font-body text-sm">
              <span>
                🏆 {t.titre} — <span className="text-lime">{cibleLabel(t)}</span>{" "}
                <span className="text-white/40">({typeLabel[t.type]})</span>
              </span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-white/40">{new Date(t.date_obtention).toLocaleDateString("fr-FR")}</span>
                <button onClick={() => handleDelete(t.id)} className="text-xs text-white/40 hover:text-orange">Retirer</button>
              </div>
            </div>
          ))}
          {trophies.length === 0 && <p className="font-body text-sm text-white/40">Aucun trophée attribué pour le moment.</p>}
        </div>
      </section>
    </div>
  );
}
