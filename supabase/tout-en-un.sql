-- ============================================================
-- GC ESPORT — SCRIPT SQL COMPLET ET REJOUABLE SANS RISQUE
-- Regroupe tous les scripts envoyés jusqu'ici, dans l'ordre.
-- Tu peux le coller et l'exécuter d'un bloc dans Supabase >
-- SQL Editor > New query > Run, même si certaines parties
-- ont déjà été appliquées avant : chaque étape se protège
-- elle-même ("si ça existe déjà, on ignore et on continue").
-- ============================================================

create extension if not exists "pgcrypto";


-- ============================================================
-- Source : gc-esport-schema.sql
-- ============================================================

-- ============================================================
-- GC ESPORT — Schéma de base de données (MVP)
-- À coller dans Supabase > SQL Editor > New query > Run
-- ============================================================

-- Extension pour générer des identifiants uniques (uuid)


-- ============================================================
-- 1. RÔLES & UTILISATEURS
-- ============================================================

-- Rôles disponibles (admin, joueur, entreprise, etc.)
do $$ begin
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
exception when duplicate_object then null;
end $$;

-- Table liée à l'authentification Supabase (auth.users existe déjà nativement)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'joueur',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 2. JOUEURS
-- ============================================================

do $$ begin
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
exception when duplicate_object then null;
end $$;

