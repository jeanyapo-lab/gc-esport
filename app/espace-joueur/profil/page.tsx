"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Game = { id: string; nom: string };

export default function ProfilJoueurPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [playerId, setPlayerId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [statut, setStatut] = useState<string>("inscription_incomplete");
  const [games, setGames] = useState<Game[]>([]);
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [ville, setVille] = useState("");
  const [dateNaissance, setDateNaissance] = useState("");
  const [niveauDeclare, setNiveauDeclare] = useState("");
  const [experienceCompetitive, setExperienceCompetitive] = useState("");
  const [palmares, setPalmares] = useState("");
  const [disponibilites, setDisponibilites] = useState("");
  const [liensVideos, setLiensVideos] = useState("");

  const [gameId, setGameId] = useState("");
  const [plateforme, setPlateforme] = useState("");
  const [identifiantGaming, setIdentifiantGaming] = useState("");

  useEffect(() => {
    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.push("/connexion");
        return;
      }
      const uid = sessionData.session.user.id;
      setUserId(uid);

      const { data: gamesData } = await supabase.from("games").select("id, nom").eq("actif", true);
      setGames(gamesData ?? []);

      const { data: player } = await supabase
        .from("player_profiles")
        .select(
          "id, statut, ville, date_naissance, niveau_declare, experience_competitive, palmares, disponibilites, liens_videos, photo_url"
        )
        .eq("user_id", uid)
        .single();

      if (player) {
        setPlayerId(player.id);
        setStatut(player.statut);
        setPhotoUrl(player.photo_url ?? "");
        setVille(player.ville ?? "");
        setDateNaissance(player.date_naissance ?? "");
        setNiveauDeclare(player.niveau_declare ?? "");
        setExperienceCompetitive(player.experience_competitive ?? "");
        setPalmares(player.palmares ?? "");
        setDisponibilites(player.disponibilites ?? "");
        setLiensVideos((player.liens_videos ?? []).join(", "));

        const { data: account } = await supabase
          .from("player_game_accounts")
          .select("game_id, plateforme, identifiant_gaming")
          .eq("player_id", player.id)
          .limit(1)
          .maybeSingle();

        if (account) {
          setGameId(account.game_id);
          setPlateforme(account.plateforme ?? "");
          setIdentifiantGaming(account.identifiant_gaming ?? "");
        }
      }

      setLoading(false);
    }
    load();
  }, [router]);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    setUploadingPhoto(true);
    const ext = file.name.split(".").pop();
    const path = `players/${userId}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, {
      upsert: true,
    });

    if (uploadError) {
      setError("Erreur lors de l'envoi de la photo : " + uploadError.message);
      setUploadingPhoto(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(path);
    setPhotoUrl(publicUrlData.publicUrl);
    setUploadingPhoto(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!playerId) return;
    setError(null);
    setSuccess(false);
    setSaving(true);

    const liensArray = liensVideos
      .split(",")
      .map((l) => l.trim())
      .filter(Boolean);

    const nouveauStatut = statut === "inscription_incomplete" ? "en_attente_verification" : statut;

    const { error: updateError } = await supabase
      .from("player_profiles")
      .update({
        ville,
        date_naissance: dateNaissance || null,
        niveau_declare: niveauDeclare,
        experience_competitive: experienceCompetitive,
        palmares,
        disponibilites,
        liens_videos: liensArray,
        photo_url: photoUrl || null,
        statut: nouveauStatut,
      })
      .eq("id", playerId);

    if (updateError) {
      setError("Une erreur est survenue : " + updateError.message);
      setSaving(false);
      return;
    }

    if (gameId) {
      const { error: accountError } = await supabase
        .from("player_game_accounts")
        .upsert(
          {
            player_id: playerId,
            game_id: gameId,
            plateforme,
            identifiant_gaming: identifiantGaming,
          },
          { onConflict: "player_id,game_id" }
        );

      if (accountError) {
        setError("Une erreur est survenue : " + accountError.message);
        setSaving(false);
        return;
      }
    }

    setStatut(nouveauStatut);
    setSaving(false);
    setSuccess(true);
  }

  if (loading) {
    return <div className="px-6 py-24 text-center font-body text-white/50">Chargement…</div>;
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-24">
      <h1 className="font-display text-4xl">Compléter mon profil</h1>
      <p className="mt-3 font-body text-sm text-white/60">
        Plus ton profil est complet, plus tu as de chances d'être repéré.
      </p>

      <form onSubmit={handleSubmit} className="mt-10 space-y-8">
        <section>
          <p className="font-display text-lg text-lime">Photo de profil</p>
          <div className="mt-4 flex items-center gap-5">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt="Photo de profil" className="h-20 w-20 rounded-full object-cover" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-panel font-display text-2xl text-orange">
                ?
              </div>
            )}
            <label className="cursor-pointer rounded-full border border-white/20 px-5 py-2 font-body text-sm hover:border-white/50">
              {uploadingPhoto ? "Envoi…" : "Choisir une photo"}
              <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" disabled={uploadingPhoto} />
            </label>
          </div>
        </section>

        <section>
          <p className="font-display text-lg text-lime">Informations générales</p>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <Field label="Ville">
              <input value={ville} onChange={(e) => setVille(e.target.value)} className="input" />
            </Field>
            <Field label="Date de naissance">
              <input
                type="date"
                value={dateNaissance}
                onChange={(e) => setDateNaissance(e.target.value)}
                className="input"
              />
            </Field>
          </div>
        </section>

        <section>
          <p className="font-display text-lg text-lime">Jeu & niveau</p>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <Field label="Jeu">
              <select value={gameId} onChange={(e) => setGameId(e.target.value)} className="input">
                <option value="">— Choisir —</option>
                {games.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nom}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Plateforme">
              <input
                placeholder="PS5, PC..."
                value={plateforme}
                onChange={(e) => setPlateforme(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Identifiant gaming">
              <input
                value={identifiantGaming}
                onChange={(e) => setIdentifiantGaming(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Niveau déclaré">
              <input
                placeholder="Division 2..."
                value={niveauDeclare}
                onChange={(e) => setNiveauDeclare(e.target.value)}
                className="input"
              />
            </Field>
          </div>
        </section>

        <section>
          <p className="font-display text-lg text-lime">Expérience</p>
          <div className="mt-4 space-y-5">
            <Field label="Expérience compétitive">
              <textarea
                rows={3}
                value={experienceCompetitive}
                onChange={(e) => setExperienceCompetitive(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Palmarès">
              <textarea
                rows={2}
                value={palmares}
                onChange={(e) => setPalmares(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Liens vidéos (séparés par une virgule)">
              <input
                value={liensVideos}
                onChange={(e) => setLiensVideos(e.target.value)}
                className="input"
              />
            </Field>
          </div>
        </section>

        <section>
          <p className="font-display text-lg text-lime">Disponibilités</p>
          <div className="mt-4">
            <Field label="Décris tes disponibilités (jours, créneaux...)">
              <textarea
                rows={3}
                value={disponibilites}
                onChange={(e) => setDisponibilites(e.target.value)}
                className="input"
              />
            </Field>
          </div>
        </section>

        {error && <p className="font-body text-sm text-red-400">{error}</p>}
        {success && (
          <p className="font-body text-sm text-lime">Profil mis à jour avec succès.</p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-full bg-orange px-7 py-3 font-body font-semibold text-ink transition hover:bg-lime disabled:opacity-50"
        >
          {saving ? "Enregistrement…" : "Enregistrer mon profil"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="font-body text-sm text-white/70">{label}</label>
      <div className="mt-2">{children}</div>
    </div>
  );
}
