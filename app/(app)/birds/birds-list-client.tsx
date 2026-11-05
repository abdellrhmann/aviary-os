"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Search,
  Plus,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
} from "lucide-react";
import type { Bird } from "@/lib/validation/birds";
import { getBirdAgeParts } from "@/lib/validation/birds";
import { BirdThumb } from "./bird-thumb";
interface FilterState {
  search: string;
  species: string;
  status: string;
  location: string;
  sex: string;
  archived: boolean;
  sort: string;
  order: "asc" | "desc";
}

interface BirdsListClientProps {
  birds: Bird[];
  photoUrls?: Record<string, string>;
  totalCount: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  speciesList: Array<{ id: string; common_name: string }>;
  locationsList: Array<{ id: string; name: string }>;
  filters: FilterState;
}

export function BirdsListClient({
  photoUrls = {},
  birds,
  totalCount,
  currentPage,
  pageSize,
  totalPages,
  speciesList,
  locationsList,
  filters,
}: BirdsListClientProps) {
  const t = useTranslations("Birds");
  function formatAge(hatchDate: string | null | undefined): string | null {
    const parts = getBirdAgeParts(hatchDate);
    if (!parts) return null;

    const { years, months, days } = parts;
    const unit = (key: "years" | "months" | "days", count: number) =>
      t(`ageUnits.${key}`, { count });

    if (years > 0) {
      return months > 0
        ? t("ageAnd", { first: unit("years", years), second: unit("months", months) })
        : unit("years", years);
    }
    if (months > 0) {
      return days > 0
        ? t("ageAnd", { first: unit("months", months), second: unit("days", days) })
        : unit("months", months);
    }
    return unit("days", days);
  }
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  // Local search input state
  const [searchInput, setSearchInput] = useState(filters.search);
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

  function updateQuery(updates: Partial<FilterState> & { page?: number }) {
    const nextFilters = { ...filters, ...updates };
    const params = new URLSearchParams();

    if (nextFilters.search) params.set("search", nextFilters.search);
    if (nextFilters.species) params.set("species", nextFilters.species);
    if (nextFilters.status) params.set("status", nextFilters.status);
    if (nextFilters.location) params.set("location", nextFilters.location);
    if (nextFilters.sex) params.set("sex", nextFilters.sex);
    if (nextFilters.archived) params.set("archived", "true");

    if (nextFilters.sort && nextFilters.sort !== "created_at") {
      params.set("sort", nextFilters.sort);
    }
    if (nextFilters.order && nextFilters.order !== "desc") {
      params.set("order", nextFilters.order);
    }

    const targetPage = updates.page !== undefined ? updates.page : 1;
    if (targetPage > 1) {
      params.set("page", String(targetPage));
    }

    startTransition(() => {
      const queryString = params.toString();
      router.push(queryString ? `${pathname}?${queryString}` : pathname);
    });
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateQuery({ search: searchInput.trim(), page: 1 });
  }

  function handleSortToggle(column: string) {
    if (filters.sort === column) {
      const newOrder = filters.order === "asc" ? "desc" : "asc";
      updateQuery({ order: newOrder, page: 1 });
    } else {
      updateQuery({ sort: column, order: "asc", page: 1 });
    }
  }

  function handleClearFilters() {
    setSearchInput("");
    startTransition(() => {
      router.push(pathname);
    });
  }

  const hasActiveFilters = Boolean(
    filters.search ||
    filters.species ||
    filters.status ||
    filters.location ||
    filters.sex ||
    filters.archived
  );

  const fromItem = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const toItem = Math.min(currentPage * pageSize, totalCount);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {t("title")}
          </h1>
          <p className="text-sm text-muted mt-1">
            {t("description")}
          </p>
        </div>
        <div>
          <Link
            href="/birds/new"
            className="inline-flex items-center gap-1.5 text-xs font-medium bg-accent text-accent-foreground hover:bg-accent-hover px-3 py-2 rounded-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{t("addBird")}</span>
          </Link>
        </div>
      </div>

      {/* Search and Filters Toolbar */}
      <div className="bg-surface border border-border rounded-md p-4 space-y-3">
        {/* Search Row */}
        <div className="flex flex-col sm:flex-row gap-2">
          <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute start-3 top-2.5 text-muted pointer-events-none" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t("searchPlaceholder")}
                aria-label={t("searchAria")}
                className="w-full ps-9 pe-3 py-1.5 text-xs bg-surface border border-border rounded-md text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 text-xs font-medium bg-muted-surface hover:bg-border border border-border rounded-md text-foreground transition-colors shrink-0"
            >
              {t("search")}
            </button>
          </form>

          <button
            type="button"
            onClick={() => setShowFiltersMobile(!showFiltersMobile)}
            className="sm:hidden inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-md bg-surface text-foreground"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{showFiltersMobile ? t("hideFilters") : t("filters")}</span>
          </button>
        </div>

        {/* Filter Dropdowns (always visible on sm+, expandable on mobile) */}
        <div
          className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2 pt-2 border-t border-border ${showFiltersMobile ? "block" : "hidden sm:grid"
            }`}
        >
          {/* Species Filter */}
          <div>
            <label htmlFor="filter-species" className="block text-[11px] text-muted mb-1">
              {t("species")}
            </label>
            <select
              id="filter-species"
              value={filters.species}
              aria-label={t("filterSpeciesAria")}
              onChange={(e) =>
                updateQuery({ species: e.target.value, page: 1 })
              }
              className="w-full text-xs px-2 py-1.5 bg-surface border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">{t("allSpecies")}</option>
              {speciesList.map((sp) => (
                <option key={sp.id} value={sp.id}>
                  {sp.common_name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label htmlFor="filter-status" className="block text-[11px] text-muted mb-1">
              {t("status.label")}
            </label>
            <select
              id="filter-status"
              value={filters.status}
              aria-label={t("filterStatusAria")}
              onChange={(e) => updateQuery({ status: e.target.value, page: 1 })}
              className="w-full text-xs px-2 py-1.5 bg-surface border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">{t("status.all")}</option>
              <option value="active">{t("status.active")}</option>
              <option value="sold">{t("status.sold")}</option>
              <option value="deceased">{t("status.deceased")}</option>
              <option value="transferred">{t("status.transferred")}</option>
            </select>
          </div>

          {/* Location Filter */}
          <div>
            <label htmlFor="filter-location" className="block text-[11px] text-muted mb-1">
              {t("location")}
            </label>
            <select
              id="filter-location"
              value={filters.location}
              aria-label={t("filterLocationAria")}
              onChange={(e) =>
                updateQuery({ location: e.target.value, page: 1 })
              }
              className="w-full text-xs px-2 py-1.5 bg-surface border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">{t("allLocations")}</option>
              {locationsList.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sex Filter */}
          <div>
            <label htmlFor="filter-sex" className="block text-[11px] text-muted mb-1">
              {t("sex.label")}
            </label>
            <select
              id="filter-sex"
              value={filters.sex}
              aria-label={t("filterSexAria")}
              onChange={(e) => updateQuery({ sex: e.target.value, page: 1 })}
              className="w-full text-xs px-2 py-1.5 bg-surface border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">{t("sex.all")}</option>
              <option value="male">{t("sex.male")}</option>
              <option value="female">{t("sex.female")}</option>
              <option value="unknown">{t("sex.unknown")}</option>
            </select>
          </div>

          {/* Include Archived Checkbox & Clear */}
          <div className="flex flex-col justify-end">
            <div className="flex items-center gap-2 py-1.5">
              <input
                id="filter-archived"
                type="checkbox"
                checked={filters.archived}
                onChange={(e) =>
                  updateQuery({ archived: e.target.checked, page: 1 })
                }
                className="w-3.5 h-3.5 rounded border-border text-accent focus:ring-accent"
              />
              <label
                htmlFor="filter-archived"
                className="text-[11px] text-foreground cursor-pointer select-none"
              >
                {t("includeArchived")}
              </label>
            </div>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 text-xs border-t border-border">
            <span className="text-muted">
              {t("filtersApplied", { count: totalCount })}
            </span>
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1 text-accent hover:underline text-xs"
            >
              <X className="w-3.5 h-3.5" />
              <span>{t("clearFilters")}</span>
            </button>
          </div>
        )}
      </div>

      {/* Desktop Table View (hidden on small screens) */}
      <div className="hidden md:block bg-surface border border-border rounded-md overflow-hidden">
        <table className="w-full text-start text-sm">
          <thead className="bg-muted-surface border-b border-border text-xs text-muted font-medium uppercase tracking-wider rtl:tracking-normal">
            <tr>
              <th scope="col" className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => handleSortToggle("ring_number")}
                  title={t("sortByRingNumber")}
                  className="inline-flex items-center gap-1 hover:text-foreground text-start"
                >
                  <span>{t("bandRing")}</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </button>
              </th>
              <th scope="col" className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => handleSortToggle("name")}
                  title={t("sortByName")}
                  className="inline-flex items-center gap-1 hover:text-foreground text-start"
                >
                  <span>{t("name")}</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </button>
              </th>
              <th scope="col" className="px-4 py-3">
                {t("speciesVariety")}
              </th>
              <th scope="col" className="px-4 py-3">
                {t("sex.label")}
              </th>
              <th scope="col" className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => handleSortToggle("hatch_date")}
                  title={t("sortByHatchDate")}
                  className="inline-flex items-center gap-1 hover:text-foreground text-start"
                >
                  <span>{t("hatchDateAge")}</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </button>
              </th>
              <th scope="col" className="px-4 py-3">
                {t("location")}
              </th>
              <th scope="col" className="px-4 py-3">
                {t("status.label")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-foreground">
            {birds.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center text-xs text-muted"
                >
                  {hasActiveFilters
                    ? t("emptyFiltered")
                    : t("emptyDefault")}
                </td>
              </tr>
            ) : (
              birds.map((bird) => {
                const age = formatAge(bird.hatch_date);
                const isArchived = Boolean(bird.deleted_at);

                return (
                  <tr
                    key={bird.id}
                    className="hover:bg-muted-surface/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs font-medium">
                      <Link
                        href={`/birds/${bird.id}`}
                        className="text-accent hover:underline font-semibold"
                      >
                        {bird.ring_number || "—"}
                      </Link>
                      {isArchived && (
                        <span className="ms-1.5 text-[10px] px-1.5 py-0.2 rounded border border-border bg-muted-surface text-muted">
                          {t("archived")}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="flex items-center gap-2.5">
                      <BirdThumb size="sm" url={bird.photo_path ? photoUrls[bird.photo_path] : null} alt={bird.name || t("unnamed")} />
                      <Link
                        href={`/birds/${bird.id}`}
                        className="hover:underline font-medium text-foreground"
                      >
                        {bird.name || t("unnamed")}
                      </Link>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div>
                        <span className="font-medium">
                          {bird.species?.common_name || "—"}
                        </span>
                        {bird.variety && (
                          <span className="text-muted block text-[11px]">
                            {bird.variety}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {t(`sex.${bird.sex}`)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {bird.hatch_date ? (
                        <span>
                          {bird.hatch_date}
                          {age ? ` (${age})` : ""}
                          {bird.hatch_date_estimated ? ` ${t("estimatedAbbr")}` : ""}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {bird.location?.name || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className="px-2 py-0.5 rounded border border-border bg-muted-surface text-[11px]">
                        {t(`status.${bird.status}`)}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Compact Card View (shown below md breakpoint, fully usable at 375px) */}
      <div className="md:hidden space-y-3">
        {birds.length === 0 ? (
          <div className="bg-surface border border-border rounded-md p-6 text-center text-xs text-muted">
            {hasActiveFilters
              ? t("emptyFiltered")
              : t("emptyDefault")}
          </div>
        ) : (
          birds.map((bird) => {
            const age = formatAge(bird.hatch_date);
            const isArchived = Boolean(bird.deleted_at);

            return (
              <Link
                key={bird.id}
                href={`/birds/${bird.id}`}
                className="block bg-surface border border-border rounded-md p-4 hover:border-accent transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <BirdThumb url={bird.photo_path ? photoUrls[bird.photo_path] : null} alt={bird.name || t("unnamed")} />
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-xs text-foreground">
                        {bird.name || t("unnamed")}
                      </span>
                      {bird.ring_number && (
                        <span className="font-mono text-[11px] text-muted">
                          [{bird.ring_number}]
                        </span>
                      )}
                      {isArchived && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded border border-border bg-muted-surface text-muted">
                          {t("archived")}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted mt-0.5">
                      {bird.species?.common_name || t("speciesUnassigned")}
                      {bird.variety ? ` • ${bird.variety}` : ""}
                    </p>
                  </div>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded border border-border bg-muted-surface shrink-0">
                    {t(`status.${bird.status}`)}
                  </span>
                </div>

                <div className="mt-3 pt-2 border-t border-border grid grid-cols-2 gap-2 text-[11px] text-muted">
                  <div>
                    <span>{t("mobileSex")} </span>
                    <span className="text-foreground">{t(`sex.${bird.sex}`)}</span>
                  </div>
                  <div>
                    <span>{t("mobileLocation")} </span>
                    <span className="text-foreground">
                      {bird.location?.name || "—"}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span>{t("mobileHatch")} </span>
                    <span className="text-foreground">
                      {bird.hatch_date
                        ? `${bird.hatch_date}${age ? ` (${age})` : ""}${bird.hatch_date_estimated ? ` ${t("estimatedAbbr")}` : ""
                        }`
                        : t("unknown")}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* Server-side Pagination Bar */}
      {totalCount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted pt-2">
          <div>
            {t("showingRange", {
              from: fromItem,
              to: toItem,
              total: totalCount,
            })}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => updateQuery({ page: currentPage - 1 })}
              disabled={currentPage <= 1 || isPending}
              aria-label={t("previous")}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-border bg-surface hover:bg-muted-surface text-foreground disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5 rtl:rotate-180" />
              <span>{t("previous")}</span>
            </button>

            <span className="px-2">
              {t("pageCurrentOfTotal", {
                current: currentPage,
                total: totalPages,
              })}
            </span>

            <button
              type="button"
              onClick={() => updateQuery({ page: currentPage + 1 })}
              disabled={currentPage >= totalPages || isPending}
              aria-label={t("next")}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-border bg-surface hover:bg-muted-surface text-foreground disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <span>{t("next")}</span>
              <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