create table if not exists player_profiles (
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
create table if not exists player_status_history (
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

create table if not exists games (
  id uuid primary key default gen_random_uuid(),
  nom text not null,                 -- ex: "EA SPORTS FC"
  actif boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists player_game_accounts (
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

do $$ begin
  create type company_status as enum (
  'prospect',
  'demande_recue',
  'en_discussion',
  'engagement_en_attente',
  'participante_confirmee',
  'retiree',
  'suspendue'
);
exception when duplicate_object then null;
end $$;

create table if not exists companies (
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

create table if not exists company_reps (
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

do $$ begin
  create type competition_status as enum (
  'preparation',
  'inscriptions_ouvertes',
  'en_cours',
  'terminee',
  'annulee'
);
exception when duplicate_object then null;
end $$;

create table if not exists competitions (
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

create table if not exists editions (
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

create table if not exists registrations (
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

create table if not exists combine_sessions (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references editions(id) on delete cascade,
  nom text not null,
  date_session date,
  created_at timestamptz not null default now()
);

create table if not exists matches (
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

create table if not exists player_stats (
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

create table if not exists evaluations (
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

do $$ begin
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
exception when duplicate_object then null;
end $$;

create table if not exists draft_editions (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references editions(id) on delete cascade,
  nom text not null,
  date_draft date,
  nb_tours int,
  regles text,
  ordre_methode text default 'classement_inverse',
  created_at timestamptz not null default now()
);

create table if not exists draft_order (
  id uuid primary key default gen_random_uuid(),
  draft_edition_id uuid not null references draft_editions(id) on delete cascade,
  company_id uuid not null references companies(id),
  position int not null,
  effectif_recherche int not null default 3 check (effectif_recherche between 2 and 5),
  unique (draft_edition_id, company_id)
);

create table if not exists draft_picks (
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

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references editions(id) on delete cascade,
  company_id uuid not null references companies(id),
  nom text not null,
  created_at timestamptz not null default now()
);

create table if not exists team_assignments (
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

do $$ begin
  create type engagement_status as enum (
  'a_preparer',
  'en_attente_signature',
  'valide',
  'refuse',
  'expire',
  'annule'
);
exception when duplicate_object then null;
end $$;

create table if not exists engagements (
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

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references engagements(id) on delete cascade,
  fichier_url text not null,       -- lien vers Supabase Storage
  version int not null default 1,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 11. NOTIFICATIONS
-- ============================================================

create table if not exists notifications (
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

create table if not exists sponsors (
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

create table if not exists news (
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

create table if not exists audit_log (
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
drop policy if exists "profiles_self" on profiles;
create policy "profiles_self" on profiles
  for all using (auth.uid() = id);

-- Un joueur peut voir et modifier son propre profil joueur
drop policy if exists "player_self" on player_profiles;
create policy "player_self" on player_profiles
  for all using (auth.uid() = user_id);

-- Les profils joueurs publics sont visibles par tout le monde
drop policy if exists "player_public_read" on player_profiles;
create policy "player_public_read" on player_profiles
  for select using (profil_public = true);


-- ============================================================
-- Source : gc-esport-permissions.sql
-- ============================================================

-- ============================================================
-- GC ESPORT — Permissions de lecture publique
-- À coller dans Supabase > SQL Editor > New query > Run
-- ============================================================
-- Sans ça, Supabase refuse toute lecture depuis le site, même
-- si RLS est désactivé sur une table : il faut le droit de
-- lecture ET l'absence de blocage RLS.
-- On donne ici uniquement le droit de LIRE (select), jamais
-- d'écrire, au rôle public (anon) et aux comptes connectés
-- (authenticated). L'écriture sera gérée table par table plus
-- tard, avec des règles précises (un joueur ne modifie que son
-- propre profil, etc.).

grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;

-- Pour que les prochaines tables qu'on créera aient aussi
-- automatiquement le droit de lecture, sans repasser par ce
-- script à chaque fois :
alter default privileges in schema public grant select on tables to anon, authenticated;


-- ============================================================
-- Source : gc-esport-auth-permissions.sql
-- ============================================================

-- ============================================================
-- GC ESPORT — Permissions pour la connexion / inscription
-- À coller dans Supabase > SQL Editor > New query > Run
-- ============================================================
-- On avait autorisé la LECTURE publique. Il faut maintenant
-- autoriser les personnes CONNECTÉES (authenticated) à créer
-- et modifier leur propre profil, leur propre fiche joueur ou
-- entreprise — jamais celle de quelqu'un d'autre.

grant insert, update on public.profiles to authenticated;
grant insert, update on public.player_profiles to authenticated;
grant insert, update on public.companies to authenticated;
grant insert, select, update on public.company_reps to authenticated;

-- Une entreprise doit être visible publiquement une fois créée
-- (page "Entreprises participantes"), et modifiable uniquement
-- par ses représentants.
drop policy if exists "companies_public_read" on companies;
create policy "companies_public_read" on companies
  for select using (true);

drop policy if exists "companies_insert_auth" on companies;
create policy "companies_insert_auth" on companies
  for insert to authenticated with check (true);

drop policy if exists "companies_update_by_reps" on companies;
create policy "companies_update_by_reps" on companies
  for update using (
    exists (
      select 1 from company_reps cr
      where cr.company_id = companies.id and cr.user_id = auth.uid()
    )
  );

-- Un représentant ne voit et ne crée que ses propres liens
-- vers une entreprise.
alter table company_reps enable row level security;

drop policy if exists "company_reps_self" on company_reps;
create policy "company_reps_self" on company_reps
  for all using (auth.uid() = user_id);


-- ============================================================
-- Source : gc-esport-admin-permissions.sql
-- ============================================================

-- ============================================================
-- GC ESPORT — Droits de l'administrateur
-- À coller dans Supabase > SQL Editor > New query > Run
-- ============================================================
-- Permet à un compte avec le rôle admin (ou super_admin,
-- responsable_joueurs, responsable_partenariats) de valider les
-- profils joueurs et les entreprises. Ces droits ne s'ajoutent
-- qu'à ces rôles précis — un joueur ou une entreprise normale
-- ne peut toujours modifier que sa propre fiche.

drop policy if exists "player_profiles_admin_all" on player_profiles;
create policy "player_profiles_admin_all" on player_profiles
  for all using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and p.role in ('super_admin', 'admin', 'responsable_joueurs')
    )
  );

drop policy if exists "companies_admin_all" on companies;
create policy "companies_admin_all" on companies
  for all using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and p.role in ('super_admin', 'admin', 'responsable_partenariats')
    )
  );

-- Traçabilité : chaque changement de statut d'un joueur est
-- enregistré (qui, quand, ancien/nouveau statut, motif).
grant insert, select on public.player_status_history to authenticated;

-- ============================================================
-- Se désigner soi-même comme administrateur
-- ============================================================
-- 1. Crée d'abord un compte normal sur /inscription/joueur avec
--    TON adresse e-mail (celle que tu utiliseras pour
--    administrer le site).
-- 2. Remplace ensuite ton-email@exemple.com ci-dessous par
--    cette adresse, et exécute cette ligne :

update profiles
set role = 'admin'
where id = (select id from auth.users where email = 'ton-email@exemple.com');


-- ============================================================
-- Source : gc-esport-trigger-inscription.sql
-- ============================================================

-- ============================================================
-- GC ESPORT — Création automatique du profil à l'inscription
-- À coller dans Supabase > SQL Editor > New query > Run
-- ============================================================
-- Avant : le site essayait de créer la fiche joueur/entreprise
-- juste après l'inscription, mais tant que l'e-mail n'est pas
-- confirmé, ce n'est pas encore autorisé.
-- Maintenant : cette fonction se déclenche automatiquement,
-- côté base de données, dès qu'un compte est créé — qu'il soit
-- confirmé ou non. Elle lit les informations envoyées par le
-- formulaire (rôle, pseudo, nom d'entreprise...) et crée la
-- bonne fiche.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := new.raw_user_meta_data->>'role';
  v_company_id uuid;
begin
  insert into public.profiles (id, role)
  values (new.id, coalesce(v_role, 'joueur')::user_role);

  if v_role = 'joueur' then
    insert into public.player_profiles (user_id, pseudo, ville, date_naissance, statut)
    values (
      new.id,
      new.raw_user_meta_data->>'pseudo',
      new.raw_user_meta_data->>'ville',
      nullif(new.raw_user_meta_data->>'date_naissance', '')::date,
      'inscription_incomplete'
    );

  elsif v_role = 'entreprise' then
    insert into public.companies (nom, secteur_activite, contact_email, statut)
    values (
      new.raw_user_meta_data->>'nom_entreprise',
      new.raw_user_meta_data->>'secteur_activite',
      coalesce(new.raw_user_meta_data->>'contact_email', new.email),
      'prospect'
    )
    returning id into v_company_id;

    insert into public.company_reps (company_id, user_id, fonction)
    values (v_company_id, new.id, 'Représentant principal');
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ============================================================
-- Source : gc-esport-permissions-profil.sql
-- ============================================================

-- ============================================================
-- GC ESPORT — Permissions pour compléter le profil joueur
-- À coller dans Supabase > SQL Editor > New query > Run
-- ============================================================

grant insert, update on public.player_game_accounts to authenticated;

alter table player_game_accounts enable row level security;

drop policy if exists "player_game_accounts_self" on player_game_accounts;
create policy "player_game_accounts_self" on player_game_accounts
  for all using (
    exists (
      select 1 from player_profiles pp
      where pp.id = player_game_accounts.player_id and pp.user_id = auth.uid()
    )
  );

-- Un admin doit aussi pouvoir consulter ces comptes de jeu lors
-- de la vérification d'un profil.
drop policy if exists "player_game_accounts_admin_read" on player_game_accounts;
create policy "player_game_accounts_admin_read" on player_game_accounts
  for select using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and p.role in ('super_admin', 'admin', 'responsable_joueurs')
    )
  );


-- ============================================================
-- Source : gc-esport-draft-permissions.sql
-- ============================================================

-- ============================================================
-- GC ESPORT — Module Draft : schéma + permissions
-- À coller dans Supabase > SQL Editor > New query > Run
-- ============================================================

-- Un statut manquait pour suivre l'avancement d'une édition du Draft
alter table draft_editions add column if not exists statut text not null default 'preparation';

-- ------------------------------------------------------------
-- Droits d'écriture (l'accès précis est ensuite filtré par les
-- règles RLS ci-dessous : un rôle "authenticated" seul n'a pas
-- automatiquement le droit d'agir sur les lignes des autres).
-- ------------------------------------------------------------
grant insert, update on public.editions to authenticated;
grant insert, update on public.draft_editions to authenticated;
grant insert, update on public.draft_order to authenticated;
grant insert, update on public.draft_picks to authenticated;
grant insert, update on public.teams to authenticated;
grant insert, update on public.team_assignments to authenticated;

-- ------------------------------------------------------------
-- Éditions de compétition : lecture publique, écriture admin
-- ------------------------------------------------------------
alter table editions enable row level security;

drop policy if exists "editions_public_read" on editions;
create policy "editions_public_read" on editions for select using (true);

drop policy if exists "editions_admin_write" on editions;
create policy "editions_admin_write" on editions
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid()
      and p.role in ('super_admin', 'admin', 'responsable_competitions'))
  );

-- ------------------------------------------------------------
-- Éditions du Draft : lecture publique, écriture admin
-- ------------------------------------------------------------
alter table draft_editions enable row level security;

drop policy if exists "draft_editions_public_read" on draft_editions;
create policy "draft_editions_public_read" on draft_editions for select using (true);

drop policy if exists "draft_editions_admin_write" on draft_editions;
create policy "draft_editions_admin_write" on draft_editions
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid()
      and p.role in ('super_admin', 'admin', 'responsable_competitions'))
  );

-- ------------------------------------------------------------
-- Ordre de sélection : lecture publique, écriture admin
-- ------------------------------------------------------------
alter table draft_order enable row level security;

drop policy if exists "draft_order_public_read" on draft_order;
create policy "draft_order_public_read" on draft_order for select using (true);

drop policy if exists "draft_order_admin_write" on draft_order;
create policy "draft_order_admin_write" on draft_order
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid()
      and p.role in ('super_admin', 'admin', 'responsable_competitions'))
  );

-- ------------------------------------------------------------
-- Sélections (picks) : une entreprise crée sa propre sélection,
-- le joueur concerné répond, l'admin valide.
-- ------------------------------------------------------------
drop policy if exists "draft_picks_company_insert" on draft_picks;
create policy "draft_picks_company_insert" on draft_picks
  for insert to authenticated with check (
    exists (select 1 from company_reps cr
      where cr.company_id = draft_picks.company_id and cr.user_id = auth.uid())
  );

drop policy if exists "draft_picks_select_involved" on draft_picks;
create policy "draft_picks_select_involved" on draft_picks
  for select using (
    exists (select 1 from company_reps cr
      where cr.company_id = draft_picks.company_id and cr.user_id = auth.uid())
    or exists (select 1 from player_profiles pp
      where pp.id = draft_picks.player_id and pp.user_id = auth.uid())
    or exists (select 1 from profiles p where p.id = auth.uid()
      and p.role in ('super_admin', 'admin', 'responsable_competitions', 'responsable_joueurs'))
  );

drop policy if exists "draft_picks_player_update" on draft_picks;
create policy "draft_picks_player_update" on draft_picks
  for update using (
    exists (select 1 from player_profiles pp
      where pp.id = draft_picks.player_id and pp.user_id = auth.uid())
  );

drop policy if exists "draft_picks_admin_update" on draft_picks;
create policy "draft_picks_admin_update" on draft_picks
  for update using (
    exists (select 1 from profiles p where p.id = auth.uid()
      and p.role in ('super_admin', 'admin', 'responsable_competitions'))
  );

-- ------------------------------------------------------------
-- Équipes et affectations : lecture publique, écriture admin
-- ------------------------------------------------------------
alter table teams enable row level security;

drop policy if exists "teams_public_read" on teams;
create policy "teams_public_read" on teams for select using (true);

drop policy if exists "teams_admin_write" on teams;
create policy "teams_admin_write" on teams
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid()
      and p.role in ('super_admin', 'admin', 'responsable_competitions'))
  );

alter table team_assignments enable row level security;

drop policy if exists "team_assignments_public_read" on team_assignments;
create policy "team_assignments_public_read" on team_assignments for select using (true);

drop policy if exists "team_assignments_admin_write" on team_assignments;
create policy "team_assignments_admin_write" on team_assignments
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid()
      and p.role in ('super_admin', 'admin', 'responsable_competitions'))
  );


-- ============================================================
-- Source : gc-esport-storage-photos.sql
-- ============================================================

-- ============================================================
-- GC ESPORT — Stockage des photos de profil et logos
-- À coller dans Supabase > SQL Editor > New query > Run
-- ============================================================

-- Crée un espace de stockage public nommé "avatars"
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- N'importe quel compte connecté peut déposer un fichier
drop policy if exists "avatars_insert_auth" on storage.objects;
create policy "avatars_insert_auth" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars');

-- Seul celui qui a déposé le fichier peut le remplacer ou le supprimer
drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own" on storage.objects
  for update using (bucket_id = 'avatars' and owner = auth.uid());

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own" on storage.objects
  for delete using (bucket_id = 'avatars' and owner = auth.uid());

-- Les photos sont visibles par tout le monde (profils publics)
drop policy if exists "avatars_select_public" on storage.objects;
create policy "avatars_select_public" on storage.objects
  for select using (bucket_id = 'avatars');


-- ============================================================
-- Source : gc-esport-championnat-permissions.sql
-- ============================================================

-- ============================================================
-- GC ESPORT — Permissions pour la gestion du championnat
-- À coller dans Supabase > SQL Editor > New query > Run
-- ============================================================

grant insert, update on public.matches to authenticated;

alter table matches enable row level security;

-- Les résultats sont publics (page classements)
drop policy if exists "matches_public_read" on matches;
create policy "matches_public_read" on matches for select using (true);

-- Seul GC ESPORT peut créer un match ou modifier un score —
-- jamais une entreprise ni un joueur.
drop policy if exists "matches_admin_write" on matches;
create policy "matches_admin_write" on matches
  for all using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and p.role in ('super_admin', 'admin', 'responsable_competitions')
    )
  );


-- ============================================================
-- Source : gc-esport-engagements-permissions.sql
-- ============================================================

-- ============================================================
-- GC ESPORT — Module Engagements & Documents
-- À coller dans Supabase > SQL Editor > New query > Run
-- ============================================================

-- Espace de stockage privé (contrairement aux photos de profil,
-- ces documents contiennent des informations personnelles et ne
-- doivent jamais être publics)
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Chacun ne peut déposer que dans son propre dossier (préfixé par
-- son identifiant), qu'il soit joueur ou représentant d'entreprise
drop policy if exists "documents_storage_insert_own" on storage.objects;
create policy "documents_storage_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "documents_storage_select_own_or_admin" on storage.objects;
create policy "documents_storage_select_own_or_admin" on storage.objects
  for select using (
    bucket_id = 'documents' and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from profiles p where p.id = auth.uid()
          and p.role in ('super_admin', 'admin', 'responsable_competitions', 'responsable_partenariats', 'responsable_joueurs')
      )
    )
  );

