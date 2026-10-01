// Petite animation "motion design" en 3 scènes qui tourne en boucle dans le
// hero de l'accueil, à la place d'une photo : une main qui joue, un score
// qui s'affiche avec des confettis, puis une coupe soulevée. Tout est
// dessiné en SVG/CSS (pas de vidéo à charger), dans les couleurs du site.
// Composant statique (pas d'interactivité) : pas besoin de "use client".
export default function HeroAnimation() {
  const confettiScore = Array.from({ length: 14 }, (_, i) => i);
  const confettiTrophy = Array.from({ length: 10 }, (_, i) => i);

  return (
    <div className="relative mx-auto h-[380px] w-[380px]">
      <div className="gc-hero-anim-glow pointer-events-none absolute inset-0 -z-10 rounded-full bg-orange/15 blur-[90px]" />

      <svg viewBox="0 0 400 400" className="h-full w-full overflow-visible">
        {/* ---------- Scène 1 : la main qui joue ---------- */}
        <g className="gc-scene gc-scene-1">
          <g className="gc-controller-wiggle" transform="translate(0,0)">
            {/* Manette */}
            <rect x="95" y="175" width="210" height="90" rx="42" fill="#17171A" stroke="#2a2a2e" strokeWidth="2" />
            <circle cx="150" cy="220" r="19" fill="#0A0A0A" stroke="#3a3a3e" strokeWidth="2" />
            <circle cx="150" cy="220" r="8" fill="#242428" />
            {/* Croix directionnelle */}
            <rect x="192" y="238" width="10" height="26" rx="2" fill="#2d2d31" />
            <rect x="184" y="246" width="26" height="10" rx="2" fill="#2d2d31" />
            {/* Boutons qui s'allument tour à tour */}
            <circle className="gc-btn gc-btn-1" cx="258" cy="202" r="9" fill="#FF5500" />
            <circle className="gc-btn gc-btn-2" cx="278" cy="222" r="9" fill="#C9FF03" />
            <circle className="gc-btn gc-btn-3" cx="258" cy="242" r="9" fill="#FF5500" />
            <circle className="gc-btn gc-btn-4" cx="238" cy="222" r="9" fill="#C9FF03" />
          </g>
          {/* Pouce stylisé posé sur le stick gauche */}
          <g className="gc-thumb-press">
            <ellipse cx="148" cy="212" rx="24" ry="30" fill="#C98B5E" opacity="0.92" transform="rotate(-18 148 212)" />
          </g>
          <text x="200" y="330" textAnchor="middle" className="font-display fill-white/50 text-[13px] uppercase tracking-[0.25em]">
            En jeu
          </text>
        </g>

        {/* ---------- Scène 2 : le score qui tombe ---------- */}
        <g className="gc-scene gc-scene-2">
          <g className="gc-score-pop">
            <text
              x="200"
              y="225"
              textAnchor="middle"
              className="font-display fill-white text-[64px] font-black"
              style={{ fontFamily: "var(--font-orbitron)" }}
            >
              10 — 0
            </text>
          </g>
          <text x="200" y="265" textAnchor="middle" className="font-body fill-lime text-[13px] uppercase tracking-[0.25em]">
            Victoire
          </text>
          {confettiScore.map((i) => (
            <rect
              key={i}
              className={`gc-confetti gc-confetti-${i % 7}`}
              x={60 + i * 21}
              y={130}
              width="7"
              height="7"
              rx="1.5"
              fill={i % 3 === 0 ? "#FF5500" : i % 3 === 1 ? "#C9FF03" : "#F5F5F5"}
            />
          ))}
        </g>

        {/* ---------- Scène 3 : la coupe soulevée ---------- */}
        <g className="gc-scene gc-scene-3">
          <g className="gc-trophy-lift">
            {/* Bras stylisé */}
            <path d="M170 320 L200 220 L230 320 Z" fill="#C98B5E" />
            {/* Coupe */}
            <g className="gc-trophy-glow-anim">
              <path
                d="M160 150 C160 190 175 210 200 210 C225 210 240 190 240 150 L240 140 L160 140 Z"
                fill="url(#gc-trophy-gradient)"
                stroke="#FF5500"
                strokeWidth="2"
              />
              <path d="M160 145 C140 145 140 180 165 182" fill="none" stroke="#FF5500" strokeWidth="5" strokeLinecap="round" />
              <path d="M240 145 C260 145 260 180 235 182" fill="none" stroke="#FF5500" strokeWidth="5" strokeLinecap="round" />
              <rect x="192" y="208" width="16" height="22" fill="#C9FF03" />
              <rect x="172" y="228" width="56" height="12" rx="3" fill="#FF5500" />
              <rect x="160" y="240" width="80" height="10" rx="3" fill="#C9FF03" />
            </g>
          </g>
          <text x="200" y="330" textAnchor="middle" className="font-display fill-white/50 text-[13px] uppercase tracking-[0.25em]">
            Champion
          </text>
          {confettiTrophy.map((i) => (
            <rect
              key={i}
              className={`gc-confetti gc-confetti-${i % 7}`}
              x={70 + i * 27}
              y={110}
              width="7"
              height="7"
              rx="1.5"
              fill={i % 2 === 0 ? "#FF5500" : "#C9FF03"}
            />
          ))}
        </g>

        <defs>
          <linearGradient id="gc-trophy-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6b3d10" />
            <stop offset="100%" stopColor="#38200a" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
