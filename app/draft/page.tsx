export default function DraftPage() {
  const steps = [
    { t: "Sélection provisoire", d: "Une entreprise choisit un joueur éligible selon l'ordre du Draft." },
    { t: "Réponse du joueur", d: "Le joueur consulte les conditions proposées et accepte ou refuse librement." },
    { t: "Confirmation entreprise", d: "L'entreprise confirme les conditions d'affectation." },
    { t: "Validation GC ESPORT", d: "GC ESPORT vérifie et valide officiellement l'affectation." },
  ];

  return (
    <div className="mx-auto max-w-4xl px-6 py-24">
      <p className="font-body text-sm uppercase tracking-[0.2em] text-lime">Le concept central</p>
      <h1 className="mt-6 font-display text-5xl">GC ESPORT DRAFT</h1>
      <p className="mt-8 font-body text-lg text-white/70">
        Le Draft est le système par lequel les entreprises participantes
        découvrent et sélectionnent des joueurs préalablement inscrits et
        évalués par GC ESPORT. L'ordre de sélection est établi par classement
        inversé : l'entreprise la moins bien classée choisit en premier.
      </p>

      <div className="mt-16 space-y-6">
        {steps.map((s, i) => (
          <div key={s.t} className="flex gap-6 border-b border-line pb-6">
            <span className="font-display text-2xl text-orange">{i + 1}</span>
            <div>
              <p className="font-body font-semibold">{s.t}</p>
              <p className="mt-1 font-body text-sm text-white/60">{s.d}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-16 rounded-2xl border border-line bg-panel p-8">
        <p className="font-body text-sm text-white/60">
          Important : une sélection provisoire n'est pas une affectation
          définitive, et le Draft ne constitue ni un contrat de travail ni un
          transfert de propriété sur le joueur. Un joueur qui refuse une
          sélection n'est pas pénalisé automatiquement.
        </p>
      </div>
    </div>
  );
}
