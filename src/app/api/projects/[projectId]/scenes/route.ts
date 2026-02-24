import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { v4 as uuid } from "uuid";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;

  const { data: scenes, error } = await supabase
    .from("scenes")
    .select("*")
    .eq("project_id", projectId)
    .order("scene_number");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const enriched = await Promise.all(
    (scenes || []).map(async (scene) => {
      const { data: saRows } = await supabase
        .from("scene_assets")
        .select("asset_id, role, position_hint")
        .eq("scene_id", scene.id);
      let assets: unknown[] = [];
      if (saRows?.length) {
        const assetIds = saRows.map((r) => r.asset_id);
        const { data: assetRows } = await supabase.from("assets").select("*").in("id", assetIds);
        assets = (assetRows || []).map((a) => {
          const sa = saRows.find((r) => r.asset_id === a.id);
          return { ...a, role: sa?.role, position_hint: sa?.position_hint };
        });
      }
      return { ...scene, assets };
    })
  );

  return NextResponse.json(enriched);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const body = await req.json();
  const { title, description, scene_number, mood, camera_angle, lighting, script_id } = body;

  const id = `SCN_${uuid().slice(0, 8).toUpperCase()}`;

  // Auto-determine scene number if not provided
  let num = scene_number;
  if (!num) {
    const { data } = await supabase
      .from("scenes")
      .select("scene_number")
      .eq("project_id", projectId)
      .order("scene_number", { ascending: false })
      .limit(1);
    num = (data?.[0]?.scene_number || 0) + 1;
  }

  const { data, error } = await supabase
    .from("scenes")
    .insert({
      id,
      project_id: projectId,
      script_id: script_id || null,
      scene_number: num,
      title: title || `Scene ${num}`,
      description: description || "",
      mood: mood || "neutral",
      camera_angle: camera_angle || "medium shot",
      lighting: lighting || "natural",
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
