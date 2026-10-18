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

/**
 * Incubation days preprocessor: allows null/empty string, or integer between 1 and 120. Defaults to null.
 */
const incubationDaysSchema = z.preprocess((val) => {
  if (val === undefined || val === null || val === "") return null;
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (trimmed === "") return null;
    if (!/^-?\d+(\.\d+)?$/.test(trimmed)) return val;
    return Number(trimmed);
  }
  return val;
}, z.number({ message: "Incubation days must be a whole number between 1 and 120" })
    .int("Incubation days must be a whole number between 1 and 120")
    .min(1, "Incubation days must be between 1 and 120")
    .max(120, "Incubation days must be between 1 and 120")
    .nullable()
    .default(null)
);

export const speciesSchema = z.object({
  common_name: requiredTrimmedString(100, "Common name"),
  scientific_name: optionalTrimmedString(100, "Scientific name"),
  incubation_days: incubationDaysSchema,
  notes: optionalTrimmedString(1000, "Notes"),
});

export type SpeciesInput = z.infer<typeof speciesSchema>;

export const speciesUpdateSchema = speciesSchema.extend({
  id: z.string().uuid("Invalid species identifier"),
});

export type SpeciesUpdateInput = z.infer<typeof speciesUpdateSchema>;

export interface Species {
  id: string;
  owner_id: string;
  common_name: string;
  scientific_name: string | null;
  incubation_days: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
