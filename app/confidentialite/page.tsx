export default function ConfidentialitePage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-24">
      <div className="mb-10 rounded-lg border border-orange/40 bg-orange/10 p-4 font-body text-sm text-orange">
        ⚠ Modèle de base à faire valider par un juriste avant mise en
        production. Ce texte n'a pas de valeur juridique définitive en l'état.
      </div>

      <h1 className="font-display text-4xl">Politique de confidentialité</h1>
      <p className="mt-2 font-body text-sm text-white/40">Dernière mise à jour : à compléter avant publication</p>

      <div className="mt-10 space-y-8 font-body text-white/70">
        <section>
          <h2 className="font-display text-xl text-lime">1. Données collectées</h2>
          <p className="mt-3">
            GC ESPORT collecte les données nécessaires au fonctionnement de la
            plateforme : identité (nom, prénom, pseudo, date de naissance),
            coordonnées (e-mail, téléphone, ville), informations gaming
            (identifiant, plateforme, niveau), photo de profil, statistiques
            de compétition, et, pour les entreprises, les informations
            professionnelles fournies (secteur, contact, représentants).
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-lime">2. Données privées et publiques</h2>
          <p className="mt-3">
            Le nom et prénom d'un joueur sont privés par défaut. Seules les
            informations que le joueur choisit de rendre publiques (pseudo,
            statistiques, palmarès) apparaissent sur son profil public. Les
            documents déposés (engagements, autorisations) sont strictement
            privés — accessibles uniquement à leur propriétaire et à
            l'équipe GC ESPORT.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-lime">3. Mineurs</h2>
          <p className="mt-3">
            Les données d'un joueur mineur sont traitées avec une vigilance
            renforcée. La diffusion d'image et toute contrepartie financière
            nécessitent un consentement parental explicite avant validation.
            Un parent ou tuteur peut demander l'accès, la rectification ou la
            suppression des données de l'enfant mineur en contactant
            GC ESPORT.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-lime">4. Utilisation des données</h2>
          <p className="mt-3">
            Les données sont utilisées pour : la gestion des inscriptions et
            profils, l'organisation des évaluations et compétitions, la mise
            en relation entre joueurs et entreprises via le Draft et le
            recrutement, et la communication liée à la plateforme
            (notifications, résultats).
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-lime">5. Conservation et sécurité</h2>
          <p className="mt-3">
            Les données sont hébergées via des prestataires techniques
            sécurisés (base de données et stockage de fichiers). L'accès aux
            données privées est limité par des règles de permission strictes
            selon le rôle de chaque utilisateur (joueur, entreprise, admin).
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-lime">6. Droits des utilisateurs</h2>
          <p className="mt-3">
            Chaque utilisateur peut consulter et corriger ses informations
            depuis son espace personnel. Pour toute demande de suppression de
            compte ou de données, contactez GC ESPORT via la page Contact.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-lime">7. Cookies</h2>
          <p className="mt-3">
            La plateforme utilise uniquement les cookies techniques
            nécessaires à la connexion et au bon fonctionnement du site.
            Aucun cookie publicitaire n'est utilisé.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-lime">8. Contact</h2>
          <p className="mt-3">
            Pour toute question relative à la présente politique ou à vos
            données personnelles, contactez GC ESPORT via la page Contact du
            site.
          </p>
        </section>
      </div>
    </div>
  );
}