-- ------------------------------------------------------------
-- Table "engagements" : GC ESPORT crée l'engagement, le joueur ou
-- l'entreprise concerné le consulte, GC ESPORT seul le valide.
-- ------------------------------------------------------------
grant insert, update on public.engagements to authenticated;

drop policy if exists "engagements_admin_all" on engagements;
create policy "engagements_admin_all" on engagements
  for all using (
    exists (
      select 1 from profiles p where p.id = auth.uid()
        and p.role in ('super_admin', 'admin', 'responsable_competitions', 'responsable_partenariats', 'responsable_joueurs')
    )
  );

drop policy if exists "engagements_player_read" on engagements;
create policy "engagements_player_read" on engagements
  for select using (
    exists (select 1 from player_profiles pp where pp.id = engagements.player_id and pp.user_id = auth.uid())
  );

drop policy if exists "engagements_company_read" on engagements;
create policy "engagements_company_read" on engagements
  for select using (
    exists (select 1 from company_reps cr where cr.company_id = engagements.company_id and cr.user_id = auth.uid())
  );

-- ------------------------------------------------------------
-- Table "documents" : le joueur ou l'entreprise dépose son fichier
-- signé pour SON PROPRE engagement uniquement.
-- ------------------------------------------------------------
grant insert, select on public.documents to authenticated;

