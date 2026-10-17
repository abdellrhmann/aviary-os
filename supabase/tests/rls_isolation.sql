-- ============================================================================
-- AviaryOS Manual RLS & Data Isolation Test Script
-- File: supabase/tests/rls_isolation.sql
--
-- Verification query to run afterwards:
--   SELECT count(*) FROM auth.users WHERE email LIKE '%@aviaryos.local';
-- Expected result: 0 (verifies transaction rolled back and left no test users behind).
--
-- Purpose:
--   Verifies multi-tenant isolation, cross-owner composite foreign key
--   enforcement, CHECK constraints, and RBAC table permissions via manual
--   execution in the Supabase SQL Editor.
--
-- How to run:
--   1. Open the Supabase Dashboard -> SQL Editor.
--   2. Paste and run this entire script.
--   3. Inspect the Messages/Output tab for verification notices.
--   4. The script wraps all tests inside a transaction that terminates with
--      ROLLBACK, leaving zero data or test users in the database.
-- ============================================================================

BEGIN;

-- ============================================================================
-- Step 0: Setup Temporary Test Users
-- ============================================================================
-- owner_id has a foreign key to auth.users(id) ON DELETE CASCADE.
-- We insert two temporary mock users into auth.users for the duration of this transaction.

INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin
)
VALUES
    (
        '11111111-1111-1111-1111-111111111111',
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'test_user_a@aviaryos.local',
        '',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        '{"provider":"email","providers":["email"]}',
        '{}',
        false
    ),
    (
        '22222222-2222-2222-2222-222222222222',
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'test_user_b@aviaryos.local',
        '',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        '{"provider":"email","providers":["email"]}',
        '{}',
        false
    )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Step 1: Seed User A Data (as User A)
-- ============================================================================

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';
SET LOCAL "request.jwt.claim.sub" = '11111111-1111-1111-1111-111111111111';

DO $$
DECLARE
    v_user_a uuid := '11111111-1111-1111-1111-111111111111';
    v_species_a uuid := 'a0000000-0000-0000-0000-000000000001';
    v_location_a uuid := 'a0000000-0000-0000-0000-000000000002';
    v_sire_a uuid := 'a0000000-0000-0000-0000-000000000003';
    v_dam_a uuid := 'a0000000-0000-0000-0000-000000000004';
    v_chick_a uuid := 'a0000000-0000-0000-0000-000000000005';
BEGIN
    IF auth.uid() <> v_user_a THEN
        RAISE EXCEPTION 'Setup failure: auth.uid() does not match User A (got %)', auth.uid();
    END IF;

    -- Insert User A species
    INSERT INTO public.species (id, owner_id, common_name, scientific_name, incubation_days)
    VALUES (v_species_a, v_user_a, 'Gouldian Finch', 'Chloebia gouldiae', 14);

    -- Insert User A location
    INSERT INTO public.locations (id, owner_id, name)
    VALUES (v_location_a, v_user_a, 'Aviary Room 1');

    -- Insert User A sire bird
    INSERT INTO public.birds (id, owner_id, species_id, location_id, ring_number, sex, status)
    VALUES (v_sire_a, v_user_a, v_species_a, v_location_a, 'A-SIRE-001', 'male', 'active');

    -- Insert User A dam bird
    INSERT INTO public.birds (id, owner_id, species_id, location_id, ring_number, sex, status)
    VALUES (v_dam_a, v_user_a, v_species_a, v_location_a, 'A-DAM-001', 'female', 'active');

    -- Insert User A offspring referencing species, location, sire, and dam
    INSERT INTO public.birds (id, owner_id, species_id, location_id, sire_id, dam_id, ring_number, sex, status)
    VALUES (v_chick_a, v_user_a, v_species_a, v_location_a, v_sire_a, v_dam_a, 'A-CHICK-001', 'unknown', 'active');

    RAISE NOTICE 'SUCCESS [Step 1]: Seed data created successfully for User A.';
END;
$$;

-- ============================================================================
-- Step 2: Test Unauthenticated (anon) Role Access
-- ============================================================================

SET LOCAL ROLE anon;
SET LOCAL "request.jwt.claims" = '{"role": "anon"}';
SET LOCAL "request.jwt.claim.sub" = '';

DO $$
DECLARE
    v_count integer := 0;
    v_caught_exception boolean := false;
