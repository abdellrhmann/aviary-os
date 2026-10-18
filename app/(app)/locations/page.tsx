import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Location } from "@/lib/validation/locations";
import { LocationsManager } from "./locations-manager";

export const dynamic = "force-dynamic";

export default async function LocationsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("locations")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Failed to load locations records:", error);
  }

  const locationsList: Location[] = (data || []).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );

  return <LocationsManager initialLocations={locationsList} />;
}
