-- ============================================================
-- GC ESPORT — Schéma de base de données (MVP)
-- À coller dans Supabase > SQL Editor > New query > Run
-- ============================================================

-- Extension pour générer des identifiants uniques (uuid)
create extension if not exists "pgcrypto";

-- ============================================================
-- 1. RÔLES & UTILISATEURS
-- ============================================================

-- Rôles disponibles (admin, joueur, entreprise, etc.)
create type user_role as enum (
  'super_admin',
  'admin',
  'responsable_competitions',
  'responsable_joueurs',
  'responsable_partenariats',
  'responsable_communication',
  'joueur',
  'entreprise'
);

-- Table liée à l'authentification Supabase (auth.users existe déjà nativement)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'joueur',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 2. JOUEURS
-- ============================================================

create type player_status as enum (
  'inscription_incomplete',
  'en_attente_verification',
  'profil_verifie',
  'en_attente_evaluation',
  'eligible_draft',
  'non_eligible',
  'suspendu',
  'retire'
);

create table player_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  nom text,               -- privé par défaut
  prenom text,             -- privé par défaut
  pseudo text not null,
  date_naissance date,
  ville text,
  pays text default 'Côte d''Ivoire',
  telephone text,
  photo_url text,
  niveau_declare text,     -- ex: "Division 2"
  experience_competitive text,
  palmares text,
  liens_videos text[],
  disponibilites text,     -- texte libre déclaré par le joueur (ex: "2 créneaux/semaine, soirs")
  statut player_status not null default 'inscription_incomplete',
  profil_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Historique des changements de statut joueur (traçabilité)
