import { describe, it, expect } from "vitest";
import {
  birdSchema,
  birdUpdateSchema,
  parentChildAgeSchema,
  escapeLikeWildcards,
  wouldCreateAncestryCycle,
  isParentOlderThanChild,
  formatBirdAge,
} from "@/lib/validation/birds";

describe("Bird Validation Schemas", () => {
  const validSpeciesId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
  const validLocationId = "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22";
  const validSireId = "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33";
  const validDamId = "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44";

  it("accepts valid minimal input (only required species_id)", () => {
    const input = {
      species_id: validSpeciesId,
    };
    const result = birdSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.species_id).toBe(validSpeciesId);
      expect(result.data.name).toBeNull();
      expect(result.data.variety).toBeNull();
      expect(result.data.ring_number).toBeNull();
      expect(result.data.sex).toBe("unknown");
      expect(result.data.status).toBe("active");
      expect(result.data.hatch_date).toBeNull();
      expect(result.data.hatch_date_estimated).toBe(false);
      expect(result.data.acquired_on).toBeNull();
      expect(result.data.location_id).toBeNull();
      expect(result.data.sire_id).toBeNull();
      expect(result.data.dam_id).toBeNull();
      expect(result.data.notes).toBeNull();
    }
  });

  it("accepts valid complete input", () => {
    const input = {
      species_id: validSpeciesId,
      variety: "Normal Grey",
      name: "Sunny",
      ring_number: "AVI-2024-001",
      sex: "male",
      hatch_date: "2024-04-15",
      hatch_date_estimated: true,
      acquired_on: "2024-06-01",
      source: "Local Breeder",
      location_id: validLocationId,
      sire_id: validSireId,
      dam_id: validDamId,
      status: "active",
      status_changed_on: "2024-06-01",
      notes: "Healthy male, banded.",
    };
    const result = birdSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Sunny");
      expect(result.data.variety).toBe("Normal Grey");
      expect(result.data.ring_number).toBe("AVI-2024-001");
      expect(result.data.sex).toBe("male");
      expect(result.data.hatch_date).toBe("2024-04-15");
      expect(result.data.hatch_date_estimated).toBe(true);
      expect(result.data.acquired_on).toBe("2024-06-01");
      expect(result.data.source).toBe("Local Breeder");
      expect(result.data.notes).toBe("Healthy male, banded.");
    }
  });

  it("trims whitespace from all string fields and normalizes empty strings to null", () => {
    const input = {
      species_id: validSpeciesId,
      name: "   Sky   ",
      variety: "  Opaline  ",
      ring_number: "   ",
      source: "",
      notes: "   Some notes   ",
      location_id: "",
      sire_id: null,
      dam_id: undefined,
    };
    const result = birdSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Sky");
      expect(result.data.variety).toBe("Opaline");
      expect(result.data.ring_number).toBeNull();
      expect(result.data.source).toBeNull();
      expect(result.data.notes).toBe("Some notes");
      expect(result.data.location_id).toBeNull();
      expect(result.data.sire_id).toBeNull();
      expect(result.data.dam_id).toBeNull();
    }
  });

  it("enforces length limits on string fields", () => {
    // name max 100
    expect(
      birdSchema.safeParse({ species_id: validSpeciesId, name: "A".repeat(100) })
        .success
    ).toBe(true);
    expect(
      birdSchema.safeParse({ species_id: validSpeciesId, name: "A".repeat(101) })
        .success
    ).toBe(false);

    // variety max 100
    expect(
      birdSchema.safeParse({
        species_id: validSpeciesId,
        variety: "B".repeat(100),
      }).success
    ).toBe(true);
    expect(
      birdSchema.safeParse({
        species_id: validSpeciesId,
        variety: "B".repeat(101),
      }).success
    ).toBe(false);

    // source max 100
    expect(
      birdSchema.safeParse({
        species_id: validSpeciesId,
        source: "C".repeat(100),
      }).success
    ).toBe(true);
    expect(
      birdSchema.safeParse({
        species_id: validSpeciesId,
        source: "C".repeat(101),
      }).success
    ).toBe(false);

    // ring_number max 50
    expect(
      birdSchema.safeParse({
        species_id: validSpeciesId,
        ring_number: "R".repeat(50),
      }).success
    ).toBe(true);
    expect(
      birdSchema.safeParse({
        species_id: validSpeciesId,
        ring_number: "R".repeat(51),
      }).success
    ).toBe(false);

    // notes max 2000
    expect(
      birdSchema.safeParse({
        species_id: validSpeciesId,
        notes: "N".repeat(2000),
      }).success
    ).toBe(true);
    expect(
      birdSchema.safeParse({
        species_id: validSpeciesId,
        notes: "N".repeat(2001),
      }).success
    ).toBe(false);
  });

  it("rejects invalid date formats and invalid calendar dates", () => {
    // Malformed formats
    expect(
      birdSchema.safeParse({
        species_id: validSpeciesId,
        hatch_date: "not-a-date",
      }).success
    ).toBe(false);
    expect(
      birdSchema.safeParse({
        species_id: validSpeciesId,
        hatch_date: "2024/05/10",
      }).success
    ).toBe(false);
    expect(
      birdSchema.safeParse({
        species_id: validSpeciesId,
        hatch_date: "10-05-2024",
      }).success
    ).toBe(false);

    // Nonexistent calendar dates
    expect(
      birdSchema.safeParse({
        species_id: validSpeciesId,
        hatch_date: "2024-02-30",
      }).success
    ).toBe(false);
    expect(
      birdSchema.safeParse({
        species_id: validSpeciesId,
        hatch_date: "2024-04-31",
      }).success
    ).toBe(false);
    expect(
      birdSchema.safeParse({
        species_id: validSpeciesId,
        hatch_date: "2024-13-01",
      }).success
    ).toBe(false);
  });

  it("rejects hatch dates in the future", () => {
    const futureDate = "2099-01-01";
    const result = birdSchema.safeParse({
      species_id: validSpeciesId,
      hatch_date: futureDate,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("future");
    }
  });

  it("rejects invalid enums for sex and status", () => {
    expect(
      birdSchema.safeParse({
        species_id: validSpeciesId,
        sex: "invalid_sex",
      }).success
    ).toBe(false);

    expect(
      birdSchema.safeParse({
        species_id: validSpeciesId,
        status: "lost",
      }).success
    ).toBe(false);
  });

  it("rejects acquired_on when it is earlier than hatch_date", () => {
    const invalidInput = {
      species_id: validSpeciesId,
      hatch_date: "2024-06-15",
      acquired_on: "2024-05-15", // Before hatch
    };
    const result = birdSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldError = result.error.flatten().fieldErrors.acquired_on;
      expect(fieldError).toBeDefined();
      expect(fieldError![0]).toContain("before hatch date");
    }

    // Same date or later should succeed
    const validSameDate = {
      species_id: validSpeciesId,
      hatch_date: "2024-06-15",
      acquired_on: "2024-06-15",
    };
    expect(birdSchema.safeParse(validSameDate).success).toBe(true);

    const validLaterDate = {
      species_id: validSpeciesId,
      hatch_date: "2024-06-15",
      acquired_on: "2024-07-01",
    };
    expect(birdSchema.safeParse(validLaterDate).success).toBe(true);
  });

  it("validates parent older than child via parentChildAgeSchema and birdSchema", () => {
    // When parent is younger than child
    const badParent = parentChildAgeSchema.safeParse({
      child_hatch_date: "2024-01-01",
      parent_hatch_date: "2024-05-01",
    });
    expect(badParent.success).toBe(false);

    // When parent and child have the same hatch date
    const sameDate = parentChildAgeSchema.safeParse({
      child_hatch_date: "2024-01-01",
      parent_hatch_date: "2024-01-01",
    });
    expect(sameDate.success).toBe(false);

    // When parent is older than child
    const goodParent = parentChildAgeSchema.safeParse({
      child_hatch_date: "2024-06-01",
      parent_hatch_date: "2023-01-01",
    });
    expect(goodParent.success).toBe(true);

    // Pure function isParentOlderThanChild
    expect(isParentOlderThanChild("2023-01-01", "2024-01-01")).toBe(true);
    expect(isParentOlderThanChild("2024-05-01", "2024-01-01")).toBe(false);
    expect(isParentOlderThanChild("2024-01-01", "2024-01-01")).toBe(false);
    expect(isParentOlderThanChild(null, "2024-01-01")).toBe(true);
    expect(isParentOlderThanChild("2023-01-01", null)).toBe(true);

    // Via birdSchema contextual validation
    const birdWithYoungSire = birdSchema.safeParse({
      species_id: validSpeciesId,
      hatch_date: "2024-06-01",
      sire_id: validSireId,
      sire_hatch_date: "2024-07-01", // Younger than bird
    });
    expect(birdWithYoungSire.success).toBe(false);

    const birdWithOldSire = birdSchema.safeParse({
      species_id: validSpeciesId,
      hatch_date: "2024-06-01",
      sire_id: validSireId,
      sire_hatch_date: "2023-01-01", // Older than bird
    });
    expect(birdWithOldSire.success).toBe(true);
  });

  it("rejects identical sire and dam", () => {
    const input = {
      species_id: validSpeciesId,
      sire_id: validSireId,
      dam_id: validSireId, // Same ID
    };
    const result = birdSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects bird as its own sire or dam in birdUpdateSchema", () => {
    const selfSire = birdUpdateSchema.safeParse({
      id: validSireId,
      species_id: validSpeciesId,
      sire_id: validSireId,
    });
    expect(selfSire.success).toBe(false);

    const selfDam = birdUpdateSchema.safeParse({
      id: validDamId,
      species_id: validSpeciesId,
      dam_id: validDamId,
    });
    expect(selfDam.success).toBe(false);
  });
});

