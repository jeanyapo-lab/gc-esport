"use client";

import { useEffect, useRef, useState } from "react";

// Le 🏆 "pop" comme un déblocage d'achievement dès qu'il apparaît à
// l'écran, puis pulse doucement en continu (voir .gc-trophy dans
// globals.css). Remplace le simple "🏆" statique utilisé partout où un
// trophée est affiché (profils, palmarès...).
export default function Trophy({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [popped, setPopped] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setPopped(true);
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
    <span ref={ref} className={`gc-trophy ${popped ? "gc-trophy-pop" : "opacity-0"} ${className}`}>
      🏆
    </span>
  );
}
