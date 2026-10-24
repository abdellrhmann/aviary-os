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