drop policy if exists "documents_admin_all" on documents;
create policy "documents_admin_all" on documents
  for all using (
    exists (
      select 1 from profiles p where p.id = auth.uid()
        and p.role in ('super_admin', 'admin', 'responsable_competitions', 'responsable_partenariats', 'responsable_joueurs')
    )
  );

drop policy if exists "documents_owner_insert" on documents;
create policy "documents_owner_insert" on documents
  for insert to authenticated with check (
    exists (
      select 1 from engagements e
      left join player_profiles pp on pp.id = e.player_id
      left join company_reps cr on cr.company_id = e.company_id
      where e.id = documents.engagement_id
        and (pp.user_id = auth.uid() or cr.user_id = auth.uid())
    )
  );

drop policy if exists "documents_owner_read" on documents;
create policy "documents_owner_read" on documents
  for select using (
    exists (
      select 1 from engagements e
      left join player_profiles pp on pp.id = e.player_id
      left join company_reps cr on cr.company_id = e.company_id
      where e.id = documents.engagement_id
        and (pp.user_id = auth.uid() or cr.user_id = auth.uid())
    )
  );


-- ============================================================
-- Source : gc-esport-combine-permissions.sql
-- ============================================================

-- ============================================================
-- GC ESPORT — Module Combine (évaluations avant le Draft)
-- À coller dans Supabase > SQL Editor > New query > Run
-- ============================================================

grant insert, update on public.combine_sessions to authenticated;
grant insert, update on public.evaluations to authenticated;
grant insert, update on public.player_stats to authenticated;

-- Sessions d'évaluation : visibles publiquement (calendrier), gérées par l'admin
alter table combine_sessions enable row level security;

drop policy if exists "combine_sessions_public_read" on combine_sessions;
create policy "combine_sessions_public_read" on combine_sessions for select using (true);

drop policy if exists "combine_sessions_admin_write" on combine_sessions;
create policy "combine_sessions_admin_write" on combine_sessions
  for all using (
    exists (
      select 1 from profiles p where p.id = auth.uid()
        and p.role in ('super_admin', 'admin', 'responsable_joueurs', 'responsable_competitions')
    )
  );

-- Évaluations qualitatives : privées — visibles par l'admin et par le joueur concerné uniquement
alter table evaluations enable row level security;

drop policy if exists "evaluations_admin_all" on evaluations;
create policy "evaluations_admin_all" on evaluations
  for all using (
    exists (
      select 1 from profiles p where p.id = auth.uid()
        and p.role in ('super_admin', 'admin', 'responsable_joueurs')
    )
  );

drop policy if exists "evaluations_player_read_own" on evaluations;
create policy "evaluations_player_read_own" on evaluations
  for select using (
    exists (select 1 from player_profiles pp where pp.id = evaluations.player_id and pp.user_id = auth.uid())
  );

-- Statistiques vérifiées : publiques (utile pour les profils joueurs), gérées par l'admin
alter table player_stats enable row level security;

drop policy if exists "player_stats_public_read" on player_stats;
create policy "player_stats_public_read" on player_stats for select using (true);

drop policy if exists "player_stats_admin_write" on player_stats;
create policy "player_stats_admin_write" on player_stats
  for all using (
    exists (
      select 1 from profiles p where p.id = auth.uid()
        and p.role in ('super_admin', 'admin', 'responsable_joueurs')
    )
  );