BEGIN
    BEGIN
        SELECT count(*) INTO v_count FROM public.species;
    EXCEPTION
        WHEN insufficient_privilege THEN
            v_caught_exception := true;
    END;

    IF NOT v_caught_exception AND v_count > 0 THEN
        RAISE EXCEPTION 'TEST FAILED: anon role was able to read % rows from public.species!', v_count;
    END IF;

    v_caught_exception := false;
    BEGIN
        SELECT count(*) INTO v_count FROM public.birds;
    EXCEPTION
        WHEN insufficient_privilege THEN
            v_caught_exception := true;
    END;

    IF NOT v_caught_exception AND v_count > 0 THEN
        RAISE EXCEPTION 'TEST FAILED: anon role was able to read % rows from public.birds!', v_count;
    END IF;

    RAISE NOTICE 'SUCCESS [Test 2]: Anon role gets 0 rows (permission denied / revoked).';
END;
$$;

-- ============================================================================
-- Step 3: Test User B Cross-Tenant Isolation (Unfiltered SELECT, Filtered SELECT, UPDATE, DELETE)
-- ============================================================================

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';
SET LOCAL "request.jwt.claim.sub" = '22222222-2222-2222-2222-222222222222';

DO $$
DECLARE
    v_user_a uuid := '11111111-1111-1111-1111-111111111111';
    v_user_b uuid := '22222222-2222-2222-2222-222222222222';
    v_count integer;
    v_rows integer;
BEGIN
    IF auth.uid() <> v_user_b THEN
        RAISE EXCEPTION 'Impersonation failure: auth.uid() does not match User B';
    END IF;

    -- 3a. User B performs UNFILTERED SELECT counts (no WHERE owner_id)
    SELECT count(*) INTO v_count FROM public.species;
    IF v_count <> 0 THEN
        RAISE EXCEPTION 'TEST FAILED: Unfiltered SELECT on public.species returned % rows for User B (expected 0)', v_count;
    END IF;

    SELECT count(*) INTO v_count FROM public.locations;
    IF v_count <> 0 THEN
        RAISE EXCEPTION 'TEST FAILED: Unfiltered SELECT on public.locations returned % rows for User B (expected 0)', v_count;
    END IF;

    SELECT count(*) INTO v_count FROM public.birds;
    IF v_count <> 0 THEN
        RAISE EXCEPTION 'TEST FAILED: Unfiltered SELECT on public.birds returned % rows for User B (expected 0)', v_count;
    END IF;
    RAISE NOTICE 'SUCCESS [Test 3a]: Unfiltered SELECT counts on species, locations, birds for User B returned 0.';

    -- 3b. User B attempts to SELECT User A's rows explicitly
    SELECT count(*) INTO v_count FROM public.species WHERE owner_id = v_user_a;
    IF v_count > 0 THEN
        RAISE EXCEPTION 'TEST FAILED: User B was able to SELECT User A species (% rows returned)', v_count;
    END IF;

    SELECT count(*) INTO v_count FROM public.locations WHERE owner_id = v_user_a;
    IF v_count > 0 THEN
        RAISE EXCEPTION 'TEST FAILED: User B was able to SELECT User A locations (% rows returned)', v_count;
    END IF;

    SELECT count(*) INTO v_count FROM public.birds WHERE owner_id = v_user_a;
    IF v_count > 0 THEN
        RAISE EXCEPTION 'TEST FAILED: User B was able to SELECT User A birds (% rows returned)', v_count;
    END IF;
    RAISE NOTICE 'SUCCESS [Test 3b]: User B cannot SELECT any rows belonging to User A.';

    -- 3c. User B attempts to UPDATE User A's rows
    UPDATE public.species SET notes = 'Exploited by B' WHERE owner_id = v_user_a;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows > 0 THEN
        RAISE EXCEPTION 'TEST FAILED: User B was able to UPDATE User A species (% rows affected)', v_rows;
    END IF;

    UPDATE public.birds SET notes = 'Exploited by B' WHERE owner_id = v_user_a;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows > 0 THEN
        RAISE EXCEPTION 'TEST FAILED: User B was able to UPDATE User A birds (% rows affected)', v_rows;
    END IF;
    RAISE NOTICE 'SUCCESS [Test 3c]: User B cannot UPDATE any rows belonging to User A (0 rows affected).';

    -- 3d. User B attempts to DELETE User A's rows
    DELETE FROM public.species WHERE owner_id = v_user_a;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows > 0 THEN
        RAISE EXCEPTION 'TEST FAILED: User B was able to DELETE User A species (% rows affected)', v_rows;
    END IF;

    DELETE FROM public.locations WHERE owner_id = v_user_a;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows > 0 THEN
        RAISE EXCEPTION 'TEST FAILED: User B was able to DELETE User A locations (% rows affected)', v_rows;
    END IF;
    RAISE NOTICE 'SUCCESS [Test 3d]: User B cannot DELETE any rows belonging to User A (0 rows affected).';
