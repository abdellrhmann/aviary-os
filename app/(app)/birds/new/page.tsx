import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BirdForm } from "../bird-form";

export const dynamic = "force-dynamic";

export default async function NewBirdPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Load species for dropdown
  const { data: speciesData } = await supabase
    .from("species")
    .select("id, common_name")
    .order("common_name", { ascending: true });

  // Load locations for dropdown
  const { data: locationsData } = await supabase
    .from("locations")
    .select("id, name")
    .order("name", { ascending: true });

  // Load candidate parents (non-archived birds)
  const { data: candidateBirds } = await supabase
    .from("birds")
    .select("id, name, ring_number, sex, hatch_date")
    .is("deleted_at", null)
    .order("ring_number", { ascending: true });

  const speciesList = speciesData || [];
  const locationsList = locationsData || [];
  const candidateParents = candidateBirds || [];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="border-b border-border pb-4">
        <div className="flex items-center gap-2 text-xs text-muted mb-2">
          <Link href="/birds" className="hover:text-foreground flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Birds</span>
          </Link>
          <span>/</span>
          <span className="text-foreground">New Record</span>
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Register New Bird
        </h1>
        <p className="text-sm text-muted mt-1">
          Add an individual bird to your registry with lineage, band, and species records.
        </p>
      </div>

      <BirdForm
        speciesList={speciesList}
        locationsList={locationsList}
        candidateParents={candidateParents}
        isEdit={false}
      />
    </div>
  );
}
