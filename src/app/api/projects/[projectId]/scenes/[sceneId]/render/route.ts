import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { generateSceneImage } from "@/lib/image-gen";
import { v4 as uuid } from "uuid";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ projectId: string; sceneId: string }> }) {
  const { projectId, sceneId } = await params;

  const { data: scene } = await supabase
    .from("scenes")
    .select("*")
    .eq("id", sceneId)
    .eq("project_id", projectId)
    .single();
  if (!scene) return NextResponse.json({ error: "Scene not found" }, { status: 404 });

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  // Get scene assets
  const { data: saRows } = await supabase
    .from("scene_assets")
    .select("asset_id")
    .eq("scene_id", sceneId);
  if (!saRows?.length) {
    return NextResponse.json({ error: "Scene has no assets assigned. Add assets before rendering." }, { status: 400 });
  }

  const assetIds = saRows.map((r) => r.asset_id);
  const { data: sceneAssetRows } = await supabase.from("assets").select("*").in("id", assetIds);
  if (!sceneAssetRows?.length) {
    return NextResponse.json({ error: "Scene has no assets assigned." }, { status: 400 });
  }

  const unlockedAssets = sceneAssetRows.filter((a) => !a.locked);
  if (unlockedAssets.length > 0) {
    return NextResponse.json({
      error: "All assets must be locked before rendering",
      unlocked_assets: unlockedAssets.map((a) => a.name),
    }, { status: 400 });
  }

  const seed = Math.floor(Math.random() * 2147483647);

  await supabase
    .from("scenes")
    .update({ render_status: "rendering", updated_at: new Date().toISOString() })
    .eq("id", sceneId);

  generateSceneImage({
    sceneId,
    assets: sceneAssetRows.map((a) => ({
      name: a.name,
      type: a.type,
      visual_prompt: a.visual_prompt,
      thumbnail_url: a.thumbnail_url || undefined,
    })),
    sceneDescription: scene.description,
    mood: scene.mood,
    cameraAngle: scene.camera_angle,
    lighting: scene.lighting,
    visualStyle: project?.visual_style || "anime cinematic realism",
    seed,
  })
    .then(async (result) => {
      const { count } = await supabase
        .from("scene_versions")
        .select("*", { count: "exact", head: true })
        .eq("scene_id", sceneId);
      const newVersion = (count || 0) + 1;

      const renderMetadata = {
        render_engine: `AWS Bedrock / ${process.env.BEDROCK_MODEL_ID || "amazon.nova-canvas-v1:0"}`,
        seed: result.seed,
        rendered_at: new Date().toISOString(),
        assets_used: sceneAssetRows.length,
        asset_ids: sceneAssetRows.map((a) => a.id),
      };

      await supabase
        .from("scenes")
        .update({
          render_status: "completed",
          rendered_url: result.url,
          render_metadata: renderMetadata,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sceneId);

      await supabase.from("scene_versions").insert({
        id: `SV_${uuid().slice(0, 8).toUpperCase()}`,
        scene_id: sceneId,
        version: newVersion,
        rendered_url: result.url,
        render_metadata: renderMetadata,
      });

      console.log(`[Bedrock] Scene ${sceneId} rendered: ${result.url}`);
    })
    .catch(async (err) => {
      await supabase
        .from("scenes")
        .update({ render_status: "failed", updated_at: new Date().toISOString() })
        .eq("id", sceneId);
      console.error(`[Bedrock] Scene ${sceneId} render failed:`, err.message);
    });

  const { data: updated } = await supabase
    .from("scenes")
    .select("*")
    .eq("id", sceneId)
    .single();
  return NextResponse.json(updated);
}
