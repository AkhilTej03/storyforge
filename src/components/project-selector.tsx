"use client";

import { useState } from "react";
import { useProjectStore } from "@/lib/store";
import type { Project } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, FolderOpen, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const VISUAL_STYLES = [
  "anime cinematic realism",
  "photorealistic",
  "watercolor illustration",
  "comic book",
  "noir cinematic",
  "pixel art",
  "concept art",
  "oil painting",
];

interface ProjectSelectorProps {
  onSelect: (project: Project) => void;
  onCreate: (name: string, visualStyle: string) => void;
  mode: "fullscreen" | "compact";
}

export function ProjectSelector({ onSelect, onCreate, mode }: ProjectSelectorProps) {
  const { projects, currentProject } = useProjectStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [visualStyle, setVisualStyle] = useState("anime cinematic realism");

  const handleCreate = () => {
    if (!name.trim()) return;
    onCreate(name.trim(), visualStyle);
    setName("");
    setVisualStyle("anime cinematic realism");
    setDialogOpen(false);
  };

  if (mode === "fullscreen") {
    return (
      <div className="flex flex-col items-center gap-8 max-w-lg w-full px-6">
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-xl font-bold">
            SF
          </div>
          <h1 className="text-2xl font-bold tracking-tight">StoryForge</h1>
          <p className="text-sm text-muted-foreground text-center">
            Asset-first storyboard generation for visual storytelling
          </p>
        </div>

        {projects.length > 0 && (
          <div className="w-full">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Recent Projects</p>
            <div className="space-y-2">
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onSelect(p)}
                  className="flex w-full items-center gap-3 rounded-lg border border-border bg-card p-3 text-left hover:bg-accent transition-colors"
                >
                  <FolderOpen className="h-5 w-5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.visual_style} / {p.base_model}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="w-full border-t border-border pt-6">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Create New Project</p>
          <div className="space-y-3">
            <div>
              <Label htmlFor="project-name" className="text-xs">Project Name</Label>
              <Input
                id="project-name"
                placeholder="e.g., College Silence"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="visual-style" className="text-xs">Visual Style</Label>
              <Select value={visualStyle} onValueChange={setVisualStyle}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VISUAL_STYLES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleCreate} disabled={!name.trim()} className="w-full">
              <Plus className="h-4 w-4 mr-2" /> Create Project
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Compact mode for sidebar
  return (
    <div className="flex items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex flex-1 items-center gap-2 rounded-md bg-sidebar-accent/50 px-2.5 py-1.5 text-left hover:bg-sidebar-accent transition-colors min-w-0">
            <FolderOpen className="h-3.5 w-3.5 text-sidebar-primary shrink-0" />
            <span className="text-xs font-medium truncate flex-1">{currentProject?.name}</span>
            <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {projects.map((p) => (
            <DropdownMenuItem key={p.id} onClick={() => onSelect(p)}>
              <FolderOpen className="h-4 w-4 mr-2" />
              {p.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-sidebar-foreground hover:bg-sidebar-accent">
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label htmlFor="new-name">Project Name</Label>
              <Input
                id="new-name"
                placeholder="e.g., College Silence"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="new-style">Visual Style</Label>
              <Select value={visualStyle} onValueChange={setVisualStyle}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VISUAL_STYLES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleCreate} disabled={!name.trim()} className="w-full">
              Create Project
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
