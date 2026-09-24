"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

// Petit composant client isolé : le reste de la page /joueurs
// reste rendu côté serveur (visible par les moteurs de recherche),
// seul ce bouton a besoin de savoir qui est connecté.
export default function JoueurCTA({ playerId }: { playerId: string }) {
  const [isEntreprise, setIsEntreprise] = useState(false);

  useEffect(() => {
    async function check() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", sessionData.session.user.id)
        .single();
      setIsEntreprise(profile?.role === "entreprise");
    }
    check();
  }, []);

  if (!isEntreprise) return null;

  return (
    <Link
      href={`/espace-entreprise/recrutement?player=${playerId}`}
      className="flex-1 rounded-full bg-orange px-3 py-2 text-center font-body text-xs font-semibold text-ink hover:bg-lime"
    >
      Recruter / Transférer
    </Link>
  );
}
