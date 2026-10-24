import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Bird } from "@/lib/validation/birds";
import { BirdDetail } from "./bird-detail";

export const dynamic = "force-dynamic";

interface BirdPageProps {
  params: Promise<{ id: string }>;
}

export default async function BirdProfilePage({ params }: BirdPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch the bird record with joined species, location, sire, and dam
  const { data: birdRow, error: birdError } = await supabase
    .from("birds")
    .select(`
      *,
      species:species!birds_species_fkey(id, common_name),
      location:locations!birds_location_fkey(id, name)
    `)
    .eq("id", id)
    .single();

  if (birdError) {
    console.error("Failed to load bird:", birdError);
  }

  if (birdError || !birdRow) {
    notFound();
  }

  // Load sire and dam separately (composite FKs are not embeddable)
  const parentIds = [birdRow.sire_id, birdRow.dam_id].filter(
    (v): v is string => Boolean(v)
  );

  const { data: parentRows } = parentIds.length
    ? await supabase
      .from("birds")
      .select("id, name, ring_number, sex, hatch_date")
      .in("id", parentIds)
    : { data: [] };

  const bird = {
    ...birdRow,
    sire: parentRows?.find((p) => p.id === birdRow.sire_id) ?? null,
    dam: parentRows?.find((p) => p.id === birdRow.dam_id) ?? null,
  };

  if (birdError || !bird) {
    notFound();
  }

  // Count active offspring where this bird is recorded as sire or dam
  const { count: offspringCount } = await supabase
    .from("birds")
    .select("id", { count: "exact", head: true })
    .or(`sire_id.eq.${id},dam_id.eq.${id}`)
    .is("deleted_at", null);

  // Load species for edit form
  const { data: speciesData } = await supabase
    .from("species")
    .select("id, common_name")
    .order("common_name", { ascending: true });

  // Load locations for edit form
  const { data: locationsData } = await supabase
    .from("locations")
    .select("id, name")
    .order("name", { ascending: true });

  // Load candidate parents (excluding this bird itself)
  const { data: candidateBirds } = await supabase
    .from("birds")
    .select("id, name, ring_number, sex, hatch_date")
    .is("deleted_at", null)
    .neq("id", id)
    .order("ring_number", { ascending: true });

  return (
    <BirdDetail
      bird={bird as unknown as Bird}
      offspringCount={offspringCount ?? 0}
      speciesList={speciesData || []}
      locationsList={locationsData || []}
      candidateParents={candidateBirds || []}
    />
  );
}