-- ============================================================
-- Source : gc-esport-complement-brief.sql
-- ============================================================

-- ============================================================
-- GC ESPORT — Compléments du brief : sponsors, actualités,
-- sondages, représentants, shortlist, rôles utilisateurs
-- À coller dans Supabase > SQL Editor > New query > Run
-- ============================================================

-- ------------------------------------------------------------
-- Sponsors / partenaires : lecture publique, écriture admin
-- ------------------------------------------------------------
grant insert, update on public.sponsors to authenticated;

alter table sponsors enable row level security;

drop policy if exists "sponsors_public_read" on sponsors;
create policy "sponsors_public_read" on sponsors for select using (true);

drop policy if exists "sponsors_admin_write" on sponsors;
create policy "sponsors_admin_write" on sponsors
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid()
      and p.role in ('super_admin', 'admin', 'responsable_partenariats', 'responsable_communication'))
  );

-- ------------------------------------------------------------
-- Actualités : lecture publique des articles publiés, écriture admin
-- ------------------------------------------------------------
grant insert, update on public.news to authenticated;

alter table news enable row level security;

drop policy if exists "news_public_read" on news;
create policy "news_public_read" on news for select using (publie = true);

drop policy if exists "news_admin_all" on news;
create policy "news_admin_all" on news
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid()
      and p.role in ('super_admin', 'admin', 'responsable_communication'))
  );

-- ------------------------------------------------------------
-- Sondages (Fan Zone)
-- ------------------------------------------------------------
create table if not exists polls (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  actif boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references polls(id) on delete cascade,
  texte text not null,
  created_at timestamptz not null default now()
);

create table if not exists poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references polls(id) on delete cascade,
  option_id uuid not null references poll_options(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (poll_id, user_id)
);

grant select on public.polls, public.poll_options, public.poll_votes to anon, authenticated;
grant insert, update on public.polls, public.poll_options to authenticated;
grant insert on public.poll_votes to authenticated;

alter table polls enable row level security;
alter table poll_options enable row level security;
alter table poll_votes enable row level security;

drop policy if exists "polls_public_read" on polls;
create policy "polls_public_read" on polls for select using (true);
drop policy if exists "poll_options_public_read" on poll_options;
create policy "poll_options_public_read" on poll_options for select using (true);
drop policy if exists "poll_votes_public_read" on poll_votes;
create policy "poll_votes_public_read" on poll_votes for select using (true);

drop policy if exists "polls_admin_write" on polls;
create policy "polls_admin_write" on polls
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid()
      and p.role in ('super_admin', 'admin', 'responsable_communication'))
  );

drop policy if exists "poll_options_admin_write" on poll_options;
create policy "poll_options_admin_write" on poll_options
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid()
      and p.role in ('super_admin', 'admin', 'responsable_communication'))
  );

-- Chacun ne peut voter qu'en son propre nom (unicité déjà garantie par la table)
drop policy if exists "poll_votes_insert_own" on poll_votes;
create policy "poll_votes_insert_own" on poll_votes
  for insert to authenticated with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- Gestion des représentants d'entreprise
-- ------------------------------------------------------------
-- Fonction sécurisée : retrouve l'identifiant d'un compte à partir
-- de son e-mail, sans exposer le reste de la table des comptes.
create or replace function public.find_user_id_by_email(p_email text)
returns uuid
language sql
security definer
set search_path = public
as $$
  select id from auth.users where email = p_email limit 1;
$$;

grant execute on function public.find_user_id_by_email(text) to authenticated;

grant delete on public.company_reps to authenticated;

-- Un représentant peut ajouter/retirer un collègue de SA propre entreprise
drop policy if exists "company_reps_add_teammate" on company_reps;
create policy "company_reps_add_teammate" on company_reps
  for insert to authenticated with check (
    exists (select 1 from company_reps cr where cr.company_id = company_reps.company_id and cr.user_id = auth.uid())
  );

drop policy if exists "company_reps_remove_teammate" on company_reps;
create policy "company_reps_remove_teammate" on company_reps
  for delete using (
    exists (select 1 from company_reps cr where cr.company_id = company_reps.company_id and cr.user_id = auth.uid())
  );

-- ------------------------------------------------------------
-- Shortlist privée (scouting entreprise)
-- ------------------------------------------------------------
create table if not exists shortlist_entries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  player_id uuid not null references player_profiles(id) on delete cascade,
  notes text,
  created_at timestamptz not null default now(),
  unique (company_id, player_id)
);

grant select, insert, update, delete on public.shortlist_entries to authenticated;

alter table shortlist_entries enable row level security;

drop policy if exists "shortlist_own_company" on shortlist_entries;
create policy "shortlist_own_company" on shortlist_entries
  for all using (
    exists (select 1 from company_reps cr where cr.company_id = shortlist_entries.company_id and cr.user_id = auth.uid())
  );

-- ------------------------------------------------------------
-- Gestion des rôles utilisateurs (réservé aux comptes admin)
-- ------------------------------------------------------------
drop policy if exists "profiles_admin_manage_roles" on profiles;
create policy "profiles_admin_manage_roles" on profiles
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('super_admin', 'admin'))
  );


-- ============================================================
-- Source : gc-esport-fix-connexion-admin.sql
-- ============================================================

-- ============================================================
-- GC ESPORT — Correctif : boucle infinie bloquant la connexion
-- À coller dans Supabase > SQL Editor > New query > Run
-- ============================================================
-- La règle "profiles_admin_manage_roles" vérifiait le rôle admin
-- en interrogeant la table profiles depuis une règle DE la table
-- profiles — ce qui crée une boucle que la base refuse d'exécuter.
-- On passe par une fonction dédiée qui contourne ce problème.

drop policy if exists "profiles_admin_manage_roles" on profiles;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role in ('super_admin', 'admin')
  );
