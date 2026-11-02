export type EntityType = "species" | "location" | "bird";

export type OperationType =
  | "create"
  | "update"
  | "delete"
  | "archive"
  | "restore";

export interface DatabaseError {
  code?: string | number;
  message?: string;
  details?: string;
  hint?: string;
}

/**
 * Maps PostgreSQL / PostgREST error codes to friendly, safe user-facing error messages.
 * Never exposes raw internal database errors to the client.
 */
export function mapDatabaseError(
  error: unknown,
  entity: EntityType,
  operation: OperationType = "create"
): string {
  const err = error as DatabaseError | null | undefined;
  const code = err?.code ? String(err.code) : "";

  // Postgres 23505: unique_violation
  if (code === "23505") {
    if (entity === "species") {
      return "A species with this common name already exists.";
    }
    if (entity === "location") {
      return "A location with this name already exists.";
    }
    if (entity === "bird") {
      return "A bird with this ring number already exists.";
    }
  }

  // Postgres 23503: foreign_key_violation
  if (code === "23503") {
    if (entity === "species") {
      return "Cannot delete this species because it is currently assigned to one or more birds.";
    }
    if (entity === "location") {
      return "Cannot delete this location because it is currently assigned to one or more birds.";
    }
    if (entity === "bird") {
      if (operation === "delete") {
        return "Cannot delete this bird because it is referenced by other records.";
      }
      return "The selected species, location, or parent bird does not exist.";
    }
  }

  // Postgres 23514: check_violation
  if (code === "23514") {
    return "Validation rule check failed. Please verify the information entered.";
  }

  // Unexpected errors: Log details server-side only and present a safe, generic message.
  console.error(`Database error during ${operation} on ${entity}:`, error);
  return "An unexpected error occurred. Please try again.";
}

export type ErrorCode =
  | "not_signed_in"
  | "validation_failed"
  | "invalid_id"
  | "species_duplicate"
  | "location_duplicate"
  | "bird_duplicate"
  | "species_in_use"
  | "location_in_use"
  | "bird_in_use"
  | "reference_missing"
  | "check_failed"
  | "parent_verify_failed"
  | "sire_not_found"
  | "dam_not_found"
  | "sire_too_young"
  | "dam_too_young"
  | "sire_cycle"
  | "dam_cycle"
  | "ancestry_verify_failed"
  | "bird_not_found"
  | "unexpected";
/**
 * Same classification as mapDatabaseError, but returns a stable code
 * so the UI can translate the message into the user's language.
 */
export function getDatabaseErrorCode(
  error: unknown,
  entity: EntityType,
  operation: OperationType = "create"
): ErrorCode {
  const err = error as DatabaseError | null | undefined;
  const code = err?.code ? String(err.code) : "";

  // Postgres 23505: unique_violation
  if (code === "23505") {
    if (entity === "species") return "species_duplicate";
    if (entity === "location") return "location_duplicate";
    return "bird_duplicate";
  }

  // Postgres 23503: foreign_key_violation
  if (code === "23503") {
    if (entity === "species") return "species_in_use";
    if (entity === "location") return "location_in_use";
    return operation === "delete" ? "bird_in_use" : "reference_missing";
  }

  // Postgres 23514: check_violation
  if (code === "23514") return "check_failed";

  // Unexpected errors: log details server-side only.
  console.error(`Database error during ${operation} on ${entity}:`, error);
  return "unexpected";
}