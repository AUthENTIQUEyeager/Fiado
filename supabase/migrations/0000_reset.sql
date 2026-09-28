-- FIADO — reinitialisation complete d'un projet Supabase existant
-- A COLLER DANS L'EDITEUR SQL SUPABASE ET EXECUTER EN PREMIER,
-- AVANT 0001_init.sql. Destructeur et irreversible.
--
-- Sauvegarde d'abord si l'ancienne base contient quelque chose d'utile :
-- Supabase > Database > Backups, ou `pg_dump` en ligne de commande.
--
-- Ce script supprime TOUTES les tables et fonctions du schema public
-- (peu importe leur nom / projet d'origine), et desactive les taches
-- cron existantes. Il ne touche PAS aux comptes d'authentification
-- (auth.users) ni au Storage — voir la section optionnelle en bas si
-- tu veux aussi repartir de zero sur les utilisateurs.

-- 1. Desactive toutes les taches cron existantes (si l'extension est active)
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(job.jobid) from cron.job as job;
  end if;
end $$;

-- 2. Supprime toutes les tables du schema public
do $$
declare
  r record;
begin
  for r in (select tablename from pg_tables where schemaname = 'public') loop
    execute format('drop table if exists public.%I cascade', r.tablename);
  end loop;
end $$;

-- 3. Supprime toutes les fonctions du schema public (ex. get_reliability
--    d'une precedente tentative, ou des fonctions d'un autre projet)
do $$
declare
  r record;
begin
  for r in (
    select p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on p.pronamespace = n.oid
    where n.nspname = 'public'
  ) loop
    execute format('drop function if exists public.%I(%s) cascade', r.proname, r.args);
  end loop;
end $$;

-- Verification : cette requete doit renvoyer 0 ligne avant de continuer
select tablename from pg_tables where schemaname = 'public';

-- ---------------------------------------------------------------------
-- OPTIONNEL — decommente uniquement si tu veux aussi vider les comptes
-- utilisateurs de l'ancien projet (irreversible, casse toute session
-- active liee a l'ancienne base) :
--
-- delete from auth.users;
-- ---------------------------------------------------------------------

-- Une fois ce script execute et la verification a 0 ligne confirmee,
-- lance 0001_init.sql puis 0002_cron.sql normalement.