describe("Search Escape Helper", () => {
  it("escapes %, _, and \\ characters", () => {
    expect(escapeLikeWildcards("")).toBe("");
    expect(escapeLikeWildcards("Normal text")).toBe("Normal text");
    expect(escapeLikeWildcards("100%")).toBe("100\\%");
    expect(escapeLikeWildcards("bird_1")).toBe("bird\\_1");
    expect(escapeLikeWildcards("C:\\aviary\\test")).toBe("C:\\\\aviary\\\\test");
    expect(escapeLikeWildcards("50%_off\\now")).toBe("50\\%\\_off\\\\now");
  });
});

describe("Ancestry Cycle Check Pure Function", () => {
  it("returns true when target is its own proposed parent", () => {
    const target = "bird-1";
    expect(wouldCreateAncestryCycle(target, target, new Map())).toBe(true);
  });

  it("returns false when proposed parent is null or undefined", () => {
    expect(wouldCreateAncestryCycle("bird-1", null, new Map())).toBe(false);
    expect(wouldCreateAncestryCycle("bird-1", undefined, new Map())).toBe(false);
  });

  it("detects direct 1-step cycle", () => {
    // bird-2's sire is bird-1.
    // If we try to make bird-2 the sire of bird-1, that is a cycle!
    const lookup = new Map<string, { sire_id?: string | null; dam_id?: string | null }>([
      ["bird-2", { sire_id: "bird-1", dam_id: null }],
    ]);

    expect(wouldCreateAncestryCycle("bird-1", "bird-2", lookup)).toBe(true);
  });

  it("detects multi-step deep cycle", () => {
    // bird-1 -> parent of bird-2 -> parent of bird-3 -> parent of bird-4
    // Trying to set bird-4 as parent of bird-1 creates a cycle: 1 -> 2 -> 3 -> 4 -> 1
    const lookup = new Map<string, { sire_id?: string | null; dam_id?: string | null }>([
      ["bird-4", { sire_id: "bird-3", dam_id: null }],
      ["bird-3", { sire_id: null, dam_id: "bird-2" }],
      ["bird-2", { sire_id: "bird-1", dam_id: null }],
    ]);

    expect(wouldCreateAncestryCycle("bird-1", "bird-4", lookup)).toBe(true);
  });

  it("returns false for valid ancestry branch", () => {
    // bird-1 wants parent bird-4
    // bird-4 has parents bird-5 and bird-6
    // Neither 5 nor 6 is bird-1
    const lookup = new Map<string, { sire_id?: string | null; dam_id?: string | null }>([
      ["bird-4", { sire_id: "bird-5", dam_id: "bird-6" }],
      ["bird-5", { sire_id: null, dam_id: null }],
      ["bird-6", { sire_id: null, dam_id: null }],
    ]);

    expect(wouldCreateAncestryCycle("bird-1", "bird-4", lookup)).toBe(false);
  });

  it("handles diamond ancestry safely without false positive cycle", () => {
    // Diamond:
    // P1 and P2 are parents of S1 and D1.
    // S1 and D1 are parents of candidate.
    // target bird-1 wants candidate as parent.
    const lookup = new Map<string, { sire_id?: string | null; dam_id?: string | null }>([
      ["cand", { sire_id: "s1", dam_id: "d1" }],
      ["s1", { sire_id: "p1", dam_id: "p2" }],
      ["d1", { sire_id: "p1", dam_id: "p2" }],
      ["p1", { sire_id: null, dam_id: null }],
      ["p2", { sire_id: null, dam_id: null }],
    ]);

    expect(wouldCreateAncestryCycle("bird-1", "cand", lookup)).toBe(false);
  });

  it("works with lookup function as well as Map", () => {
    const parents: Record<string, { sire_id: string | null; dam_id: string | null }> = {
      "child": { sire_id: "parent", dam_id: null },
      "parent": { sire_id: "grandparent", dam_id: null },
    };

    const lookupFn = (id: string) => parents[id] || null;

    expect(wouldCreateAncestryCycle("grandparent", "child", lookupFn)).toBe(true);
    expect(wouldCreateAncestryCycle("other", "child", lookupFn)).toBe(false);
  });
});

describe("Bird Age Formatting Helper", () => {
  it("formats age in years and months", () => {
    const ref = new Date("2026-10-24T00:00:00Z");
    expect(formatBirdAge("2024-04-15", ref)).toBe("2y 6m");
  });

  it("formats age in months and days for birds under 1 year", () => {
    const ref = new Date("2026-10-24T00:00:00Z");
    expect(formatBirdAge("2026-07-10", ref)).toBe("3m 14d");
  });

  it("formats age in days for newly hatched chicks", () => {
    const ref = new Date("2026-10-24T00:00:00Z");
    expect(formatBirdAge("2026-10-18", ref)).toBe("6d");
  });

  it("returns null for null, empty or future hatch dates", () => {
    const ref = new Date("2026-10-24T00:00:00Z");
    expect(formatBirdAge(null, ref)).toBeNull();
    expect(formatBirdAge("", ref)).toBeNull();
    expect(formatBirdAge("2027-01-01", ref)).toBeNull();
  });
});
