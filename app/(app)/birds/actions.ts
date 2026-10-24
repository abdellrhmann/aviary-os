"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  birdSchema,
  birdUpdateSchema,
  wouldCreateAncestryCycle,
  type Bird,
} from "@/lib/validation/birds";
import { mapDatabaseError } from "@/lib/validation/errors";

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
}

export async function createBirdAction(
  rawData: unknown
): Promise<ActionResponse<Bird>> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      error: "You must be signed in to perform this action.",
    };
  }

  const parsed = birdSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed. Please correct the fields below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const birdData = parsed.data;

  // Validate parents if provided
  const parentIds = [birdData.sire_id, birdData.dam_id].filter(
    Boolean
  ) as string[];

  if (parentIds.length > 0) {
    const { data: parents, error: parentsError } = await supabase
      .from("birds")
      .select("id, hatch_date, sex")
      .in("id", parentIds);

    if (parentsError) {
      return {
        success: false,
        error: "Failed to verify parent records.",
      };
    }

    const sire = parents?.find((p) => p.id === birdData.sire_id);
    const dam = parents?.find((p) => p.id === birdData.dam_id);

    if (birdData.sire_id && !sire) {
      return {
        success: false,
        error: "Selected sire could not be found.",
        fieldErrors: { sire_id: ["Selected sire does not exist."] },
      };
    }

    if (birdData.dam_id && !dam) {
      return {
        success: false,
        error: "Selected dam could not be found.",
        fieldErrors: { dam_id: ["Selected dam does not exist."] },
      };
    }

    // Check parent ages relative to bird
    if (birdData.hatch_date) {
      if (sire?.hatch_date && sire.hatch_date >= birdData.hatch_date) {
        return {
          success: false,
          error: "Sire must be older than the offspring.",
          fieldErrors: { sire_id: ["Sire must be older than the offspring."] },
        };
      }
      if (dam?.hatch_date && dam.hatch_date >= birdData.hatch_date) {
        return {
          success: false,
          error: "Dam must be older than the offspring.",
          fieldErrors: { dam_id: ["Dam must be older than the offspring."] },
        };
      }
    }
  }

  // Automatic status_changed_on to today if not provided
  const statusChangedOn =
    birdData.status_changed_on || new Date().toISOString().slice(0, 10);

  // Never provide or trust owner_id from the client.
  // The PostgreSQL table default auth.uid() and RLS policy enforce owner_id.
  const { data, error } = await supabase
    .from("birds")
    .insert({
      species_id: birdData.species_id,
      variety: birdData.variety,
      name: birdData.name,
      ring_number: birdData.ring_number,
      sex: birdData.sex,
      hatch_date: birdData.hatch_date,
      hatch_date_estimated: birdData.hatch_date_estimated,
      acquired_on: birdData.acquired_on,
      source: birdData.source,
      location_id: birdData.location_id,
      sire_id: birdData.sire_id,
      dam_id: birdData.dam_id,
      status: birdData.status,
      status_changed_on: statusChangedOn,
      notes: birdData.notes,
    })
    .select()
    .single();

  if (error) {
    const message = mapDatabaseError(error, "bird", "create");
    return { success: false, error: message };
  }

  revalidatePath("/birds");
  revalidatePath("/");
  return { success: true, data: data as Bird };
}

