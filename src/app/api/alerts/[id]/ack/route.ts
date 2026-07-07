import { NextResponse } from "next/server";
import { hasSupabaseAdmin, getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!hasSupabaseAdmin()) {
    return NextResponse.json({ ok: true, configured: false });
  }

  const { id } = await context.params;
  const { error } = await getSupabaseAdmin()
    .from("alerts")
    .update({
      status: "acknowledged",
      updated_at: new Date().toISOString()
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, configured: true });
}
