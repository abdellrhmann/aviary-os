export type EntityType = "species" | "location";

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
  operation: "create" | "update" | "delete" = "create"
): string {
  const err = error as DatabaseError | null | undefined;
  const code = err?.code ? String(err.code) : "";

  // Postgres 23505: unique_violation
  if (code === "23505") {
    if (entity === "species") {
      return "A species with this common name already exists.";
    }
    return "A location with this name already exists.";
  }

  // Postgres 23503: foreign_key_violation
  if (code === "23503") {
    if (entity === "species") {
      return "Cannot delete this species because it is currently assigned to one or more birds.";
    }
    return "Cannot delete this location because it is currently assigned to one or more birds.";
  }

  // Unexpected errors: Log details server-side only and present a safe, generic message.
  console.error(`Database error during ${operation} on ${entity}:`, error);
  return "An unexpected error occurred. Please try again.";
}
