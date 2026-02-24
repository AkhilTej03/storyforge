import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { generateAssetImage, generateVariantImages } from "@/lib/image-gen";
import { v4 as uuid } from "uuid";

export async function POST(req: NextRequest, { params }: { params: Promise<{ projectId: string; assetId: string }> }) {
  const { projectId, assetId } = await params;
  const body = await req.json().catch(() => ({}));
  const variantCount = body.variants || 0;

  const { data: asset } = await supabase
    .from("assets")
    .select("*")
    .eq("id", assetId)
    .eq("project_id", projectId)
    .single();
  if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  if (asset.locked) return NextResponse.json({ error: "Cannot regenerate a locked asset" }, { status: 403 });

  const prompt = asset.visual_prompt;
  if (!prompt) return NextResponse.json({ error: "Asset has no visual prompt" }, { status: 400 });

  const negativePrompt = asset.negative_prompt || "low quality, blurry, deformed";
  const newSeed = body.seed || Math.floor(Math.random() * 2147483647);
  const assetType = asset.type;

  await supabase
    .from("assets")
    .update({ generation_status: "generating", updated_at: new Date().toISOString() })
    .eq("id", assetId);

  if (variantCount > 1) {
    const count = Math.min(variantCount, 4);

    generateVariantImages({ assetId, prompt, negativePrompt, baseSeed: newSeed, count, assetType })
      .then(async (variants) => {
        await supabase.from("asset_variants").delete().eq("asset_id", assetId);
        for (let i = 0; i < variants.length; i++) {
          await supabase.from("asset_variants").insert({
            id: `VAR_${uuid().slice(0, 8).toUpperCase()}`,
            asset_id: assetId,
            variant_index: i + 1,
            seed: variants[i].seed,
            thumbnail_url: variants[i].url,
            selected: false,
          });
        }
        await supabase
          .from("assets")
          .update({ generation_status: "completed", updated_at: new Date().toISOString() })
          .eq("id", assetId);
        console.log(`[Bedrock] Asset ${assetId} - ${count} variants generated`);
      })
      .catch(async (err) => {
        await supabase
          .from("assets")
          .update({ generation_status: "failed", updated_at: new Date().toISOString() })
          .eq("id", assetId);
        console.error(`[Bedrock] Asset ${assetId} variant generation failed:`, err.message);
      });

    return NextResponse.json({ status: "generating", message: `Generating ${count} variants via AWS Bedrock...` });
  }

  generateAssetImage({ assetId, prompt, negativePrompt, seed: newSeed, assetType })
    .then(async (result) => {
      const newVersion = asset.version + 1;
      await supabase
        .from("assets")
        .update({
          thumbnail_url: result.url,
          seed: newSeed,
          version: newVersion,
          generation_status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", assetId);
      await supabase.from("asset_versions").insert({
        id: `AV_${uuid().slice(0, 8).toUpperCase()}`,
        asset_id: assetId,
        version: newVersion,
        visual_prompt: prompt,
        negative_prompt: negativePrompt,
        seed: newSeed,
        thumbnail_url: result.url,
        metadata: asset.metadata,
      });
      console.log(`[Bedrock] Asset ${assetId} regenerated: ${result.url}`);
    })
    .catch(async (err) => {
      await supabase
        .from("assets")
        .update({ generation_status: "failed", updated_at: new Date().toISOString() })
        .eq("id", assetId);
      console.error(`[Bedrock] Asset ${assetId} regeneration failed:`, err.message);
    });

  return NextResponse.json({ status: "generating", message: "Regenerating via AWS Bedrock..." });
}
