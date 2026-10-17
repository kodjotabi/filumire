-- 0024: expose only migration-0023 deployment evidence (17 Oct 2026).
-- Additive only: one read-only view, no table or row changed. The deployment
-- guard reads kind and sha256 of the 0023 ledger row through this view, so the
-- application role never needs access to filumire_schema_migrations itself.
-- Owner-based (not security_invoker) with a security barrier: the view reads
-- the ledger with its owner's rights. Role-neutral, like 0019-0023: the view is
-- owned by whoever applies it, and the application role's SELECT is granted
-- only by scripts/sql/app-role-grants.sql, run after migrations.
-- Applying this file requires separate owner approval per database.

CREATE VIEW public.filumire_deployment_migration_0023
WITH (security_barrier = true)
AS
SELECT kind, sha256
FROM public.filumire_schema_migrations
WHERE id = '0023_learner_grade_set_by';

REVOKE ALL PRIVILEGES
ON public.filumire_deployment_migration_0023
FROM PUBLIC;

-- The view must belong to the ledger's owner, so it reads the ledger with
-- exactly the rights that already govern it. Any other owner stops the apply.
DO $$
BEGIN
  IF (SELECT relowner FROM pg_class WHERE oid = 'public.filumire_deployment_migration_0023'::regclass)
     IS DISTINCT FROM
     (SELECT relowner FROM pg_class WHERE oid = 'public.filumire_schema_migrations'::regclass) THEN
    RAISE EXCEPTION 'Apply 0024 as the owner of filumire_schema_migrations';
  END IF;
END $$;
