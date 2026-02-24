import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ projectId: string; sceneId: string }> }) {
  const { projectId, sceneId } = await params;

  const { data: scene } = await supabase
    .from("scenes")
    .select("*")
    .eq("id", sceneId)
    .eq("project_id", projectId)
    .single();
  if (!scene) return NextResponse.json({ error: "Scene not found" }, { status: 404 });

  const body = await req.json();
  const { assets } = body;

  if (!Array.isArray(assets)) {
    return NextResponse.json({ error: "assets array is required" }, { status: 400 });
  }

  // Validate all assets exist and belong to project
  for (const a of assets) {
    const { data: asset } = await supabase
      .from("assets")
      .select("id")
      .eq("id", a.asset_id)
      .eq("project_id", projectId)
      .single();
    if (!asset) {
      return NextResponse.json({ error: `Asset ${a.asset_id} not found in project` }, { status: 400 });
    }
  }

  // Replace all scene assets
  await supabase.from("scene_assets").delete().eq("scene_id", sceneId);
  for (const a of assets) {
    await supabase.from("scene_assets").insert({
      scene_id: sceneId,
      asset_id: a.asset_id,
      role: a.role || "primary",
      position_hint: a.position_hint || "center",
    });
  }

  // Return updated assets
  const { data: saRows } = await supabase
    .from("scene_assets")
    .select("asset_id, role, position_hint")
    .eq("scene_id", sceneId);
  let updatedAssets: unknown[] = [];
  if (saRows?.length) {
    const assetIds = saRows.map((r) => r.asset_id);
    const { data: assetRows } = await supabase.from("assets").select("*").in("id", assetIds);
    updatedAssets = (assetRows || []).map((a) => {
      const sa = saRows.find((r) => r.asset_id === a.id);
      return { ...a, role: sa?.role, position_hint: sa?.position_hint };
    });
  }

  return NextResponse.json({ assets: updatedAssets });
}