create table player_status_history (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references player_profiles(id) on delete cascade,
  ancien_statut player_status,
  nouveau_statut player_status not null,
  motif text,
  change_par uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ============================================================
-- 3. JEUX / DISCIPLINES
-- ============================================================

create table games (
  id uuid primary key default gen_random_uuid(),
  nom text not null,                 -- ex: "EA SPORTS FC"
  actif boolean not null default true,
  created_at timestamptz not null default now()
);

create table player_game_accounts (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references player_profiles(id) on delete cascade,
  game_id uuid not null references games(id),
  plateforme text,                   -- ex: "PS5", "PC"
  identifiant_gaming text not null,
  created_at timestamptz not null default now(),
  unique (player_id, game_id)
);

-- ============================================================
-- 4. ENTREPRISES
-- ============================================================

create type company_status as enum (
  'prospect',
  'demande_recue',
  'en_discussion',
  'engagement_en_attente',
  'participante_confirmee',
  'retiree',
  'suspendue'
);

create table companies (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  logo_url text,
  secteur_activite text,
  presentation text,
  site_web text,
  reseaux_sociaux jsonb,
  ville text,
  contact_email text,
  contact_telephone text,
  statut company_status not null default 'prospect',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table company_reps (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  fonction text,
  created_at timestamptz not null default now(),
  unique (company_id, user_id)
);

-- ============================================================
-- 5. COMPÉTITIONS & ÉDITIONS
-- ============================================================

create type competition_status as enum (
  'preparation',
  'inscriptions_ouvertes',
  'en_cours',
  'terminee',
  'annulee'
);

create table competitions (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  description text,
  game_id uuid not null references games(id),
  format text not null default 'poules', -- poules | elimination_directe | ligue
  places_max int,                         -- null = illimité
  statut competition_status not null default 'preparation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table editions (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references competitions(id) on delete cascade,
  nom text not null,                      -- ex: "Saison 1 - 2026"
  date_debut_inscriptions date,
  date_fin_inscriptions date,
  date_debut date,
  date_fin date,
  statut competition_status not null default 'preparation',
  created_at timestamptz not null default now()
);

-- ============================================================
-- 6. INSCRIPTIONS
-- ============================================================

create table registrations (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references player_profiles(id) on delete cascade,
  edition_id uuid not null references editions(id) on delete cascade,
  statut player_status not null default 'inscription_incomplete',
  created_at timestamptz not null default now(),
  unique (player_id, edition_id)
);

-- ============================================================
-- 7. COMBINE (ÉVALUATIONS)
-- ============================================================

create table combine_sessions (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references editions(id) on delete cascade,
  nom text not null,
  date_session date,
  created_at timestamptz not null default now()
);

create table matches (
  id uuid primary key default gen_random_uuid(),
  combine_session_id uuid references combine_sessions(id) on delete cascade,
  edition_id uuid references editions(id) on delete cascade,
  joueur1_id uuid references player_profiles(id),
  joueur2_id uuid references player_profiles(id),
  score_joueur1 int,
  score_joueur2 int,
  date_match timestamptz,
  valide boolean not null default false,
  created_at timestamptz not null default now()
);

create table player_stats (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references player_profiles(id) on delete cascade,
  match_id uuid references matches(id) on delete cascade,
  matchs_joues int default 0,
  victoires int default 0,
  nuls int default 0,
  defaites int default 0,
  buts_marques int default 0,
  buts_encaisses int default 0,
  verifie_par uuid references profiles(id),  -- null = donnée déclarée, rempli = donnée vérifiée
  created_at timestamptz not null default now()
);

create table evaluations (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references player_profiles(id) on delete cascade,
  combine_session_id uuid references combine_sessions(id) on delete cascade,
  technique int check (technique between 0 and 20),
  tactique int check (tactique between 0 and 20),
  adaptation int check (adaptation between 0 and 20),
  gestion_pression int check (gestion_pression between 0 and 20),
  esprit_sportif int check (esprit_sportif between 0 and 20),
  observations text,
  evalue_par uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ============================================================
-- 8. DRAFT
-- ============================================================

create type draft_pick_status as enum (
  'selection_provisoire',
  'en_attente_reponse_joueur',
  'acceptee_par_joueur',
  'en_attente_confirmation_entreprise',
  'en_attente_validation_gcesport',
  'affectation_confirmee',
  'refusee',
  'annulee',
  'expiree'
);

create table draft_editions (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references editions(id) on delete cascade,
  nom text not null,
  date_draft date,
  nb_tours int,
  regles text,
  ordre_methode text default 'classement_inverse',
  created_at timestamptz not null default now()
);

create table draft_order (
  id uuid primary key default gen_random_uuid(),
  draft_edition_id uuid not null references draft_editions(id) on delete cascade,
  company_id uuid not null references companies(id),
  position int not null,
  effectif_recherche int not null default 3 check (effectif_recherche between 2 and 5),
  unique (draft_edition_id, company_id)
);

create table draft_picks (
  id uuid primary key default gen_random_uuid(),
  draft_edition_id uuid not null references draft_editions(id) on delete cascade,
  company_id uuid not null references companies(id),
  player_id uuid not null references player_profiles(id),
  tour int not null,
  statut draft_pick_status not null default 'selection_provisoire',
  conditions_proposees text,       -- ex: montant de la récompense financière proposée
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (draft_edition_id, player_id)  -- empêche la sélection en double
);

-- ============================================================
-- 9. ÉQUIPES & AFFECTATIONS
-- ============================================================

create table teams (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references editions(id) on delete cascade,
  company_id uuid not null references companies(id),
  nom text not null,
  created_at timestamptz not null default now()
);

create table team_assignments (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  player_id uuid not null references player_profiles(id),
  titulaire boolean not null default true,
  created_at timestamptz not null default now(),
  unique (team_id, player_id)
);

-- ============================================================
-- 10. ENGAGEMENTS & DOCUMENTS
-- ============================================================

create type engagement_status as enum (
  'a_preparer',
  'en_attente_signature',
  'valide',
  'refuse',
  'expire',
  'annule'
);

create table engagements (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid references editions(id),
  player_id uuid references player_profiles(id),
  company_id uuid references companies(id),
  type_engagement text not null,   -- ex: "charte_joueur", "accord_affectation"
  statut engagement_status not null default 'a_preparer',
  date_emission timestamptz,
  date_reponse timestamptz,
  date_validation timestamptz,
  created_at timestamptz not null default now()
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references engagements(id) on delete cascade,
  fichier_url text not null,       -- lien vers Supabase Storage
  version int not null default 1,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 11. NOTIFICATIONS
-- ============================================================

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  titre text not null,
  message text not null,
  lue boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 12. SPONSORS & PARTENAIRES
-- ============================================================

create table sponsors (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  logo_url text,
  type_partenariat text,
  edition_id uuid references editions(id),
  confirme boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 13. ACTUALITÉS
-- ============================================================

create table news (
  id uuid primary key default gen_random_uuid(),
  titre text not null,
  contenu text not null,
  image_url text,
  publie boolean not null default false,
  auteur_id uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ============================================================
-- 14. JOURNAL D'AUDIT
-- ============================================================

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  action text not null,             -- ex: "validation_profil_joueur"
  entite text,                      -- ex: "player_profiles"
  entite_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- SÉCURITÉ DE BASE (RLS)
-- Active la protection des données sur les tables sensibles.
-- Les règles précises (qui voit quoi) seront ajoutées à l'étape
-- de développement de chaque espace (joueur / entreprise / admin).
-- ============================================================

alter table profiles enable row level security;
alter table player_profiles enable row level security;
alter table companies enable row level security;
alter table draft_picks enable row level security;
alter table engagements enable row level security;
alter table documents enable row level security;
alter table notifications enable row level security;
alter table audit_log enable row level security;

-- Un utilisateur peut voir/modifier son propre profil de connexion
create policy "profiles_self" on profiles
  for all using (auth.uid() = id);

-- Un joueur peut voir et modifier son propre profil joueur
create policy "player_self" on player_profiles
  for all using (auth.uid() = user_id);

-- Les profils joueurs publics sont visibles par tout le monde
create policy "player_public_read" on player_profiles
  for select using (profil_public = true);
