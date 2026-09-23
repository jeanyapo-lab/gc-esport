import Link from "next/link";

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-24 md:pt-32">
        <p className="font-body text-sm uppercase tracking-[0.2em] text-lime">
          Abidjan · Côte d'Ivoire
        </p>
        <h1 className="mt-6 max-w-3xl font-display text-5xl leading-[1.05] md:text-7xl">
          Le talent gaming ivoirien mérite une vraie scène.
        </h1>
        <p className="mt-8 max-w-xl font-body text-lg text-white/70">
          GC ESPORT est l'association qui structure l'e-sport et le gaming en
          Côte d'Ivoire : détection de talents, championnats inter-entreprises
          et compétitions gaming, tout au long de l'année, à travers plusieurs
          disciplines.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/connexion"
            className="rounded-full bg-orange px-7 py-3 font-body font-semibold text-ink transition hover:bg-lime"
          >
            Inscris-toi comme joueur
          </Link>
          <Link
            href="/competitions"
            className="rounded-full border border-white/20 px-7 py-3 font-body font-semibold text-white transition hover:border-white/50"
          >
            Voir les compétitions
          </Link>
        </div>
      </section>

      {/* Le programme */}
      <section className="border-t border-line bg-panel">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="font-display text-3xl md:text-4xl">Un programme, plusieurs compétitions</h2>
          <p className="mt-4 max-w-2xl font-body text-white/60">
            GC ESPORT ne se limite pas à un seul tournoi : plusieurs
            championnats et disciplines sont prévus au fil de l'année.
            EA SPORTS FC ouvre le bal avec le GC ESPORT DRAFT, notre système
            de détection et d'affectation des joueurs aux entreprises
            participantes.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/draft"
              className="rounded-full border border-lime px-6 py-3 font-body text-sm font-semibold text-lime transition hover:bg-lime hover:text-ink"
            >
              Découvrir le GC ESPORT DRAFT
            </Link>
            <Link
              href="/competitions"
              className="rounded-full border border-white/20 px-6 py-3 font-body text-sm font-semibold text-white transition hover:border-white/50"
            >
              Toutes les compétitions
            </Link>
          </div>
        </div>
      </section>

      {/* Le parcours du joueur */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="font-display text-3xl md:text-4xl">Le parcours d'un joueur</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-4">
            {[
              { n: "1", t: "Inscription", d: "Le joueur crée son profil gaming et rejoint une édition." },
              { n: "2", t: "Combine", d: "Ses statistiques et son niveau sont évalués par GC ESPORT." },
              { n: "3", t: "Draft", d: "Les entreprises participantes le sélectionnent selon leurs besoins." },
              { n: "4", t: "Championnat", d: "Affecté à une équipe, il représente son entreprise en compétition." },
            ].map((s) => (
              <div key={s.n} className="border-t border-orange pt-6">
                <p className="font-display text-3xl text-orange">{s.n}</p>
                <p className="mt-3 font-body font-semibold">{s.t}</p>
                <p className="mt-2 font-body text-sm text-white/60">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pour qui */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <h3 className="font-display text-2xl text-lime">Joueurs</h3>
            <p className="mt-4 font-body text-white/70">
              Montre ton niveau, fais-toi repérer par des entreprises, et
              représente leurs couleurs en compétition.
            </p>
          </div>
          <div>
            <h3 className="font-display text-2xl text-lime">Entreprises</h3>
            <p className="mt-4 font-body text-white/70">
              Constituez votre équipe esport à partir de joueurs évalués et
              vérifiés par GC ESPORT.
            </p>
          </div>
          <div>
            <h3 className="font-display text-2xl text-lime">Public</h3>
            <p className="mt-4 font-body text-white/70">
              Suivez les compétitions, les classements et le parcours de vos
              joueurs et équipes favoris.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
