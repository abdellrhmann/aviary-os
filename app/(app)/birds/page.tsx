import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { escapeLikeWildcards, type Bird } from "@/lib/validation/birds";
import { BirdsListClient } from "./birds-list-client";

export const dynamic = "force-dynamic";

interface BirdsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function BirdsPage({ searchParams }: BirdsPageProps) {
  const resolvedParams = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Parse pagination and filters from searchParams
  const rawPage = Array.isArray(resolvedParams.page)
    ? resolvedParams.page[0]
    : resolvedParams.page;
  const pageNum = parseInt(rawPage || "1", 10);
  const currentPage = isNaN(pageNum) || pageNum < 1 ? 1 : pageNum;
  const pageSize = 25;

  const rawSort = Array.isArray(resolvedParams.sort)
    ? resolvedParams.sort[0]
    : resolvedParams.sort;
  const allowedSorts = ["name", "ring_number", "hatch_date", "created_at"];
  const sort = allowedSorts.includes(rawSort || "") ? rawSort! : "created_at";

  const rawOrder = Array.isArray(resolvedParams.order)
    ? resolvedParams.order[0]
    : resolvedParams.order;
  const order: "asc" | "desc" = rawOrder === "asc" ? "asc" : "desc";

  const search =
    (Array.isArray(resolvedParams.search)
      ? resolvedParams.search[0]
      : resolvedParams.search) || "";

  const species =
    (Array.isArray(resolvedParams.species)
      ? resolvedParams.species[0]
      : resolvedParams.species) || "";

  const status =
    (Array.isArray(resolvedParams.status)
      ? resolvedParams.status[0]
      : resolvedParams.status) || "";

  const location =
    (Array.isArray(resolvedParams.location)
      ? resolvedParams.location[0]
      : resolvedParams.location) || "";

  const sex =
    (Array.isArray(resolvedParams.sex)
      ? resolvedParams.sex[0]
      : resolvedParams.sex) || "";

  const archivedParam = Array.isArray(resolvedParams.archived)
    ? resolvedParams.archived[0]
    : resolvedParams.archived;
  const isArchived = archivedParam === "true";

  // Build query
  let query = supabase
    .from("birds")
    .select(
      `
      *,
      species:species(id, common_name),
      location:locations(id, name)
    `,
      { count: "exact" }
    );

  // Exclude archived birds by default
  if (!isArchived) {
    query = query.is("deleted_at", null);
  }

  // Text search on name, ring_number, variety
  if (search.trim()) {
    const escaped = escapeLikeWildcards(search.trim().slice(0, 100));
    // Quote the value so commas, parentheses and dots in user input
    // cannot change the structure of the filter expression.
    const quoted = `"%${escaped.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}%"`;
    query = query.or(
      `name.ilike.${quoted},ring_number.ilike.${quoted},variety.ilike.${quoted}`
    );
  }

  // Exact filters
  if (species) {
    query = query.eq("species_id", species);
  }
  if (status) {
    query = query.eq("status", status);
  }
  if (location) {
    query = query.eq("location_id", location);
  }
  if (sex) {
    query = query.eq("sex", sex);
  }

  // Sorting
  query = query.order(sort, { ascending: order === "asc", nullsFirst: false });

  // Pagination bounds
  const from = (currentPage - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data: birdsData, count: totalCount, error: birdsError } = await query;

  if (birdsError) {
    console.error("Failed to load bird records:", birdsError);
  }

  // Load dropdown lists for filter controls
  const { data: speciesData } = await supabase
    .from("species")
    .select("id, common_name")
    .order("common_name", { ascending: true });

  const { data: locationsData } = await supabase
    .from("locations")
    .select("id, name")
    .order("name", { ascending: true });

  const total = totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <BirdsListClient
      birds={(birdsData as unknown as Bird[]) || []}
      totalCount={total}
      currentPage={currentPage}
      pageSize={pageSize}
      totalPages={totalPages}
      speciesList={speciesData || []}
      locationsList={locationsData || []}
      filters={{
        search,
        species,
        status,
        location,
        sex,
        archived: isArchived,
        sort,
        order,
      }}
    />
  );
}
