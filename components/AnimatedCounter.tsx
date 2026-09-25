"use client";

import { useEffect, useRef, useState } from "react";

// Affiche un nombre qui "monte" de 0 jusqu'à sa valeur finale quand il
// devient visible à l'écran (ex: "250 joueurs" qui s'anime à l'arrivée).
export default function AnimatedCounter({
  value,
  suffix = "",
  duration = 1200,
  className = "",
}: {
  value: number;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !started.current) {
            started.current = true;
            const startTime = performance.now();
            function tick(now: number) {
              const progress = Math.min(1, (now - startTime) / duration);
              // easeOutCubic : démarre vite, ralentit en approchant la fin
              const eased = 1 - Math.pow(1 - progress, 3);
              setDisplay(Math.round(eased * value));
              if (progress < 1) requestAnimationFrame(tick);
            }
            requestAnimationFrame(tick);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.4 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [value, duration]);

  return (
    <span ref={ref} className={className}>
      {display}
      {suffix}
    </span>
  );
}
