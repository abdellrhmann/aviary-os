"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, X, Check, AlertCircle } from "lucide-react";
import type { Species } from "@/lib/validation/species";
import {
  createSpeciesAction,
  updateSpeciesAction,
  deleteSpeciesAction,
} from "./actions";

interface SpeciesManagerProps {
  initialSpecies: Species[];
}

export function SpeciesManager({ initialSpecies }: SpeciesManagerProps) {
  // Add form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addCommonName, setAddCommonName] = useState("");
  const [addScientificName, setAddScientificName] = useState("");
  const [addIncubationDays, setAddIncubationDays] = useState("");
  const [addNotes, setAddNotes] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [addFieldErrors, setAddFieldErrors] = useState<
    Record<string, string[] | undefined>
  >({});
  const [isPendingAdd, startAddTransition] = useTransition();

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCommonName, setEditCommonName] = useState("");
  const [editScientificName, setEditScientificName] = useState("");
  const [editIncubationDays, setEditIncubationDays] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [editFieldErrors, setEditFieldErrors] = useState<
    Record<string, string[] | undefined>
  >({});
  const [isPendingEdit, startEditTransition] = useTransition();

  // Delete confirmation state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isPendingDelete, startDeleteTransition] = useTransition();

  function resetAddForm() {
    setAddCommonName("");
    setAddScientificName("");
    setAddIncubationDays("");
    setAddNotes("");
    setAddError(null);
    setAddFieldErrors({});
    setShowAddForm(false);
  }

  function handleStartEdit(item: Species) {
    setEditingId(item.id);
    setEditCommonName(item.common_name);
    setEditScientificName(item.scientific_name || "");
    setEditIncubationDays(
      item.incubation_days !== null ? String(item.incubation_days) : ""
    );
    setEditNotes(item.notes || "");
    setEditError(null);
    setEditFieldErrors({});
    setDeletingId(null);
    setDeleteError(null);
  }

  function handleCancelEdit() {
    setEditingId(null);
    setEditError(null);
    setEditFieldErrors({});
  }

  function handleStartDelete(id: string) {
    setDeletingId(id);
    setDeleteError(null);
    setEditingId(null);
  }

  function handleCancelDelete() {
    setDeletingId(null);
    setDeleteError(null);
  }

  function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);
    setAddFieldErrors({});

    startAddTransition(async () => {
      const result = await createSpeciesAction({
        common_name: addCommonName,
        scientific_name: addScientificName,
        incubation_days: addIncubationDays,
        notes: addNotes,
      });

      if (!result.success) {
        setAddError(result.error || "Failed to create species.");
        if (result.fieldErrors) {
          setAddFieldErrors(result.fieldErrors);
        }
        return;
      }

      resetAddForm();
    });
  }

  function handleEditSubmit(e: React.FormEvent, id: string) {
    e.preventDefault();
    setEditError(null);
    setEditFieldErrors({});

    startEditTransition(async () => {
      const result = await updateSpeciesAction({
        id,
        common_name: editCommonName,
        scientific_name: editScientificName,
        incubation_days: editIncubationDays,
        notes: editNotes,
      });

      if (!result.success) {
        setEditError(result.error || "Failed to update species.");
        if (result.fieldErrors) {
          setEditFieldErrors(result.fieldErrors);
        }
        return;
      }

      setEditingId(null);
    });
  }

  function handleConfirmDelete(id: string) {
    setDeleteError(null);

    startDeleteTransition(async () => {
      const result = await deleteSpeciesAction(id);

      if (!result.success) {
        setDeleteError(result.error || "Failed to delete species.");
        return;
      }

      setDeletingId(null);
    });
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Species
          </h1>
          <p className="text-sm text-muted mt-1">
            Manage avian species records, incubation parameters, and breeding
            characteristics.
          </p>
        </div>
        <div>
          <button
            type="button"
            onClick={() => {
              setShowAddForm(!showAddForm);
              setAddError(null);
              setAddFieldErrors({});
            }}
            className="inline-flex items-center gap-1.5 text-xs font-medium bg-accent text-accent-foreground hover:bg-accent-hover px-3 py-2 rounded-md transition-colors"
          >
            {showAddForm ? (
              <>
                <X className="w-4 h-4" />
                <span>Close form</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Add species</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Add Species Form */}
      {showAddForm && (
        <div className="bg-surface border border-border rounded-md p-4 sm:p-5">
          <div className="border-b border-border pb-3 mb-4">
            <h2 className="text-sm font-semibold text-foreground">
              New Species Record
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Enter species details. Common name is required.
            </p>
          </div>

          {addError && (
            <div className="mb-4 p-3 rounded-md border border-danger/30 bg-danger-subtle text-danger text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{addError}</span>
            </div>
          )}

          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="add-common-name"
                  className="block text-xs font-medium text-foreground mb-1"
                >
                  Common name <span className="text-danger">*</span>
                </label>
                <input
                  id="add-common-name"
                  type="text"
                  required
                  maxLength={100}
                  value={addCommonName}
                  onChange={(e) => setAddCommonName(e.target.value)}
                  placeholder="e.g. Gouldian Finch"
                  className="w-full text-sm px-3 py-2 bg-surface border border-border rounded-md text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                />
                {addFieldErrors.common_name && (
                  <p className="text-xs text-danger mt-1">
                    {addFieldErrors.common_name[0]}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="add-scientific-name"
                  className="block text-xs font-medium text-foreground mb-1"
                >
                  Scientific name
                </label>
                <input
                  id="add-scientific-name"
                  type="text"
                  maxLength={100}
                  value={addScientificName}
                  onChange={(e) => setAddScientificName(e.target.value)}
                  placeholder="e.g. Chloebia gouldiae"
                  className="w-full text-sm px-3 py-2 bg-surface border border-border rounded-md text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                />
                {addFieldErrors.scientific_name && (
                  <p className="text-xs text-danger mt-1">
                    {addFieldErrors.scientific_name[0]}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="add-incubation-days"
                  className="block text-xs font-medium text-foreground mb-1"
                >
                  Incubation period (days)
                </label>
                <input
                  id="add-incubation-days"
                  type="number"
                  min="1"
                  max="120"
                  step="1"
                  value={addIncubationDays}
                  onChange={(e) => setAddIncubationDays(e.target.value)}
                  placeholder="1 - 120"
                  className="w-full text-sm px-3 py-2 bg-surface border border-border rounded-md text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                />
                {addFieldErrors.incubation_days && (
                  <p className="text-xs text-danger mt-1">
                    {addFieldErrors.incubation_days[0]}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="add-notes"
                  className="block text-xs font-medium text-foreground mb-1"
                >
                  Notes
                </label>
                <textarea
                  id="add-notes"
                  rows={2}
                  maxLength={1000}
                  value={addNotes}
                  onChange={(e) => setAddNotes(e.target.value)}
                  placeholder="Optional care or breeding notes..."
                  className="w-full text-sm px-3 py-2 bg-surface border border-border rounded-md text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent resize-y"
                />
                {addFieldErrors.notes && (
                  <p className="text-xs text-danger mt-1">
                    {addFieldErrors.notes[0]}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={resetAddForm}
                disabled={isPendingAdd}
                className="inline-flex items-center justify-center text-xs font-medium bg-surface text-foreground hover:bg-muted-surface border border-border px-3 py-2 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPendingAdd}
                className="inline-flex items-center justify-center text-xs font-medium bg-accent text-accent-foreground hover:bg-accent-hover px-4 py-2 rounded-md transition-colors disabled:opacity-50"
              >
                {isPendingAdd ? "Saving..." : "Save species"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Alert at top if deleteError */}
      {deleteError && (
        <div className="p-3 rounded-md border border-danger/30 bg-danger-subtle text-danger text-xs flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{deleteError}</span>
          </div>
          <button
            type="button"
            onClick={() => setDeleteError(null)}
            className="text-danger hover:underline font-medium text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Species Records List */}
      <div className="bg-surface border border-border rounded-md overflow-hidden">
        {initialSpecies.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted">
            No species records registered yet. Use the button above to add a
            species.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {/* Desktop Table Header */}
            <div className="hidden md:grid md:grid-cols-12 gap-4 px-4 py-3 bg-muted-surface text-xs font-medium text-muted uppercase tracking-wider">
              <div className="col-span-3">Common Name</div>
              <div className="col-span-3">Scientific Name</div>
              <div className="col-span-2">Incubation</div>
              <div className="col-span-2">Notes</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            {initialSpecies.map((item) => {
              const isEditing = editingId === item.id;
              const isDeleting = deletingId === item.id;

              if (isEditing) {
                return (
                  <form
                    key={item.id}
                    onSubmit={(e) => handleEditSubmit(e, item.id)}
                    className="p-4 bg-muted-surface/40 space-y-3"
                  >
                    {editError && (
                      <div className="p-2.5 rounded-md border border-danger/30 bg-danger-subtle text-danger text-xs flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{editError}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label
                          htmlFor={`edit-common-${item.id}`}
                          className="block text-[11px] font-medium text-muted mb-1"
                        >
                          Common Name *
                        </label>
                        <input
                          id={`edit-common-${item.id}`}
                          type="text"
                          required
                          maxLength={100}
                          value={editCommonName}
                          onChange={(e) => setEditCommonName(e.target.value)}
                          className="w-full text-xs px-2.5 py-1.5 bg-surface border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                        {editFieldErrors.common_name && (
                          <p className="text-[11px] text-danger mt-0.5">
                            {editFieldErrors.common_name[0]}
                          </p>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor={`edit-sci-${item.id}`}
                          className="block text-[11px] font-medium text-muted mb-1"
                        >
                          Scientific Name
                        </label>
                        <input
                          id={`edit-sci-${item.id}`}
                          type="text"
                          maxLength={100}
                          value={editScientificName}
                          onChange={(e) =>
                            setEditScientificName(e.target.value)
                          }
                          className="w-full text-xs px-2.5 py-1.5 bg-surface border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                        {editFieldErrors.scientific_name && (
                          <p className="text-[11px] text-danger mt-0.5">
                            {editFieldErrors.scientific_name[0]}
                          </p>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor={`edit-incub-${item.id}`}
                          className="block text-[11px] font-medium text-muted mb-1"
                        >
                          Incubation (days)
                        </label>
                        <input
                          id={`edit-incub-${item.id}`}
                          type="number"
                          min="1"
                          max="120"
                          step="1"
                          value={editIncubationDays}
                          onChange={(e) =>
                            setEditIncubationDays(e.target.value)
                          }
                          className="w-full text-xs px-2.5 py-1.5 bg-surface border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                        {editFieldErrors.incubation_days && (
                          <p className="text-[11px] text-danger mt-0.5">
                            {editFieldErrors.incubation_days[0]}
                          </p>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor={`edit-notes-${item.id}`}
                          className="block text-[11px] font-medium text-muted mb-1"
                        >
                          Notes
                        </label>
                        <input
                          id={`edit-notes-${item.id}`}
                          type="text"
                          maxLength={1000}
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          className="w-full text-xs px-2.5 py-1.5 bg-surface border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                        {editFieldErrors.notes && (
                          <p className="text-[11px] text-danger mt-0.5">
                            {editFieldErrors.notes[0]}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        disabled={isPendingEdit}
                        className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 bg-surface text-foreground border border-border rounded-md hover:bg-muted-surface"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Cancel</span>
                      </button>
                      <button
                        type="submit"
                        disabled={isPendingEdit}
                        className="inline-flex items-center gap-1 text-xs px-3 py-1.5 bg-accent text-accent-foreground rounded-md hover:bg-accent-hover disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{isPendingEdit ? "Saving..." : "Save"}</span>
                      </button>
                    </div>
                  </form>
                );
              }

              if (isDeleting) {
                return (
                  <div
                    key={item.id}
                    className="p-4 bg-danger-subtle/50 border-l-2 border-danger space-y-2"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold text-danger">
                          Delete species &quot;{item.common_name}&quot;?
                        </p>
                        <p className="text-[11px] text-muted mt-0.5">
                          This action will permanently delete this record. It
                          cannot be undone.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleCancelDelete}
                          disabled={isPendingDelete}
                          className="text-xs px-3 py-1.5 bg-surface text-foreground border border-border rounded-md hover:bg-muted-surface"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleConfirmDelete(item.id)}
                          disabled={isPendingDelete}
                          className="text-xs px-3 py-1.5 bg-danger text-accent-foreground rounded-md hover:opacity-90 disabled:opacity-50 font-medium"
                        >
                          {isPendingDelete ? "Deleting..." : "Confirm delete"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={item.id}
                  className="p-4 flex flex-col md:grid md:grid-cols-12 gap-2 md:gap-4 md:items-center text-sm"
                >
                  <div className="md:col-span-3">
                    <span className="font-medium text-foreground">
                      {item.common_name}
                    </span>
                  </div>

                  <div className="md:col-span-3 text-xs md:text-sm text-muted">
                    {item.scientific_name ? (
                      <span className="italic">{item.scientific_name}</span>
                    ) : (
                      <span className="text-muted/60">—</span>
                    )}
                  </div>

                  <div className="md:col-span-2 text-xs md:text-sm text-muted">
                    {item.incubation_days !== null ? (
                      <span>{item.incubation_days} days</span>
                    ) : (
                      <span className="text-muted/60">—</span>
                    )}
                  </div>

                  <div className="md:col-span-2 text-xs text-muted truncate">
                    {item.notes ? (
                      <span title={item.notes}>{item.notes}</span>
                    ) : (
                      <span className="text-muted/60">—</span>
                    )}
                  </div>

                  <div className="md:col-span-2 flex items-center justify-end gap-1 pt-2 md:pt-0 border-t md:border-t-0 border-border/50">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(item)}
                      className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground hover:bg-muted-surface px-2.5 py-1.5 rounded-md transition-colors"
                      title="Edit species"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStartDelete(item.id)}
                      className="inline-flex items-center gap-1 text-xs text-danger hover:bg-danger-subtle px-2.5 py-1.5 rounded-md transition-colors"
                      title="Delete species"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
