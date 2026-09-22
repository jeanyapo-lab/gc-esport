import Link from "next/link";

const links = [
  { href: "/competitions", label: "Compétitions" },
  { href: "/joueurs", label: "Joueurs" },
  { href: "/entreprises", label: "Entreprises" },
  { href: "/draft", label: "GC ESPORT DRAFT" },
  { href: "/a-propos", label: "À propos" },
  { href: "/contact", label: "Contact" },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-ink/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-display text-xl tracking-wide">
          GC <span className="text-orange">ESPORT</span>
        </Link>
        <nav className="hidden gap-8 font-body text-sm text-white/70 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="transition hover:text-white">
              {l.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/connexion"
          className="rounded-full bg-orange px-5 py-2 font-body text-sm font-semibold text-ink transition hover:bg-lime"
        >
          Connexion
        </Link>
      </div>
    </header>
  );
}
