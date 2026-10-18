import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Species } from "@/lib/validation/species";
import { SpeciesManager } from "./species-manager";

export const dynamic = "force-dynamic";

export default async function SpeciesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("species")
    .select("*")
    .order("common_name", { ascending: true });

  if (error) {
    console.error("Failed to load species records:", error);
  }

  const speciesList: Species[] = (data || []).sort((a, b) =>
    a.common_name.localeCompare(b.common_name, undefined, { sensitivity: "base" })
  );

  return <SpeciesManager initialSpecies={speciesList} />;
}
