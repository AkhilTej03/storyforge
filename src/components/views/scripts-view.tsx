"use client";

import { useState } from "react";
import { useProjectStore } from "@/lib/store";
import { api } from "@/lib/api";
import type { Script, Scene } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FileText,
  Plus,
  Trash2,
  Play,
  Save,
  CheckCircle2,
  Clapperboard,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

export function ScriptsView() {
  const { currentProject, scripts, setScripts, scenes, setScenes, setView } = useProjectStore();
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  const [compiledScenes, setCompiledScenes] = useState<Scene[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Script | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [compiling, setCompiling] = useState(false);

  if (!currentProject) return null;

  const refreshScripts = async () => {
    const updated = await api.scripts.list(currentProject.id);
    setScripts(updated);
    const updatedScenes = await api.scenes.list(currentProject.id);
    setScenes(updatedScenes);
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    try {
      const script = await api.scripts.create(currentProject.id, { title: newTitle.trim() });
      await refreshScripts();
      setCreateOpen(false);
      setNewTitle("");
      openScript(script);
      toast.success("Script created");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const openScript = async (script: Script) => {
    try {
      const detail = await api.scripts.get(currentProject.id, script.id);
      setSelectedScript(detail);
      setEditTitle(detail.title);
      setEditContent(detail.content);
      setCompiledScenes(detail.scenes || []);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleSave = async () => {
    if (!selectedScript) return;
    setSaving(true);
    try {
      await api.scripts.update(currentProject.id, selectedScript.id, {
        title: editTitle,
        content: editContent,
      });
      await refreshScripts();
      toast.success("Script saved");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleCompile = async () => {
    if (!selectedScript) return;
    // Save first
    setSaving(true);
    try {
      await api.scripts.update(currentProject.id, selectedScript.id, {
        title: editTitle,
        content: editContent,
      });
    } catch (e) {
      toast.error((e as Error).message);
      setSaving(false);
      return;
    }
    setSaving(false);

    setCompiling(true);
    try {
      const result = await api.scripts.compile(currentProject.id, selectedScript.id);
      setCompiledScenes(result.scenes);
      await refreshScripts();
      toast.success(`Compiled into ${result.count} scenes`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCompiling(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.scripts.delete(currentProject.id, deleteTarget.id);
      await refreshScripts();
      if (selectedScript?.id === deleteTarget.id) {
        setSelectedScript(null);
      }
      setDeleteTarget(null);
      toast.success("Script deleted");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  // Script editor view
  if (selectedScript) {
    return (
      <div className="flex flex-col h-full">
        {/* Editor Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedScript(null)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="h-8 w-64 text-sm font-medium"
            />
            {selectedScript.compiled ? (
              <Badge variant="secondary" className="text-green-400">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Compiled
              </Badge>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>
              <Save className="h-3.5 w-3.5 mr-1.5" /> {saving ? "Saving..." : "Save"}
            </Button>
            <Button size="sm" onClick={handleCompile} disabled={compiling || !editContent.trim()}>
              <Play className="h-3.5 w-3.5 mr-1.5" /> {compiling ? "Compiling..." : "Compile to Scenes"}
            </Button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Script Content */}
          <div className="flex-1 p-4">
            <div className="mb-2">
              <Label className="text-xs text-muted-foreground">
                Use scene markers: &quot;SCENE 1:&quot;, &quot;INT.&quot;, &quot;EXT.&quot;, &quot;---&quot;, or &quot;## Scene&quot; to denote scenes
              </Label>
            </div>
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder={`SCENE 1: The Opening\nA quiet college campus at dawn. The protagonist walks alone through empty corridors.\n\n---\n\nSCENE 2: The Encounter\nIn the library, two students meet for the first time.`}
              className="h-[calc(100%-2rem)] resize-none font-mono text-sm leading-relaxed"
            />
          </div>

          {/* Compiled Scenes Panel */}
          <div className="w-80 border-l border-border overflow-y-auto custom-scrollbar bg-secondary/20 p-4">
            <h3 className="text-sm font-semibold mb-3">
              Compiled Scenes ({compiledScenes.length})
            </h3>
            {compiledScenes.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Write your script and click &quot;Compile to Scenes&quot; to decompose it into individual scenes.
              </p>
            ) : (
              <div className="space-y-2">
                {compiledScenes.map((scene, i) => (
                  <div key={scene.id || i} className="rounded-lg border border-border bg-card p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Clapperboard className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-medium">{scene.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-3">{scene.description}</p>
                    {scene.render_status !== "draft" && (
                      <Badge variant="outline" className="mt-2 text-[10px]">{scene.render_status}</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}

            {compiledScenes.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-4"
                onClick={() => setView("scenes")}
              >
                Edit Scenes
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Script list view
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Scripts</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{scripts.length} scripts in project</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> New Script
        </Button>
      </div>

      {scripts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No scripts yet</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Create Script
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {scripts.map((script) => (
            <div
              key={script.id}
              className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 hover:bg-accent/50 transition-colors cursor-pointer"
              onClick={() => openScript(script)}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                <FileText className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{script.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {script.content ? `${script.content.length} characters` : "Empty"} / {new Date(script.updated_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {script.compiled ? (
                  <Badge variant="secondary" className="text-green-400">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Compiled
                  </Badge>
                ) : (
                  <Badge variant="outline">Draft</Badge>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => { e.stopPropagation(); setDeleteTarget(script); }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Script</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Title</Label>
              <Input
                className="mt-1"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g., Episode 1 - The Beginning"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <Button onClick={handleCreate} disabled={!newTitle.trim()} className="w-full">
              Create Script
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" /> Delete Script
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.title}&quot;? This will NOT delete scenes compiled from this script.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
