import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { v4 as uuid } from "uuid";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ projectId: string; assetId: string }> }) {
  const { projectId, assetId } = await params;

  const { data: asset } = await supabase
    .from("assets")
    .select("id")
    .eq("id", assetId)
    .eq("project_id", projectId)
    .single();
  if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });

  const { data } = await supabase
    .from("asset_variants")
    .select("*")
    .eq("asset_id", assetId)
    .order("variant_index");
  return NextResponse.json(data || []);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ projectId: string; assetId: string }> }) {
  const { projectId, assetId } = await params;
  const body = await req.json();
  const { variant_id } = body;

  if (!variant_id) return NextResponse.json({ error: "variant_id is required" }, { status: 400 });

  const { data: asset } = await supabase
    .from("assets")
    .select("*")
    .eq("id", assetId)
    .eq("project_id", projectId)
    .single();
  if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  if (asset.locked) return NextResponse.json({ error: "Cannot modify a locked asset" }, { status: 403 });

  const { data: variant } = await supabase
    .from("asset_variants")
    .select("*")
    .eq("id", variant_id)
    .eq("asset_id", assetId)
    .single();
  if (!variant) return NextResponse.json({ error: "Variant not found" }, { status: 404 });

  const newVersion = asset.version + 1;
  await supabase
    .from("assets")
    .update({
      thumbnail_url: variant.thumbnail_url,
      seed: variant.seed,
      version: newVersion,
      updated_at: new Date().toISOString(),
    })
    .eq("id", assetId);

  // Mark this variant as selected
  await supabase.from("asset_variants").update({ selected: false }).eq("asset_id", assetId);
  await supabase.from("asset_variants").update({ selected: true }).eq("id", variant_id);

  // Record version
  await supabase.from("asset_versions").insert({
    id: `AV_${uuid().slice(0, 8).toUpperCase()}`,
    asset_id: assetId,
    version: newVersion,
    visual_prompt: asset.visual_prompt,
    negative_prompt: asset.negative_prompt,
    seed: variant.seed,
    thumbnail_url: variant.thumbnail_url,
    metadata: asset.metadata,
  });

  const { data: updated } = await supabase
    .from("assets")
    .select("*")
    .eq("id", assetId)
    .single();
  return NextResponse.json(updated);
}
