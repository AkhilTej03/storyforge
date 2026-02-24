export interface Project {
  id: string;
  name: string;
  visual_style: string;
  base_model: string;
  default_sampler: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export type AssetType = "character" | "environment" | "nature" | "prop";
export type GenerationStatus = "idle" | "generating" | "completed" | "failed";

export interface Asset {
  id: string;
  project_id: string;
  name: string;
  type: AssetType;
  description: string;
  visual_prompt: string;
  negative_prompt: string;
  seed: number | null;
  version: number;
  locked: number;
  thumbnail_url: string | null;
  generation_status: GenerationStatus;
  metadata: Record<string, unknown>;
  usage_count?: number;
  created_at: string;
  updated_at: string;
}

export interface AssetVersion {
  id: string;
  asset_id: string;
  version: number;
  visual_prompt: string;
  negative_prompt: string;
  seed: number | null;
  thumbnail_url: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AssetVariant {
  id: string;
  asset_id: string;
  variant_index: number;
  seed: number | null;
  thumbnail_url: string | null;
  selected: number;
  created_at: string;
}

export interface AssetDetail extends Asset {
  versions: AssetVersion[];
  variants: AssetVariant[];
  used_in_scenes: Scene[];
}

export interface Script {
  id: string;
  project_id: string;
  title: string;
  content: string;
  compiled: number;
  created_at: string;
  updated_at: string;
  scenes?: Scene[];
}

export type RenderStatus = "draft" | "rendering" | "completed" | "failed";

export interface Scene {
  id: string;
  project_id: string;
  script_id: string | null;
  scene_number: number;
  title: string;
  description: string;
  mood: string;
  camera_angle: string;
  lighting: string;
  render_status: RenderStatus;
  rendered_url: string | null;
  render_metadata: Record<string, unknown>;
  assets?: SceneAsset[];
  versions?: SceneVersion[];
  created_at: string;
  updated_at: string;
}

export interface SceneAsset extends Asset {
  role: string;
  position_hint: string;
}

export interface SceneVersion {
  id: string;
  scene_id: string;
  version: number;
  rendered_url: string | null;
  render_metadata: Record<string, unknown>;
  created_at: string;
}

export interface ExportRecord {
  id: string;
  project_id: string;
  type: "pdf" | "image_sequence" | "metadata_bundle";
  status: "pending" | "processing" | "completed" | "failed";
  file_url: string | null;
  created_at: string;
}

export interface ProjectStats {
  assetCount: number;
  sceneCount: number;
  scriptCount: number;
  lockedAssets: number;
  renderedScenes: number;
  assetsByType: { type: string; count: number }[];
  recentAssets: Asset[];
  recentScenes: Scene[];
}

export type ViewType = "dashboard" | "assets" | "scripts" | "scenes" | "storyboard" | "exports";