export async function updateBirdAction(
  rawData: unknown
): Promise<ActionResponse<Bird>> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      error: "You must be signed in to perform this action.",
    };
  }

  const parsed = birdUpdateSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed. Please correct the fields below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const birdData = parsed.data;

  // Retrieve current bird to check existing status and status_changed_on
  const { data: existingBird, error: existingError } = await supabase
    .from("birds")
    .select("id, status, status_changed_on")
    .eq("id", birdData.id)
    .single();

  if (existingError || !existingBird) {
    return {
      success: false,
      error: "Bird record not found.",
    };
  }

  // Parents verification and circular ancestry check
  const parentIds = [birdData.sire_id, birdData.dam_id].filter(
    Boolean
  ) as string[];

  if (parentIds.length > 0) {
    const { data: parents, error: parentsError } = await supabase
      .from("birds")
      .select("id, hatch_date, sex")
      .in("id", parentIds);

    if (parentsError) {
      return {
        success: false,
        error: "Failed to verify parent records.",
      };
    }

    const sire = parents?.find((p) => p.id === birdData.sire_id);
    const dam = parents?.find((p) => p.id === birdData.dam_id);

    if (birdData.sire_id && !sire) {
      return {
        success: false,
        error: "Selected sire could not be found.",
        fieldErrors: { sire_id: ["Selected sire does not exist."] },
      };
    }

    if (birdData.dam_id && !dam) {
      return {
        success: false,
        error: "Selected dam could not be found.",
        fieldErrors: { dam_id: ["Selected dam does not exist."] },
      };
    }

    // Check parent ages relative to bird
    if (birdData.hatch_date) {
      if (sire?.hatch_date && sire.hatch_date >= birdData.hatch_date) {
        return {
          success: false,
          error: "Sire must be older than the offspring.",
          fieldErrors: { sire_id: ["Sire must be older than the offspring."] },
        };
      }
      if (dam?.hatch_date && dam.hatch_date >= birdData.hatch_date) {
        return {
          success: false,
          error: "Dam must be older than the offspring.",
          fieldErrors: { dam_id: ["Dam must be older than the offspring."] },
        };
      }
    }

    // Ancestry cycle check
    const { data: allBirds, error: allBirdsError } = await supabase
      .from("birds")
      .select("id, sire_id, dam_id");

    if (allBirdsError) {
      return {
        success: false,
        error: "Failed to verify bird ancestry.",
      };
    }

    const parentLookup = new Map<
      string,
      { sire_id?: string | null; dam_id?: string | null }
    >(
      (allBirds || []).map((b) => [
        b.id,
        { sire_id: b.sire_id, dam_id: b.dam_id },
      ])
    );

    if (
      birdData.sire_id &&
      wouldCreateAncestryCycle(birdData.id, birdData.sire_id, parentLookup)
    ) {
      return {
        success: false,
        error: "Setting this sire would create a circular ancestry loop.",
        fieldErrors: {
          sire_id: ["Circular ancestry loop detected."],
        },
      };
    }

    if (
      birdData.dam_id &&
      wouldCreateAncestryCycle(birdData.id, birdData.dam_id, parentLookup)
    ) {
      return {
        success: false,
        error: "Setting this dam would create a circular ancestry loop.",
        fieldErrors: {
          dam_id: ["Circular ancestry loop detected."],
        },
      };
    }
  }

  // Automatic status_changed_on when status changes unless explicitly provided
  let statusChangedOn = birdData.status_changed_on;
  if (!statusChangedOn) {
    if (birdData.status !== existingBird.status) {
      statusChangedOn = new Date().toISOString().slice(0, 10);
    } else {
      statusChangedOn = existingBird.status_changed_on;
    }
  }

  const { data, error } = await supabase
    .from("birds")
    .update({
      species_id: birdData.species_id,
      variety: birdData.variety,
      name: birdData.name,
      ring_number: birdData.ring_number,
      sex: birdData.sex,
      hatch_date: birdData.hatch_date,
      hatch_date_estimated: birdData.hatch_date_estimated,
      acquired_on: birdData.acquired_on,
      source: birdData.source,
      location_id: birdData.location_id,
      sire_id: birdData.sire_id,
      dam_id: birdData.dam_id,
      status: birdData.status,
      status_changed_on: statusChangedOn,
      notes: birdData.notes,
    })
    .eq("id", birdData.id)
    .select()
    .single();

  if (error) {
    const message = mapDatabaseError(error, "bird", "update");
    return { success: false, error: message };
  }

  revalidatePath("/birds");
  revalidatePath(`/birds/${birdData.id}`);
  revalidatePath("/");
  return { success: true, data: data as Bird };
}

export async function archiveBirdAction(
  id: string
): Promise<ActionResponse<null>> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      error: "You must be signed in to perform this action.",
    };
  }

  if (!id || typeof id !== "string") {
    return { success: false, error: "Invalid bird identifier." };
  }

  const { error } = await supabase
    .from("birds")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    const message = mapDatabaseError(error, "bird", "archive");
    return { success: false, error: message };
  }

  revalidatePath("/birds");
  revalidatePath(`/birds/${id}`);
  revalidatePath("/");
  return { success: true };
}

export async function restoreBirdAction(
  id: string
): Promise<ActionResponse<null>> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      error: "You must be signed in to perform this action.",
    };
  }

  if (!id || typeof id !== "string") {
    return { success: false, error: "Invalid bird identifier." };
  }

  const { error } = await supabase
    .from("birds")
    .update({ deleted_at: null })
    .eq("id", id);

  if (error) {
    const message = mapDatabaseError(error, "bird", "restore");
    return { success: false, error: message };
  }

  revalidatePath("/birds");
  revalidatePath(`/birds/${id}`);
  revalidatePath("/");
  return { success: true };
}
