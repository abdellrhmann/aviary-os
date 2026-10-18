"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, X, Check, AlertCircle } from "lucide-react";
import type { Location } from "@/lib/validation/locations";
import {
  createLocationAction,
  updateLocationAction,
  deleteLocationAction,
} from "./actions";

interface LocationsManagerProps {
  initialLocations: Location[];
}

export function LocationsManager({ initialLocations }: LocationsManagerProps) {
  // Add form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addName, setAddName] = useState("");
  const [addNotes, setAddNotes] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [addFieldErrors, setAddFieldErrors] = useState<
    Record<string, string[] | undefined>
  >({});
  const [isPendingAdd, startAddTransition] = useTransition();

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
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
    setAddName("");
    setAddNotes("");
    setAddError(null);
    setAddFieldErrors({});
    setShowAddForm(false);
  }

  function handleStartEdit(item: Location) {
    setEditingId(item.id);
    setEditName(item.name);
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
      const result = await createLocationAction({
        name: addName,
        notes: addNotes,
      });

      if (!result.success) {
        setAddError(result.error || "Failed to create location.");
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
      const result = await updateLocationAction({
        id,
        name: editName,
        notes: editNotes,
      });

      if (!result.success) {
        setEditError(result.error || "Failed to update location.");
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
      const result = await deleteLocationAction(id);

      if (!result.success) {
        setDeleteError(result.error || "Failed to delete location.");
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
            Locations
          </h1>
          <p className="text-sm text-muted mt-1">
            Manage aviaries, breeding cages, flight enclosures, and quarantine
            facilities.
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
                <span>Add location</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Add Location Form */}
      {showAddForm && (
        <div className="bg-surface border border-border rounded-md p-4 sm:p-5">
          <div className="border-b border-border pb-3 mb-4">
            <h2 className="text-sm font-semibold text-foreground">
              New Location Record
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Enter location details. Name is required.
            </p>
          </div>

          {addError && (
            <div className="mb-4 p-3 rounded-md border border-danger/30 bg-danger-subtle text-danger text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{addError}</span>
            </div>
          )}

          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="add-location-name"
                className="block text-xs font-medium text-foreground mb-1"
              >
                Location name <span className="text-danger">*</span>
              </label>
              <input
                id="add-location-name"
                type="text"
                required
                maxLength={100}
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="e.g. Aviary A - East Flight"
                className="w-full text-sm px-3 py-2 bg-surface border border-border rounded-md text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
              />
              {addFieldErrors.name && (
                <p className="text-xs text-danger mt-1">
                  {addFieldErrors.name[0]}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="add-location-notes"
                className="block text-xs font-medium text-foreground mb-1"
              >
                Notes
              </label>
              <textarea
                id="add-location-notes"
                rows={2}
                maxLength={1000}
                value={addNotes}
                onChange={(e) => setAddNotes(e.target.value)}
                placeholder="Optional facility dimensions, lighting, or usage notes..."
                className="w-full text-sm px-3 py-2 bg-surface border border-border rounded-md text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent resize-y"
              />
              {addFieldErrors.notes && (
                <p className="text-xs text-danger mt-1">
                  {addFieldErrors.notes[0]}
                </p>
              )}
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
                {isPendingAdd ? "Saving..." : "Save location"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Alert if deleteError */}
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

      {/* Locations Records List */}
      <div className="bg-surface border border-border rounded-md overflow-hidden">
        {initialLocations.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted">
            No location records registered yet. Use the button above to add a
            location.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {/* Desktop Table Header */}
            <div className="hidden md:grid md:grid-cols-12 gap-4 px-4 py-3 bg-muted-surface text-xs font-medium text-muted uppercase tracking-wider">
              <div className="col-span-5">Name</div>
              <div className="col-span-5">Notes</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            {initialLocations.map((item) => {
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor={`edit-name-${item.id}`}
                          className="block text-[11px] font-medium text-muted mb-1"
                        >
                          Location Name *
                        </label>
                        <input
                          id={`edit-name-${item.id}`}
                          type="text"
                          required
                          maxLength={100}
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full text-xs px-2.5 py-1.5 bg-surface border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                        {editFieldErrors.name && (
                          <p className="text-[11px] text-danger mt-0.5">
                            {editFieldErrors.name[0]}
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
                          Delete location &quot;{item.name}&quot;?
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
                  <div className="md:col-span-5">
                    <span className="font-medium text-foreground">
                      {item.name}
                    </span>
                  </div>

                  <div className="md:col-span-5 text-xs text-muted truncate">
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
                      title="Edit location"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStartDelete(item.id)}
                      className="inline-flex items-center gap-1 text-xs text-danger hover:bg-danger-subtle px-2.5 py-1.5 rounded-md transition-colors"
                      title="Delete location"
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
