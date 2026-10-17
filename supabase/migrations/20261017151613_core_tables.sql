-- AviaryOS Core Tables Migration
-- Migration: 20261017151613_core_tables.sql
-- Description: Creates species, locations, and birds tables with cross-owner composite foreign keys,
--              updated_at trigger function, performance indexes, and strict Row Level Security (RLS).

-- ============================================================================
-- 1. Shared Timestamp Trigger Function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- ============================================================================
-- 2. Species Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.species (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    common_name text NOT NULL,
    scientific_name text,
    incubation_days integer CHECK (incubation_days IS NULL OR (incubation_days >= 1 AND incubation_days <= 120)),
    notes text,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT species_id_owner_id_key UNIQUE (id, owner_id)
);

DROP TRIGGER IF EXISTS trg_species_updated_at ON public.species;
CREATE TRIGGER trg_species_updated_at
    BEFORE UPDATE ON public.species
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- ============================================================================
-- 3. Locations Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.locations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    notes text,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT locations_id_owner_id_key UNIQUE (id, owner_id)
);

DROP TRIGGER IF EXISTS trg_locations_updated_at ON public.locations;
CREATE TRIGGER trg_locations_updated_at
    BEFORE UPDATE ON public.locations
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- ============================================================================
-- 4. Birds Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.birds (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    species_id uuid NOT NULL,
    variety text,
    name text,
    ring_number text,
    sex text NOT NULL DEFAULT 'unknown' CHECK (sex IN ('male', 'female', 'unknown')),
    hatch_date date,
    hatch_date_estimated boolean NOT NULL DEFAULT false,
    acquired_on date,
    source text,
    location_id uuid,
    sire_id uuid,
    dam_id uuid,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'deceased', 'transferred')),
    status_changed_on date,
    notes text,
    photo_path text,
    deleted_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Composite unique constraint to support self-referential / child composite foreign keys
    CONSTRAINT birds_id_owner_id_key UNIQUE (id, owner_id),

    -- Cross-owner composite foreign keys ensuring referenced records belong to the same owner.
    -- Using ON DELETE NO ACTION (deferred until the end of statement/transaction check):
    -- this ensures deleting a user's auth row can cascade through all their tables without
    -- ordering conflicts, while deleting an in-use species or location is still blocked.
    CONSTRAINT birds_species_fkey FOREIGN KEY (species_id, owner_id)
        REFERENCES public.species(id, owner_id) ON DELETE NO ACTION,
    CONSTRAINT birds_location_fkey FOREIGN KEY (location_id, owner_id)
        REFERENCES public.locations(id, owner_id) ON DELETE NO ACTION,
    CONSTRAINT birds_sire_fkey FOREIGN KEY (sire_id, owner_id)
        REFERENCES public.birds(id, owner_id) ON DELETE NO ACTION,
    CONSTRAINT birds_dam_fkey FOREIGN KEY (dam_id, owner_id)
        REFERENCES public.birds(id, owner_id) ON DELETE NO ACTION,

    -- Ancestry and identity CHECK constraints
    CONSTRAINT birds_sire_not_self CHECK (sire_id IS NULL OR sire_id <> id),
    CONSTRAINT birds_dam_not_self CHECK (dam_id IS NULL OR dam_id <> id),
    CONSTRAINT birds_parents_distinct CHECK (sire_id IS NULL OR dam_id IS NULL OR sire_id <> dam_id),
    CONSTRAINT birds_ring_number_not_empty CHECK (ring_number IS NULL OR btrim(ring_number) <> '')
);

DROP TRIGGER IF EXISTS trg_birds_updated_at ON public.birds;
CREATE TRIGGER trg_birds_updated_at
    BEFORE UPDATE ON public.birds
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- ============================================================================
-- 5. Indexes
-- ============================================================================

-- Unique partial index: ring_number is unique per owner for active (non-deleted) birds
CREATE UNIQUE INDEX IF NOT EXISTS idx_birds_owner_ring_number_active
    ON public.birds (owner_id, ring_number)
    WHERE ring_number IS NOT NULL AND deleted_at IS NULL;

-- Case-insensitive unique indexes on species common_name and location name per owner
CREATE UNIQUE INDEX IF NOT EXISTS idx_species_owner_lower_common_name
    ON public.species (owner_id, lower(common_name));

CREATE UNIQUE INDEX IF NOT EXISTS idx_locations_owner_lower_name
    ON public.locations (owner_id, lower(name));

