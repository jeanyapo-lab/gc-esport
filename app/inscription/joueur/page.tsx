"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Game = { id: string; nom: string };

const plateformes = [
  { value: "console", label: "Console" },
  { value: "mobile", label: "Mobile" },
  { value: "pc", label: "PC" },
];

export default function InscriptionJoueurPage() {
  const router = useRouter();
  const [pseudo, setPseudo] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ville, setVille] = useState("");
  const [dateNaissance, setDateNaissance] = useState("");
  const [plateformePrincipale, setPlateformePrincipale] = useState("console");
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGames, setSelectedGames] = useState<Record<string, string>>({}); // game_id -> identifiant_gaming
  const [loading, setLoading] = useState(false);
  const [piege, setPiege] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [acceptCgu, setAcceptCgu] = useState(false);

  useEffect(() => {
    supabase
      .from("games")
      .select("id, nom")
      .eq("actif", true)
      .then(({ data }) => setGames(data ?? []));
  }, []);

  function toggleGame(gameId: string) {
    setSelectedGames((prev) => {
      const next = { ...prev };
      if (gameId in next) delete next[gameId];
      else next[gameId] = "";
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (piege) return; // anti-spam silencieux
    setError(null);
    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: "joueur",
          pseudo,
          ville,
          date_naissance: dateNaissance,
          plateforme_principale: plateformePrincipale,
          games: Object.entries(selectedGames).map(([game_id, identifiant_gaming]) => ({
            game_id,
            identifiant_gaming,
          })),
        },
      },
    });

    if (signUpError) {
      setError(traduireErreur(signUpError.message));
      setLoading(false);
      return;
    }

    setLoading(false);

    if (!data.session) {
      // Confirmation par e-mail requise avant de pouvoir se connecter
      setNeedsConfirmation(true);
      return;
    }

    router.push("/espace-joueur");
  }

  if (needsConfirmation) {
    return (
      <div className="mx-auto max-w-xl px-6 py-32 text-center">
        <h1 className="font-display text-3xl text-lime">Vérifie tes e-mails</h1>
        <p className="mt-6 font-body text-white/70">
          Un lien de confirmation vient de t'être envoyé à {email}. Clique
          dessus pour activer ton compte, puis reviens te connecter.
        </p>
        <Link href="/connexion" className="mt-8 inline-block font-body text-orange hover:underline">
          Aller à la connexion →
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-6 py-24">
      <h1 className="font-display text-4xl">Inscription joueur</h1>
      <p className="mt-3 font-body text-sm text-white/60">
        Quelques informations pour créer ton profil gaming.
      </p>

      <form onSubmit={handleSubmit} className="mt-10 space-y-5">
        <input
          type="text"
          value={piege}
          onChange={(e) => setPiege(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
        />
        <Field label="Pseudo gaming">
          <input
            required
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value)}
            className="input"
          />
        </Field>
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
        <Field label="Tu joues plutôt sur...">
          <div className="flex gap-3">
            {plateformes.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPlateformePrincipale(p.value)}
                className={`flex-1 rounded-lg border px-3 py-2 font-body text-sm ${
                  plateformePrincipale === p.value ? "border-orange bg-orange/10 text-orange" : "border-line text-white/60"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Jeux auxquels tu peux compétir">
          <div className="space-y-2">
            {games.map((g) => (
              <div key={g.id}>
                <label className="flex items-center gap-3 font-body text-sm text-white/70">
                  <input type="checkbox" checked={g.id in selectedGames} onChange={() => toggleGame(g.id)} />
                  {g.nom}
                </label>
                {g.id in selectedGames && (
                  <input
                    placeholder={`Identifiant gaming sur ${g.nom} (optionnel)`}
                    value={selectedGames[g.id]}
                    onChange={(e) => setSelectedGames((prev) => ({ ...prev, [g.id]: e.target.value }))}
                    className="input mt-2"
                  />
                )}
              </div>
            ))}
            {games.length === 0 && <p className="font-body text-xs text-white/40">Aucun jeu disponible pour le moment.</p>}
          </div>
        </Field>

        <Field label="E-mail">
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Mot de passe">
          <input
            required
            minLength={6}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
          />
        </Field>

        <label className="flex items-start gap-3 font-body text-sm text-white/70">
          <input
            required
            type="checkbox"
            checked={acceptCgu}
            onChange={(e) => setAcceptCgu(e.target.checked)}
            className="mt-1"
          />
          <span>
            J'accepte les{" "}
            <Link href="/cgu" target="_blank" className="text-orange hover:underline">
              conditions d'utilisation
            </Link>{" "}
            et la{" "}
            <Link href="/confidentialite" target="_blank" className="text-orange hover:underline">
              politique de confidentialité
            </Link>
            .
          </span>
        </label>

        {error && <p className="font-body text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading || !acceptCgu}
          className="w-full rounded-full bg-orange px-7 py-3 font-body font-semibold text-ink transition hover:bg-lime disabled:opacity-50"
        >
          {loading ? "Création en cours…" : "Créer mon compte joueur"}
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

function traduireErreur(message: string) {
  if (message.includes("already registered")) return "Cette adresse e-mail est déjà utilisée.";
  if (message.includes("Password")) return "Le mot de passe doit faire au moins 6 caractères.";
  return "Une erreur est survenue : " + message;
}
