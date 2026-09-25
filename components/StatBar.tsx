"use client";

import { useEffect, useRef, useState } from "react";

// Jauge façon jeu vidéo : se remplit jusqu'à sa valeur quand elle devient
// visible à l'écran, au lieu d'afficher juste un chiffre sec.
export default function StatBar({
  label,
  value,
  max = 100,
  className = "",
}: {
  label: string;
  value: number;
  max?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [filled, setFilled] = useState(false);
  const pct = Math.max(0, Math.min(100, (value / max) * 100));

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setFilled(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      <div className="flex items-center justify-between">
        <p className="font-body text-xs uppercase tracking-wide text-white/40">{label}</p>
        <p className="font-display text-sm text-orange">{value}</p>
      </div>
      <div className="gc-statbar-track mt-1">
        <div className="gc-statbar-fill" style={{ width: filled ? `${pct}%` : "0%" }} />
      </div>
    </div>
  );
}
