"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  speciesSchema,
  speciesUpdateSchema,
  type Species,
} from "@/lib/validation/species";
import { mapDatabaseError } from "@/lib/validation/errors";

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
}

export async function createSpeciesAction(
  rawData: unknown
): Promise<ActionResponse<Species>> {
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

  const parsed = speciesSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed. Please correct the fields below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  // Never provide or trust owner_id from the client.
  // The PostgreSQL table default auth.uid() and RLS policy enforce owner_id.
  const { data, error } = await supabase
    .from("species")
    .insert({
      common_name: parsed.data.common_name,
      scientific_name: parsed.data.scientific_name,
      incubation_days: parsed.data.incubation_days,
      notes: parsed.data.notes,
    })
    .select()
    .single();

  if (error) {
    const message = mapDatabaseError(error, "species", "create");
    return { success: false, error: message };
  }

  revalidatePath("/species");
  return { success: true, data: data as Species };
}

export async function updateSpeciesAction(
  rawData: unknown
): Promise<ActionResponse<Species>> {
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

  const parsed = speciesUpdateSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed. Please correct the fields below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { id, common_name, scientific_name, incubation_days, notes } =
    parsed.data;

  // RLS ensures only records belonging to auth.uid() can be updated.
  const { data, error } = await supabase
    .from("species")
    .update({
      common_name,
      scientific_name,
      incubation_days,
      notes,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    const message = mapDatabaseError(error, "species", "update");
    return { success: false, error: message };
  }

  revalidatePath("/species");
  return { success: true, data: data as Species };
}

export async function deleteSpeciesAction(
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
    return { success: false, error: "Invalid species identifier." };
  }

  // RLS ensures only records belonging to auth.uid() can be deleted.
  // Foreign key constraint birds_species_fkey blocks deletion if referenced by birds (Postgres error 23503).
  const { error } = await supabase.from("species").delete().eq("id", id);

  if (error) {
    const message = mapDatabaseError(error, "species", "delete");
    return { success: false, error: message };
  }

  revalidatePath("/species");
  return { success: true };
}
