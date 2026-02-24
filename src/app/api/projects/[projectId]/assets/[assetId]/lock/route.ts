import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ projectId: string; assetId: string }> }) {
  const { projectId, assetId } = await params;

  const { data: existing } = await supabase
    .from("assets")
    .select("*")
    .eq("id", assetId)
    .eq("project_id", projectId)
    .single();
  if (!existing) return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  if (existing.locked) return NextResponse.json({ error: "Asset is already locked" }, { status: 400 });

  const { data, error } = await supabase
    .from("assets")
    .update({ locked: true, updated_at: new Date().toISOString() })
    .eq("id", assetId)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
