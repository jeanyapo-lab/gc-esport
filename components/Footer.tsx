import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto max-w-6xl px-6 py-12 font-body text-sm text-white/50">
        <div className="flex flex-col justify-between gap-8 md:flex-row">
          <div>
            <p className="font-display text-lg text-white">
              GC <span className="text-orange">ESPORT</span>
            </p>
            <p className="mt-2 max-w-xs">
              Détection de talents, Draft et compétitions e-sport interentreprises en Côte d'Ivoire.
            </p>
          </div>
          <div className="flex flex-wrap gap-12">
            <div>
              <p className="mb-3 text-white/80">Plateforme</p>
              <ul className="space-y-2">
                <li><Link href="/competitions" className="hover:text-white">Compétitions</Link></li>
                <li><Link href="/classements" className="hover:text-white">Classements</Link></li>
                <li><Link href="/draft" className="hover:text-white">Le Draft</Link></li>
                <li><Link href="/joueurs" className="hover:text-white">Joueurs</Link></li>
                <li><Link href="/entreprises" className="hover:text-white">Entreprises</Link></li>
                <li><Link href="/equipes" className="hover:text-white">Équipes</Link></li>
                <li><Link href="/calendrier" className="hover:text-white">Calendrier</Link></li>
              </ul>
            </div>
            <div>
              <p className="mb-3 text-white/80">Communauté</p>
              <ul className="space-y-2">
                <li><Link href="/notre-equipe" className="hover:text-white">Notre équipe</Link></li>
                <li><Link href="/actualites" className="hover:text-white">Actualités</Link></li>
                <li><Link href="/fan-zone" className="hover:text-white">Fan Zone</Link></li>
                <li><Link href="/partenaires" className="hover:text-white">Partenaires</Link></li>
              </ul>
            </div>
            <div>
              <p className="mb-3 text-white/80">GC ESPORT</p>
              <ul className="space-y-2">
                <li><Link href="/faq" className="hover:text-white">FAQ</Link></li>
                <li><Link href="/a-propos" className="hover:text-white">À propos</Link></li>
                <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs text-white/30">© {new Date().getFullYear()} GC ESPORT — Abidjan, Côte d'Ivoire.</p>
          <div className="flex gap-4 text-xs text-white/30">
            <Link href="/cgu" className="hover:text-white/60">Conditions d'utilisation</Link>
            <Link href="/confidentialite" className="hover:text-white/60">Confidentialité</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
