import { z } from "zod";

export const BIRD_SEX = ["male", "female", "unknown"] as const;
export type BirdSex = (typeof BIRD_SEX)[number];

export const BIRD_STATUS = [
  "active",
  "sold",
  "deceased",
  "transferred",
] as const;
export type BirdStatus = (typeof BIRD_STATUS)[number];

/**
 * Escapes PostgreSQL LIKE/ILIKE wildcard characters (% and _) as well as backslashes.
 * Used for safe search across bird name, ring_number, and variety.
 */
export function escapeLikeWildcards(input: string): string {
  if (!input) return "";
  return input.replace(/([\\%_])/g, "\\$1");
}

/**
 * Helper to check whether a calendar date string (YYYY-MM-DD) is valid.
 */
export function isValidDateString(val: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) return false;
  const [y, m, d] = val.split("-").map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

/**
 * Checks whether a parent is strictly older than its offspring.
 * If either date is missing, returns true (cannot disprove age ordering).
 */
export function isParentOlderThanChild(
  parentHatchDate: string | null | undefined,
  childHatchDate: string | null | undefined
): boolean {
  if (!parentHatchDate || !childHatchDate) return true;
  return parentHatchDate < childHatchDate;
}

export type ParentLookupMap =
  | Map<string, { sire_id?: string | null; dam_id?: string | null }>
  | Record<string, { sire_id?: string | null; dam_id?: string | null }>
  | ((id: string) => { sire_id?: string | null; dam_id?: string | null } | null | undefined);

/**
 * Pure function to detect if setting candidateParentId as a parent of targetBirdId
 * would introduce a circular ancestry cycle.
 *
 * Traverses up candidateParentId's ancestors. If targetBirdId is found, a cycle would occur.
 * Includes a maxDepth loop safeguard (default 50) to prevent infinite loops.
 */
export function wouldCreateAncestryCycle(
  targetBirdId: string,
  candidateParentId: string | null | undefined,
  lookup: ParentLookupMap,
  maxDepth = 50
): boolean {
  if (!targetBirdId || !candidateParentId) return false;
  if (targetBirdId === candidateParentId) return true;

  const getParents = (id: string) => {
    if (typeof lookup === "function") {
      return lookup(id);
    }
    if (lookup instanceof Map) {
      return lookup.get(id);
    }
    return lookup[id];
  };

  const queue: string[] = [candidateParentId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    if (visited.size >= maxDepth) {
      // Loop safeguard exceeded: treat as cycle risk
      return true;
    }

    const currentId = queue.shift()!;
    if (currentId === targetBirdId) {
      return true;
    }

    if (!visited.has(currentId)) {
      visited.add(currentId);
      const parentRecord = getParents(currentId);
      if (parentRecord) {
        if (parentRecord.sire_id) queue.push(parentRecord.sire_id);
        if (parentRecord.dam_id) queue.push(parentRecord.dam_id);
      }
    }
  }

  return false;
}

/**
 * Common string preprocessor that trims whitespace and returns null if empty.
 */
const optionalTrimmedString = (maxLength: number, fieldLabel: string) =>
  z.preprocess((val) => {
    if (val === undefined || val === null) return null;
    if (typeof val === "string") {
      const trimmed = val.trim();
      return trimmed === "" ? null : trimmed;
    }
    return val;
  }, z.string().max(maxLength, `${fieldLabel} must be ${maxLength} characters or fewer`).nullable().default(null));

/**
 * Preprocessor for optional UUID fields (location_id, sire_id, dam_id).
 */
const optionalUuid = (fieldLabel: string) =>
  z.preprocess((val) => {
    if (val === undefined || val === null) return null;
    if (typeof val === "string") {
      const trimmed = val.trim();
      return trimmed === "" ? null : trimmed;
    }
    return val;
  }, z.string().uuid(`Invalid ${fieldLabel} identifier`).nullable().default(null));

/**
 * Preprocessor and validator for optional date strings (YYYY-MM-DD).
 */
const dateStringSchema = (fieldLabel: string, disallowFuture = false) =>
  z.preprocess(
    (val) => {
      if (val === undefined || val === null) return null;
      if (typeof val === "string") {
        const trimmed = val.trim();
        return trimmed === "" ? null : trimmed;
      }
      return val;
    },
    z
      .string()
      .refine(
        (val) => isValidDateString(val),
        `${fieldLabel} must be a valid date in YYYY-MM-DD format`
      )
      .refine(
        (val) => {
          if (!disallowFuture) return true;
          const today = new Date().toISOString().slice(0, 10);
          return val <= today;
        },
        `${fieldLabel} cannot be in the future`
      )
      .nullable()
      .default(null)
  );

/**
 * Dedicated schema for checking parent vs child hatch dates directly.
 */
export const parentChildAgeSchema = z
  .object({
    child_hatch_date: dateStringSchema("Child hatch date", true),
    parent_hatch_date: dateStringSchema("Parent hatch date", true),
  })
  .refine(
    (data) => {
      if (!data.child_hatch_date || !data.parent_hatch_date) return true;
      return data.parent_hatch_date < data.child_hatch_date;
    },
    {
      message: "Parent must be older than the offspring",
      path: ["parent_hatch_date"],
    }
  );