END;
$$;

-- ============================================================================
-- Step 4: Test Cross-Owner Integrity on species_id
-- ============================================================================

DO $$
DECLARE
    v_user_b uuid := '22222222-2222-2222-2222-222222222222';
    v_species_a uuid := 'a0000000-0000-0000-0000-000000000001';
    v_caught_fk boolean := false;
BEGIN
    -- User B attempts to insert a bird referencing User A's species
    BEGIN
        INSERT INTO public.birds (
            id,
            owner_id,
            species_id,
            ring_number,
            sex,
            status
        )
        VALUES (
            'b0000000-0000-0000-0000-000000000001',
            v_user_b,
            v_species_a,
            'B-BIRD-001',
            'unknown',
            'active'
        );
    EXCEPTION
        WHEN foreign_key_violation THEN
            v_caught_fk := true;
    END;

    IF NOT v_caught_fk THEN
        RAISE EXCEPTION 'TEST FAILED: User B inserted a bird with User A species_id without foreign key violation!';
    END IF;

    RAISE NOTICE 'SUCCESS [Test 4]: Cross-owner species_id insert rejected by composite foreign key (foreign_key_violation).';
END;
$$;

-- ============================================================================
-- Step 5: Test Cross-Owner Integrity on sire_id
-- ============================================================================

DO $$
DECLARE
    v_user_b uuid := '22222222-2222-2222-2222-222222222222';
    v_species_b uuid := 'b0000000-0000-0000-0000-000000000010';
    v_sire_a uuid := 'a0000000-0000-0000-0000-000000000003';
    v_caught_fk boolean := false;
BEGIN
    -- First, User B creates their own valid species
    INSERT INTO public.species (id, owner_id, common_name, incubation_days)
    VALUES (v_species_b, v_user_b, 'Zebra Finch', 12);

    -- User B attempts to create a bird referencing their own species but User A's bird as sire_id
    BEGIN
        INSERT INTO public.birds (
            id,
            owner_id,
            species_id,
            sire_id,
            ring_number,
            sex,
            status
        )
        VALUES (
            'b0000000-0000-0000-0000-000000000002',
            v_user_b,
            v_species_b,
            v_sire_a,
            'B-BIRD-002',
            'unknown',
            'active'
        );
    EXCEPTION
        WHEN foreign_key_violation THEN
            v_caught_fk := true;
    END;

    IF NOT v_caught_fk THEN
        RAISE EXCEPTION 'TEST FAILED: User B inserted a bird with User A sire_id without foreign key violation!';
    END IF;

    RAISE NOTICE 'SUCCESS [Test 5]: Cross-owner sire_id insert rejected by composite foreign key (foreign_key_violation).';
END;
$$;

-- ============================================================================
-- Step 6: Test Soft Delete Enforcement (DELETE on birds is Denied)
-- ============================================================================

DO $$
DECLARE
    v_user_b uuid := '22222222-2222-2222-2222-222222222222';
    v_species_b uuid := 'b0000000-0000-0000-0000-000000000010';
    v_bird_b uuid := 'b0000000-0000-0000-0000-000000000003';
    v_caught_permission boolean := false;
BEGIN
    -- User B inserts a valid bird
    INSERT INTO public.birds (
        id,
        owner_id,
        species_id,
        ring_number,
        sex,
        status
    )
    VALUES (
        v_bird_b,
        v_user_b,
        v_species_b,
        'B-BIRD-003',
        'female',
        'active'
    );

    -- User B attempts a hard DELETE on their own bird
    BEGIN
        DELETE FROM public.birds WHERE id = v_bird_b;
    EXCEPTION
        WHEN insufficient_privilege THEN
            v_caught_permission := true;
    END;

    IF NOT v_caught_permission THEN
        RAISE EXCEPTION 'TEST FAILED: DELETE on public.birds was permitted; expected insufficient_privilege!';
    END IF;

    RAISE NOTICE 'SUCCESS [Test 6]: Hard DELETE on public.birds was denied with insufficient_privilege (soft-delete enforced).';
