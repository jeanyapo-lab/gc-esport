import Link from "next/link";

export default function InscriptionPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-24">
      <h1 className="font-display text-5xl">Rejoindre GC ESPORT</h1>
      <p className="mt-4 font-body text-white/60">
        Choisis le profil qui te correspond.
      </p>

      <div className="mt-14 grid gap-6 sm:grid-cols-2">
        <Link
          href="/inscription/joueur"
          className="group rounded-2xl border border-line bg-panel p-8 transition hover:border-orange"
        >
          <p className="font-display text-2xl text-lime">Je suis joueur</p>
          <p className="mt-3 font-body text-sm text-white/60">
            Crée ton profil gaming, participe aux évaluations et fais-toi
            repérer par des entreprises via le Draft.
          </p>
          <p className="mt-6 font-body text-sm font-semibold text-orange group-hover:underline">
            S'inscrire comme joueur →
          </p>
        </Link>

        <Link
          href="/inscription/entreprise"
          className="group rounded-2xl border border-line bg-panel p-8 transition hover:border-orange"
        >
          <p className="font-display text-2xl text-lime">Je suis une entreprise</p>
          <p className="mt-3 font-body text-sm text-white/60">
            Créez votre profil entreprise, participez au scouting et
            constituez votre équipe au Draft.
          </p>
          <p className="mt-6 font-body text-sm font-semibold text-orange group-hover:underline">
            Inscrire mon entreprise →
          </p>
        </Link>
      </div>

      <p className="mt-10 font-body text-sm text-white/50">
        Déjà inscrit ?{" "}
        <Link href="/connexion" className="text-orange hover:underline">
          Connecte-toi
        </Link>
      </p>
    </div>
  );
}
