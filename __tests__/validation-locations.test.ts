import { describe, it, expect } from "vitest";
import { locationSchema, locationUpdateSchema } from "@/lib/validation/locations";

describe("Locations Validation Schema", () => {
  it("accepts valid complete input", () => {
    const input = {
      name: "Flight Aviary 1",
      notes: "Outdoor flight cage for small finches.",
    };
    const result = locationSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Flight Aviary 1");
      expect(result.data.notes).toBe("Outdoor flight cage for small finches.");
    }
  });

  it("accepts valid minimal input without notes", () => {
    const input = {
      name: "Breeding Cage A",
    };
    const result = locationSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Breeding Cage A");
      expect(result.data.notes).toBeNull();
    }
  });

  it("trims whitespace from name and notes", () => {
    const input = {
      name: "  Quarantine Shed  ",
      notes: "  Isolated holding facility.  ",
    };
    const result = locationSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Quarantine Shed");
      expect(result.data.notes).toBe("Isolated holding facility.");
    }
  });

  it("converts empty and whitespace-only notes to null", () => {
    const input = {
      name: "Cage 4",
      notes: "    ",
    };
    const result = locationSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.notes).toBeNull();
    }
  });

  it("rejects empty name", () => {
    expect(locationSchema.safeParse({ name: "" }).success).toBe(false);
    expect(locationSchema.safeParse({ name: "   " }).success).toBe(false);
    expect(locationSchema.safeParse({}).success).toBe(false);
  });

  it("enforces length limit on name (max 100)", () => {
    const validAt100 = locationSchema.safeParse({
      name: "L".repeat(100),
    });
    expect(validAt100.success).toBe(true);

    const overLimit = locationSchema.safeParse({
      name: "L".repeat(101),
    });
    expect(overLimit.success).toBe(false);
  });

  it("enforces length limit on notes (max 1000)", () => {
    const validAt1000 = locationSchema.safeParse({
      name: "Aviary",
      notes: "N".repeat(1000),
    });
    expect(validAt1000.success).toBe(true);

    const overLimit = locationSchema.safeParse({
      name: "Aviary",
      notes: "N".repeat(1001),
    });
    expect(overLimit.success).toBe(false);
  });

  describe("locationUpdateSchema", () => {
    it("requires a valid uuid for id", () => {
      const valid = locationUpdateSchema.safeParse({
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Cage 1",
      });
      expect(valid.success).toBe(true);

      const invalidId = locationUpdateSchema.safeParse({
        id: "invalid-id",
        name: "Cage 1",
      });
      expect(invalidId.success).toBe(false);
    });
  });
});
