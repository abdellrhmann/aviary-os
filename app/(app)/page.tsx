import Link from "next/link";
import { Bird, ArrowRight } from "lucide-react";

export default function DashboardPage() {
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
            0
          </div>
          <div className="text-xs text-muted mt-1">
            Registered in system
          </div>
        </div>

        <div className="bg-surface border border-border rounded-md p-4">
          <div className="text-xs font-medium text-muted uppercase tracking-wider">
            Species
          </div>
          <div className="text-2xl font-semibold text-foreground mt-2">
            0
          </div>
          <div className="text-xs text-muted mt-1">
            Distinct varieties
          </div>
        </div>

        <div className="bg-surface border border-border rounded-md p-4">
          <div className="text-xs font-medium text-muted uppercase tracking-wider">
            Enclosures
          </div>
          <div className="text-2xl font-semibold text-foreground mt-2">
            0
          </div>
          <div className="text-xs text-muted mt-1">
            Active locations
          </div>
        </div>
      </div>

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
          <Link
            href="/birds"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline"
          >
            <span>View all birds</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="py-8 text-center">
          <Bird className="w-8 h-8 text-muted mx-auto mb-2 opacity-60" />
          <p className="text-sm text-foreground font-medium">
            No bird records found
          </p>
          <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
            Get started by adding your first bird profile to track lineage, health, and band identifiers.
          </p>
          <div className="mt-4">
            <Link
              href="/birds"
              className="inline-flex items-center text-xs font-medium bg-accent text-accent-foreground hover:bg-accent-hover px-3 py-1.5 rounded-md transition-colors"
            >
              Go to Birds
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
