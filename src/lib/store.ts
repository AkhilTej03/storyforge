import { create } from "zustand";
import type { Project, Asset, Script, Scene, ExportRecord, ProjectStats, ViewType } from "./types";

interface ProjectState {
  // Navigation
  currentView: ViewType;
  setView: (view: ViewType) => void;

  // Project
  projects: Project[];
  currentProject: Project | null;
  setProjects: (projects: Project[]) => void;
  setCurrentProject: (project: Project | null) => void;

  // Assets
  assets: Asset[];
  setAssets: (assets: Asset[]) => void;

  // Scripts
  scripts: Script[];
  setScripts: (scripts: Script[]) => void;

  // Scenes
  scenes: Scene[];
  setScenes: (scenes: Scene[]) => void;

  // Exports
  exports: ExportRecord[];
  setExports: (exports: ExportRecord[]) => void;

  // Stats
  stats: ProjectStats | null;
  setStats: (stats: ProjectStats | null) => void;

  // UI
  selectedAssetId: string | null;
  setSelectedAssetId: (id: string | null) => void;
  selectedSceneId: string | null;
  setSelectedSceneId: (id: string | null) => void;
  selectedScriptId: string | null;
  setSelectedScriptId: (id: string | null) => void;
  assetCreationOpen: boolean;
  setAssetCreationOpen: (open: boolean) => void;
  sceneCompareIds: [string, string] | null;
  setSceneCompareIds: (ids: [string, string] | null) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  currentView: "dashboard",
  setView: (view) => set({ currentView: view }),

  projects: [],
  currentProject: null,
  setProjects: (projects) => set({ projects }),
  setCurrentProject: (project) => set({ currentProject: project }),

  assets: [],
  setAssets: (assets) => set({ assets }),

  scripts: [],
  setScripts: (scripts) => set({ scripts }),

  scenes: [],
  setScenes: (scenes) => set({ scenes }),

  exports: [],
  setExports: (exports) => set({ exports }),

  stats: null,
  setStats: (stats) => set({ stats }),

  selectedAssetId: null,
  setSelectedAssetId: (id) => set({ selectedAssetId: id }),
  selectedSceneId: null,
  setSelectedSceneId: (id) => set({ selectedSceneId: id }),
  selectedScriptId: null,
  setSelectedScriptId: (id) => set({ selectedScriptId: id }),
  assetCreationOpen: false,
  setAssetCreationOpen: (open) => set({ assetCreationOpen: open }),
  sceneCompareIds: null,
  setSceneCompareIds: (ids) => set({ sceneCompareIds: ids }),
}));
