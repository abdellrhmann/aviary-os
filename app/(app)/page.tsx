import Link from "next/link";
import { redirect } from "next/navigation";
import { Bird, ArrowRight, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 1. Total non-archived birds
  const { count: totalBirds } = await supabase
    .from("birds")
    .select("*", { count: "exact", head: true })
    .is("deleted_at", null);

  // 2. Species in use: distinct species_id among non-archived birds
  const { data: birdsSpecies } = await supabase
    .from("birds")
    .select("species_id")
    .is("deleted_at", null);

  const speciesInUseCount = new Set(
    (birdsSpecies || []).map((b) => b.species_id)
  ).size;

  // 3. Number of locations
  const { count: totalLocations } = await supabase
    .from("locations")
    .select("*", { count: "exact", head: true });

  // 4. Birds by status
  const { data: statusRows } = await supabase
    .from("birds")
    .select("status")
    .is("deleted_at", null);

  const statusCounts = {
    active: 0,
    sold: 0,
    deceased: 0,
    transferred: 0,
  };

  (statusRows || []).forEach((row) => {
    if (row.status in statusCounts) {
      statusCounts[row.status as keyof typeof statusCounts]++;
    }
  });

  const birdCount = totalBirds ?? 0;
  const locationCount = totalLocations ?? 0;

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-4">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Dashboard
        </h1>
        <p className="text-sm text-muted mt-1">
          Summary and status of your aviary records.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface border border-border rounded-md p-4">
          <div className="text-xs font-medium text-muted uppercase tracking-wider">
            Total Birds
          </div>
          <div className="text-2xl font-semibold text-foreground mt-2">
            {birdCount}
          </div>
          <div className="text-xs text-muted mt-1">
            Registered active birds
          </div>
        </div>

        <div className="bg-surface border border-border rounded-md p-4">
          <div className="text-xs font-medium text-muted uppercase tracking-wider">
            Species in Use
          </div>
          <div className="text-2xl font-semibold text-foreground mt-2">
            {speciesInUseCount}
          </div>
          <div className="text-xs text-muted mt-1">
            Represented in flock
          </div>
        </div>

        <div className="bg-surface border border-border rounded-md p-4">
          <div className="text-xs font-medium text-muted uppercase tracking-wider">
            Locations
          </div>
          <div className="text-2xl font-semibold text-foreground mt-2">
            {locationCount}
          </div>
          <div className="text-xs text-muted mt-1">
            Active enclosures
          </div>
        </div>
      </div>

      {/* Birds by Status Breakdown */}
      <div className="bg-surface border border-border rounded-md p-4 sm:p-5">
        <div className="border-b border-border pb-3 mb-4">
          <h2 className="text-xs font-medium text-muted uppercase tracking-wider">
            Flock Status Breakdown
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-md bg-muted-surface border border-border">
            <span className="text-xs text-muted block">Active</span>
            <span className="text-lg font-semibold text-foreground mt-1 block">
              {statusCounts.active}
            </span>
          </div>
          <div className="p-3 rounded-md bg-muted-surface border border-border">
            <span className="text-xs text-muted block">Sold</span>
            <span className="text-lg font-semibold text-foreground mt-1 block">
              {statusCounts.sold}
            </span>
          </div>
          <div className="p-3 rounded-md bg-muted-surface border border-border">
            <span className="text-xs text-muted block">Deceased</span>
            <span className="text-lg font-semibold text-foreground mt-1 block">
              {statusCounts.deceased}
            </span>
          </div>
          <div className="p-3 rounded-md bg-muted-surface border border-border">
            <span className="text-xs text-muted block">Transferred</span>
            <span className="text-lg font-semibold text-foreground mt-1 block">
              {statusCounts.transferred}
            </span>
          </div>
        </div>
      </div>

      {/* Bird Registry Quick Link / Empty State */}
      <div className="bg-surface border border-border rounded-md p-6">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Bird Registry
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Current inventory and records.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/birds/new"
              className="inline-flex items-center gap-1.5 text-xs font-medium bg-accent text-accent-foreground hover:bg-accent-hover px-2.5 py-1.5 rounded-md transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add bird</span>
            </Link>
            <Link
              href="/birds"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline px-2 py-1.5"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {birdCount === 0 ? (
          <div className="py-8 text-center">
            <Bird className="w-8 h-8 text-muted mx-auto mb-2 opacity-60" />
            <p className="text-sm text-foreground font-medium">
              No bird records found
            </p>
            <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
              Get started by adding your first bird profile to track lineage, band identifiers, and enclosures.
            </p>
            <div className="mt-4">
              <Link
                href="/birds/new"
                className="inline-flex items-center text-xs font-medium bg-accent text-accent-foreground hover:bg-accent-hover px-3 py-1.5 rounded-md transition-colors"
              >
                Add your first bird
              </Link>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center sm:text-left">
            <p className="text-sm text-foreground">
              You have {birdCount} registered bird{birdCount === 1 ? "" : "s"} across {speciesInUseCount} species.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 justify-center sm:justify-start">
              <Link
                href="/birds"
                className="inline-flex items-center gap-1 text-xs font-medium bg-muted-surface hover:bg-border text-foreground px-3 py-1.5 rounded-md border border-border transition-colors"
              >
                Browse Registry
              </Link>
              <Link
                href="/birds/new"
                className="inline-flex items-center gap-1 text-xs font-medium bg-accent text-accent-foreground hover:bg-accent-hover px-3 py-1.5 rounded-md transition-colors"
              >
                Register New Bird
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
