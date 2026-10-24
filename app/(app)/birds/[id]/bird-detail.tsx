"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  Archive,
  RotateCcw,
  AlertCircle,
  AlertTriangle,
  Dna,
  MapPin,
  Calendar,
  Tag,
  Clock,
  ShieldAlert,
} from "lucide-react";
import type { Bird } from "@/lib/validation/birds";
import { formatBirdAge } from "@/lib/validation/birds";
import { BirdForm } from "../bird-form";
import { archiveBirdAction, restoreBirdAction } from "../actions";

interface BirdDetailProps {
  bird: Bird;
  offspringCount: number;
  speciesList: Array<{ id: string; common_name: string }>;
  locationsList: Array<{ id: string; name: string }>;
  candidateParents: Array<{
    id: string;
    name: string | null;
    ring_number: string | null;
    sex: string;
    hatch_date: string | null;
  }>;
}

export function BirdDetail({
  bird,
  offspringCount,
  speciesList,
  locationsList,
  candidateParents,
}: BirdDetailProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [isPendingArchive, startArchiveTransition] = useTransition();
  const [isPendingRestore, startRestoreTransition] = useTransition();

  const isArchived = Boolean(bird.deleted_at);
  const calculatedAge = formatBirdAge(bird.hatch_date);

  function handleArchive() {
    setActionError(null);
    startArchiveTransition(async () => {
      const result = await archiveBirdAction(bird.id);
      if (!result.success) {
        setActionError(result.error || "Failed to archive bird.");
        return;
      }
      setShowArchiveConfirm(false);
      router.refresh();
    });
  }

  function handleRestore() {
    setActionError(null);
    startRestoreTransition(async () => {
      const result = await restoreBirdAction(bird.id);
      if (!result.success) {
        setActionError(result.error || "Failed to restore bird.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted">
          <Link
            href="/birds"
            className="hover:text-foreground flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Birds</span>
          </Link>
          <span>/</span>
          <span className="text-foreground">
            {bird.ring_number || bird.name || "Bird Profile"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {!isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-1.5 text-xs font-medium bg-surface text-foreground hover:bg-muted-surface border border-border px-3 py-1.5 rounded-md transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          )}

          {!isEditing &&
            (isArchived ? (
              <button
                type="button"
                onClick={handleRestore}
                disabled={isPendingRestore}
                className="inline-flex items-center gap-1.5 text-xs font-medium bg-muted-surface hover:bg-border text-foreground px-3 py-1.5 rounded-md border border-border transition-colors disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isPendingRestore ? "Restoring..." : "Restore"}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setActionError(null);
                  setShowArchiveConfirm(true);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-danger hover:bg-danger-subtle px-3 py-1.5 rounded-md border border-danger/30 transition-colors"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>Archive</span>
              </button>
            ))}
        </div>
      </div>

      {actionError && (
        <div className="p-3 rounded-md border border-danger/30 bg-danger-subtle text-danger text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Archived Banner */}
      {isArchived && (
        <div className="p-4 rounded-md border border-border bg-muted-surface flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
          <div>
            <p className="font-semibold text-foreground">
              Archived Record
            </p>
            <p className="text-muted mt-0.5">
              This bird was archived on{" "}
              {bird.deleted_at ? bird.deleted_at.slice(0, 10) : ""}. It is hidden from standard registry lists.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRestore}
            disabled={isPendingRestore}
            className="inline-flex items-center justify-center gap-1.5 text-xs font-medium bg-surface text-foreground hover:bg-border border border-border px-3 py-1.5 rounded-md transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restore bird</span>
          </button>
        </div>
      )}

      {/* Archive Confirmation Dialog / Notice */}
      {showArchiveConfirm && (
        <div className="p-4 rounded-md border border-border bg-surface shadow-sm space-y-3">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 text-muted shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Archive Bird Record
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Archiving removes this bird from active lists while preserving historical data.
              </p>
            </div>
          </div>

          {offspringCount > 0 && (
            <div className="p-3 rounded-md border border-border bg-muted-surface text-xs text-foreground flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-muted" />
              <span>
                Notice: This bird is recorded as a parent of {offspringCount}{" "}
                offspring. Archiving will retain lineage connections for descendants, but hide this bird from active parent pickers.
              </span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={() => setShowArchiveConfirm(false)}
              disabled={isPendingArchive}
              className="px-3 py-1.5 text-xs font-medium border border-border rounded-md hover:bg-muted-surface"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleArchive}
              disabled={isPendingArchive}
              className="px-3 py-1.5 text-xs font-medium bg-danger text-white rounded-md hover:opacity-90 disabled:opacity-50"
            >
              {isPendingArchive ? "Archiving..." : "Confirm Archive"}
            </button>
          </div>
        </div>
      )}

      {isEditing ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Edit Bird Record
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Update identifiers, lineage, status, or location details.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="text-xs text-muted hover:text-foreground"
            >
              Cancel editing
            </button>
          </div>

          <BirdForm
            initialData={bird}
            speciesList={speciesList}
            locationsList={locationsList}
            candidateParents={candidateParents}
            isEdit={true}
          />
        </div>
      ) : (
        /* View Details Mode */
        <div className="space-y-6">
          {/* Header Summary */}
          <div className="bg-surface border border-border rounded-md p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight text-foreground">
                  {bird.name || bird.ring_number || "Unnamed Bird"}
                </h1>
                {isArchived && (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded border border-border bg-muted-surface text-muted">
                    Archived
                  </span>
                )}
              </div>
              <p className="text-sm text-muted mt-0.5">
                {bird.species?.common_name || "Species Unassigned"}
                {bird.variety ? ` • ${bird.variety}` : ""}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium px-2.5 py-1 rounded border border-border bg-muted-surface capitalize text-foreground">
                Status: {bird.status}
              </span>
              <span className="text-xs font-medium px-2.5 py-1 rounded border border-border bg-muted-surface capitalize text-foreground">
                Sex: {bird.sex}
              </span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Identification & Physical */}
            <div className="bg-surface border border-border rounded-md p-4 sm:p-5 space-y-3">
              <div className="border-b border-border pb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted">
                <Tag className="w-3.5 h-3.5" />
                <span>Identification</span>
              </div>
              <dl className="grid grid-cols-2 gap-y-3 text-xs">
                <div>
                  <dt className="text-muted">Common Name</dt>
                  <dd className="font-medium text-foreground mt-0.5">
                    {bird.species?.common_name || "Not set"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Ring / Band</dt>
                  <dd className="font-medium text-foreground mt-0.5">
                    {bird.ring_number || "No band recorded"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Variety / Mutation</dt>
                  <dd className="font-medium text-foreground mt-0.5">
                    {bird.variety || "None specified"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Sex</dt>
                  <dd className="font-medium text-foreground mt-0.5 capitalize">
                    {bird.sex}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Life Stage & Age */}
            <div className="bg-surface border border-border rounded-md p-4 sm:p-5 space-y-3">
              <div className="border-b border-border pb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted">
                <Calendar className="w-3.5 h-3.5" />
                <span>Life Stage & Age</span>
              </div>
              <dl className="grid grid-cols-2 gap-y-3 text-xs">
                <div>
                  <dt className="text-muted">Hatch Date</dt>
                  <dd className="font-medium text-foreground mt-0.5">
                    {bird.hatch_date ? (
                      <span>
                        {bird.hatch_date}
                        {bird.hatch_date_estimated && (
                          <span className="text-muted text-[11px] ml-1">
                            (est.)
                          </span>
                        )}
                      </span>
                    ) : (
                      "Unknown"
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Calculated Age</dt>
                  <dd className="font-medium text-foreground mt-0.5">
                    {calculatedAge || "N/A"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Acquired On</dt>
                  <dd className="font-medium text-foreground mt-0.5">
                    {bird.acquired_on || "Not recorded"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Source / Origin</dt>
                  <dd className="font-medium text-foreground mt-0.5">
                    {bird.source || "Not recorded"}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Pedigree & Lineage */}
            <div className="bg-surface border border-border rounded-md p-4 sm:p-5 space-y-3">
              <div className="border-b border-border pb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted">
                <Dna className="w-3.5 h-3.5" />
                <span>Lineage & Parents</span>
              </div>
              <dl className="grid grid-cols-2 gap-y-3 text-xs">
                <div>
                  <dt className="text-muted">Sire (Father)</dt>
                  <dd className="font-medium text-foreground mt-0.5">
                    {bird.sire ? (
                      <Link
                        href={`/birds/${bird.sire.id}`}
                        className="text-accent hover:underline inline-flex items-center gap-1"
                      >
                        {bird.sire.ring_number
                          ? `[${bird.sire.ring_number}] `
                          : ""}
                        {bird.sire.name || "Unnamed"}
                      </Link>
                    ) : (
                      <span className="text-muted">Unknown / Not recorded</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Dam (Mother)</dt>
                  <dd className="font-medium text-foreground mt-0.5">
                    {bird.dam ? (
                      <Link
                        href={`/birds/${bird.dam.id}`}
                        className="text-accent hover:underline inline-flex items-center gap-1"
                      >
                        {bird.dam.ring_number
                          ? `[${bird.dam.ring_number}] `
                          : ""}
                        {bird.dam.name || "Unnamed"}
                      </Link>
                    ) : (
                      <span className="text-muted">Unknown / Not recorded</span>
                    )}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-muted">Recorded Offspring</dt>
                  <dd className="font-medium text-foreground mt-0.5">
                    {offspringCount} descendant{offspringCount === 1 ? "" : "s"}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Location & Tracking */}
            <div className="bg-surface border border-border rounded-md p-4 sm:p-5 space-y-3">
              <div className="border-b border-border pb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted">
                <MapPin className="w-3.5 h-3.5" />
                <span>Facility & Status</span>
              </div>
              <dl className="grid grid-cols-2 gap-y-3 text-xs">
                <div>
                  <dt className="text-muted">Current Location</dt>
                  <dd className="font-medium text-foreground mt-0.5">
                    {bird.location?.name || "Unassigned"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Status</dt>
                  <dd className="font-medium text-foreground mt-0.5 capitalize">
                    {bird.status}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Status Changed On</dt>
                  <dd className="font-medium text-foreground mt-0.5">
                    {bird.status_changed_on || "Initial registration"}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-surface border border-border rounded-md p-4 sm:p-5 space-y-2">
            <div className="text-xs font-medium uppercase tracking-wider text-muted">
              Notes & Observations
            </div>
            <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
              {bird.notes || "No notes recorded for this bird."}
            </p>
          </div>

          {/* Metadata Footer */}
          <div className="text-[11px] text-muted flex flex-wrap gap-4 pt-2">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>
                Registered: {bird.created_at ? bird.created_at.slice(0, 10) : "N/A"}
              </span>
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>
                Last updated: {bird.updated_at ? bird.updated_at.slice(0, 10) : "N/A"}
              </span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
