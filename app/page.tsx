import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Reveal from "@/components/Reveal";
import AnimatedCounter from "@/components/AnimatedCounter";
import GlitchTitle from "@/components/GlitchTitle";

export const revalidate = 60;

export default async function Home() {
  const [{ count: nbJoueurs }, { count: nbEntreprises }, { count: nbCompetitions }, { count: nbTrophees }] =
    await Promise.all([
      supabase.from("player_profiles").select("id", { count: "exact", head: true }),
      supabase.from("companies").select("id", { count: "exact", head: true }).eq("statut", "participante_confirmee"),
      supabase.from("competitions").select("id", { count: "exact", head: true }),
      supabase.from("trophies").select("id", { count: "exact", head: true }),
    ]);

  const stats = [
    { label: "Joueurs inscrits", value: nbJoueurs ?? 0 },
    { label: "Entreprises engagées", value: nbEntreprises ?? 0 },
    { label: "Compétitions", value: nbCompetitions ?? 0 },
    { label: "Trophées décernés", value: nbTrophees ?? 0 },
  ];

  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-0 pt-24 md:pb-0 md:pt-32">
        <div className="grid items-end gap-10 md:grid-cols-[1.1fr_0.9fr]">
          <div className="pb-20 md:pb-28">
            <p className="animate-[gc-fade-in-up_0.7s_ease-out_both] font-body text-sm uppercase tracking-[0.2em] text-lime">
              Abidjan · Côte d'Ivoire
            </p>
            <h1 className="mt-6 animate-[gc-fade-in-up_0.8s_ease-out_0.1s_both] font-display text-5xl leading-[1.05] md:text-7xl">
              <GlitchTitle text="Le talent gaming ivoirien mérite une vraie scène." />
            </h1>
            <p className="mt-8 max-w-xl animate-[gc-fade-in-up_0.8s_ease-out_0.2s_both] font-body text-lg text-white/70">
              GC ESPORT est l'association qui structure l'e-sport et le gaming en
              Côte d'Ivoire : détection de talents, championnats inter-entreprises
              et compétitions gaming, tout au long de l'année, à travers plusieurs
              disciplines.
            </p>
            <div className="mt-10 flex flex-wrap gap-4 animate-[gc-fade-in-up_0.8s_ease-out_0.3s_both]">
              <Link
                href="/inscription/joueur"
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
          </div>

          {/* Joueur détouré, aligné à droite — masqué sur mobile pour ne pas
              écraser le texte sur petit écran. */}
          <div className="relative hidden justify-self-end md:flex">
            <img
              src="/images/hero-joueur.webp"
              alt="Joueur GC ESPORT avec casque gaming, maillot Abidjan Ascendants"
              className="gc-hero-fade relative max-h-[560px] w-auto animate-[gc-fade-in-up_1s_ease-out_0.2s_both] object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.5)]"
            />
          </div>
        </div>
      </section>

      {/* Chiffres clés, animés au défilement */}
      <section className="border-t border-line bg-panel">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((s, i) => (
              <Reveal key={s.label} delay={i * 100} className="text-center md:text-left">
                <p className="font-display text-4xl text-orange md:text-5xl">
                  <AnimatedCounter value={s.value} suffix="+" />
                </p>
                <p className="mt-2 font-body text-xs uppercase tracking-wide text-white/50">{s.label}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Le programme */}
      <section className="border-t border-line bg-panel">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <Reveal>
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
          </Reveal>
        </div>
      </section>

      {/* Le parcours du joueur */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <Reveal>
            <h2 className="font-display text-3xl md:text-4xl">Le parcours d'un joueur</h2>
          </Reveal>
          <div className="mt-12 grid gap-8 md:grid-cols-4">
            {[
              { n: "1", t: "Inscription", d: "Le joueur crée son profil gaming et rejoint une édition." },
              { n: "2", t: "Combine", d: "Ses statistiques et son niveau sont évalués par GC ESPORT." },
              { n: "3", t: "Draft", d: "Les entreprises participantes le sélectionnent selon leurs besoins." },
              { n: "4", t: "Championnat", d: "Affecté à une équipe, il représente son entreprise en compétition." },
            ].map((s, i) => (
              <Reveal key={s.n} delay={i * 100} className="border-t border-orange pt-6">
                <p className="font-display text-3xl text-orange">{s.n}</p>
                <p className="mt-3 font-body font-semibold">{s.t}</p>
                <p className="mt-2 font-body text-sm text-white/60">{s.d}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Pour qui */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-10 md:grid-cols-3">
          {[
            {
              t: "Joueurs",
              d: "Montre ton niveau, fais-toi repérer par des entreprises, et représente leurs couleurs en compétition.",
            },
            {
              t: "Entreprises",
              d: "Constituez votre équipe esport à partir de joueurs évalués et vérifiés par GC ESPORT.",
            },
            {
              t: "Public",
              d: "Suivez les compétitions, les classements et le parcours de vos joueurs et équipes favoris.",
            },
          ].map((c, i) => (
            <Reveal key={c.t} delay={i * 100}>
              <h3 className="font-display text-2xl text-lime">{c.t}</h3>
              <p className="mt-4 font-body text-white/70">{c.d}</p>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
