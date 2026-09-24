type Reseaux = {
  twitter?: string;
  twitch?: string;
  youtube?: string;
  instagram?: string;
  discord?: string;
} | null | undefined;

const PLATEFORMES: { key: keyof NonNullable<Reseaux>; label: string }[] = [
  { key: "twitter", label: "X" },
  { key: "twitch", label: "TW" },
  { key: "youtube", label: "YT" },
  { key: "instagram", label: "IG" },
  { key: "discord", label: "DC" },
];

export default function SocialLinks({ reseaux }: { reseaux?: Reseaux }) {
  return (
    <div className="flex gap-2">
      {PLATEFORMES.map((p) => {
        const url = reseaux?.[p.key];
        if (url) {
          return (
            <a
              key={p.key}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-lime/20 font-body text-[10px] font-bold text-lime hover:bg-lime hover:text-ink"
            >
              {p.label}
            </a>
          );
        }
        return (
          <span
            key={p.key}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 font-body text-[10px] font-bold text-white/20"
          >
            {p.label}
          </span>
        );
      })}
    </div>
  );
}
