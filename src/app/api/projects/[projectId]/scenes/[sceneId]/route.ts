import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ projectId: string; sceneId: string }> }) {
  const { projectId, sceneId } = await params;

  const { data: scene } = await supabase
    .from("scenes")
    .select("*")
    .eq("id", sceneId)
    .eq("project_id", projectId)
    .single();
  if (!scene) return NextResponse.json({ error: "Scene not found" }, { status: 404 });

  const { data: saRows } = await supabase
    .from("scene_assets")
    .select("asset_id, role, position_hint")
    .eq("scene_id", sceneId);
  let assets: unknown[] = [];
  if (saRows?.length) {
    const assetIds = saRows.map((r) => r.asset_id);
    const { data: assetRows } = await supabase.from("assets").select("*").in("id", assetIds);
    assets = (assetRows || []).map((a) => {
      const sa = saRows.find((r) => r.asset_id === a.id);
      return { ...a, role: sa?.role, position_hint: sa?.position_hint };
    });
  }

  const { data: versions } = await supabase
    .from("scene_versions")
    .select("*")
    .eq("scene_id", sceneId)
    .order("version", { ascending: false });

  return NextResponse.json({
    ...scene,
    assets,
    versions: versions || [],
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ projectId: string; sceneId: string }> }) {
  const { projectId, sceneId } = await params;

  const { data: existing } = await supabase
    .from("scenes")
    .select("*")
    .eq("id", sceneId)
    .eq("project_id", projectId)
    .single();
  if (!existing) return NextResponse.json({ error: "Scene not found" }, { status: 404 });

  const body = await req.json();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of ["title", "description", "mood", "camera_angle", "lighting", "scene_number"]) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  const { data, error } = await supabase
    .from("scenes")
    .update(updates)
    .eq("id", sceneId)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ projectId: string; sceneId: string }> }) {
  const { projectId, sceneId } = await params;
  await supabase.from("scenes").delete().eq("id", sceneId).eq("project_id", projectId);
  return NextResponse.json({ success: true });
}
