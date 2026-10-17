-- AviaryOS Table Privilege Hardening
-- Migration: 20261017155933_fix_table_privileges.sql
-- Reason: Supabase grants default privileges to authenticated on new tables, so GRANT alone
--         did not remove them; the original migration left DELETE and TRUNCATE available on birds.
--         This migration explicitly revokes all privileges from public, anon, and authenticated,
--         re-grants only the necessary permissions, and modifies default privileges on public schema.

REVOKE ALL ON TABLE public.species   FROM public, anon, authenticated;
REVOKE ALL ON TABLE public.locations FROM public, anon, authenticated;
REVOKE ALL ON TABLE public.birds     FROM public, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.species   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.locations TO authenticated;
GRANT SELECT, INSERT, UPDATE         ON TABLE public.birds     TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
   REVOKE ALL ON TABLES FROM anon, authenticated;