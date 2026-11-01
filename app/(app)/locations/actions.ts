"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  locationSchema,
  locationUpdateSchema,
  type Location,
} from "@/lib/validation/locations";
import {
  mapDatabaseError,
  getDatabaseErrorCode,
  type ErrorCode,
} from "@/lib/validation/errors";

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: ErrorCode;
  fieldErrors?: Record<string, string[] | undefined>;
}

export async function createLocationAction(
  rawData: unknown
): Promise<ActionResponse<Location>> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      error: "You must be signed in to perform this action.",
      errorCode: "not_signed_in",
    };
  }

  const parsed = locationSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed. Please correct the fields below.",
      errorCode: "validation_failed",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  // Never provide or trust owner_id from the client.
  // The PostgreSQL table default auth.uid() and RLS policy enforce owner_id.
  const { data, error } = await supabase
    .from("locations")
    .insert({
      name: parsed.data.name,
      notes: parsed.data.notes,
    })
    .select()
    .single();

  if (error) {
    const message = mapDatabaseError(error, "location", "create");
    const errorCode = getDatabaseErrorCode(error, "location", "create");
    return { success: false, error: message, errorCode };
  }

  revalidatePath("/locations");
  return { success: true, data: data as Location };
}

export async function updateLocationAction(
  rawData: unknown
): Promise<ActionResponse<Location>> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      error: "You must be signed in to perform this action.",
      errorCode: "not_signed_in",
    };
  }

  const parsed = locationUpdateSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed. Please correct the fields below.",
      errorCode: "validation_failed",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { id, name, notes } = parsed.data;

  // RLS ensures only records belonging to auth.uid() can be updated.
  const { data, error } = await supabase
    .from("locations")
    .update({
      name,
      notes,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    const message = mapDatabaseError(error, "location", "update");
    const errorCode = getDatabaseErrorCode(error, "location", "update");
    return { success: false, error: message, errorCode };
  }

  revalidatePath("/locations");
  return { success: true, data: data as Location };
}

export async function deleteLocationAction(
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
      errorCode: "not_signed_in",
    };
  }

  if (!id || typeof id !== "string") {
    return {
      success: false,
      error: "Invalid location identifier.",
      errorCode: "invalid_id",
    };
  }

  // RLS ensures only records belonging to auth.uid() can be deleted.
  // Foreign key constraint birds_location_fkey blocks deletion if referenced by birds (Postgres error 23503).
  const { error } = await supabase.from("locations").delete().eq("id", id);

  if (error) {
    const message = mapDatabaseError(error, "location", "delete");
    const errorCode = getDatabaseErrorCode(error, "location", "delete");
    return { success: false, error: message, errorCode };
  }

  revalidatePath("/locations");
  return { success: true };
}