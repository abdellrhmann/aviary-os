import { Plus } from "lucide-react";

export default function BirdsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Birds
          </h1>
          <p className="text-sm text-muted mt-1">
            Manage your individual birds, species records, and identifiers.
          </p>
        </div>
        <div>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-xs font-medium bg-accent text-accent-foreground hover:bg-accent-hover px-3 py-2 rounded-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add bird</span>
          </button>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted-surface border-b border-border text-xs text-muted font-medium uppercase tracking-wider">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Band ID
                </th>
                <th scope="col" className="px-4 py-3">
                  Species
                </th>
                <th scope="col" className="px-4 py-3">
                  Sex
                </th>
                <th scope="col" className="px-4 py-3">
                  Hatch Date
                </th>
                <th scope="col" className="px-4 py-3">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground">
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-12 text-center text-xs text-muted"
                >
                  No bird records registered yet. Use the button above to add a
                  record.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
