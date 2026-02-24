"use client";

import { useState } from "react";
import { useProjectStore } from "@/lib/store";
import { api } from "@/lib/api";
import type { Scene } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Film,
  Play,
  CheckCircle2,
  Loader2,
  XCircle,
  Clapperboard,
  ArrowLeftRight,
  RefreshCw,
  ZoomIn,
  ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import NextImage from "next/image";

export function StoryboardView() {
  const { currentProject, scenes, setScenes } = useProjectStore();
  const [compareMode, setCompareMode] = useState(false);
  const [compareScenes, setCompareScenes] = useState<[Scene | null, Scene | null]>([null, null]);
  const [detailScene, setDetailScene] = useState<Scene | null>(null);

  if (!currentProject) return null;

  const sortedScenes = [...scenes].sort((a, b) => a.scene_number - b.scene_number);

  const handleRerender = async (scene: Scene) => {
    try {
      await api.scenes.render(currentProject.id, scene.id);
      const updated = await api.scenes.list(currentProject.id);
      setScenes(updated);
      toast.success(`Scene #${scene.scene_number} rendering...`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleSelectForCompare = (scene: Scene) => {
    if (!compareMode) return;
    if (!compareScenes[0]) {
      setCompareScenes([scene, null]);
    } else if (!compareScenes[1]) {
      setCompareScenes([compareScenes[0], scene]);
    } else {
      setCompareScenes([scene, null]);
    }
  };

  const handleViewDetail = async (scene: Scene) => {
    try {
      const detail = await api.scenes.get(currentProject.id, scene.id);
      setDetailScene(detail);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-3">
          <Film className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-lg font-bold">Storyboard Timeline</h1>
            <p className="text-xs text-muted-foreground">{sortedScenes.length} scenes / {sortedScenes.filter(s => s.render_status === "completed").length} rendered</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={compareMode ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setCompareMode(!compareMode);
              setCompareScenes([null, null]);
            }}
          >
            <ArrowLeftRight className="h-3.5 w-3.5 mr-1.5" />
            {compareMode ? "Exit Compare" : "Compare"}
          </Button>
        </div>
      </div>

      {sortedScenes.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Film className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No scenes to display</p>
            <p className="text-xs text-muted-foreground mt-1">Create scenes first to build your storyboard.</p>
          </div>
        </div>
      ) : (
        <>
          {/* Timeline */}
          <div className="flex-1 overflow-x-auto timeline-scroll p-6">
            <div className="relative min-w-max">
              {/* Connection line */}
              <div className="absolute top-[120px] left-0 right-0 h-0.5 bg-border" />

              <div className="flex gap-4">
                {sortedScenes.map((scene) => {
                  const isCompareSelected = compareScenes[0]?.id === scene.id || compareScenes[1]?.id === scene.id;
                  return (
                    <div
                      key={scene.id}
                      className={`relative flex flex-col items-center shrink-0 ${
                        compareMode ? "cursor-pointer" : ""
                      } ${isCompareSelected ? "ring-2 ring-primary rounded-xl" : ""}`}
                      onClick={() => compareMode ? handleSelectForCompare(scene) : undefined}
                    >
                      {/* Frame card */}
                      <div className="w-56 rounded-xl border border-border bg-card overflow-hidden group">
                        {/* Thumbnail area */}
                        <div className="relative h-36 overflow-hidden">
                          {scene.rendered_url && scene.render_status === "completed" ? (
                            <NextImage
                              src={scene.rendered_url}
                              alt={scene.title}
                              fill
                              className="object-cover transition-transform group-hover:scale-105"
                              unoptimized
                            />
                          ) : scene.render_status === "rendering" ? (
                            <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-900/20 to-amber-950/40">
                              <Loader2 className="h-8 w-8 text-amber-400 animate-spin" />
                              <p className="text-[10px] text-amber-400 mt-1">Rendering...</p>
                            </div>
                          ) : scene.render_status === "failed" ? (
                            <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-red-900/20 to-red-950/40">
                              <XCircle className="h-8 w-8 text-red-400" />
                              <p className="text-[10px] text-red-400 mt-1">Failed</p>
                            </div>
                          ) : (
                            <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-secondary/50 to-secondary">
                              <Clapperboard className="h-8 w-8 text-muted-foreground/30" />
                              <p className="text-[10px] text-muted-foreground mt-1">Draft</p>
                            </div>
                          )}

                          {/* Hover actions */}
                          {!compareMode && (
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => handleViewDetail(scene)}>
                                <ZoomIn className="h-3.5 w-3.5" />
                              </Button>
                              {scene.render_status === "completed" && (
                                <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => handleRerender(scene)}>
                                  <RefreshCw className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              {scene.render_status === "draft" && (
                                <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => handleRerender(scene)}>
                                  <Play className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="p-3">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-[10px] font-mono text-muted-foreground">#{scene.scene_number}</span>
                            <p className="text-xs font-medium truncate">{scene.title}</p>
                          </div>
                          <p className="text-[10px] text-muted-foreground line-clamp-2">{scene.description}</p>
                          <div className="flex items-center gap-1 mt-2">
                            <Badge variant="outline" className="text-[9px] px-1 py-0">{scene.mood}</Badge>
                            <Badge variant="outline" className="text-[9px] px-1 py-0">{scene.camera_angle}</Badge>
                          </div>
                        </div>
                      </div>

                      {/* Timeline node */}
                      <div className="relative mt-3">
                        <div className={`h-3 w-3 rounded-full border-2 ${
                          scene.render_status === "completed"
                            ? "bg-green-400 border-green-400"
                            : scene.render_status === "rendering"
                            ? "bg-amber-400 border-amber-400 animate-pulse"
                            : "bg-border border-muted-foreground/30"
                        }`} />
                      </div>

                      <p className="text-[10px] text-muted-foreground mt-2">Scene {scene.scene_number}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Compare Panel */}
          {compareMode && compareScenes[0] && compareScenes[1] && (
            <div className="border-t border-border bg-card p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <ArrowLeftRight className="h-4 w-4 text-primary" /> Scene Comparison
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {compareScenes.map((scene) => (
                  scene && (
                    <div key={scene.id} className="rounded-lg border border-border overflow-hidden">
                      {/* Compare image */}
                      <div className="relative h-40">
                        {scene.rendered_url && scene.render_status === "completed" ? (
                          <NextImage src={scene.rendered_url} alt={scene.title} fill className="object-cover" unoptimized />
                        ) : (
                          <div className="h-full flex items-center justify-center bg-secondary">
                            <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium">Scene #{scene.scene_number}: {scene.title}</span>
                          <Badge variant="outline" className="text-[10px]">{scene.render_status}</Badge>
                        </div>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between"><span className="text-muted-foreground">Mood</span><span>{scene.mood}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Camera</span><span>{scene.camera_angle}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Lighting</span><span>{scene.lighting}</span></div>
                          {scene.render_metadata && (scene.render_metadata as Record<string, unknown>).seed && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Seed</span>
                              <span className="font-mono">{String((scene.render_metadata as Record<string, unknown>).seed)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Scene Detail Dialog */}
      <Dialog open={!!detailScene} onOpenChange={() => setDetailScene(null)}>
        <DialogContent className="max-w-2xl">
          {detailScene && (
            <>
              <DialogHeader>
                <DialogTitle>Scene #{detailScene.scene_number}: {detailScene.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                {/* Full render */}
                {detailScene.rendered_url && detailScene.render_status === "completed" && (
                  <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-border">
                    <NextImage src={detailScene.rendered_url} alt={detailScene.title} fill className="object-cover" unoptimized />
                  </div>
                )}

                <p className="text-sm text-muted-foreground">{detailScene.description}</p>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-lg bg-secondary/50 p-2 text-center"><p className="text-muted-foreground">Mood</p><p className="font-medium mt-0.5">{detailScene.mood}</p></div>
                  <div className="rounded-lg bg-secondary/50 p-2 text-center"><p className="text-muted-foreground">Camera</p><p className="font-medium mt-0.5">{detailScene.camera_angle}</p></div>
                  <div className="rounded-lg bg-secondary/50 p-2 text-center"><p className="text-muted-foreground">Lighting</p><p className="font-medium mt-0.5">{detailScene.lighting}</p></div>
                </div>

                {/* Assets with thumbnails */}
                {detailScene.assets && detailScene.assets.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Assets Used</p>
                    <div className="grid grid-cols-4 gap-2">
                      {detailScene.assets.map((asset) => (
                        <div key={asset.id} className="rounded-lg border border-border overflow-hidden">
                          <div className="relative aspect-square">
                            {asset.thumbnail_url ? (
                              <NextImage src={asset.thumbnail_url} alt={asset.name} fill className="object-cover" unoptimized />
                            ) : (
                              <div className="h-full flex items-center justify-center bg-secondary">
                                <ImageIcon className="h-4 w-4 text-muted-foreground/30" />
                              </div>
                            )}
                          </div>
                          <p className="text-[10px] text-center py-1 truncate px-1">{asset.name}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Render versions with images */}
                {detailScene.versions && detailScene.versions.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Render Versions</p>
                    <div className="grid grid-cols-3 gap-2">
                      {detailScene.versions.map((v) => (
                        <div key={v.id} className="rounded-lg border border-border overflow-hidden">
                          {v.rendered_url ? (
                            <div className="relative aspect-video">
                              <NextImage src={v.rendered_url} alt={`v${v.version}`} fill className="object-cover" unoptimized />
                            </div>
                          ) : (
                            <div className="aspect-video flex items-center justify-center bg-secondary">
                              <ImageIcon className="h-4 w-4 text-muted-foreground/30" />
                            </div>
                          )}
                          <div className="px-2 py-1 flex justify-between text-[10px]">
                            <span className="font-medium">v{v.version}</span>
                            <span className="text-muted-foreground font-mono">
                              seed: {String((v.render_metadata as Record<string, unknown>)?.seed || "N/A")}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