/**
 * Base bird schema for insert/update.
 */
export const birdSchema = z
  .object({
    species_id: z
      .string({ message: "Species is required" })
      .uuid("Invalid species identifier"),
    variety: optionalTrimmedString(100, "Variety"),
    name: optionalTrimmedString(100, "Name"),
    ring_number: optionalTrimmedString(50, "Ring number"),
    sex: z
      .enum(BIRD_SEX, { message: "Sex must be male, female, or unknown" })
      .default("unknown"),
    hatch_date: dateStringSchema("Hatch date", true),
    hatch_date_estimated: z.preprocess((val) => {
      if (val === true || val === "true" || val === "on" || val === 1 || val === "1") {
        return true;
      }
      return false;
    }, z.boolean().default(false)),
    acquired_on: dateStringSchema("Acquired date", false),
    source: optionalTrimmedString(100, "Source"),
    location_id: optionalUuid("location"),
    sire_id: optionalUuid("sire"),
    dam_id: optionalUuid("dam"),
    status: z
      .enum(BIRD_STATUS, {
        message: "Status must be active, sold, deceased, or transferred",
      })
      .default("active"),
    status_changed_on: dateStringSchema("Status changed date", false),
    notes: optionalTrimmedString(2000, "Notes"),

    // Optional parent hatch dates for contextual validation
    sire_hatch_date: dateStringSchema("Sire hatch date", true).optional(),
    dam_hatch_date: dateStringSchema("Dam hatch date", true).optional(),
  })
  .superRefine((data, ctx) => {
    // acquired_on not before hatch_date
    if (data.acquired_on && data.hatch_date) {
      if (data.acquired_on < data.hatch_date) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Acquired date cannot be before hatch date",
          path: ["acquired_on"],
        });
      }
    }

    // sire and dam must not be identical
    if (data.sire_id && data.dam_id && data.sire_id === data.dam_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Sire and dam cannot be the same bird",
        path: ["dam_id"],
      });
    }

    // sire older than bird if hatch dates are known
    if (data.hatch_date && data.sire_hatch_date) {
      if (data.sire_hatch_date >= data.hatch_date) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Sire must be older than the offspring",
          path: ["sire_id"],
        });
      }
    }

    // dam older than bird if hatch dates are known
    if (data.hatch_date && data.dam_hatch_date) {
      if (data.dam_hatch_date >= data.hatch_date) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Dam must be older than the offspring",
          path: ["dam_id"],
        });
      }
    }
  });

export type BirdInput = z.infer<typeof birdSchema>;

export const birdUpdateSchema = birdSchema
  .extend({
    id: z.string().uuid("Invalid bird identifier"),
  })
  .superRefine((data, ctx) => {
    if (data.sire_id && data.sire_id === data.id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A bird cannot be its own sire",
        path: ["sire_id"],
      });
    }
    if (data.dam_id && data.dam_id === data.id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A bird cannot be its own dam",
        path: ["dam_id"],
      });
    }
  });

export type BirdUpdateInput = z.infer<typeof birdUpdateSchema>;

export interface Bird {
  id: string;
  owner_id: string;
  species_id: string;
  variety: string | null;
  name: string | null;
  ring_number: string | null;
  sex: BirdSex;
  hatch_date: string | null;
  hatch_date_estimated: boolean;
  acquired_on: string | null;
  source: string | null;
  location_id: string | null;
  sire_id: string | null;
  dam_id: string | null;
  status: BirdStatus;
  status_changed_on: string | null;
  notes: string | null;
  photo_path: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;

  // Joined / related fields
  species?: { id?: string; common_name: string } | null;
  location?: { id?: string; name: string } | null;
  sire?: { id: string; name: string | null; ring_number: string | null; sex?: BirdSex; hatch_date?: string | null } | null;
  dam?: { id: string; name: string | null; ring_number: string | null; sex?: BirdSex; hatch_date?: string | null } | null;
}

/**
 * Calculates human-readable age from a hatch date string.
 * Example: "2y 4m", "5m", "18d", or null if no hatch date.
 */
export function formatBirdAge(
  hatchDate: string | null | undefined,
  refDate: Date = new Date()
): string | null {
  if (!hatchDate || !isValidDateString(hatchDate)) return null;

  const [y, m, d] = hatchDate.split("-").map(Number);
  const birth = new Date(Date.UTC(y, m - 1, d));
  const now = new Date(Date.UTC(refDate.getFullYear(), refDate.getMonth(), refDate.getDate()));

  if (birth > now) return null;

  let years = now.getUTCFullYear() - birth.getUTCFullYear();
  let months = now.getUTCMonth() - birth.getUTCMonth();
  let days = now.getUTCDate() - birth.getUTCDate();

  if (days < 0) {
    months -= 1;
    // Days in previous month
    const prevMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
    days += prevMonth.getUTCDate();
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years > 0) {
    return months > 0 ? `${years}y ${months}m` : `${years}y`;
  }
  if (months > 0) {
    return days > 0 ? `${months}m ${days}d` : `${months}m`;
  }
  return `${Math.max(0, days)}d`;
}