-- Query performance indexes on birds
CREATE INDEX IF NOT EXISTS idx_birds_owner_status
    ON public.birds (owner_id, status);

CREATE INDEX IF NOT EXISTS idx_birds_owner_species_id
    ON public.birds (owner_id, species_id);

CREATE INDEX IF NOT EXISTS idx_birds_owner_location_id
    ON public.birds (owner_id, location_id);

CREATE INDEX IF NOT EXISTS idx_birds_owner_deleted_at
    ON public.birds (owner_id, deleted_at);

-- Foreign key indexes on birds
CREATE INDEX IF NOT EXISTS idx_birds_owner_sire_id
    ON public.birds (owner_id, sire_id);

CREATE INDEX IF NOT EXISTS idx_birds_owner_dam_id
    ON public.birds (owner_id, dam_id);

-- ============================================================================
-- 6. Row Level Security (RLS) Configuration
-- ============================================================================

ALTER TABLE public.species ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.species FORCE ROW LEVEL SECURITY;

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations FORCE ROW LEVEL SECURITY;

ALTER TABLE public.birds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.birds FORCE ROW LEVEL SECURITY;

-- ============================================================================
-- 7. Role Privileges & Grants
-- ============================================================================

-- Revoke all permissions from anon and public roles
REVOKE ALL ON TABLE public.species FROM public, anon;
REVOKE ALL ON TABLE public.locations FROM public, anon;
REVOKE ALL ON TABLE public.birds FROM public, anon;

-- Explicitly grant operations to authenticated role only (DELETE is not granted on birds)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.species TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.locations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.birds TO authenticated;

-- ============================================================================
-- 8. Row Level Security Policies (Authenticated Role)
-- ============================================================================

-- Policies for public.species
DROP POLICY IF EXISTS "species_select_policy" ON public.species;
CREATE POLICY "species_select_policy"
    ON public.species
    FOR SELECT
    TO authenticated
    USING ((SELECT auth.uid()) = owner_id);

DROP POLICY IF EXISTS "species_insert_policy" ON public.species;
CREATE POLICY "species_insert_policy"
    ON public.species
    FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = owner_id);

DROP POLICY IF EXISTS "species_update_policy" ON public.species;
CREATE POLICY "species_update_policy"
    ON public.species
    FOR UPDATE
    TO authenticated
    USING ((SELECT auth.uid()) = owner_id)
    WITH CHECK ((SELECT auth.uid()) = owner_id);

DROP POLICY IF EXISTS "species_delete_policy" ON public.species;
CREATE POLICY "species_delete_policy"
    ON public.species
    FOR DELETE
    TO authenticated
    USING ((SELECT auth.uid()) = owner_id);

-- Policies for public.locations
DROP POLICY IF EXISTS "locations_select_policy" ON public.locations;
CREATE POLICY "locations_select_policy"
    ON public.locations
    FOR SELECT
    TO authenticated
    USING ((SELECT auth.uid()) = owner_id);

DROP POLICY IF EXISTS "locations_insert_policy" ON public.locations;
CREATE POLICY "locations_insert_policy"
    ON public.locations
    FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = owner_id);

DROP POLICY IF EXISTS "locations_update_policy" ON public.locations;
CREATE POLICY "locations_update_policy"
    ON public.locations
    FOR UPDATE
    TO authenticated
    USING ((SELECT auth.uid()) = owner_id)
    WITH CHECK ((SELECT auth.uid()) = owner_id);

DROP POLICY IF EXISTS "locations_delete_policy" ON public.locations;
CREATE POLICY "locations_delete_policy"
    ON public.locations
    FOR DELETE
    TO authenticated
    USING ((SELECT auth.uid()) = owner_id);

-- Policies for public.birds (DELETE policy omitted because DELETE is not granted)
DROP POLICY IF EXISTS "birds_select_policy" ON public.birds;
CREATE POLICY "birds_select_policy"
    ON public.birds
    FOR SELECT
    TO authenticated
    USING ((SELECT auth.uid()) = owner_id);

DROP POLICY IF EXISTS "birds_insert_policy" ON public.birds;
CREATE POLICY "birds_insert_policy"
    ON public.birds
    FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = owner_id);

DROP POLICY IF EXISTS "birds_update_policy" ON public.birds;
CREATE POLICY "birds_update_policy"
    ON public.birds
    FOR UPDATE
    TO authenticated
    USING ((SELECT auth.uid()) = owner_id)
    WITH CHECK ((SELECT auth.uid()) = owner_id);