$$;

grant execute on function public.is_admin() to authenticated;

drop policy if exists "profiles_admin_manage_roles" on profiles;
create policy "profiles_admin_manage_roles" on profiles
  for all using (public.is_admin());


-- ============================================================
-- Source : gc-esport-fix-retrait-draft.sql
-- ============================================================

-- ============================================================
-- GC ESPORT — Correctif : retrait d'une entreprise du Draft
-- À coller dans Supabase > SQL Editor > New query > Run
-- ============================================================
-- Le droit de suppression manquait sur draft_order — le clic sur
-- "Retirer" échouait silencieusement sans rien changer.

grant delete on public.draft_order to authenticated;


-- ============================================================
-- Source : gc-esport-contact-messages.sql
-- ============================================================

-- ============================================================
-- GC ESPORT — Formulaire de contact fonctionnel
-- À coller dans Supabase > SQL Editor > New query > Run
-- ============================================================

create table if not exists contact_messages (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  email text not null,
  message text not null,
  lu boolean not null default false,
  created_at timestamptz not null default now()
);

-- N'importe quel visiteur (même non connecté) peut envoyer un message
grant insert on public.contact_messages to anon, authenticated;
grant select, update on public.contact_messages to authenticated;

alter table contact_messages enable row level security;

drop policy if exists "contact_messages_insert_public" on contact_messages;
create policy "contact_messages_insert_public" on contact_messages
  for insert with check (true);

drop policy if exists "contact_messages_admin_read" on contact_messages;
create policy "contact_messages_admin_read" on contact_messages
  for select using (
    exists (
      select 1 from profiles p where p.id = auth.uid()
        and p.role in ('super_admin', 'admin', 'responsable_communication')
    )
  );

drop policy if exists "contact_messages_admin_update" on contact_messages;
create policy "contact_messages_admin_update" on contact_messages
  for update using (
    exists (
      select 1 from profiles p where p.id = auth.uid()
        and p.role in ('super_admin', 'admin', 'responsable_communication')
    )
  );


-- ============================================================
-- Source : gc-esport-notifications.sql
-- ============================================================

-- ============================================================
-- GC ESPORT — Notifications in-app
-- À coller dans Supabase > SQL Editor > New query > Run
-- ============================================================
-- Chacun ne lit et ne modifie (marquer comme lu) que ses propres
-- notifications. La création se fait depuis le site au moment de
-- chaque événement (sélection Draft, validation, engagement...),
-- donc n'importe quel compte connecté peut créer une notification
-- pour un autre utilisateur concerné par son action — c'est une
-- version simple pour le MVP, à renforcer plus tard avec une
-- fonction serveur dédiée si besoin.

grant select, insert, update on public.notifications to authenticated;

drop policy if exists "notifications_select_own" on notifications;
create policy "notifications_select_own" on notifications
  for select using (auth.uid() = user_id);

drop policy if exists "notifications_insert_authenticated" on notifications;
create policy "notifications_insert_authenticated" on notifications
  for insert to authenticated with check (true);

drop policy if exists "notifications_update_own" on notifications;
create policy "notifications_update_own" on notifications
  for update using (auth.uid() = user_id);


-- ============================================================
-- Source : gc-esport-admin-competitions.sql
-- ============================================================

-- ============================================================
-- GC ESPORT — Gestion admin des compétitions et des jeux
-- À coller dans Supabase > SQL Editor > New query > Run
-- ============================================================
-- Ces deux tables n'avaient encore jamais reçu de droit
-- d'écriture — seul l'admin peut créer/modifier une compétition
-- ou un jeu, la lecture reste publique.

grant insert, update on public.games to authenticated;
grant insert, update on public.competitions to authenticated;

alter table games enable row level security;
drop policy if exists "games_public_read" on games;
create policy "games_public_read" on games for select using (true);
drop policy if exists "games_admin_write" on games;
create policy "games_admin_write" on games
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid()
      and p.role in ('super_admin', 'admin', 'responsable_competitions'))
  );

alter table competitions enable row level security;
drop policy if exists "competitions_public_read" on competitions;
create policy "competitions_public_read" on competitions for select using (true);
drop policy if exists "competitions_admin_write" on competitions;
create policy "competitions_admin_write" on competitions
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid()
      and p.role in ('super_admin', 'admin', 'responsable_competitions'))
  );


-- ============================================================
-- Source : gc-esport-recrutement-permissions.sql
-- ============================================================

-- ============================================================
-- GC ESPORT — Module Recrutement libre & Transferts
-- À coller dans Supabase > SQL Editor > New query > Run
-- ============================================================

do $$ begin
  create type recruitment_type as enum ('recrutement_libre', 'transfert');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type recruitment_status as enum (
  'en_attente_reponse_joueur',
  'refusee_joueur',
  'en_attente_ancienne_entreprise',
  'refusee_ancienne_entreprise',
  'en_attente_validation_gcesport',
  'validee',
  'annulee'
);
exception when duplicate_object then null;
end $$;