END;
$$;

-- ============================================================================
-- Step 7: Additional Integrity and Constraint Tests (as User B)
-- ============================================================================

DO $$
DECLARE
    v_user_a uuid := '11111111-1111-1111-1111-111111111111';
    v_user_b uuid := '22222222-2222-2222-2222-222222222222';
    v_species_b uuid := 'b0000000-0000-0000-0000-000000000010';
    v_caught boolean := false;
BEGIN
    -- 7a. Inserting a row with owner_id = User A is rejected by RLS WITH CHECK
    v_caught := false;
    BEGIN
        INSERT INTO public.species (id, owner_id, common_name)
        VALUES ('b0000000-0000-0000-0000-000000000099', v_user_a, 'Spoofed Species');
    EXCEPTION
        WHEN insufficient_privilege THEN
            v_caught := true;
    END;

    IF NOT v_caught THEN
        RAISE EXCEPTION 'TEST FAILED: User B was able to insert a row with owner_id = User A!';
    END IF;
    RAISE NOTICE 'SUCCESS [Test 7a]: Inserting a row with owner_id = User A is rejected by RLS WITH CHECK.';

    -- 7b. Updating a row's owner_id is rejected by RLS WITH CHECK
    v_caught := false;
    BEGIN
        UPDATE public.species SET owner_id = v_user_a WHERE id = v_species_b;
    EXCEPTION
        WHEN insufficient_privilege THEN
            v_caught := true;
    END;

    IF NOT v_caught THEN
        RAISE EXCEPTION 'TEST FAILED: User B was able to update owner_id to User A!';
    END IF;
    RAISE NOTICE 'SUCCESS [Test 7b]: Updating a row''s owner_id is rejected by RLS WITH CHECK.';

    -- 7c. Duplicate ring_number for the same owner is rejected (unique_violation)
    v_caught := false;
    BEGIN
        INSERT INTO public.birds (id, owner_id, species_id, ring_number, sex, status)
        VALUES ('b0000000-0000-0000-0000-000000000004', v_user_b, v_species_b, 'B-BIRD-003', 'male', 'active');
    EXCEPTION
        WHEN unique_violation THEN
            v_caught := true;
    END;

    IF NOT v_caught THEN
        RAISE EXCEPTION 'TEST FAILED: Duplicate ring_number was allowed for the same owner!';
    END IF;
    RAISE NOTICE 'SUCCESS [Test 7c]: Duplicate ring_number for the same owner is rejected (unique_violation).';

    -- 7d. Bird with sire_id = its own id is rejected (check_violation)
    v_caught := false;
    BEGIN
        INSERT INTO public.birds (id, owner_id, species_id, sire_id, ring_number, sex, status)
        VALUES (
            'b0000000-0000-0000-0000-000000000005',
            v_user_b,
            v_species_b,
            'b0000000-0000-0000-0000-000000000005',
            'B-BIRD-SELF',
            'male',
            'active'
        );
    EXCEPTION
        WHEN check_violation THEN
            v_caught := true;
    END;

    IF NOT v_caught THEN
        RAISE EXCEPTION 'TEST FAILED: Bird with sire_id = its own id was allowed!';
    END IF;
    RAISE NOTICE 'SUCCESS [Test 7d]: Bird with sire_id = its own id is rejected (check_violation).';

    -- 7e. Empty-string ring_number is rejected (check_violation)
    v_caught := false;
    BEGIN
        INSERT INTO public.birds (id, owner_id, species_id, ring_number, sex, status)
        VALUES ('b0000000-0000-0000-0000-000000000006', v_user_b, v_species_b, '   ', 'unknown', 'active');
    EXCEPTION
        WHEN check_violation THEN
            v_caught := true;
    END;

    IF NOT v_caught THEN
        RAISE EXCEPTION 'TEST FAILED: Empty-string ring_number was allowed!';
    END IF;
    RAISE NOTICE 'SUCCESS [Test 7e]: Empty-string ring_number is rejected (check_violation).';
END;
$$;

-- ============================================================================
-- Final Notice & Rollback
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '=========================================================';
    RAISE NOTICE 'ALL RLS ISOLATION AND INTEGRITY TESTS PASSED!';
    RAISE NOTICE 'Rolling back transaction to leave database clean.';
    RAISE NOTICE '=========================================================';
END;
$$;

ROLLBACK;

SELECT 'ALL TESTS PASSED' AS result;
