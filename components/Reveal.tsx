"use client";

import { useEffect, useRef, useState } from "react";

// Fait apparaître son contenu (fondu + léger glissement) dès qu'il entre
// dans l'écran en scrollant. Utilisable partout : listes, cartes, sections.
// `delay` (en ms) permet un effet "en cascade" quand on l'utilise dans un
// .map(), en le calculant à partir de l'index (ex: delay={i * 60}).
export default function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`gc-reveal ${visible ? "gc-reveal-visible" : ""} ${className}`}
      style={visible ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
