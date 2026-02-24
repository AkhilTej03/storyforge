import type { Project, Asset, AssetDetail, AssetVariant, Script, Scene, ExportRecord, ProjectStats, AssetType } from "./types";

const BASE = "/api";

async function fetcher<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

export const api = {
  projects: {
    list: () => fetcher<Project[]>("/projects"),
    get: (id: string) => fetcher<Project>(`/projects/${id}`),
    create: (data: { name: string; visual_style?: string; base_model?: string; default_sampler?: string }) =>
      fetcher<Project>("/projects", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Project>) =>
      fetcher<Project>(`/projects/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => fetcher<{ success: boolean }>(`/projects/${id}`, { method: "DELETE" }),
    stats: (id: string) => fetcher<ProjectStats>(`/projects/${id}/stats`),
  },

  assets: {
    list: (projectId: string, type?: AssetType) =>
      fetcher<Asset[]>(`/projects/${projectId}/assets${type ? `?type=${type}` : ""}`),
    get: (projectId: string, assetId: string) =>
      fetcher<AssetDetail>(`/projects/${projectId}/assets/${assetId}`),
    create: (projectId: string, data: {
      name: string; type: AssetType; description?: string;
      visual_prompt?: string; negative_prompt?: string; seed?: number; metadata?: Record<string, unknown>;
    }) => fetcher<Asset>(`/projects/${projectId}/assets`, { method: "POST", body: JSON.stringify(data) }),
    update: (projectId: string, assetId: string, data: Partial<Asset>) =>
      fetcher<Asset>(`/projects/${projectId}/assets/${assetId}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (projectId: string, assetId: string) =>
      fetcher<{ success: boolean }>(`/projects/${projectId}/assets/${assetId}`, { method: "DELETE" }),
    lock: (projectId: string, assetId: string) =>
      fetcher<Asset>(`/projects/${projectId}/assets/${assetId}/lock`, { method: "POST" }),
    generate: (projectId: string, assetId: string, opts?: { variants?: number; seed?: number }) =>
      fetcher<{ status: string; message: string }>(`/projects/${projectId}/assets/${assetId}/generate`, {
        method: "POST",
        body: JSON.stringify(opts || {}),
      }),
    getVariants: (projectId: string, assetId: string) =>
      fetcher<AssetVariant[]>(`/projects/${projectId}/assets/${assetId}/variants`),
    selectVariant: (projectId: string, assetId: string, variantId: string) =>
      fetcher<Asset>(`/projects/${projectId}/assets/${assetId}/variants`, {
        method: "POST",
        body: JSON.stringify({ variant_id: variantId }),
      }),
  },

  scripts: {
    list: (projectId: string) => fetcher<Script[]>(`/projects/${projectId}/scripts`),
    get: (projectId: string, scriptId: string) =>
      fetcher<Script & { scenes: Scene[] }>(`/projects/${projectId}/scripts/${scriptId}`),
    create: (projectId: string, data: { title: string; content?: string }) =>
      fetcher<Script>(`/projects/${projectId}/scripts`, { method: "POST", body: JSON.stringify(data) }),
    update: (projectId: string, scriptId: string, data: Partial<Script>) =>
      fetcher<Script>(`/projects/${projectId}/scripts/${scriptId}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (projectId: string, scriptId: string) =>
      fetcher<{ success: boolean }>(`/projects/${projectId}/scripts/${scriptId}`, { method: "DELETE" }),
    compile: (projectId: string, scriptId: string) =>
      fetcher<{ scenes: Scene[]; count: number }>(`/projects/${projectId}/scripts/${scriptId}/compile`, { method: "POST" }),
  },

  scenes: {
    list: (projectId: string) => fetcher<Scene[]>(`/projects/${projectId}/scenes`),
    get: (projectId: string, sceneId: string) =>
      fetcher<Scene>(`/projects/${projectId}/scenes/${sceneId}`),
    create: (projectId: string, data: Partial<Scene>) =>
      fetcher<Scene>(`/projects/${projectId}/scenes`, { method: "POST", body: JSON.stringify(data) }),
    update: (projectId: string, sceneId: string, data: Partial<Scene>) =>
      fetcher<Scene>(`/projects/${projectId}/scenes/${sceneId}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (projectId: string, sceneId: string) =>
      fetcher<{ success: boolean }>(`/projects/${projectId}/scenes/${sceneId}`, { method: "DELETE" }),
    setAssets: (projectId: string, sceneId: string, assets: { asset_id: string; role?: string; position_hint?: string }[]) =>
      fetcher<{ assets: Asset[] }>(`/projects/${projectId}/scenes/${sceneId}/assets`, { method: "PUT", body: JSON.stringify({ assets }) }),
    render: (projectId: string, sceneId: string) =>
      fetcher<Scene>(`/projects/${projectId}/scenes/${sceneId}/render`, { method: "POST" }),
  },

  exports: {
    list: (projectId: string) => fetcher<ExportRecord[]>(`/projects/${projectId}/exports`),
    create: (projectId: string, type: "pdf" | "image_sequence" | "metadata_bundle") =>
      fetcher<ExportRecord>(`/projects/${projectId}/exports`, { method: "POST", body: JSON.stringify({ type }) }),
  },
};
