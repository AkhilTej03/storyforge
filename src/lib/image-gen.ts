import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import fs from "fs";
import path from "path";
import { Buffer } from "node:buffer";

const GENERATED_DIR = path.join(process.cwd(), "public", "generated");

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getBedrockClient(): BedrockRuntimeClient {
  return new BedrockRuntimeClient({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

const MODEL_ID = process.env.BEDROCK_MODEL_ID || "amazon.nova-canvas-v1:0";

/**
 * Generate an image using AWS Bedrock and save to disk.
 * Returns the public URL path for the image.
 */
async function invokeBedrockImage(opts: {
  prompt: string;
  negativePrompt?: string;
  seed?: number;
  width?: number;
  height?: number;
  filename: string;
  subfolder: string;
}): Promise<{ url: string; seed: number }> {
  const {
    prompt,
    negativePrompt = "low quality, blurry, deformed, disfigured, bad anatomy, bad proportions, extra limbs, mutated hands, poorly drawn face, poorly drawn hands, text, watermark, logo, signature, cropped, out of frame, ugly, tiling, grainy, oversaturated",
    seed = Math.floor(Math.random() * 2147483647),
    width = 1024,
    height = 1024,
    filename,
    subfolder,
  } = opts;

  const client = getBedrockClient();

  // Build payload based on model type
  let payload: Record<string, unknown>;
  const modelId = MODEL_ID;

  if (modelId.startsWith("stability.sd3") || modelId.startsWith("stability.sd3-5") || modelId === "stability.sd3-ultra-v1:1") {
    // Stability SD3.5 / Ultra
    const aspectRatio = getAspectRatio(width, height);
    payload = {
      prompt,
      negative_prompt: negativePrompt,
      mode: "text-to-image",
      aspect_ratio: aspectRatio,
      output_format: "png",
      seed: seed % 4294967295,
    };
  } else if (modelId === "stability.stable-diffusion-xl-v1") {
    // Legacy SDXL
    payload = {
      text_prompts: [
        { text: prompt, weight: 1 },
        ...(negativePrompt ? [{ text: negativePrompt, weight: -1 }] : []),
      ],
      cfg_scale: 10,
      seed: seed % 4294967295,
      steps: 50,
      width,
      height,
      style_preset: "cinematic",
    };
  } else {
    // Amazon Nova Canvas / Titan Image Generator (default)
    payload = {
      taskType: "TEXT_IMAGE",
      textToImageParams: {
        text: prompt,
        ...(negativePrompt ? { negativeText: negativePrompt } : {}),
      },
      imageGenerationConfig: {
        numberOfImages: 1,
        quality: "premium",
        height,
        width,
          cfgScale: 7.5,
        seed: seed % 2147483647,
      },
    };
  }

  const response = await client.send(
    new InvokeModelCommand({
      modelId,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(payload),
    })
  );

  const responseBody = JSON.parse(new TextDecoder().decode(response.body));

  // Check for content moderation errors (Amazon models)
  if (responseBody.error) {
    throw new Error(`Bedrock generation error: ${responseBody.error}`);
  }

  // Extract base64 image based on model type
  let base64Data: string;
  if (modelId === "stability.stable-diffusion-xl-v1") {
    base64Data = responseBody.artifacts[0].base64;
  } else {
    base64Data = responseBody.images[0];
  }

  // Save to disk
  const outDir = path.join(GENERATED_DIR, subfolder);
  ensureDir(outDir);
  const filePath = path.join(outDir, filename);
  await fs.promises.writeFile(filePath, Buffer.from(base64Data, "base64"));

  const url = `/generated/${subfolder}/${filename}`;
  return { url, seed };
}

function getAspectRatio(width: number, height: number): string {
    const ratio = width / height;
    if (ratio >= 2.2) return "21:9";
    if (ratio >= 1.7) return "16:9";
    if (ratio >= 1.4) return "3:2";
    if (ratio >= 1.1) return "4:3";
    if (ratio >= 0.9) return "1:1";
    if (ratio >= 0.7) return "5:4";
    if (ratio >= 0.55) return "2:3";
    if (ratio >= 0.45) return "9:16";
    return "9:21";
  }

// Round to nearest valid Bedrock dimension (multiple of 64, between 320 and 4096 for Nova Canvas)
function snapDimension(val: number): number {
  const snapped = Math.round(val / 64) * 64;
  return Math.max(320, Math.min(4096, snapped));
}

/**
 * Generate an image for an asset.
 * Saves the file to public/generated/assets/{assetId}_{seed}.png
 */
export async function generateAssetImage(opts: {
  assetId: string;
  prompt: string;
  negativePrompt?: string;
  seed?: number;
  assetType: string;
}): Promise<{ url: string; seed: number }> {
  const { assetId, prompt, negativePrompt, seed = Math.floor(Math.random() * 2147483647), assetType } = opts;

  const width = assetType === "environment" ? snapDimension(1280) : snapDimension(1024);
  const height = assetType === "environment" ? snapDimension(720) : snapDimension(1024);

  // Nova Canvas has a 1024 char limit for prompts
  const maxLen = MODEL_ID.startsWith("amazon.") ? 1024 : 10000;
  const truncatedPrompt = prompt.length > maxLen ? prompt.slice(0, maxLen - 3) + "..." : prompt;

  return invokeBedrockImage({
    prompt: truncatedPrompt,
    negativePrompt,
    seed,
    width,
    height,
    filename: `${assetId}_${seed}.png`,
    subfolder: "assets",
  });
}

/**
 * Generate a scene composition image using actual asset images as references (IMAGE_VARIATION)
 * plus a text prompt describing the scene composition.
 */
export async function generateSceneImage(opts: {
  sceneId: string;
  assets: { name: string; type: string; visual_prompt: string; thumbnail_url?: string }[];
  sceneDescription: string;
  mood: string;
  cameraAngle: string;
  lighting: string;
  visualStyle: string;
  seed?: number;
}): Promise<{ url: string; seed: number }> {
  const { sceneId, assets, sceneDescription, mood, cameraAngle, lighting, visualStyle, seed = Math.floor(Math.random() * 2147483647) } = opts;

  // Collect base64-encoded images from asset thumbnails (up to 5 for Nova Canvas IMAGE_VARIATION)
  const referenceImages: string[] = [];
  for (const asset of assets.slice(0, 5)) {
    if (!asset.thumbnail_url) continue;
    const imgPath = path.join(process.cwd(), "public", asset.thumbnail_url);
    if (fs.existsSync(imgPath)) {
      const imgBuffer = await fs.promises.readFile(imgPath);
      referenceImages.push(imgBuffer.toString("base64"));
    }
  }

  // Build the text prompt describing how assets interact in the scene
  const maxLen = MODEL_ID.startsWith("amazon.") ? 1024 : 10000;

  const promptParts = [
    visualStyle ? `${visualStyle} style cinematic storyboard frame` : "cinematic storyboard frame",
    sceneDescription || "",
    mood ? `${mood} mood` : "",
    cameraAngle ? `${cameraAngle}` : "",
    lighting ? `${lighting} lighting` : "",
    "highly detailed, sharp focus",
  ].filter(Boolean);

  // Add short asset references so the model knows what the images represent
  for (const a of assets) {
    const label = a.type === "environment" ? `set in ${a.name}` : a.name;
    promptParts.push(label);
  }

  let fullPrompt = promptParts.join(", ");
  if (fullPrompt.length > maxLen) {
    fullPrompt = fullPrompt.slice(0, maxLen - 3) + "...";
  }

  console.log(`[Scene Render] ${referenceImages.length} reference images, prompt (${fullPrompt.length} chars): ${fullPrompt}...`);

  const width = snapDimension(1024);
  const height = snapDimension(576);
  const outSeed = seed % 2147483647;

  // If we have reference images and using Nova Canvas, use IMAGE_VARIATION
  if (referenceImages.length > 0 && MODEL_ID.startsWith("amazon.")) {
    const client = getBedrockClient();

    const payload = {
      taskType: "IMAGE_VARIATION",
      imageVariationParams: {
        images: referenceImages,
        text: fullPrompt,
        similarityStrength: 0.9, // Balance between reference fidelity and scene composition
        negativeText: "low quality, blurry, deformed, disfigured, bad anatomy, text, watermark, logo, signature, cropped, ugly, grainy",
      },
      imageGenerationConfig: {
        numberOfImages: 1,
        quality: "premium",
        height,
        width,
        cfgScale: 7.5,
        seed: outSeed,
      },
    };

    const response = await client.send(
      new InvokeModelCommand({
        modelId: MODEL_ID,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify(payload),
      })
    );

    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    if (responseBody.error) {
      throw new Error(`Bedrock generation error: ${responseBody.error}`);
    }

    const base64Data = responseBody.images[0];
    const outDir = path.join(GENERATED_DIR, "scenes");
    ensureDir(outDir);
    const filename = `${sceneId}_${outSeed}.png`;
    const filePath = path.join(outDir, filename);
    await fs.promises.writeFile(filePath, Buffer.from(base64Data, "base64"));

    return { url: `/generated/scenes/${filename}`, seed: outSeed };
  }

  // Fallback: text-only generation (non-Amazon models or no reference images)
  return invokeBedrockImage({
    prompt: fullPrompt,
    seed,
    width,
    height,
    filename: `${sceneId}_${outSeed}.png`,
    subfolder: "scenes",
  });
}

/**
 * Generate multiple variant images for an asset.
 */
export async function generateVariantImages(opts: {
  assetId: string;
  prompt: string;
  negativePrompt?: string;
  baseSeed: number;
  count: number;
  assetType: string;
}): Promise<{ url: string; seed: number }[]> {
    const { assetId, prompt, negativePrompt, baseSeed, count, assetType } = opts;

  const width = assetType === "environment" ? snapDimension(1280) : snapDimension(1024);
  const height = assetType === "environment" ? snapDimension(720) : snapDimension(1024);

  // Nova Canvas has a 1024 char limit for prompts
  const maxLen = MODEL_ID.startsWith("amazon.") ? 1024 : 10000;
  const truncatedPrompt = prompt.length > maxLen ? prompt.slice(0, maxLen - 3) + "..." : prompt;

  const results: { url: string; seed: number }[] = [];

  for (let i = 0; i < count; i++) {
    const variantSeed = baseSeed + (i + 1) * 7919;
    const result = await invokeBedrockImage({
      prompt: truncatedPrompt,
      negativePrompt,
      seed: variantSeed,
      width,
      height,
      filename: `${assetId}_var${i + 1}_${variantSeed}.png`,
      subfolder: "variants",
    });
    results.push(result);
  }

  return results;
}
