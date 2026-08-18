-- =====================================================================
-- SOMA — SQL en attente de déploiement (à exécuter dans Supabase SQL Editor)
-- =====================================================================
-- Ces éléments sont référencés par l'application React mais pas encore
-- déployés côté base. Tant qu'ils ne le sont pas, les écrans concernés
-- renverront une erreur (que l'interface affiche clairement).

-- ---------------------------------------------------------------------
-- 1) Policy UPDATE sur `budgets` pour le rôle admin
--    Requise par l'écran Admin → « Forcer statut » (adminForceStatut).
--    Sans elle, la RLS bloque la mise à jour du statut par l'admin.
-- ---------------------------------------------------------------------
create policy "admin_update_budgets"
  on public.budgets
  for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ---------------------------------------------------------------------
-- 2) Rappel : fonction affecter_dr (écran « Affectation DR »)
--    Si elle n'a pas encore été déployée, reprendre le bloc
--    `create or replace function public.affecter_dr(...)` fourni
--    précédemment. L'écran Affectation DR en dépend.
-- ---------------------------------------------------------------------
-- (voir l'échange précédent pour le corps complet de la fonction)
