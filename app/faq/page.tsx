"use client";

import { useState } from "react";

const questions = [
  {
    q: "Comment je m'inscris comme joueur ?",
    r: "Depuis la page d'accueil ou le menu, clique sur \"Inscris-toi comme joueur\". Renseigne ton pseudo, ta ville, la plateforme sur laquelle tu joues et les jeux auxquels tu peux compétir. Une fois ton compte créé, complète ton profil pour passer en vérification.",
  },
  {
    q: "C'est quoi le GC ESPORT DRAFT ?",
    r: "Le système par lequel les entreprises participantes sélectionnent des joueurs préalablement évalués par GC ESPORT, dans un ordre annoncé à l'avance. Une sélection n'est définitive qu'une fois acceptée par le joueur et validée par GC ESPORT.",
  },
  {
    q: "Une sélection au Draft m'engage-t-elle automatiquement ?",
    r: "Non. Une sélection provisoire n'est ni un contrat de travail, ni un transfert de propriété sur le joueur. Tu peux refuser une sélection sans pénalité automatique.",
  },
  {
    q: "Comment devenir \"éligible au Draft\" ?",
    r: "Ton profil doit d'abord être vérifié par GC ESPORT, puis tu dois participer à une session d'évaluation (le Combine), où tes statistiques de jeu sont enregistrées. GC ESPORT te rend ensuite éligible.",
  },
  {
    q: "Y a-t-il un âge minimum pour s'inscrire ?",
    r: "Oui, l'inscription est ouverte à partir de 12 ans. Pour tout joueur mineur, un consentement parental écrit est nécessaire avant toute participation officielle ou proposition financière.",
  },
  {
    q: "Comment une entreprise peut-elle participer ?",
    r: "Elle crée un compte entreprise, complète son profil, puis attend la confirmation de GC ESPORT. Une fois confirmée, elle peut participer au scouting, au Draft, et au recrutement libre.",
  },
  {
    q: "Une entreprise peut-elle recruter un joueur en dehors du Draft ?",
    r: "Oui, via le recrutement libre (pour un joueur non encore recruté) ou la négociation de transfert (pour un joueur déjà chez une autre entreprise, avec l'accord de cette dernière et du joueur).",
  },
  {
    q: "Combien de joueurs une entreprise peut-elle avoir ?",
    r: "5 joueurs maximum par édition, tous canaux confondus (Draft, recrutement libre, transferts).",
  },
  {
    q: "Comment sont calculées les statistiques d'un joueur ?",
    r: "Attaque, Défense et Régularité viennent des matchs officiels validés par GC ESPORT. Technique et Vision viennent des statistiques réelles du jeu (précision des passes, tirs, passes clés...) recueillies lors des évaluations du Combine.",
  },
  {
    q: "Je n'arrive pas à me connecter, que faire ?",
    r: "Utilise le lien \"Mot de passe oublié ?\" sur la page de connexion. Si le problème persiste, contacte GC ESPORT via la page Contact.",
  },
];

export default function FaqPage() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-3xl px-6 py-24">
      <h1 className="font-display text-5xl">Questions fréquentes</h1>
      <p className="mt-4 font-body text-white/60">Tout ce qu'il faut savoir pour bien démarrer sur GC ESPORT.</p>

      <div className="mt-14 space-y-3">
        {questions.map((item, i) => (
          <div key={i} className="rounded-2xl border border-line bg-panel">
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="flex w-full items-center justify-between px-6 py-5 text-left"
            >
              <span className="font-body font-semibold">{item.q}</span>
              <span className="font-display text-lime">{open === i ? "−" : "+"}</span>
            </button>
            {open === i && <p className="border-t border-line px-6 py-5 font-body text-sm text-white/70">{item.r}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
