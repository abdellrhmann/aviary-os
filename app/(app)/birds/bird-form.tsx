"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, AlertTriangle, ArrowLeft } from "lucide-react";
import type { Bird } from "@/lib/validation/birds";
import { createBirdAction, updateBirdAction } from "./actions";

interface ParentCandidate {
  id: string;
  name: string | null;
  ring_number: string | null;
  sex: string;
  hatch_date: string | null;
}

interface BirdFormProps {
  initialData?: Bird | null;
  speciesList: Array<{ id: string; common_name: string }>;
  locationsList: Array<{ id: string; name: string }>;
  candidateParents: ParentCandidate[];
  isEdit?: boolean;
}

export function BirdForm({
  initialData,
  speciesList,
  locationsList,
  candidateParents,
  isEdit = false,
}: BirdFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Record<string, string[] | undefined>
  >({});

  // Form states
  const [speciesId, setSpeciesId] = useState(
    initialData?.species_id || (speciesList[0]?.id ?? "")
  );
  const [variety, setVariety] = useState(initialData?.variety || "");
  const [name, setName] = useState(initialData?.name || "");
  const [ringNumber, setRingNumber] = useState(initialData?.ring_number || "");
  const [sex, setSex] = useState<"male" | "female" | "unknown">(
    initialData?.sex || "unknown"
  );
  const [hatchDate, setHatchDate] = useState(initialData?.hatch_date || "");
  const [hatchDateEstimated, setHatchDateEstimated] = useState(
    initialData?.hatch_date_estimated || false
  );
  const [acquiredOn, setAcquiredOn] = useState(initialData?.acquired_on || "");
  const [source, setSource] = useState(initialData?.source || "");
  const [locationId, setLocationId] = useState(initialData?.location_id || "");
  const [sireId, setSireId] = useState(initialData?.sire_id || "");
  const [damId, setDamId] = useState(initialData?.dam_id || "");
  const [status, setStatus] = useState<
    "active" | "sold" | "deceased" | "transferred"
  >(initialData?.status || "active");
  const [statusChangedOn, setStatusChangedOn] = useState(
    initialData?.status_changed_on || ""
  );
  const [notes, setNotes] = useState(initialData?.notes || "");

  // Parent search filters for dropdowns
  const [sireSearch, setSireSearch] = useState("");
  const [damSearch, setDamSearch] = useState("");

  const todayStr = new Date().toISOString().slice(0, 10);

  // Filter parents excluding the current bird
  const eligibleParents = candidateParents.filter(
    (p) => !isEdit || p.id !== initialData?.id
  );

  const selectedSire = eligibleParents.find((p) => p.id === sireId);
  const selectedDam = eligibleParents.find((p) => p.id === damId);

  // Warnings for non-standard parent sexes
  const sireSexWarning =
    selectedSire && selectedSire.sex !== "male"
      ? `Notice: The selected sire is recorded as ${selectedSire.sex}, not male.`
      : null;

  const damSexWarning =
    selectedDam && selectedDam.sex !== "female"
      ? `Notice: The selected dam is recorded as ${selectedDam.sex}, not female.`
      : null;

  function handleStatusChange(
    newStatus: "active" | "sold" | "deceased" | "transferred"
  ) {
    setStatus(newStatus);
    if (!statusChangedOn || (initialData && initialData.status !== newStatus)) {
      setStatusChangedOn(todayStr);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const payload = {
      species_id: speciesId,
      variety: variety || null,
      name: name || null,
      ring_number: ringNumber || null,
      sex,
      hatch_date: hatchDate || null,
      hatch_date_estimated: hatchDateEstimated,
      acquired_on: acquiredOn || null,
      source: source || null,
      location_id: locationId || null,
      sire_id: sireId || null,
      dam_id: damId || null,
      status,
      status_changed_on: statusChangedOn || null,
      notes: notes || null,
    };

    startTransition(async () => {
      let result;
      if (isEdit && initialData?.id) {
        result = await updateBirdAction({
          id: initialData.id,
          ...payload,
        });
      } else {
        result = await createBirdAction(payload);
      }

      if (!result.success) {
        setFormError(result.error || "Failed to save bird record.");
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
        }
        return;
      }

      if (isEdit && initialData?.id) {
        router.push(`/birds/${initialData.id}`);
      } else if (result.data?.id) {
        router.push(`/birds/${result.data.id}`);
      } else {
        router.push("/birds");
      }
      router.refresh();
    });
  }

  // Filtered parent candidates
  const filteredSires = eligibleParents.filter((p) => {
    if (!sireSearch) return true;
    const q = sireSearch.toLowerCase();
    return (
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.ring_number && p.ring_number.toLowerCase().includes(q))
    );
  });

  const filteredDams = eligibleParents.filter((p) => {
    if (!damSearch) return true;
    const q = damSearch.toLowerCase();
    return (
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.ring_number && p.ring_number.toLowerCase().includes(q))
    );
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {formError && (
        <div className="p-3 rounded-md border border-danger/30 bg-danger-subtle text-danger text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{formError}</span>
        </div>
      )}

      {/* Basic Identification */}
      <div className="bg-surface border border-border rounded-md p-4 sm:p-5 space-y-4">
        <div className="border-b border-border pb-3">
          <h2 className="text-sm font-semibold text-foreground">
            Identification & Taxonomy
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Core taxonomic classification and band numbers.
          </p>
        </div>

        {/* Species Selection */}
        <div>
          <label
            htmlFor="bird-species"
            className="block text-xs font-medium text-foreground mb-1"
          >
            Species <span className="text-danger">*</span>
          </label>
          {speciesList.length === 0 ? (
            <div className="p-3 rounded-md border border-border bg-muted-surface text-xs text-foreground">
              <p className="font-medium">No species configured yet.</p>
              <p className="text-muted mt-1">
                You must register at least one species before adding birds.
              </p>
              <div className="mt-2">
                <Link
                  href="/species"
                  className="text-xs font-medium text-accent hover:underline"
                >
                  Go to Species to add one
                </Link>
              </div>
            </div>
          ) : (
            <select
              id="bird-species"
              required
              value={speciesId}
              onChange={(e) => setSpeciesId(e.target.value)}
              className="w-full text-sm px-3 py-2 bg-surface border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            >
              <option value="">Select a species...</option>
              {speciesList.map((sp) => (
                <option key={sp.id} value={sp.id}>
                  {sp.common_name}
                </option>
              ))}
            </select>
          )}
          {fieldErrors.species_id && (
            <p className="text-xs text-danger mt-1">
              {fieldErrors.species_id[0]}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="bird-name"
              className="block text-xs font-medium text-foreground mb-1"
            >
              Bird Name
            </label>
            <input
              id="bird-name"
              type="text"
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sunny or Bluey"
              className="w-full text-sm px-3 py-2 bg-surface border border-border rounded-md text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            />
            {fieldErrors.name && (
              <p className="text-xs text-danger mt-1">
                {fieldErrors.name[0]}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="bird-ring-number"
              className="block text-xs font-medium text-foreground mb-1"
            >
              Ring / Band Number
            </label>
            <input
              id="bird-ring-number"
              type="text"
              maxLength={50}
              value={ringNumber}
              onChange={(e) => setRingNumber(e.target.value)}
              placeholder="e.g. AVI-2024-042"
              className="w-full text-sm px-3 py-2 bg-surface border border-border rounded-md text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            />
            {fieldErrors.ring_number && (
              <p className="text-xs text-danger mt-1">
                {fieldErrors.ring_number[0]}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="bird-variety"
              className="block text-xs font-medium text-foreground mb-1"
            >
              Variety / Color Mutation
            </label>
            <input
              id="bird-variety"
              type="text"
              maxLength={100}
              value={variety}
              onChange={(e) => setVariety(e.target.value)}
              placeholder="e.g. Opaline, Normal Grey, Lutino"
              className="w-full text-sm px-3 py-2 bg-surface border border-border rounded-md text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            />
            {fieldErrors.variety && (
              <p className="text-xs text-danger mt-1">
                {fieldErrors.variety[0]}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="bird-sex"
              className="block text-xs font-medium text-foreground mb-1"
            >
              Sex
            </label>
            <select
              id="bird-sex"
              value={sex}
              onChange={(e) =>
                setSex(e.target.value as "male" | "female" | "unknown")
              }
              className="w-full text-sm px-3 py-2 bg-surface border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            >
              <option value="unknown">Unknown</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
            {fieldErrors.sex && (
              <p className="text-xs text-danger mt-1">{fieldErrors.sex[0]}</p>
            )}
          </div>
        </div>
      </div>

      {/* Dates & Acquisition */}
      <div className="bg-surface border border-border rounded-md p-4 sm:p-5 space-y-4">
        <div className="border-b border-border pb-3">
          <h2 className="text-sm font-semibold text-foreground">
            Dates & Acquisition
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Hatch record, acquisition history, and enclosure assignment.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="bird-hatch-date"
              className="block text-xs font-medium text-foreground mb-1"
            >
              Hatch Date
            </label>
            <input
              id="bird-hatch-date"
              type="date"
              max={todayStr}
              value={hatchDate}
              onChange={(e) => setHatchDate(e.target.value)}
              className="w-full text-sm px-3 py-2 bg-surface border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            />
            <div className="mt-2 flex items-center gap-2">
              <input
                id="bird-hatch-date-estimated"
                type="checkbox"
                checked={hatchDateEstimated}
                onChange={(e) => setHatchDateEstimated(e.target.checked)}
                className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
              />
              <label
                htmlFor="bird-hatch-date-estimated"
                className="text-xs text-muted cursor-pointer"
              >
                Hatch date is estimated
              </label>
            </div>
            {fieldErrors.hatch_date && (
              <p className="text-xs text-danger mt-1">
                {fieldErrors.hatch_date[0]}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="bird-acquired-on"
              className="block text-xs font-medium text-foreground mb-1"
            >
              Acquisition Date
            </label>
            <input
              id="bird-acquired-on"
              type="date"
              value={acquiredOn}
              onChange={(e) => setAcquiredOn(e.target.value)}
              className="w-full text-sm px-3 py-2 bg-surface border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            />
            {fieldErrors.acquired_on && (
              <p className="text-xs text-danger mt-1">
                {fieldErrors.acquired_on[0]}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="bird-source"
              className="block text-xs font-medium text-foreground mb-1"
            >
              Source / Origin
            </label>
            <input
              id="bird-source"
              type="text"
              maxLength={100}
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="e.g. Bred in-house, Breeder Name, Import"
              className="w-full text-sm px-3 py-2 bg-surface border border-border rounded-md text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            />
            {fieldErrors.source && (
              <p className="text-xs text-danger mt-1">
                {fieldErrors.source[0]}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="bird-location"
              className="block text-xs font-medium text-foreground mb-1"
            >
              Location / Enclosure
            </label>
            <select
              id="bird-location"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="w-full text-sm px-3 py-2 bg-surface border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            >
              <option value="">None / Unassigned</option>
              {locationsList.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
            {fieldErrors.location_id && (
              <p className="text-xs text-danger mt-1">
                {fieldErrors.location_id[0]}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Lineage & Pedigree */}
      <div className="bg-surface border border-border rounded-md p-4 sm:p-5 space-y-4">
        <div className="border-b border-border pb-3">
          <h2 className="text-sm font-semibold text-foreground">
            Lineage & Ancestry
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Select recorded parents from your active birds flock.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Sire Selection */}
          <div className="space-y-1.5">
            <label
              htmlFor="bird-sire"
              className="block text-xs font-medium text-foreground"
            >
              Sire (Father)
            </label>
            {eligibleParents.length > 5 && (
              <input
                type="text"
                placeholder="Search sire by ring or name..."
                value={sireSearch}
                onChange={(e) => setSireSearch(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 bg-surface border border-border rounded-md text-foreground placeholder:text-muted mb-1 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
              />
            )}
            <select
              id="bird-sire"
              value={sireId}
              onChange={(e) => setSireId(e.target.value)}
              className="w-full text-sm px-3 py-2 bg-surface border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            >
              <option value="">Unknown / None</option>
              {filteredSires.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.ring_number ? `[${p.ring_number}] ` : ""}
                  {p.name || "Unnamed"} ({p.sex})
                </option>
              ))}
            </select>
            {sireSexWarning && (
              <div className="p-2 rounded bg-muted-surface border border-border text-[11px] text-muted flex items-start gap-1.5 mt-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-muted" />
                <span>{sireSexWarning}</span>
              </div>
            )}
            {fieldErrors.sire_id && (
              <p className="text-xs text-danger mt-1">
                {fieldErrors.sire_id[0]}
              </p>
            )}
          </div>

          {/* Dam Selection */}
          <div className="space-y-1.5">
            <label
              htmlFor="bird-dam"
              className="block text-xs font-medium text-foreground"
            >
              Dam (Mother)
            </label>
            {eligibleParents.length > 5 && (
              <input
                type="text"
                placeholder="Search dam by ring or name..."
                value={damSearch}
                onChange={(e) => setDamSearch(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 bg-surface border border-border rounded-md text-foreground placeholder:text-muted mb-1 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
              />
            )}
            <select
              id="bird-dam"
              value={damId}
              onChange={(e) => setDamId(e.target.value)}
              className="w-full text-sm px-3 py-2 bg-surface border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            >
              <option value="">Unknown / None</option>
              {filteredDams.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.ring_number ? `[${p.ring_number}] ` : ""}
                  {p.name || "Unnamed"} ({p.sex})
                </option>
              ))}
            </select>
            {damSexWarning && (
              <div className="p-2 rounded bg-muted-surface border border-border text-[11px] text-muted flex items-start gap-1.5 mt-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-muted" />
                <span>{damSexWarning}</span>
              </div>
            )}
            {fieldErrors.dam_id && (
              <p className="text-xs text-danger mt-1">
                {fieldErrors.dam_id[0]}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Status & Life Stage */}
      <div className="bg-surface border border-border rounded-md p-4 sm:p-5 space-y-4">
        <div className="border-b border-border pb-3">
          <h2 className="text-sm font-semibold text-foreground">
            Status & Tracking
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Current disposition in your aviary records.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="bird-status"
              className="block text-xs font-medium text-foreground mb-1"
            >
              Status
            </label>
            <select
              id="bird-status"
              value={status}
              onChange={(e) =>
                handleStatusChange(
                  e.target.value as
                    | "active"
                    | "sold"
                    | "deceased"
                    | "transferred"
                )
              }
              className="w-full text-sm px-3 py-2 bg-surface border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            >
              <option value="active">Active</option>
              <option value="sold">Sold</option>
              <option value="deceased">Deceased</option>
              <option value="transferred">Transferred</option>
            </select>
            {fieldErrors.status && (
              <p className="text-xs text-danger mt-1">
                {fieldErrors.status[0]}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="bird-status-changed-on"
              className="block text-xs font-medium text-foreground mb-1"
            >
              Status Date
            </label>
            <input
              id="bird-status-changed-on"
              type="date"
              value={statusChangedOn}
              onChange={(e) => setStatusChangedOn(e.target.value)}
              className="w-full text-sm px-3 py-2 bg-surface border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            />
            <p className="text-[11px] text-muted mt-1">
              Automatically set to today if left blank when status changes.
            </p>
            {fieldErrors.status_changed_on && (
              <p className="text-xs text-danger mt-1">
                {fieldErrors.status_changed_on[0]}
              </p>
            )}
          </div>
        </div>

        <div>
          <label
            htmlFor="bird-notes"
            className="block text-xs font-medium text-foreground mb-1"
          >
            Notes & Observations
          </label>
          <textarea
            id="bird-notes"
            rows={3}
            maxLength={2000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional health records, behavioral notes, pedigree specifics..."
            className="w-full text-sm px-3 py-2 bg-surface border border-border rounded-md text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent resize-y"
          />
          {fieldErrors.notes && (
            <p className="text-xs text-danger mt-1">
              {fieldErrors.notes[0]}
            </p>
          )}
        </div>
      </div>

      {/* Form Submission Actions */}
      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2">
        <Link
          href={
            isEdit && initialData?.id
              ? `/birds/${initialData.id}`
              : "/birds"
          }
          className="inline-flex items-center justify-center gap-1.5 text-xs font-medium bg-surface text-foreground hover:bg-muted-surface border border-border px-4 py-2 rounded-md transition-colors text-center"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Cancel</span>
        </Link>
        <button
          type="submit"
          disabled={isPending || speciesList.length === 0}
          className="inline-flex items-center justify-center text-xs font-medium bg-accent text-accent-foreground hover:bg-accent-hover disabled:opacity-50 px-4 py-2 rounded-md transition-colors"
        >
          {isPending
            ? "Saving record..."
            : isEdit
            ? "Update bird record"
            : "Save bird record"}
        </button>
      </div>
    </form>
  );
}
