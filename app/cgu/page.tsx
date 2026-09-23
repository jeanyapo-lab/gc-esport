export default function CGUPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-24">
      <div className="mb-10 rounded-lg border border-orange/40 bg-orange/10 p-4 font-body text-sm text-orange">
        ⚠ Modèle de base à faire valider par un juriste avant mise en
        production. Ce texte n'a pas de valeur juridique définitive en l'état.
      </div>

      <h1 className="font-display text-4xl">Conditions générales d'utilisation</h1>
      <p className="mt-2 font-body text-sm text-white/40">Dernière mise à jour : à compléter avant publication</p>

      <div className="mt-10 space-y-8 font-body text-white/70">
        <section>
          <h2 className="font-display text-xl text-lime">1. Objet</h2>
          <p className="mt-3">
            Les présentes conditions régissent l'accès et l'utilisation de la
            plateforme GC ESPORT, éditée par l'association GC ESPORT, basée à
            Abidjan, Côte d'Ivoire. La plateforme a pour objet la détection,
            l'évaluation et l'affectation de joueurs e-sport auprès
            d'entreprises participantes, ainsi que l'organisation de
            compétitions gaming.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-lime">2. Comptes et inscription</h2>
          <p className="mt-3">
            L'inscription est ouverte aux joueurs et aux entreprises. Les
            informations fournies doivent être exactes. Un compte est
            personnel et ne doit pas être partagé. GC ESPORT se réserve le
            droit de suspendre ou refuser tout profil ne respectant pas les
            règles de la plateforme, avec motif communiqué.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-lime">3. Mineurs</h2>
          <p className="mt-3">
            L'inscription est ouverte à partir de 12 ans. Pour tout joueur
            mineur, un consentement parental écrit est requis avant toute
            participation officielle, toute diffusion d'image et toute
            proposition financière (recrutement, transfert). GC ESPORT ne
            valide aucune affectation ni contrepartie financière concernant
            un mineur tant que ce consentement n'a pas été recueilli et
            vérifié.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-lime">4. Le GC ESPORT DRAFT</h2>
          <p className="mt-3">
            Le Draft est un système de sélection organisé par GC ESPORT selon
            des règles publiées avant chaque édition. Une sélection
            provisoire ne constitue ni un contrat de travail, ni un transfert
            de propriété sur le joueur. Le joueur conserve à tout moment son
            libre consentement et peut refuser une sélection sans pénalité
            automatique.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-lime">5. Recrutement, transferts et engagements financiers</h2>
          <p className="mt-3">
            Les entreprises peuvent proposer des conditions de recrutement ou
            de transfert (durée, contrepartie financière). Ces propositions
            ne deviennent effectives qu'après acceptation du joueur (et, pour
            un transfert, accord de l'entreprise d'origine) et validation par
            GC ESPORT. GC ESPORT n'est pas partie aux accords financiers
            conclus entre une entreprise et un joueur, sauf mention contraire
            explicite.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-lime">6. Comportement et sanctions</h2>
          <p className="mt-3">
            Toute tricherie, tout comportement abusif ou toute fausse
            déclaration peut entraîner la suspension ou le retrait d'un
            profil, joueur ou entreprise. Les décisions de GC ESPORT sont
            motivées et peuvent faire l'objet d'un recours auprès de
            l'association.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-lime">7. Propriété et contenu</h2>
          <p className="mt-3">
            Les contenus publiés par un utilisateur (profil, photo, vidéos)
            restent sa propriété. En les publiant sur la plateforme,
            l'utilisateur autorise GC ESPORT à les afficher dans le cadre du
            fonctionnement du site et de la promotion de ses compétitions.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-lime">8. Responsabilité</h2>
          <p className="mt-3">
            GC ESPORT s'efforce d'assurer la disponibilité et l'exactitude
            des informations publiées, sans garantie absolue. GC ESPORT ne
            peut être tenu responsable des accords financiers privés conclus
            entre entreprises et joueurs.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-lime">9. Contact</h2>
          <p className="mt-3">
            Pour toute question relative aux présentes conditions, contactez
            GC ESPORT via la page Contact du site.
          </p>
        </section>
      </div>
    </div>
  );
}
