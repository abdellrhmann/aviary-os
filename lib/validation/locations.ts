import { z } from "zod";

/**
 * Common string preprocessor that trims whitespace and returns null if empty or omitted.
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
 * Required string preprocessor that trims whitespace and ensures min 1 char.
 */
const requiredTrimmedString = (maxLength: number, fieldLabel: string) =>
  z.preprocess(
    (val) => (typeof val === "string" ? val.trim() : val),
    z
      .string({ message: `${fieldLabel} is required` })
      .min(1, `${fieldLabel} is required`)
      .max(maxLength, `${fieldLabel} must be ${maxLength} characters or fewer`)
  );

export const locationSchema = z.object({
  name: requiredTrimmedString(100, "Location name"),
  notes: optionalTrimmedString(1000, "Notes"),
});

export type LocationInput = z.infer<typeof locationSchema>;

export const locationUpdateSchema = locationSchema.extend({
  id: z.string().uuid("Invalid location identifier"),
});

export type LocationUpdateInput = z.infer<typeof locationUpdateSchema>;

export interface Location {
  id: string;
  owner_id: string;
  name: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
