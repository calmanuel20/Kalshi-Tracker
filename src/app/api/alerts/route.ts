import { NextResponse } from "next/server";
import { demoAlerts } from "@/lib/demo";
import { hasSupabaseAdmin, getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const severity = searchParams.get("severity");

  if (!hasSupabaseAdmin()) {
    return NextResponse.json({ alerts: demoAlerts, configured: false });
  }

  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("alerts")
    .select("*,markets(*)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (status && status !== "all") {
    query = query.eq("status", status);
  }
  if (severity && severity !== "all") {
    query = query.eq("severity", severity);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ alerts: data ?? [], configured: true });
}
