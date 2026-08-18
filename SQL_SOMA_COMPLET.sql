-- =====================================================================
-- SOMA — SQL en attente de déploiement (COMPLET & AUTONOME)
-- À exécuter dans Supabase → SQL Editor → New query → Run
-- =====================================================================
-- Ce script est complet : il contient TOUT ce dont dépendent les écrans
-- « Affectation DR » et « Admin → Forcer statut ». Il complète la base
-- existante (tables + RLS déjà en place) ; il ne recrée pas le schéma.
--
-- Prérequis déjà en place (posés lors de l'audit sécurité précédent) :
--   • RLS active sur profiles + policies admin (select/insert/update/delete)
--   • vue consolidation en security_invoker, trigger set_updated_at durci
-- Ces éléments NE sont PAS répétés ici.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) Fonction affecter_dr  (écran « Affectation DR », rôle CG/DF/admin)
-- ---------------------------------------------------------------------
-- Toute l'affectation passe par cette seule fonction serveur autorisée,
-- pour ne PAS rouvrir l'écriture directe sur profiles/agences/regions au
-- CG (ce qui déferait l'audit et permettrait une élévation de privilège).
-- SECURITY DEFINER : elle s'exécute avec les droits du propriétaire et
-- effectue les écritures en interne, après avoir vérifié le rôle appelant.
-- %type : robuste quel que soit le type réel de regions.id (uuid ou entier).

create or replace function public.affecter_dr(p_agence text, p_dr uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role   public.profiles.role%type;
  v_region public.regions.id%type;
  v_nom    public.profiles.nom%type;
begin
  -- 1) Autorisation : seuls admin, CG et DF peuvent affecter
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is null or v_role not in ('admin','cg','df') then
    raise exception 'Action réservée aux profils admin, CG ou DF';
  end if;

  -- 2) Désaffectation (aucun DR sélectionné)
  if p_dr is null then
    update public.agences set region_id = null where nom = p_agence;
    return;
  end if;

  -- 3) Région du DR (créée si le DR n'en a pas encore)
  select region_id, nom into v_region, v_nom
  from public.profiles where id = p_dr;
  if not found then
    raise exception 'DR introuvable';
  end if;

  if v_region is null then
    insert into public.regions (nom) values (v_nom) returning id into v_region;
    update public.profiles set region_id = v_region where id = p_dr;
  end if;

  -- 4) Affecter l'agence à la région du DR
  update public.agences set region_id = v_region where nom = p_agence;
end;
$$;

revoke all on function public.affecter_dr(text, uuid) from public, anon;
grant execute on function public.affecter_dr(text, uuid) to authenticated;


-- ---------------------------------------------------------------------
-- 2) Policy UPDATE sur budgets pour l'admin (écran « Forcer statut »)
-- ---------------------------------------------------------------------
-- Aligné sur le style de tes policies profiles : (select auth.uid())
-- évite la réévaluation de auth.uid() à chaque ligne (recommandation audit).

drop policy if exists admin_update_budgets on public.budgets;

create policy admin_update_budgets
  on public.budgets
  for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'admin'
    )
  );

-- =====================================================================
-- Fin. Après exécution : « Affectation DR » et « Forcer statut » (admin)
-- fonctionnent. Aucune écriture directe n'est ouverte sur profiles/agences/
-- regions au CG — tout passe par la fonction autorisée ci-dessus.
-- =====================================================================
