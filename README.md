# GC ESPORT — Site web

Bienvenue ! Ce dossier contient le tout début du site GC ESPORT : les pages
publiques (accueil, compétitions, joueurs, Draft, à propos, contact), déjà
connectées à ta base de données Supabase.

## Ce qu'il te faut avant de commencer

- Un compte GitHub (tu l'as déjà ✅)
- Un compte Supabase avec le schéma déjà installé (tu l'as déjà ✅)
- Un compte Netlify (tu l'as déjà ✅)
- Installer **Node.js** sur ton ordinateur si ce n'est pas déjà fait :
  va sur https://nodejs.org et installe la version "LTS" (recommandée).

## Étape 1 — Récupérer tes identifiants Supabase

1. Va sur ton projet Supabase.
2. Dans le menu de gauche, clique sur **Project Settings** puis **API**.
3. Note deux informations :
   - **Project URL** (ressemble à `https://xxxxx.supabase.co`)
   - **anon public key** (une longue clé)

## Étape 2 — Configurer le projet en local

1. Ouvre ce dossier dans un terminal (sur Mac : clique droit sur le dossier
   dans le Finder > "Nouveau terminal au dossier", si l'option existe, sinon
   ouvre l'app Terminal et tape `cd ` puis glisse le dossier dedans).
2. Renomme le fichier `.env.local.example` en `.env.local`.
3. Ouvre `.env.local` et remplace les deux valeurs par celles notées à
   l'étape 1.
4. Dans le terminal, tape :
   ```
   npm install
   ```
   (ça télécharge tout ce dont le site a besoin pour fonctionner — ça peut
   prendre une à deux minutes).
5. Puis tape :
   ```
   npm run dev
   ```
6. Ouvre ton navigateur à l'adresse `http://localhost:3000` — le site
   s'affiche en local, sur ton ordinateur.

## Étape 3 — Mettre le code sur GitHub

1. Va sur https://github.com/new et crée un nouveau dépôt (repository),
   par exemple nommé `gc-esport`. Laisse-le vide (pas de README généré).
2. Dans le terminal, toujours dans ce dossier, tape ces commandes une par
   une (remplace `TON-COMPTE` par ton nom d'utilisateur GitHub) :
   ```
   git init
   git add .
   git commit -m "Premier envoi du site GC ESPORT"
   git branch -M main
   git remote add origin https://github.com/TON-COMPTE/gc-esport.git
   git push -u origin main
   ```

## Étape 4 — Mettre le site en ligne avec Netlify

1. Sur Netlify, clique sur **Add new site** > **Import an existing project**.
2. Choisis GitHub, puis le dépôt `gc-esport` que tu viens de créer.
3. Netlify détecte automatiquement Next.js — laisse les réglages par défaut.
4. Avant de cliquer sur "Deploy", va dans **Environment variables** et
   ajoute les deux mêmes valeurs que dans `.env.local` :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Clique sur **Deploy site**. Après une à deux minutes, ton site est en
   ligne, avec une adresse provisoire en `.netlify.app` — on pourra ensuite
   y attacher ton nom de domaine `gbesportci.com` quand tu l'auras acheté.

## Si quelque chose ne fonctionne pas

Fais une copie d'écran du message d'erreur et envoie-la moi — je
t'expliquerai quoi faire, sans jargon technique.

## Ce qui existe déjà dans ce premier envoi

- Page d'accueil
- Page Compétitions (affiche les compétitions créées dans Supabase)
- Page Joueurs (affiche les profils publics des joueurs)
- Page GC ESPORT DRAFT (explication du concept)
- Page À propos
- Page Contact (formulaire, pas encore connecté à l'envoi d'e-mail)

Ce qui vient ensuite : la connexion/inscription, les espaces joueur,
entreprise et administrateur.
