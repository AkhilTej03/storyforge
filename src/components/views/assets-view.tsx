"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useProjectStore } from "@/lib/store";
import { api } from "@/lib/api";
import type { Asset, AssetType, AssetDetail, AssetVariant } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  Box,
  Plus,
  Lock,
  LockOpen,
  Trash2,
  Eye,
  User,
  Mountain,
  TreePine,
  Wrench,
  Search,
  AlertTriangle,
  RefreshCw,
  Loader2,
  ImageIcon,
  CheckCircle2,
  XCircle,
  Sparkles,
  Grid3X3,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

const ASSET_TYPE_ICONS: Record<string, React.ReactNode> = {
  character: <User className="h-4 w-4" />,
  environment: <Mountain className="h-4 w-4" />,
  nature: <TreePine className="h-4 w-4" />,
  prop: <Wrench className="h-4 w-4" />,
};

const ASSET_TYPE_COLORS: Record<string, string> = {
  character: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  environment: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  nature: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  prop: "bg-purple-500/15 text-purple-400 border-purple-500/20",
};

const PLACEHOLDER_COLORS: Record<string, string> = {
  character: "from-blue-900/40 to-blue-950/60",
  environment: "from-emerald-900/40 to-emerald-950/60",
  nature: "from-amber-900/40 to-amber-950/60",
  prop: "from-purple-900/40 to-purple-950/60",
};

const GEN_STATUS_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  idle: { icon: <ImageIcon className="h-4 w-4" />, label: "No image", color: "text-muted-foreground" },
  generating: { icon: <Loader2 className="h-4 w-4 animate-spin" />, label: "Generating...", color: "text-amber-400" },
  completed: { icon: <CheckCircle2 className="h-4 w-4" />, label: "Generated", color: "text-green-400" },
  failed: { icon: <XCircle className="h-4 w-4" />, label: "Failed", color: "text-red-400" },
};

const ASSET_FORMS: Record<AssetType, { label: string; fields: { key: string; label: string; type: "text" | "select" | "textarea"; options?: string[] }[] }> = {
  character: {
    label: "Character",
    fields: [
      { key: "name", label: "Character Name", type: "text" },
      { key: "description", label: "Character Description", type: "textarea" },
      { key: "age_group", label: "Age Group", type: "select", options: ["child", "teen", "young adult", "adult", "elderly"] },
      { key: "body_type", label: "Body Type", type: "select", options: ["slim", "average", "athletic", "muscular", "heavy"] },
      { key: "hair_style", label: "Hair Style", type: "select", options: ["short", "medium", "long", "bald", "ponytail", "braided", "curly"] },
      { key: "hair_color", label: "Hair Color", type: "select", options: ["black", "brown", "blonde", "red", "gray", "white", "blue", "pink"] },
      { key: "clothing", label: "Clothing Style", type: "text" },
      { key: "expression", label: "Default Expression", type: "select", options: ["neutral", "happy", "serious", "sad", "angry", "surprised"] },
    ],
  },
  environment: {
    label: "Environment",
    fields: [
      { key: "name", label: "Environment Name", type: "text" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "setting_type", label: "Setting Type", type: "select", options: ["interior", "exterior", "urban", "rural", "fantasy", "sci-fi"] },
      { key: "time_of_day", label: "Time of Day", type: "select", options: ["dawn", "morning", "noon", "afternoon", "sunset", "night"] },
      { key: "weather", label: "Weather", type: "select", options: ["clear", "cloudy", "rainy", "snowy", "foggy", "stormy"] },
      { key: "architecture", label: "Architecture Style", type: "text" },
    ],
  },
  nature: {
    label: "Nature",
    fields: [
      { key: "name", label: "Element Name", type: "text" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "nature_type", label: "Type", type: "select", options: ["forest", "mountain", "river", "ocean", "desert", "garden", "sky", "field"] },
      { key: "season", label: "Season", type: "select", options: ["spring", "summer", "autumn", "winter"] },
      { key: "density", label: "Density", type: "select", options: ["sparse", "moderate", "dense", "lush"] },
    ],
  },
  prop: {
    label: "Prop",
    fields: [
      { key: "name", label: "Prop Name", type: "text" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "material", label: "Material", type: "select", options: ["wood", "metal", "glass", "fabric", "plastic", "stone", "leather"] },
      { key: "size", label: "Size", type: "select", options: ["tiny", "small", "medium", "large", "oversized"] },
      { key: "condition", label: "Condition", type: "select", options: ["new", "worn", "damaged", "ancient", "futuristic"] },
    ],
  },
};

