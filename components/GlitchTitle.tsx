// Titre avec un effet "glitch" ambiant (léger décalage RVB qui revient
// toutes les quelques secondes, façon écran de jeu) — purement CSS, pas
// besoin d'interactivité donc pas de "use client".
export default function GlitchTitle({
  text,
  as: Tag = "span",
  className = "",
}: {
  text: string;
  as?: "h1" | "h2" | "span";
  className?: string;
}) {
  return (
    <Tag className={`gc-glitch ${className}`} data-text={text}>
      {text}
    </Tag>
  );
}
