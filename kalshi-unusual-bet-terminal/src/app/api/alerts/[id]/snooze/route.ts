import { NextResponse } from "next/server";
import { hasSupabaseAdmin, getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!hasSupabaseAdmin()) {
    return NextResponse.json({ ok: true, configured: false });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const minutes = Number.isFinite(Number(body.minutes)) ? Number(body.minutes) : 60;
  const snoozedUntil = new Date(Date.now() + minutes * 60 * 1000).toISOString();

  const { error } = await getSupabaseAdmin()
    .from("alerts")
    .update({
      status: "snoozed",
      snoozed_until: snoozedUntil,
      updated_at: new Date().toISOString()
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, snoozedUntil, configured: true });
}