create table if not exists recruitment_offers (
  id uuid primary key default gen_random_uuid(),
  type recruitment_type not null,
  player_id uuid not null references player_profiles(id),
  company_id uuid not null references companies(id),       -- entreprise qui recrute
  ancienne_company_id uuid references companies(id),        -- uniquement pour un transfert
  edition_id uuid not null references editions(id),
  duree_mois int,
  budget_propose text,
  conditions text,
  statut recruitment_status not null default 'en_attente_reponse_joueur',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update on public.recruitment_offers to authenticated;
grant select on public.recruitment_offers to anon;

alter table recruitment_offers enable row level security;

-- L'admin voit et gère tout
drop policy if exists "recruitment_admin_all" on recruitment_offers;
create policy "recruitment_admin_all" on recruitment_offers
  for all using (
    exists (
      select 1 from profiles p where p.id = auth.uid()
        and p.role in ('super_admin', 'admin', 'responsable_competitions', 'responsable_joueurs', 'responsable_partenariats')
    )
  );

-- Une entreprise crée une offre pour SA propre entreprise
drop policy if exists "recruitment_company_insert" on recruitment_offers;
create policy "recruitment_company_insert" on recruitment_offers
  for insert to authenticated with check (
    exists (select 1 from company_reps cr where cr.company_id = recruitment_offers.company_id and cr.user_id = auth.uid())
  );

-- Voient l'offre : l'entreprise qui recrute, l'ancienne entreprise (si transfert), le joueur concerné, l'admin
drop policy if exists "recruitment_select_involved" on recruitment_offers;
create policy "recruitment_select_involved" on recruitment_offers
  for select using (
    exists (select 1 from company_reps cr where cr.company_id = recruitment_offers.company_id and cr.user_id = auth.uid())
    or exists (select 1 from company_reps cr where cr.company_id = recruitment_offers.ancienne_company_id and cr.user_id = auth.uid())
    or exists (select 1 from player_profiles pp where pp.id = recruitment_offers.player_id and pp.user_id = auth.uid())
    or exists (
      select 1 from profiles p where p.id = auth.uid()
        and p.role in ('super_admin', 'admin', 'responsable_competitions', 'responsable_joueurs', 'responsable_partenariats')
    )
  );

-- Le joueur peut accepter/refuser une offre qui le concerne
drop policy if exists "recruitment_player_update" on recruitment_offers;
create policy "recruitment_player_update" on recruitment_offers
  for update using (
    exists (select 1 from player_profiles pp where pp.id = recruitment_offers.player_id and pp.user_id = auth.uid())
  );

-- L'ancienne entreprise peut approuver/refuser le départ de SON joueur
drop policy if exists "recruitment_ancienne_company_update" on recruitment_offers;
create policy "recruitment_ancienne_company_update" on recruitment_offers
  for update using (
    exists (select 1 from company_reps cr where cr.company_id = recruitment_offers.ancienne_company_id and cr.user_id = auth.uid())
  );

-- Un transfert validé retire le joueur de son ancienne équipe :
-- il faut le droit de suppression sur les affectations.
grant delete on public.team_assignments to authenticated;


-- ============================================================
-- Source : gc-esport-audit-corrections-v2.sql
-- ============================================================

-- ============================================================
-- GC ESPORT — Corrections de sécurité (version rejouable)
-- Tu peux exécuter ce script plusieurs fois sans risque : chaque
-- étape supprime d'abord l'ancienne version avant de la recréer.
-- À coller dans Supabase > SQL Editor > New query > Run
-- ============================================================

-- ------------------------------------------------------------
-- 1. company_reps — boucle infinie sur l'ajout/retrait de collègue
-- ------------------------------------------------------------
drop policy if exists "company_reps_add_teammate" on company_reps;
drop policy if exists "company_reps_remove_teammate" on company_reps;

create or replace function public.is_company_rep(p_company_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from company_reps where company_id = p_company_id and user_id = auth.uid()
  );
$$;

grant execute on function public.is_company_rep(uuid) to authenticated;

drop policy if exists "company_reps_add_teammate" on company_reps;
create policy "company_reps_add_teammate" on company_reps
  for insert to authenticated with check (public.is_company_rep(company_id));

drop policy if exists "company_reps_remove_teammate" on company_reps;
create policy "company_reps_remove_teammate" on company_reps
  for delete using (public.is_company_rep(company_id));

-- ------------------------------------------------------------
-- 2. Droits de suppression manquants
-- ------------------------------------------------------------
grant delete on public.news to authenticated;
grant delete on public.sponsors to authenticated;

-- ------------------------------------------------------------
-- 3. Évaluations du Combine doivent être publiques (carte joueur)
-- ------------------------------------------------------------
alter table evaluations enable row level security;
drop policy if exists "evaluations_player_read_own" on evaluations;
drop policy if exists "evaluations_public_read" on evaluations;
drop policy if exists "evaluations_public_read" on evaluations;
create policy "evaluations_public_read" on evaluations for select using (true);

-- ------------------------------------------------------------
-- 4. Sélections du Draft doivent être visibles par toutes les
--    entreprises participantes (calcul du tour de jeu)
-- ------------------------------------------------------------
drop policy if exists "draft_picks_select_involved" on draft_picks;
drop policy if exists "draft_picks_public_read" on draft_picks;
drop policy if exists "draft_picks_public_read" on draft_picks;
create policy "draft_picks_public_read" on draft_picks for select using (true);

-- ------------------------------------------------------------
-- 5. Joueurs éligibles visibles par les entreprises même si leur
--    profil n'est pas encore public
-- ------------------------------------------------------------
drop policy if exists "player_profiles_eligible_read" on player_profiles;
drop policy if exists "player_profiles_eligible_read" on player_profiles;
create policy "player_profiles_eligible_read" on player_profiles
  for select to authenticated using (statut = 'eligible_draft');

-- ------------------------------------------------------------
-- 6. Tables détectées comme non protégées par le vérificateur de
--    sécurité Supabase : combine_sessions, player_stats,
--    player_status_history, registrations
-- ------------------------------------------------------------
alter table combine_sessions enable row level security;
drop policy if exists "combine_sessions_public_read" on combine_sessions;
drop policy if exists "combine_sessions_admin_write" on combine_sessions;
drop policy if exists "combine_sessions_public_read" on combine_sessions;
create policy "combine_sessions_public_read" on combine_sessions for select using (true);
drop policy if exists "combine_sessions_admin_write" on combine_sessions;
create policy "combine_sessions_admin_write" on combine_sessions
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid()
      and p.role in ('super_admin', 'admin', 'responsable_joueurs', 'responsable_competitions'))
  );

