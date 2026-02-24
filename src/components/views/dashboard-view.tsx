"use client";

import { useProjectStore } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Box,
  FileText,
  Clapperboard,
  Lock,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  ImageIcon,
} from "lucide-react";
import Image from "next/image";

interface DashboardViewProps {
  onRefresh: () => void;
}

export function DashboardView({ onRefresh }: DashboardViewProps) {
  const { currentProject, stats, setView } = useProjectStore();

  if (!currentProject) return null;

  const statCards = [
    { label: "Total Assets", value: stats?.assetCount ?? 0, icon: <Box className="h-5 w-5" />, color: "text-blue-400" },
    { label: "Locked Assets", value: stats?.lockedAssets ?? 0, icon: <Lock className="h-5 w-5" />, color: "text-amber-400" },
    { label: "Scripts", value: stats?.scriptCount ?? 0, icon: <FileText className="h-5 w-5" />, color: "text-emerald-400" },
    { label: "Scenes", value: stats?.sceneCount ?? 0, icon: <Clapperboard className="h-5 w-5" />, color: "text-purple-400" },
    { label: "Rendered", value: stats?.renderedScenes ?? 0, icon: <CheckCircle2 className="h-5 w-5" />, color: "text-green-400" },
  ];

  const typeColors: Record<string, string> = {
    character: "bg-blue-500/20 text-blue-300",
    environment: "bg-emerald-500/20 text-emerald-300",
    nature: "bg-amber-500/20 text-amber-300",
    prop: "bg-purple-500/20 text-purple-300",
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{currentProject.name}</h1>
          <div className="flex items-center gap-3 mt-2">
            <Badge variant="secondary">{currentProject.visual_style}</Badge>
            <Badge variant="outline">{currentProject.base_model}</Badge>
            <Badge variant="outline">{currentProject.default_sampler}</Badge>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-5 gap-3">
        {statCards.map((card) => (
          <div key={card.label} className="rounded-xl border border-border bg-card p-4">
            <div className={`${card.color} mb-2`}>{card.icon}</div>
            <p className="text-2xl font-bold">{card.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Asset Distribution */}
      {stats && stats.assetsByType.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">Asset Distribution</h2>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setView("assets")}>
              View All <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
          <div className="flex gap-2">
            {stats.assetsByType.map((item) => (
              <div key={item.type} className="flex-1 rounded-lg bg-secondary/50 p-3 text-center">
                <Badge className={typeColors[item.type] || "bg-gray-500/20 text-gray-300"} variant="secondary">
                  {item.type}
                </Badge>
                <p className="text-xl font-bold mt-2">{item.count}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Recent Assets */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Recent Assets</h2>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setView("assets")}>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
          {stats && stats.recentAssets.length > 0 ? (
            <div className="space-y-2">
              {stats.recentAssets.map((asset) => (
                <div key={asset.id} className="flex items-center gap-3 rounded-lg bg-secondary/30 px-3 py-2">
                  <div className="relative h-10 w-10 rounded-md overflow-hidden shrink-0 bg-secondary">
                    {asset.thumbnail_url ? (
                      <Image src={asset.thumbnail_url} alt={asset.name} fill className="object-cover" unoptimized />
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <ImageIcon className="h-4 w-4 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{asset.name}</p>
                    <p className="text-xs text-muted-foreground">{asset.type} / v{asset.version}</p>
                  </div>
                  {asset.locked ? <Lock className="h-3.5 w-3.5 text-amber-400" /> : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No assets yet. Start by creating assets in the Asset Library.</p>
          )}
        </div>

        {/* Recent Scenes */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Recent Scenes</h2>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setView("scenes")}>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
          {stats && stats.recentScenes.length > 0 ? (
            <div className="space-y-2">
              {stats.recentScenes.map((scene) => (
                <div key={scene.id} className="flex items-center gap-3 rounded-lg bg-secondary/30 px-3 py-2">
                  <div className="relative h-10 w-16 rounded-md overflow-hidden shrink-0 bg-secondary">
                    {scene.rendered_url && scene.render_status === "completed" ? (
                      <Image src={scene.rendered_url} alt={scene.title} fill className="object-cover" unoptimized />
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <Clapperboard className="h-4 w-4 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{scene.title}</p>
                    <p className="text-xs text-muted-foreground">Scene #{scene.scene_number}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      scene.render_status === "completed"
                        ? "text-green-400 border-green-400/30"
                        : scene.render_status === "rendering"
                        ? "text-amber-400 border-amber-400/30"
                        : "text-muted-foreground"
                    }
                  >
                    {scene.render_status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No scenes yet. Create scripts or scenes to get started.</p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold mb-3">Quick Actions</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setView("assets")}>
            <Box className="h-3.5 w-3.5 mr-1.5" /> New Asset
          </Button>
          <Button variant="outline" size="sm" onClick={() => setView("scripts")}>
            <FileText className="h-3.5 w-3.5 mr-1.5" /> New Script
          </Button>
          <Button variant="outline" size="sm" onClick={() => setView("scenes")}>
            <Clapperboard className="h-3.5 w-3.5 mr-1.5" /> New Scene
          </Button>
          <Button variant="outline" size="sm" onClick={() => setView("storyboard")}>
            View Storyboard
          </Button>
        </div>
      </div>
    </div>
  );
}
