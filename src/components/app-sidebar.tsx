"use client";

import { useState } from "react";
import { useProjectStore } from "@/lib/store";
import type { Project } from "@/lib/types";
import type { ViewType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ProjectSelector } from "@/components/project-selector";
import {
  LayoutDashboard,
  Box,
  FileText,
  Clapperboard,
  Film,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const NAV_ITEMS: { view: ViewType; label: string; icon: React.ReactNode }[] = [
  { view: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { view: "assets", label: "Asset Library", icon: <Box className="h-4 w-4" /> },
  { view: "scripts", label: "Scripts", icon: <FileText className="h-4 w-4" /> },
  { view: "scenes", label: "Scenes", icon: <Clapperboard className="h-4 w-4" /> },
  { view: "storyboard", label: "Storyboard", icon: <Film className="h-4 w-4" /> },
  { view: "exports", label: "Exports", icon: <Download className="h-4 w-4" /> },
];

interface AppSidebarProps {
  onProjectSelect: (project: Project) => void;
  onProjectCreate: (name: string, visualStyle: string) => void;
}

export function AppSidebar({ onProjectSelect, onProjectCreate }: AppSidebarProps) {
  const { currentView, setView, currentProject } = useProjectStore();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-200 ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      {/* Header */}
      <div className="flex h-14 items-center justify-between px-3 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground text-xs font-bold">
              SF
            </div>
            <span className="text-sm font-semibold tracking-tight">StoryForge</span>
          </div>
        )}
        {collapsed && (
          <div className="flex h-8 w-8 mx-auto items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground text-xs font-bold">
            SF
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-sidebar-foreground hover:bg-sidebar-accent shrink-0"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {/* Project Selector */}
      {!collapsed && (
        <div className="px-3 py-3">
          <ProjectSelector
            onSelect={onProjectSelect}
            onCreate={onProjectCreate}
            mode="compact"
          />
        </div>
      )}

      <Separator className="bg-sidebar-border" />

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.view}
            onClick={() => setView(item.view)}
            className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
              currentView === item.view
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            } ${collapsed ? "justify-center px-0" : ""}`}
            title={collapsed ? item.label : undefined}
          >
            {item.icon}
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* Footer */}
      {!collapsed && currentProject && (
        <div className="border-t border-sidebar-border px-3 py-3">
          <div className="rounded-md bg-sidebar-accent/50 px-3 py-2">
            <p className="text-[11px] text-sidebar-foreground/50 uppercase tracking-wider">Style</p>
            <p className="text-xs text-sidebar-foreground/80 mt-0.5 truncate">{currentProject.visual_style}</p>
            <p className="text-[11px] text-sidebar-foreground/50 uppercase tracking-wider mt-2">Model</p>
            <p className="text-xs text-sidebar-foreground/80 mt-0.5">{currentProject.base_model}</p>
          </div>
        </div>
      )}
    </aside>
  );
}
