import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { generateAssetImage } from "@/lib/image-gen";
import { v4 as uuid } from "uuid";

export async function GET(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const url = new URL(req.url);
  const type = url.searchParams.get("type");

  let query = supabase.from("assets").select("*").eq("project_id", projectId);
  if (type) query = query.eq("type", type);
  query = query.order("created_at", { ascending: false });

  const { data: assets, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enrich with usage count
  const enriched = await Promise.all(
    (assets || []).map(async (asset) => {
      const { count } = await supabase
        .from("scene_assets")
        .select("*", { count: "exact", head: true })
        .eq("asset_id", asset.id);
      return { ...asset, usage_count: count || 0 };
    })
  );

  return NextResponse.json(enriched);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const body = await req.json();
  const { name, type, description, visual_prompt, negative_prompt, seed, metadata } = body;

  if (!name || !type) {
    return NextResponse.json({ error: "name and type are required" }, { status: 400 });
  }
  if (!["character", "environment", "nature", "prop"].includes(type)) {
    return NextResponse.json({ error: "Invalid asset type" }, { status: 400 });
  }

  const id = `AST_${uuid().slice(0, 8).toUpperCase()}`;
  const actualSeed = seed || Math.floor(Math.random() * 2147483647);

  const { data: asset, error } = await supabase
    .from("assets")
    .insert({
      id,
      project_id: projectId,
      name,
      type,
      description: description || "",
      visual_prompt: visual_prompt || "",
      negative_prompt: negative_prompt || "low quality, blurry, deformed",
      seed: actualSeed,
      metadata: metadata || {},
      generation_status: visual_prompt ? "generating" : "idle",
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Create initial version
  await supabase.from("asset_versions").insert({
    id: `AV_${uuid().slice(0, 8).toUpperCase()}`,
    asset_id: id,
    version: 1,
    visual_prompt: visual_prompt || "",
    negative_prompt: negative_prompt || "low quality, blurry, deformed",
    seed: actualSeed,
    metadata: metadata || {},
  });

  // Fire-and-forget: generate image via AWS Bedrock in background
  if (visual_prompt) {
    generateAssetImage({
      assetId: id,
      prompt: visual_prompt,
      negativePrompt: negative_prompt || "low quality, blurry, deformed, disfigured, bad anatomy, text, watermark",
      seed: actualSeed,
      assetType: type,
    })
      .then(async (result) => {
        await supabase
          .from("assets")
          .update({ thumbnail_url: result.url, generation_status: "completed", updated_at: new Date().toISOString() })
          .eq("id", id);
        await supabase
          .from("asset_versions")
          .update({ thumbnail_url: result.url })
          .eq("asset_id", id)
          .eq("version", 1);
        console.log(`[Bedrock] Asset ${id} image generated: ${result.url}`);
      })
      .catch(async (err) => {
        await supabase
          .from("assets")
          .update({ generation_status: "failed", updated_at: new Date().toISOString() })
          .eq("id", id);
        console.error(`[Bedrock] Asset ${id} generation failed:`, err.message);
      });
  }

  return NextResponse.json(asset, { status: 201 });
}
