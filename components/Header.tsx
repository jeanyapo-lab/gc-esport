"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import NotificationBell from "./NotificationBell";

const mainLinks = [
  { href: "/competitions", label: "Compétitions" },
  { href: "/draft", label: "Draft" },
  { href: "/joueurs", label: "Joueurs" },
  { href: "/entreprises", label: "Entreprises" },
];

const moreLinks = [
  { href: "/classements", label: "Classements" },
  { href: "/equipes", label: "Équipes" },
  { href: "/actualites", label: "Actualités" },
  { href: "/fan-zone", label: "Fan Zone" },
  { href: "/partenaires", label: "Partenaires" },
  { href: "/a-propos", label: "À propos" },
  { href: "/contact", label: "Contact" },
];

const links = [...mainLinks, ...moreLinks];

const adminRoles = [
  "super_admin",
  "admin",
  "responsable_joueurs",
  "responsable_partenariats",
  "responsable_competitions",
  "responsable_communication",
];

export default function Header() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [spaceHref, setSpaceHref] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setSpaceHref(null);
        setUserId(null);
        setChecking(false);
        return;
      }
      setUserId(data.session.user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.session.user.id)
        .single();

      if (profile?.role && adminRoles.includes(profile.role)) {
        setSpaceHref("/admin");
      } else if (profile?.role === "entreprise") {
        setSpaceHref("/espace-entreprise");
      } else if (profile?.role === "joueur") {
        setSpaceHref("/espace-joueur");
      } else {
        setSpaceHref(null);
      }
      setChecking(false);
    }

    checkSession();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      checkSession();
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    setSpaceHref(null);
    setMenuOpen(false);
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-ink/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-display text-xl tracking-wide">
          GC <span className="text-orange">ESPORT</span>
        </Link>

        <nav className="hidden items-center gap-7 font-body text-sm text-white/70 md:flex">
          {mainLinks.map((l) => (
            <Link key={l.href} href={l.href} className="transition hover:text-white">
              {l.label}
            </Link>
          ))}
          <div className="relative">
            <button
              onClick={() => setMoreOpen(!moreOpen)}
              onBlur={() => setTimeout(() => setMoreOpen(false), 150)}
              className="flex items-center gap-1 transition hover:text-white"
            >
              Plus <span className="text-xs">{moreOpen ? "▲" : "▼"}</span>
            </button>
            {moreOpen && (
              <div className="absolute left-0 top-8 z-50 w-48 rounded-xl border border-line bg-panel p-2 shadow-xl">
                {moreLinks.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="block rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-ink hover:text-white"
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          {!checking && spaceHref && userId && <NotificationBell userId={userId} />}
          {!checking && spaceHref && (
            <button onClick={handleLogout} className="font-body text-sm text-white/50 hover:text-white">
              Se déconnecter
            </button>
          )}
          <Link
            href={checking ? "/connexion" : spaceHref ?? "/connexion"}
            className="rounded-full bg-orange px-5 py-2 font-body text-sm font-semibold text-ink transition hover:bg-lime"
          >
            {spaceHref ? "Mon espace" : "Connexion"}
          </Link>
        </div>

        {/* Bouton menu mobile */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 md:hidden"
          aria-label="Menu"
        >
          <span className="font-body text-lg leading-none">{menuOpen ? "✕" : "☰"}</span>
        </button>
      </div>

      {/* Menu mobile déroulant */}
      {menuOpen && (
        <div className="border-t border-line bg-ink px-6 py-6 md:hidden">
          <nav className="flex flex-col gap-4 font-body text-sm text-white/80">
            {links.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setMenuOpen(false)} className="hover:text-white">
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="mt-6 flex flex-col gap-3 border-t border-line pt-6">
            {!checking && spaceHref && userId && <NotificationBell userId={userId} />}
            {!checking && spaceHref && (
              <button onClick={handleLogout} className="text-left font-body text-sm text-white/50 hover:text-white">
                Se déconnecter
              </button>
            )}
            <Link
              href={checking ? "/connexion" : spaceHref ?? "/connexion"}
              onClick={() => setMenuOpen(false)}
              className="rounded-full bg-orange px-5 py-3 text-center font-body text-sm font-semibold text-ink hover:bg-lime"
            >
              {spaceHref ? "Mon espace" : "Connexion"}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
