-- Permet d'afficher le nom de la personne dans tous les historiques/journaux.
-- Ajoute une colonne "nom" sur profiles : les joueurs et entreprises ont déjà
-- un nom affichable ailleurs (pseudo / nom d'entreprise), mais les comptes
-- admin n'avaient jusqu'ici aucun nom stocké nulle part.

alter table public.profiles add column if not exists nom text;

-- (aucun changement de droits nécessaire pour profiles/player_profiles :
-- les admins ont déjà une règle "for all using (is_admin())" qui couvre
-- la lecture de n'importe quelle ligne)

-- company_reps n'avait en revanche qu'une règle "self" (chacun ne voit que
-- sa propre ligne) : un admin ne pouvait donc pas retrouver à quelle
-- entreprise appartient un représentant pour afficher son nom dans un
-- historique. On ajoute une règle de lecture réservée aux admins.
drop policy if exists "company_reps_admin_read" on public.company_reps;
create policy "company_reps_admin_read" on public.company_reps
  for select using (public.is_admin());
