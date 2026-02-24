"use client";

import { useEffect, useState, useCallback } from "react";
import { useProjectStore } from "@/lib/store";
import { api } from "@/lib/api";
import type { Project } from "@/lib/types";
import { AppSidebar } from "@/components/app-sidebar";
import { DashboardView } from "@/components/views/dashboard-view";
import { AssetsView } from "@/components/views/assets-view";
import { ScriptsView } from "@/components/views/scripts-view";
import { ScenesView } from "@/components/views/scenes-view";
import { StoryboardView } from "@/components/views/storyboard-view";
import { ExportsView } from "@/components/views/exports-view";
import { ProjectSelector } from "@/components/project-selector";
import { toast } from "sonner";

export default function Home() {
  const {
    currentView,
    currentProject,
    setProjects,
    setCurrentProject,
    setAssets,
    setScripts,
    setScenes,
    setExports,
    setStats,
  } = useProjectStore();

  const [loading, setLoading] = useState(true);

  const loadProjectData = useCallback(async (project: Project) => {
    try {
      const [assets, scripts, scenes, exports, stats] = await Promise.all([
        api.assets.list(project.id),
        api.scripts.list(project.id),
        api.scenes.list(project.id),
        api.exports.list(project.id),
        api.projects.stats(project.id),
      ]);
      setAssets(assets);
      setScripts(scripts);
      setScenes(scenes);
      setExports(exports);
      setStats(stats);
    } catch (e) {
      toast.error("Failed to load project data: " + (e as Error).message);
    }
  }, [setAssets, setScripts, setScenes, setExports, setStats]);

  useEffect(() => {
    async function init() {
      try {
        const projects = await api.projects.list();
        setProjects(projects);
        if (projects.length > 0) {
          setCurrentProject(projects[0]);
          await loadProjectData(projects[0]);
        }
      } catch (e) {
        toast.error("Failed to load projects: " + (e as Error).message);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [setProjects, setCurrentProject, loadProjectData]);

  const handleProjectSelect = async (project: Project) => {
    setCurrentProject(project);
    await loadProjectData(project);
  };

  const handleProjectCreate = async (name: string, visualStyle: string) => {
    try {
      const project = await api.projects.create({ name, visual_style: visualStyle });
      const projects = await api.projects.list();
      setProjects(projects);
      setCurrentProject(project);
      await loadProjectData(project);
      toast.success("Project created");
    } catch (e) {
      toast.error("Failed to create project: " + (e as Error).message);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading StoryForge...</p>
        </div>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <ProjectSelector
          onSelect={handleProjectSelect}
          onCreate={handleProjectCreate}
          mode="fullscreen"
        />
      </div>
    );
  }

  const views: Record<string, React.ReactNode> = {
    dashboard: <DashboardView onRefresh={() => loadProjectData(currentProject)} />,
    assets: <AssetsView />,
    scripts: <ScriptsView />,
    scenes: <ScenesView />,
    storyboard: <StoryboardView />,
    exports: <ExportsView />,
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar
        onProjectSelect={handleProjectSelect}
        onProjectCreate={handleProjectCreate}
      />
      <main className="flex-1 overflow-auto custom-scrollbar">
        {views[currentView] || views.dashboard}
      </main>
    </div>
  );
}
