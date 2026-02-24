"use client";

import { useState, useEffect, useRef } from "react";
import { useProjectStore } from "@/lib/store";
import { api } from "@/lib/api";
import type { Scene, Asset } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Clapperboard,
  Plus,
  Trash2,
  Save,
  Play,
  Box,
  Lock,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  XCircle,
  ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

const MOODS = ["neutral", "tense", "romantic", "melancholic", "joyful", "mysterious", "epic", "peaceful"];
const CAMERA_ANGLES = ["wide shot", "medium shot", "close-up", "extreme close-up", "bird's eye", "low angle", "dutch angle", "over-the-shoulder"];
const LIGHTING = ["natural", "dramatic", "soft", "harsh", "backlit", "rim light", "golden hour", "moonlight", "neon"];

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  draft: { icon: <Clapperboard className="h-3.5 w-3.5" />, color: "text-muted-foreground" },
  rendering: { icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, color: "text-amber-400" },
  completed: { icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: "text-green-400" },
  failed: { icon: <XCircle className="h-3.5 w-3.5" />, color: "text-red-400" },
};

export function ScenesView() {
  const { currentProject, scenes, setScenes, assets } = useProjectStore();
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Scene | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [editData, setEditData] = useState<Partial<Scene>>({});
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [rendering, setRendering] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  if (!currentProject) return null;

  const allAssets = assets;

  // Poll for rendering scenes
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    const hasRendering = scenes.some((s) => s.render_status === "rendering") ||
      (selectedScene && selectedScene.render_status === "rendering");
    if (hasRendering && currentProject) {
      pollRef.current = setInterval(async () => {
        const updatedScenes = await api.scenes.list(currentProject.id);
        setScenes(updatedScenes);
        if (selectedScene) {
          const updated = updatedScenes.find((s) => s.id === selectedScene.id);
          if (updated && updated.render_status !== "rendering") {
            const detail = await api.scenes.get(currentProject.id, selectedScene.id);
            setSelectedScene(detail);
            if (updated.render_status === "completed") {
              toast.success("Scene rendered successfully!");
            }
            setRendering(false);
          }
        }
      }, 3000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenes, selectedScene?.id, selectedScene?.render_status, currentProject?.id]);

  const refreshData = async () => {
    if (!currentProject) return;
    const [updatedScenes, updatedAssets] = await Promise.all([
      api.scenes.list(currentProject.id),
      api.assets.list(currentProject.id),
    ]);
    setScenes(updatedScenes);
    useProjectStore.getState().setAssets(updatedAssets);
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    try {
      await api.scenes.create(currentProject.id, { title: newTitle.trim(), description: newDesc });
      await refreshData();
      setCreateOpen(false);
      setNewTitle("");
      setNewDesc("");
      toast.success("Scene created");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const openScene = async (scene: Scene) => {
    try {
      const detail = await api.scenes.get(currentProject.id, scene.id);
      setSelectedScene(detail);
      setEditData({
        title: detail.title,
        description: detail.description,
        mood: detail.mood,
        camera_angle: detail.camera_angle,
        lighting: detail.lighting,
      });
      setSelectedAssetIds((detail.assets || []).map((a: Asset) => a.id));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleSave = async () => {
    if (!selectedScene) return;
    setSaving(true);
    try {
      await api.scenes.update(currentProject.id, selectedScene.id, editData);
      await api.scenes.setAssets(
        currentProject.id,
        selectedScene.id,
        selectedAssetIds.map((id) => ({ asset_id: id }))
      );
      await refreshData();
      toast.success("Scene saved");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleRender = async () => {
    if (!selectedScene) return;
    await handleSave();
    setRendering(true);
    try {
      const result = await api.scenes.render(currentProject.id, selectedScene.id);
      setSelectedScene({ ...selectedScene, render_status: result.render_status, rendered_url: result.rendered_url });
      await refreshData();
      if (result.render_status === "completed") {
        toast.success("Scene rendered successfully");
        setRendering(false);
      } else {
        toast.success("Scene rendering started...");
      }
    } catch (e) {
      toast.error((e as Error).message);
      setRendering(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.scenes.delete(currentProject.id, deleteTarget.id);
      await refreshData();
      if (selectedScene?.id === deleteTarget.id) setSelectedScene(null);
      setDeleteTarget(null);
      toast.success("Scene deleted");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const toggleAsset = (assetId: string) => {
    setSelectedAssetIds((prev) =>
      prev.includes(assetId) ? prev.filter((id) => id !== assetId) : [...prev, assetId]
    );
  };

  // Scene editor
  if (selectedScene) {
    const canRender = selectedAssetIds.length > 0 && selectedAssetIds.every((id) => {
      const asset = assets.find((a) => a.id === id);
      return asset?.locked;
    });

    const unlockedSelected = selectedAssetIds.filter((id) => {
      const asset = assets.find((a) => a.id === id);
      return asset && !asset.locked;
    });

    return (
      <div className="flex flex-col h-full">
        {/* Editor Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedScene(null)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold">Scene #{selectedScene.scene_number}</span>
            <Badge variant="outline" className={STATUS_CONFIG[selectedScene.render_status]?.color}>
              {STATUS_CONFIG[selectedScene.render_status]?.icon}
              <span className="ml-1">{selectedScene.render_status}</span>
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>
              <Save className="h-3.5 w-3.5 mr-1.5" /> {saving ? "Saving..." : "Save"}
            </Button>
            <Button
              size="sm"
              onClick={handleRender}
              disabled={rendering || !canRender}
                title={!canRender ? "All assigned assets must be locked" : "Render scene"}
            >
              {rendering ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Play className="h-3.5 w-3.5 mr-1.5" />}
              {rendering ? "Rendering..." : "Render Scene"}
            </Button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Scene Properties */}
          <div className="flex-1 p-5 overflow-y-auto custom-scrollbar space-y-4">
            <div>
              <Label className="text-xs">Title</Label>
              <Input
                className="mt-1"
                value={editData.title || ""}
                onChange={(e) => setEditData({ ...editData, title: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea
                className="mt-1"
                rows={4}
                value={editData.description || ""}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Mood</Label>
                <Select value={editData.mood || "neutral"} onValueChange={(v) => setEditData({ ...editData, mood: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MOODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Camera Angle</Label>
                <Select value={editData.camera_angle || "medium shot"} onValueChange={(v) => setEditData({ ...editData, camera_angle: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CAMERA_ANGLES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Lighting</Label>
                <Select value={editData.lighting || "natural"} onValueChange={(v) => setEditData({ ...editData, lighting: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LIGHTING.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Render Preview */}
            {selectedScene.rendered_url && selectedScene.render_status === "completed" && (
              <div>
                <Label className="text-xs">Rendered Scene</Label>
                <div className="mt-1 rounded-xl overflow-hidden border border-border">
                  <div className="relative w-full aspect-video">
                    <Image
                      src={selectedScene.rendered_url}
                      alt={selectedScene.title}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  <span className="text-xs text-green-400">Rendered successfully</span>
                  {selectedScene.render_metadata && (
                    <span className="text-[10px] text-muted-foreground ml-auto font-mono">
                      seed: {String((selectedScene.render_metadata as Record<string, unknown>).seed || "N/A")}
                    </span>
                  )}
                </div>
              </div>
            )}

            {selectedScene.render_status === "rendering" && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6 text-center">
                <Loader2 className="h-10 w-10 text-amber-400 mx-auto mb-3 animate-spin" />
                <p className="text-sm text-amber-400 font-medium">Rendering Scene...</p>
                <p className="text-xs text-amber-300/70 mt-1">
                  Composing {selectedAssetIds.length} assets into a single frame
                </p>
                <Progress value={60} className="w-48 mx-auto mt-3" />
              </div>
            )}

            {selectedScene.render_status === "failed" && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-center">
                <XCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
                <p className="text-sm text-red-400">Render failed</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={handleRender} disabled={!canRender}>
                  Retry Render
                </Button>
              </div>
            )}

            {/* Warnings */}
            {unlockedSelected.length > 0 && (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-amber-400">Unlocked Assets</p>
                  <p className="text-xs text-amber-300/70 mt-0.5">
                    {unlockedSelected.length} selected asset(s) are unlocked. All assets must be locked before rendering.
                  </p>
                </div>
              </div>
            )}

            {selectedAssetIds.length === 0 && (
              <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 flex items-start gap-2">
                <Box className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-blue-400">No Assets Assigned</p>
                  <p className="text-xs text-blue-300/70 mt-0.5">
                    Select assets from the panel on the right to compose this scene.
                  </p>
                </div>
              </div>
            )}

            {/* Selected Asset Previews */}
            {selectedAssetIds.length > 0 && (
              <div>
                <Label className="text-xs">Selected Assets ({selectedAssetIds.length})</Label>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {selectedAssetIds.map((id) => {
                    const asset = allAssets.find((a) => a.id === id);
                    if (!asset) return null;
                    return (
                      <div key={id} className="rounded-lg border border-border overflow-hidden">
                        <div className="relative aspect-square">
                          {asset.thumbnail_url ? (
                            <Image src={asset.thumbnail_url} alt={asset.name} fill className="object-cover" unoptimized />
                          ) : (
                            <div className="h-full flex items-center justify-center bg-secondary">
                              <ImageIcon className="h-5 w-5 text-muted-foreground/30" />
                            </div>
                          )}
                        </div>
                        <div className="px-2 py-1">
                          <p className="text-[10px] font-medium truncate">{asset.name}</p>
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-[8px] px-1 py-0">{asset.type}</Badge>
                            {asset.locked ? <Lock className="h-2.5 w-2.5 text-amber-400" /> : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Asset Selector Panel */}
          <div className="w-80 border-l border-border overflow-y-auto custom-scrollbar bg-secondary/20 p-4">
            <h3 className="text-sm font-semibold mb-1">Scene Assets</h3>
            <p className="text-xs text-muted-foreground mb-3">
              {selectedAssetIds.length} asset(s) selected
            </p>

            {allAssets.length === 0 ? (
              <p className="text-xs text-muted-foreground">No assets in project. Create assets first.</p>
            ) : (
              <div className="space-y-1.5">
                {allAssets.map((asset) => (
                  <label
                    key={asset.id}
                    className={`flex items-center gap-2.5 rounded-lg border p-2 cursor-pointer transition-colors ${
                      selectedAssetIds.includes(asset.id)
                        ? "border-primary/50 bg-primary/5"
                        : "border-border hover:bg-accent/50"
                    }`}
                  >
                    <Checkbox
                      checked={selectedAssetIds.includes(asset.id)}
                      onCheckedChange={() => toggleAsset(asset.id)}
                    />
                    {/* Asset thumbnail mini */}
                    <div className="relative h-9 w-9 rounded overflow-hidden shrink-0 bg-secondary">
                      {asset.thumbnail_url ? (
                        <Image src={asset.thumbnail_url} alt={asset.name} fill className="object-cover" unoptimized />
                      ) : (
                        <div className="h-full flex items-center justify-center">
                          <ImageIcon className="h-3.5 w-3.5 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{asset.name}</p>
                      <p className="text-[10px] text-muted-foreground">{asset.type} / v{asset.version}</p>
                    </div>
                    {asset.locked ? (
                      <Lock className="h-3 w-3 text-amber-400 shrink-0" />
                    ) : (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0">unlocked</Badge>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Scene list
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Scenes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{scenes.length} scenes in project</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> New Scene
        </Button>
      </div>

      {scenes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Clapperboard className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No scenes yet</p>
          <p className="text-xs text-muted-foreground mt-1">Create scenes manually or compile them from a script.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Create Scene
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {scenes.map((scene) => {
            const sc = STATUS_CONFIG[scene.render_status];
            return (
              <div
                key={scene.id}
                className="flex items-center gap-4 rounded-xl border border-border bg-card p-3 hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => openScene(scene)}
              >
                {/* Scene thumbnail */}
                <div className="relative h-16 w-24 rounded-lg overflow-hidden border border-border shrink-0 bg-secondary">
                  {scene.rendered_url && scene.render_status === "completed" ? (
                    <Image src={scene.rendered_url} alt={scene.title} fill className="object-cover" unoptimized />
                  ) : scene.render_status === "rendering" ? (
                    <div className="h-full flex items-center justify-center">
                      <Loader2 className="h-5 w-5 text-amber-400 animate-spin" />
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                      <Clapperboard className="h-5 w-5 text-muted-foreground/40" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-mono">#{scene.scene_number}</span>
                    <p className="text-sm font-medium truncate">{scene.title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{scene.description}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Badge variant="outline" className="text-[10px]">{scene.mood}</Badge>
                    <Badge variant="outline" className="text-[10px]">{scene.camera_angle}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={sc?.color}>
                    {sc?.icon}
                    <span className="ml-1">{scene.render_status}</span>
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(scene); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Scene</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Title</Label>
              <Input className="mt-1" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g., The Opening Shot" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea className="mt-1" rows={3} value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Describe what happens in this scene..." />
            </div>
            <Button onClick={handleCreate} disabled={!newTitle.trim()} className="w-full">Create Scene</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" /> Delete Scene
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.title}&quot;?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
