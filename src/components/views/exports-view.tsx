"use client";

import { useState } from "react";
import { useProjectStore } from "@/lib/store";
import { api } from "@/lib/api";
import type { ExportRecord } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  FileText,
  Image,
  FileArchive,
  CheckCircle2,
  Loader2,
  XCircle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

const EXPORT_TYPES: { type: ExportRecord["type"]; label: string; description: string; icon: React.ReactNode }[] = [
  {
    type: "pdf",
    label: "PDF Storyboard",
    description: "Full storyboard with scene metadata, thumbnails, and asset references",
    icon: <FileText className="h-6 w-6" />,
  },
  {
    type: "image_sequence",
    label: "Image Sequence",
    description: "Rendered frames as ordered image files for video editing",
    icon: <Image className="h-6 w-6" />,
  },
  {
    type: "metadata_bundle",
    label: "Metadata Bundle",
    description: "Complete project data including prompts, seeds, embeddings, and asset graphs",
    icon: <FileArchive className="h-6 w-6" />,
  },
];

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  pending: { icon: <Clock className="h-3.5 w-3.5" />, color: "text-muted-foreground", label: "Pending" },
  processing: { icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, color: "text-amber-400", label: "Processing" },
  completed: { icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: "text-green-400", label: "Completed" },
  failed: { icon: <XCircle className="h-3.5 w-3.5" />, color: "text-red-400", label: "Failed" },
};

export function ExportsView() {
  const { currentProject, exports: exportsList, setExports, scenes } = useProjectStore();
  const [exporting, setExporting] = useState<string | null>(null);

  if (!currentProject) return null;

  const renderedCount = scenes.filter((s) => s.render_status === "completed").length;

  const handleExport = async (type: ExportRecord["type"]) => {
    setExporting(type);
    try {
      await api.exports.create(currentProject.id, type);
      const updated = await api.exports.list(currentProject.id);
      setExports(updated);
      toast.success("Export completed");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold">Exports</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Export your storyboard in various formats. {renderedCount} rendered scene(s) available.
        </p>
      </div>

      {/* Export Options */}
      <div className="grid grid-cols-3 gap-3">
        {EXPORT_TYPES.map((exp) => (
          <div key={exp.type} className="rounded-xl border border-border bg-card p-5 flex flex-col">
            <div className="text-primary mb-3">{exp.icon}</div>
            <h3 className="text-sm font-semibold">{exp.label}</h3>
            <p className="text-xs text-muted-foreground mt-1 flex-1">{exp.description}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 w-full"
              onClick={() => handleExport(exp.type)}
              disabled={exporting === exp.type || renderedCount === 0}
            >
              {exporting === exp.type ? (
                <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Exporting...</>
              ) : (
                <><Download className="h-3.5 w-3.5 mr-1.5" /> Export</>
              )}
            </Button>
          </div>
        ))}
      </div>

      {renderedCount === 0 && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-400">
          No rendered scenes available. Render scenes first before exporting.
        </div>
      )}

      {/* Export History */}
      <div>
        <h2 className="text-sm font-semibold mb-3">Export History</h2>
        {exportsList.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <Download className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No exports yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {exportsList.map((exp) => {
              const sc = STATUS_CONFIG[exp.status];
              return (
                <div key={exp.id} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                    {exp.type === "pdf" ? <FileText className="h-5 w-5" /> :
                     exp.type === "image_sequence" ? <Image className="h-5 w-5" /> :
                     <FileArchive className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {exp.type === "pdf" ? "PDF Storyboard" :
                       exp.type === "image_sequence" ? "Image Sequence" :
                       "Metadata Bundle"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(exp.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="outline" className={sc.color}>
                    {sc.icon}
                    <span className="ml-1">{sc.label}</span>
                  </Badge>
                  {exp.file_url && (
                    <p className="text-[10px] text-muted-foreground font-mono max-w-32 truncate">{exp.file_url}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