export function AssetsView() {
  const { currentProject, assets, setAssets } = useProjectStore();
  const [activeTab, setActiveTab] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [creationOpen, setCreationOpen] = useState(false);
  const [detailAsset, setDetailAsset] = useState<AssetDetail | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null);
  const [creationType, setCreationType] = useState<AssetType>("character");
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const refreshAssets = useCallback(async () => {
    if (!currentProject) return;
    const updated = await api.assets.list(currentProject.id);
    setAssets(updated);
  }, [currentProject, setAssets]);

  // Poll for generating assets
  useEffect(() => {
    const hasGenerating = assets.some((a) => a.generation_status === "generating");
    if (hasGenerating) {
      pollRef.current = setInterval(() => {
        refreshAssets();
      }, 3000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [assets, refreshAssets]);

  if (!currentProject) return null;

  const filteredAssets = assets.filter((a) => {
    if (activeTab !== "all" && a.type !== activeTab) return false;
    if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleCreate = async () => {
    if (!formData.name?.trim()) {
      toast.error("Name is required");
      return;
    }
    setCreating(true);
    try {
      const { name, description, ...rest } = formData;
      const visualPrompt = buildPrompt(creationType, formData, currentProject.visual_style);
      await api.assets.create(currentProject.id, {
        name: name.trim(),
        type: creationType,
        description: description || "",
        visual_prompt: visualPrompt,
        negative_prompt: "low quality, blurry, deformed, disfigured, bad anatomy, text, watermark",
        seed: Math.floor(Math.random() * 2147483647),
        metadata: rest,
      });
      await refreshAssets();
      setCreationOpen(false);
      setFormData({});
      toast.success("Asset created - image generating...");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const handleLock = async (asset: Asset) => {
    try {
      await api.assets.lock(currentProject.id, asset.id);
      await refreshAssets();
      toast.success(`${asset.name} locked`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.assets.delete(currentProject.id, deleteTarget.id);
      await refreshAssets();
      setDeleteTarget(null);
      toast.success("Asset deleted");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleViewDetail = async (asset: Asset) => {
    try {
      const detail = await api.assets.get(currentProject.id, asset.id);
      setDetailAsset(detail);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleRegenerate = async (asset: Asset) => {
    try {
      await api.assets.generate(currentProject.id, asset.id);
      await refreshAssets();
      toast.success("Regenerating image...");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleGenerateVariants = async (asset: Asset) => {
    try {
      setVariantsLoading(true);
      await api.assets.generate(currentProject.id, asset.id, { variants: 4 });
      await refreshAssets();
      toast.success("Generating 4 variants...");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setVariantsLoading(false);
    }
  };

  const handleSelectVariant = async (assetId: string, variantId: string) => {
    try {
      await api.assets.selectVariant(currentProject.id, assetId, variantId);
      const detail = await api.assets.get(currentProject.id, assetId);
      setDetailAsset(detail);
      await refreshAssets();
      toast.success("Variant selected as primary");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Asset Library</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {assets.length} assets in project
            {assets.some((a) => a.generation_status === "generating") && (
              <span className="ml-2 text-amber-400 inline-flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Generating...
              </span>
            )}
          </p>
        </div>
        <Button onClick={() => setCreationOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> New Asset
        </Button>
      </div>

      {/* Tabs + Search */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="character">Characters</TabsTrigger>
            <TabsTrigger value="environment">Environments</TabsTrigger>
            <TabsTrigger value="nature">Nature</TabsTrigger>
            <TabsTrigger value="prop">Props</TabsTrigger>
          </TabsList>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search assets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 w-64 h-9"
            />
          </div>
        </div>

        <TabsContent value={activeTab} className="mt-4">
          {filteredAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Box className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No assets found</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setCreationOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Create Asset
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredAssets.map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  onView={() => handleViewDetail(asset)}
                  onLock={() => handleLock(asset)}
                  onDelete={() => setDeleteTarget(asset)}
                  onRegenerate={() => handleRegenerate(asset)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Creation Dialog */}
      <Dialog open={creationOpen} onOpenChange={setCreationOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Create New Asset
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Type Selection */}
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Asset Type</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {(["character", "environment", "nature", "prop"] as AssetType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => { setCreationType(type); setFormData({}); }}
                    className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs transition-colors ${
                      creationType === type
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {ASSET_TYPE_ICONS[type]}
                    <span className="capitalize">{type}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Structured Form */}
            {ASSET_FORMS[creationType].fields.map((field) => (
              <div key={field.key}>
                <Label className="text-xs">{field.label}</Label>
                {field.type === "text" && (
                  <Input
                    className="mt-1"
                    value={formData[field.key] || ""}
                    onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                    placeholder={`Enter ${field.label.toLowerCase()}...`}
                  />
                )}
                {field.type === "textarea" && (
                  <Textarea
                    className="mt-1"
                    rows={3}
                    value={formData[field.key] || ""}
                    onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                    placeholder={`Describe the ${creationType}...`}
                  />
                )}
                {field.type === "select" && field.options && (
                  <Select
                    value={formData[field.key] || ""}
                    onValueChange={(v) => setFormData({ ...formData, [field.key]: v })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options.map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ))}

            <div className="rounded-lg bg-secondary/30 border border-border p-3">
              <p className="text-xs text-muted-foreground">
                An AI-generated reference image will be created automatically based on your inputs.
                You can regenerate or create variants after creation.
              </p>
            </div>

            <Button onClick={handleCreate} disabled={creating || !formData.name?.trim()} className="w-full">
              {creating ? (
                <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Creating & Generating...</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-1.5" /> Create & Generate Image</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Asset Detail Dialog */}
      <Dialog open={!!detailAsset} onOpenChange={() => setDetailAsset(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {detailAsset && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {ASSET_TYPE_ICONS[detailAsset.type]}
                  {detailAsset.name}
                  {detailAsset.locked ? <Lock className="h-4 w-4 text-amber-400" /> : null}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                {/* Main Image */}
                <div className="rounded-xl overflow-hidden border border-border bg-secondary/20">
                  {detailAsset.thumbnail_url ? (
                    <div className="relative w-full aspect-square max-h-96">
                      <Image
                        src={detailAsset.thumbnail_url}
                        alt={detailAsset.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  ) : detailAsset.generation_status === "generating" ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-3">
                      <Loader2 className="h-10 w-10 text-amber-400 animate-spin" />
                      <p className="text-sm text-amber-400">Generating image...</p>
                      <Progress value={66} className="w-48" />
                    </div>
                  ) : detailAsset.generation_status === "failed" ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-3">
                      <XCircle className="h-10 w-10 text-red-400" />
                      <p className="text-sm text-red-400">Generation failed</p>
                      {!detailAsset.locked && (
                        <Button variant="outline" size="sm" onClick={() => handleRegenerate(detailAsset)}>
                          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className={`flex flex-col items-center justify-center h-64 bg-gradient-to-br ${PLACEHOLDER_COLORS[detailAsset.type]}`}>
                      <ImageIcon className="h-10 w-10 text-muted-foreground/30 mb-2" />
                      <p className="text-xs text-muted-foreground">No image generated</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {!detailAsset.locked && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRegenerate(detailAsset)}
                      disabled={detailAsset.generation_status === "generating"}
                    >
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Regenerate
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleGenerateVariants(detailAsset)}
                      disabled={detailAsset.generation_status === "generating" || variantsLoading}
                    >
                      <Grid3X3 className="h-3.5 w-3.5 mr-1.5" /> Generate 4 Variants
                    </Button>
                  </div>
                )}

                {/* Metadata Badges */}
                <div className="flex flex-wrap gap-2">
                  <Badge className={ASSET_TYPE_COLORS[detailAsset.type]}>{detailAsset.type}</Badge>
                  <Badge variant="outline">v{detailAsset.version}</Badge>
                  {detailAsset.locked && <Badge variant="secondary" className="text-amber-400">Locked</Badge>}
                  <Badge variant="outline" className={GEN_STATUS_CONFIG[detailAsset.generation_status]?.color}>
                    {GEN_STATUS_CONFIG[detailAsset.generation_status]?.icon}
                    <span className="ml-1">{GEN_STATUS_CONFIG[detailAsset.generation_status]?.label}</span>
                  </Badge>
                </div>

                {detailAsset.description && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Description</p>
                    <p className="text-sm mt-1">{detailAsset.description}</p>
                  </div>
                )}

                {detailAsset.visual_prompt && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Generated Prompt</p>
                    <p className="text-xs mt-1 rounded-md bg-secondary/50 p-2 font-mono">{detailAsset.visual_prompt}</p>
                  </div>
                )}

                {detailAsset.seed && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Seed</p>
                    <p className="text-sm font-mono mt-1">{detailAsset.seed}</p>
                  </div>
                )}

                {/* Variants */}
                {detailAsset.variants && detailAsset.variants.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Variants</p>
                    <div className="grid grid-cols-4 gap-2">
                      {detailAsset.variants.map((variant: AssetVariant) => (
                        <button
                          key={variant.id}
                          onClick={() => !detailAsset.locked && handleSelectVariant(detailAsset.id, variant.id)}
                          className={`relative rounded-lg overflow-hidden border-2 transition-colors ${
                            variant.selected ? "border-primary" : "border-border hover:border-primary/50"
                          } ${detailAsset.locked ? "cursor-default" : "cursor-pointer"}`}
                        >
                          {variant.thumbnail_url ? (
                            <div className="relative aspect-square">
                              <Image
                                src={variant.thumbnail_url}
                                alt={`Variant ${variant.variant_index}`}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                          ) : (
                            <div className="aspect-square flex items-center justify-center bg-secondary">
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                          )}
                          {variant.selected && (
                            <div className="absolute top-1 right-1 bg-primary rounded-full p-0.5">
                              <Check className="h-3 w-3 text-primary-foreground" />
                            </div>
                          )}
                          <p className="text-[9px] text-center py-0.5 text-muted-foreground">
                            #{variant.variant_index}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Version History with thumbnails */}
                {detailAsset.versions && detailAsset.versions.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Version History</p>
                    <div className="space-y-2">
                      {detailAsset.versions.map((v) => (
                        <div key={v.id} className="flex items-center gap-3 rounded-lg bg-secondary/30 px-3 py-2">
                          {v.thumbnail_url ? (
                            <div className="relative h-10 w-10 rounded overflow-hidden shrink-0">
                              <Image src={v.thumbnail_url} alt={`v${v.version}`} fill className="object-cover" unoptimized />
                            </div>
                          ) : (
                            <div className="h-10 w-10 rounded bg-secondary flex items-center justify-center shrink-0">
                              <ImageIcon className="h-4 w-4 text-muted-foreground/30" />
                            </div>
                          )}
                          <div className="flex-1">
                            <span className="text-xs font-medium">v{v.version}</span>
                            {v.seed && <span className="text-[10px] text-muted-foreground ml-2">seed: {v.seed}</span>}
                          </div>
                          <span className="text-[10px] text-muted-foreground">{new Date(v.created_at).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Used in Scenes */}
                {detailAsset.used_in_scenes && detailAsset.used_in_scenes.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Used in Scenes</p>
                    <div className="space-y-1">
                      {detailAsset.used_in_scenes.map((scene) => (
                        <div key={scene.id} className="flex items-center gap-2 text-sm rounded bg-secondary/30 px-3 py-1.5">
                          {scene.rendered_url ? (
                            <div className="relative h-8 w-12 rounded overflow-hidden shrink-0">
                              <Image src={scene.rendered_url} alt={scene.title} fill className="object-cover" unoptimized />
                            </div>
                          ) : null}
                          <span>{scene.title} (#{scene.scene_number})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Lock Button */}
                {!detailAsset.locked && detailAsset.generation_status === "completed" && (
                  <Button
                    onClick={async () => {
                      await handleLock(detailAsset);
                      setDetailAsset(null);
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    <Lock className="h-3.5 w-3.5 mr-1.5" /> Lock Asset (Freeze for Scene Use)
                  </Button>
                )}

                {!detailAsset.locked && detailAsset.generation_status !== "completed" && (
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-300/70">
                      Generate an image before locking. Locked assets are immutable and used for scene rendering.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" /> Delete Asset
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.name}&quot;? This action cannot be undone.
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

function AssetCard({
  asset,
  onView,
  onLock,
  onDelete,
  onRegenerate,
}: {
  asset: Asset;
  onView: () => void;
  onLock: () => void;
  onDelete: () => void;
  onRegenerate: () => void;
}) {
  const isGenerating = asset.generation_status === "generating";

  return (
    <div className="asset-card group rounded-xl border border-border bg-card overflow-hidden">
      {/* Thumbnail */}
      <div className="relative h-44 overflow-hidden">
        {asset.thumbnail_url ? (
          <Image
            src={asset.thumbnail_url}
            alt={asset.name}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            unoptimized
          />
        ) : isGenerating ? (
          <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-900/20 to-amber-950/40 gap-2">
            <Loader2 className="h-8 w-8 text-amber-400 animate-spin" />
            <p className="text-[10px] text-amber-400">Generating...</p>
            <div className="w-24">
              <Progress value={50} className="h-1" />
            </div>
          </div>
        ) : asset.generation_status === "failed" ? (
          <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-red-900/20 to-red-950/40 gap-2">
            <XCircle className="h-8 w-8 text-red-400" />
            <p className="text-[10px] text-red-400">Failed</p>
          </div>
        ) : (
          <div className={`h-full flex items-center justify-center bg-gradient-to-br ${PLACEHOLDER_COLORS[asset.type]}`}>
            <div className="text-4xl opacity-30">{ASSET_TYPE_ICONS[asset.type]}</div>
          </div>
        )}

        {/* Lock badge */}
        {asset.locked ? (
          <div className="absolute top-2 right-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/80 text-white">
              <Lock className="h-3 w-3" />
            </div>
          </div>
        ) : null}

        {/* Generation status indicator */}
        {asset.generation_status === "completed" && !isGenerating && (
          <div className="absolute top-2 left-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500/80 text-white">
              <CheckCircle2 className="h-3 w-3" />
            </div>
          </div>
        )}

        {/* Hover actions */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Button size="icon" variant="secondary" className="h-8 w-8" onClick={onView}>
            <Eye className="h-3.5 w-3.5" />
          </Button>
          {!asset.locked && (
            <>
              {asset.generation_status !== "generating" && (
                <Button size="icon" variant="secondary" className="h-8 w-8" onClick={onRegenerate}>
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              )}
              {asset.generation_status === "completed" && (
                <Button size="icon" variant="secondary" className="h-8 w-8" onClick={onLock}>
                  <LockOpen className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button size="icon" variant="destructive" className="h-8 w-8" onClick={onDelete}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>
      {/* Info */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{asset.name}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${ASSET_TYPE_COLORS[asset.type]}`}>
                {asset.type}
              </Badge>
              <span className="text-[10px] text-muted-foreground">v{asset.version}</span>
              {isGenerating && (
                <span className="text-[10px] text-amber-400 flex items-center gap-0.5">
                  <Loader2 className="h-2.5 w-2.5 animate-spin" /> generating
                </span>
              )}
            </div>
          </div>
        </div>
        {(asset.usage_count ?? 0) > 0 && (
          <p className="text-[10px] text-muted-foreground mt-1.5">
            Used in {asset.usage_count} scene{(asset.usage_count ?? 0) > 1 ? "s" : ""}
          </p>
        )}
      </div>
    </div>
  );
}

function buildPrompt(type: AssetType, data: Record<string, string>, visualStyle: string): string {
  const parts: string[] = [];
  const { name, description, ...attrs } = data;

  // Style-specific quality keywords
  const styleKeywords: Record<string, string> = {
    "anime": "anime art style, cel-shaded, vibrant colors, clean linework",
    "realistic": "photorealistic, ultra-detailed, 8k resolution, sharp focus",
    "watercolor": "watercolor painting, soft washes, artistic brushstrokes, painterly",
    "comic": "comic book art style, bold outlines, dynamic shading, graphic novel",
    "3d": "3D rendered, ray-traced lighting, subsurface scattering, cinematic render",
    "pixel": "pixel art, retro game aesthetic, clean pixels, 16-bit style",
    "oil painting": "oil painting, rich textures, classical technique, masterful brushwork",
    "concept art": "concept art, professional illustration, digital painting, artstation quality",
  };

  const styleBoost = styleKeywords[visualStyle?.toLowerCase()] || `${visualStyle} style, professional quality`;

  switch (type) {
    case "character": {
      parts.push(`masterful ${styleBoost} character portrait of ${name || "a character"}`);
      if (attrs.age_group) parts.push(`${attrs.age_group} age`);
      if (attrs.body_type) parts.push(`${attrs.body_type} build`);
      if (attrs.hair_style && attrs.hair_color) parts.push(`${attrs.hair_color} ${attrs.hair_style} hair`);
      else if (attrs.hair_color) parts.push(`${attrs.hair_color} hair`);
      else if (attrs.hair_style) parts.push(`${attrs.hair_style} hair`);
      if (attrs.clothing) parts.push(`wearing ${attrs.clothing}`);
      if (attrs.expression) parts.push(`${attrs.expression} expression`);
      if (description) parts.push(description);
      parts.push("detailed face and eyes, expressive features, strong lighting, professional character design, upper body visible, clean background with subtle gradient");
      break;
    }
    case "environment": {
      parts.push(`masterful ${styleBoost} environment illustration of ${name || "a location"}`);
      if (attrs.setting_type) parts.push(`${attrs.setting_type} setting`);
      if (attrs.time_of_day) parts.push(`${attrs.time_of_day} lighting`);
      if (attrs.weather) parts.push(`${attrs.weather} weather conditions`);
      if (attrs.architecture) parts.push(`featuring ${attrs.architecture} architecture`);
      if (description) parts.push(description);
      parts.push("wide-angle establishing shot, cinematic composition, atmospheric depth, volumetric lighting, rich environmental detail, professional matte painting quality");
      break;
    }
    case "nature": {
      parts.push(`masterful ${styleBoost} nature illustration of ${name || "a landscape"}`);
      if (attrs.nature_type) parts.push(`${attrs.nature_type} landscape`);
      if (attrs.season) parts.push(`${attrs.season} season`);
      if (attrs.density) parts.push(`${attrs.density} vegetation`);
      if (description) parts.push(description);
      parts.push("breathtaking scenic vista, golden hour light, atmospheric perspective, rich natural colors, environmental storytelling, professional landscape photography composition");
      break;
    }
    case "prop": {
      parts.push(`masterful ${styleBoost} illustration of ${name || "an object"}`);
      if (attrs.material) parts.push(`crafted from ${attrs.material}`);
      if (attrs.size) parts.push(`${attrs.size} sized`);
      if (attrs.condition) parts.push(`in ${attrs.condition} condition`);
      if (description) parts.push(description);
      parts.push("detailed product shot, studio lighting, clean background, intricate surface detail, physically accurate materials, professional concept art rendering");
      break;
    }
  }
  return parts.join(", ");
}
