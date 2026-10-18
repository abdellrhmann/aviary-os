import { describe, it, expect } from "vitest";
import { speciesSchema, speciesUpdateSchema } from "@/lib/validation/species";

describe("Species Validation Schema", () => {
  it("accepts valid complete input", () => {
    const input = {
      common_name: "Gouldian Finch",
      scientific_name: "Chloebia gouldiae",
      incubation_days: 14,
      notes: "Requires high humidity during breeding season.",
    };
    const result = speciesSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.common_name).toBe("Gouldian Finch");
      expect(result.data.scientific_name).toBe("Chloebia gouldiae");
      expect(result.data.incubation_days).toBe(14);
      expect(result.data.notes).toBe(
        "Requires high humidity during breeding season."
      );
    }
  });

  it("accepts valid minimal input (only required common_name)", () => {
    const input = {
      common_name: "Canary",
    };
    const result = speciesSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.common_name).toBe("Canary");
      expect(result.data.scientific_name).toBeNull();
      expect(result.data.incubation_days).toBeNull();
      expect(result.data.notes).toBeNull();
    }
  });

  it("trims whitespace from all string fields", () => {
    const input = {
      common_name: "  Zebra Finch  ",
      scientific_name: "  Taeniopygia guttata  ",
      notes: "  Common aviary bird.  ",
    };
    const result = speciesSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.common_name).toBe("Zebra Finch");
      expect(result.data.scientific_name).toBe("Taeniopygia guttata");
      expect(result.data.notes).toBe("Common aviary bird.");
    }
  });

  it("converts empty and whitespace-only optional strings to null", () => {
    const input = {
      common_name: "Budgerigar",
      scientific_name: "   ",
      notes: "",
    };
    const result = speciesSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.scientific_name).toBeNull();
      expect(result.data.notes).toBeNull();
    }
  });

  it("rejects empty common_name", () => {
    const emptyResult = speciesSchema.safeParse({ common_name: "" });
    expect(emptyResult.success).toBe(false);

    const whitespaceResult = speciesSchema.safeParse({ common_name: "    " });
    expect(whitespaceResult.success).toBe(false);

    const missingResult = speciesSchema.safeParse({});
    expect(missingResult.success).toBe(false);
  });

  it("enforces length limits on common_name (max 100)", () => {
    const validAt100 = speciesSchema.safeParse({
      common_name: "A".repeat(100),
    });
    expect(validAt100.success).toBe(true);

    const overLimit = speciesSchema.safeParse({
      common_name: "A".repeat(101),
    });
    expect(overLimit.success).toBe(false);
  });

  it("enforces length limits on scientific_name (max 100)", () => {
    const validAt100 = speciesSchema.safeParse({
      common_name: "Robin",
      scientific_name: "B".repeat(100),
    });
    expect(validAt100.success).toBe(true);

    const overLimit = speciesSchema.safeParse({
      common_name: "Robin",
      scientific_name: "B".repeat(101),
    });
    expect(overLimit.success).toBe(false);
  });

  it("enforces length limits on notes (max 1000)", () => {
    const validAt1000 = speciesSchema.safeParse({
      common_name: "Robin",
      notes: "C".repeat(1000),
    });
    expect(validAt1000.success).toBe(true);

    const overLimit = speciesSchema.safeParse({
      common_name: "Robin",
      notes: "C".repeat(1001),
    });
    expect(overLimit.success).toBe(false);
  });

  describe("incubation_days validation", () => {
    it("accepts boundary values 1 and 120", () => {
      const minBound = speciesSchema.safeParse({
        common_name: "Species A",
        incubation_days: 1,
      });
      expect(minBound.success).toBe(true);
      if (minBound.success) expect(minBound.data.incubation_days).toBe(1);

      const maxBound = speciesSchema.safeParse({
        common_name: "Species B",
        incubation_days: 120,
      });
      expect(maxBound.success).toBe(true);
      if (maxBound.success) expect(maxBound.data.incubation_days).toBe(120);
    });

    it("parses numeric strings into integers", () => {
      const fromString = speciesSchema.safeParse({
        common_name: "Species C",
        incubation_days: " 21 ",
      });
      expect(fromString.success).toBe(true);
      if (fromString.success) expect(fromString.data.incubation_days).toBe(21);
    });

    it("accepts null, undefined, and empty string as null", () => {
      expect(
        speciesSchema.safeParse({
          common_name: "Species D",
          incubation_days: null,
        }).data?.incubation_days
      ).toBeNull();

      expect(
        speciesSchema.safeParse({
          common_name: "Species E",
          incubation_days: undefined,
        }).data?.incubation_days
      ).toBeNull();

      expect(
        speciesSchema.safeParse({
          common_name: "Species F",
          incubation_days: "",
        }).data?.incubation_days
      ).toBeNull();

      expect(
        speciesSchema.safeParse({
          common_name: "Species G",
          incubation_days: "   ",
        }).data?.incubation_days
      ).toBeNull();
    });

    it("rejects numbers out of range (< 1 or > 120)", () => {
      expect(
        speciesSchema.safeParse({ common_name: "Test", incubation_days: 0 })
          .success
      ).toBe(false);

      expect(
        speciesSchema.safeParse({ common_name: "Test", incubation_days: -5 })
          .success
      ).toBe(false);

      expect(
        speciesSchema.safeParse({ common_name: "Test", incubation_days: 121 })
          .success
      ).toBe(false);

      expect(
        speciesSchema.safeParse({ common_name: "Test", incubation_days: "121" })
          .success
      ).toBe(false);
    });

    it("rejects non-integer values (floats)", () => {
      expect(
        speciesSchema.safeParse({ common_name: "Test", incubation_days: 14.5 })
          .success
      ).toBe(false);

      expect(
        speciesSchema.safeParse({
          common_name: "Test",
          incubation_days: "14.5",
        }).success
      ).toBe(false);
    });

    it("rejects non-numeric string values and booleans", () => {
      expect(
        speciesSchema.safeParse({ common_name: "Test", incubation_days: "abc" })
          .success
      ).toBe(false);

      expect(
        speciesSchema.safeParse({ common_name: "Test", incubation_days: true })
          .success
      ).toBe(false);
    });
  });

  describe("speciesUpdateSchema", () => {
    it("requires a valid uuid for id", () => {
      const valid = speciesUpdateSchema.safeParse({
        id: "123e4567-e89b-12d3-a456-426614174000",
        common_name: "Parrot",
      });
      expect(valid.success).toBe(true);

      const invalidId = speciesUpdateSchema.safeParse({
        id: "not-a-uuid",
        common_name: "Parrot",
      });
      expect(invalidId.success).toBe(false);
    });
  });
});
