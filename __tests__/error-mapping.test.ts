import { describe, it, expect, vi } from "vitest";
import { mapDatabaseError } from "@/lib/validation/errors";

describe("Database Error Mapping Helper", () => {
  it("maps Postgres 23505 (unique_violation) to specific user message for species", () => {
    const error = {
      code: "23505",
      message: "duplicate key value violates unique constraint 'idx_species_owner_lower_common_name'",
      details: "Key (owner_id, lower(common_name))=(...) already exists.",
    };

    const message = mapDatabaseError(error, "species", "create");
    expect(message).toBe("A species with this common name already exists.");
    expect(message).not.toContain("duplicate key value");
    expect(message).not.toContain("idx_species_owner_lower_common_name");
  });

  it("maps Postgres 23505 (unique_violation) to specific user message for locations", () => {
    const error = {
      code: "23505",
      message: "duplicate key value violates unique constraint 'idx_locations_owner_lower_name'",
      details: "Key (owner_id, lower(name))=(...) already exists.",
    };

    const message = mapDatabaseError(error, "location", "create");
    expect(message).toBe("A location with this name already exists.");
    expect(message).not.toContain("duplicate key value");
    expect(message).not.toContain("idx_locations_owner_lower_name");
  });

  it("maps Postgres 23503 (foreign_key_violation) on delete to specific user message for species", () => {
    const error = {
      code: "23503",
      message: "update or delete on table 'species' violates foreign key constraint 'birds_species_fkey'",
      details: "Key (id, owner_id)=(...) is still referenced from table 'birds'.",
    };

    const message = mapDatabaseError(error, "species", "delete");
    expect(message).toBe(
      "Cannot delete this species because it is currently assigned to one or more birds."
    );
    expect(message).not.toContain("birds_species_fkey");
    expect(message).not.toContain("foreign key constraint");
  });

  it("maps Postgres 23503 (foreign_key_violation) on delete to specific user message for locations", () => {
    const error = {
      code: "23503",
      message: "update or delete on table 'locations' violates foreign key constraint 'birds_location_fkey'",
      details: "Key (id, owner_id)=(...) is still referenced from table 'birds'.",
    };

    const message = mapDatabaseError(error, "location", "delete");
    expect(message).toBe(
      "Cannot delete this location because it is currently assigned to one or more birds."
    );
    expect(message).not.toContain("birds_location_fkey");
    expect(message).not.toContain("foreign key constraint");
  });

  it("maps unknown or unexpected database errors to a generic message and logs details server-side", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const error = {
      code: "42P01",
      message: "relation 'species' does not exist",
    };

    const message = mapDatabaseError(error, "species", "create");
    expect(message).toBe("An unexpected error occurred. Please try again.");
    expect(message).not.toContain("42P01");
    expect(message).not.toContain("relation 'species' does not exist");

    expect(consoleSpy).toHaveBeenCalledWith(
      "Database error during create on species:",
      error
    );

    consoleSpy.mockRestore();
  });

  it("handles null, undefined, or string errors safely", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(mapDatabaseError(null, "species", "create")).toBe(
      "An unexpected error occurred. Please try again."
    );
    expect(mapDatabaseError(undefined, "location", "create")).toBe(
      "An unexpected error occurred. Please try again."
    );
    expect(mapDatabaseError("some raw string error", "species", "create")).toBe(
      "An unexpected error occurred. Please try again."
    );

    consoleSpy.mockRestore();
  });
});
