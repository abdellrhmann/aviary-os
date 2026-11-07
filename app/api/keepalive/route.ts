import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// Daily ping so the free Supabase project is never paused for inactivity.
// Protected by CRON_SECRET: Vercel sends it as a Bearer token.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  // Anonymous client: RLS returns no rows, but the request still reaches the database.
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await supabase.from("species").select("id").limit(1);

  return NextResponse.json({ ok: !error, checkedAt: new Date().toISOString() });
}
