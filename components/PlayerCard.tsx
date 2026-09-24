import type { CardStats } from "@/lib/playerStats";

const rows: { key: keyof CardStats; label: string }[] = [
  { key: "attaque", label: "Attaque" },
  { key: "defense", label: "Défense" },
  { key: "technique", label: "Technique" },
  { key: "vision", label: "Vision" },
  { key: "regularite", label: "Régularité" },
];

export default function PlayerCard({ stats }: { stats: CardStats }) {
  return (
    <div className="rounded-2xl border border-line bg-panel p-6">
      <p className="font-display text-lg text-lime">Carte joueur</p>
      <div className="mt-4 space-y-3">
        {rows.map((r) => (
          <div key={r.key}>
            <div className="flex items-center justify-between font-body text-xs text-white/60">
              <span>{r.label}</span>
              <span className="text-white">{stats[r.key]}</span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-ink">
              <div
                className="h-full rounded-full bg-gradient-to-r from-orange to-lime"
                style={{ width: `${stats[r.key]}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