alter table player_stats enable row level security;
drop policy if exists "player_stats_public_read" on player_stats;
drop policy if exists "player_stats_admin_write" on player_stats;
drop policy if exists "player_stats_public_read" on player_stats;
create policy "player_stats_public_read" on player_stats for select using (true);
drop policy if exists "player_stats_admin_write" on player_stats;
create policy "player_stats_admin_write" on player_stats
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid()
      and p.role in ('super_admin', 'admin', 'responsable_joueurs'))
  );

alter table player_status_history enable row level security;
drop policy if exists "player_status_history_admin_all" on player_status_history;
drop policy if exists "player_status_history_admin_all" on player_status_history;
create policy "player_status_history_admin_all" on player_status_history
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid()
      and p.role in ('super_admin', 'admin', 'responsable_joueurs'))
  );

alter table registrations enable row level security;
drop policy if exists "registrations_admin_all" on registrations;
drop policy if exists "registrations_player_own" on registrations;
drop policy if exists "registrations_admin_all" on registrations;
create policy "registrations_admin_all" on registrations
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid()
      and p.role in ('super_admin', 'admin', 'responsable_competitions', 'responsable_joueurs'))
  );
drop policy if exists "registrations_player_own" on registrations;
create policy "registrations_player_own" on registrations
  for select using (
    exists (select 1 from player_profiles pp where pp.id = registrations.player_id and pp.user_id = auth.uid())
  );


-- ============================================================
-- Source : gc-esport-suppression-permissions.sql
-- ============================================================

-- ============================================================
-- GC ESPORT — Droits de suppression (admin)
-- À coller dans Supabase > SQL Editor > New query > Run
-- ============================================================
-- Les règles de sécurité (RLS) admin existaient déjà pour ces
-- tables, mais le droit de suppression au niveau de la table
-- n'avait jamais été accordé — comme pour draft_order plus tôt.

grant delete on public.player_profiles to authenticated;
grant delete on public.companies to authenticated;
grant delete on public.competitions to authenticated;
grant delete on public.editions to authenticated;


-- ============================================================
-- Source : gc-esport-bracket.sql
-- ============================================================

-- ============================================================
-- GC ESPORT — Bracket (élimination directe)
-- À coller dans Supabase > SQL Editor > New query > Run
-- ============================================================

create table if not exists bracket_matches (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references editions(id) on delete cascade,
  tour int not null,                      -- 1 = premier tour, 2 = suivant, etc.
  position int not null,                  -- position dans le tour (0-indexé)
  team_a_id uuid references teams(id),
  team_b_id uuid references teams(id),
  score_a int,
  score_b int,
  vainqueur_team_id uuid references teams(id),
  valide boolean not null default false,
  date_match timestamptz,
  created_at timestamptz not null default now(),
  unique (edition_id, tour, position)
);

grant select on public.bracket_matches to anon, authenticated;
grant insert, update, delete on public.bracket_matches to authenticated;

alter table bracket_matches enable row level security;

drop policy if exists "bracket_matches_public_read" on bracket_matches;
create policy "bracket_matches_public_read" on bracket_matches for select using (true);

drop policy if exists "bracket_matches_admin_write" on bracket_matches;
create policy "bracket_matches_admin_write" on bracket_matches
  for all using (
    exists (
      select 1 from profiles p where p.id = auth.uid()
        and p.role in ('super_admin', 'admin', 'responsable_competitions')
    )
  );


-- ============================================================
-- Source : gc-esport-plateforme-multijeux.sql
-- ============================================================

-- ============================================================
-- GC ESPORT — Plateforme, sélection multi-jeux, gestion des jeux
-- À coller dans Supabase > SQL Editor > New query > Run
-- ============================================================

-- Plateforme principale du joueur (console / mobile / pc)
alter table player_profiles add column if not exists plateforme_principale text;

-- Le trigger d'inscription gère maintenant aussi la plateforme et
-- une liste de jeux (au lieu d'un seul), passés depuis le formulaire.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := new.raw_user_meta_data->>'role';
  v_company_id uuid;
  v_player_id uuid;
  v_game jsonb;
begin
  insert into public.profiles (id, role)
  values (new.id, coalesce(v_role, 'joueur')::user_role);

  if v_role = 'joueur' then
    insert into public.player_profiles (user_id, pseudo, ville, date_naissance, plateforme_principale, statut)
    values (
      new.id,
      new.raw_user_meta_data->>'pseudo',
      new.raw_user_meta_data->>'ville',
      nullif(new.raw_user_meta_data->>'date_naissance', '')::date,
      new.raw_user_meta_data->>'plateforme_principale',
      'inscription_incomplete'
    )
    returning id into v_player_id;

    if new.raw_user_meta_data ? 'games' then
      for v_game in select * from jsonb_array_elements(new.raw_user_meta_data->'games')
      loop
        insert into public.player_game_accounts (player_id, game_id, identifiant_gaming)
        values (
          v_player_id,
          (v_game->>'game_id')::uuid,
          coalesce(v_game->>'identifiant_gaming', '')
        );
      end loop;
    end if;

  elsif v_role = 'entreprise' then
    insert into public.companies (nom, secteur_activite, contact_email, statut)
    values (
      new.raw_user_meta_data->>'nom_entreprise',
      new.raw_user_meta_data->>'secteur_activite',
      coalesce(new.raw_user_meta_data->>'contact_email', new.email),
      'prospect'
    )
    returning id into v_company_id;

    insert into public.company_reps (company_id, user_id, fonction)
    values (v_company_id, new.id, 'Représentant principal');
  end if;

  return new;
end;
$$;

-- Droit de suppression sur les jeux (retrait par l'admin)
grant delete on public.games to authenticated;

-- Un joueur doit pouvoir gérer sa propre liste de jeux depuis son
-- profil (déjà accordé pour insert/update — on ajoute delete ici,
-- pour pouvoir retirer un jeu de son profil).
grant delete on public.player_game_accounts to authenticated;
