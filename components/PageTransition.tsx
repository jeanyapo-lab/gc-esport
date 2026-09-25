"use client";

import { usePathname } from "next/navigation";

// Petit fondu d'entrée à chaque changement de page, plutôt qu'un
// changement brutal. La `key={pathname}` force React à remonter le
// contenu à chaque navigation, ce qui relance l'animation CSS.
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="gc-page-enter">
      {children}
    </div>
  );
}
