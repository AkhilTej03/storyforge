import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ projectId: string; assetId: string }> }) {
  const { projectId, assetId } = await params;

  const { data: asset, error } = await supabase
    .from("assets")
    .select("*")
    .eq("id", assetId)
    .eq("project_id", projectId)
    .single();
  if (error || !asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });

  const [versionsRes, variantsRes, scenesRes] = await Promise.all([
    supabase.from("asset_versions").select("*").eq("asset_id", assetId).order("version", { ascending: false }),
    supabase.from("asset_variants").select("*").eq("asset_id", assetId).order("variant_index"),
    supabase
      .from("scene_assets")
      .select("scene_id")
      .eq("asset_id", assetId)
      .then(async (res) => {
        if (!res.data?.length) return { data: [] };
        const sceneIds = res.data.map((r) => r.scene_id);
        return supabase.from("scenes").select("*").in("id", sceneIds);
      }),
  ]);

  return NextResponse.json({
    ...asset,
    versions: versionsRes.data || [],
    variants: variantsRes.data || [],
    used_in_scenes: scenesRes.data || [],
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ projectId: string; assetId: string }> }) {
  const { projectId, assetId } = await params;

  const { data: existing } = await supabase
    .from("assets")
    .select("*")
    .eq("id", assetId)
    .eq("project_id", projectId)
    .single();
  if (!existing) return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  if (existing.locked) return NextResponse.json({ error: "Cannot edit a locked asset" }, { status: 403 });

  const body = await req.json();
  const allowed = ["name", "description", "visual_prompt", "negative_prompt", "metadata"];
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  const { data, error } = await supabase
    .from("assets")
    .update(updates)
    .eq("id", assetId)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ projectId: string; assetId: string }> }) {
  const { projectId, assetId } = await params;

  const { data: existing } = await supabase
    .from("assets")
    .select("*")
    .eq("id", assetId)
    .eq("project_id", projectId)
    .single();
  if (!existing) return NextResponse.json({ error: "Asset not found" }, { status: 404 });

  const { count } = await supabase
    .from("scene_assets")
    .select("*", { count: "exact", head: true })
    .eq("asset_id", assetId);
  if ((count || 0) > 0) return NextResponse.json({ error: "Cannot delete asset used in scenes" }, { status: 403 });
  if (existing.locked) return NextResponse.json({ error: "Cannot delete a locked asset" }, { status: 403 });

  await supabase.from("assets").delete().eq("id", assetId);
  return NextResponse.json({ success: true });
}
