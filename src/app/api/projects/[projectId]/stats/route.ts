import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;

  const [assetRes, sceneRes, scriptRes, lockedRes, renderedRes, typeRes, recentAssetsRes, recentScenesRes] = await Promise.all([
    supabase.from("assets").select("*", { count: "exact", head: true }).eq("project_id", projectId),
    supabase.from("scenes").select("*", { count: "exact", head: true }).eq("project_id", projectId),
    supabase.from("scripts").select("*", { count: "exact", head: true }).eq("project_id", projectId),
    supabase.from("assets").select("*", { count: "exact", head: true }).eq("project_id", projectId).eq("locked", true),
    supabase.from("scenes").select("*", { count: "exact", head: true }).eq("project_id", projectId).eq("render_status", "completed"),
    supabase.from("assets").select("type").eq("project_id", projectId),
    supabase.from("assets").select("*").eq("project_id", projectId).order("updated_at", { ascending: false }).limit(5),
    supabase.from("scenes").select("*").eq("project_id", projectId).order("updated_at", { ascending: false }).limit(5),
  ]);

  const typeCounts: Record<string, number> = {};
  for (const row of typeRes.data || []) {
    typeCounts[row.type] = (typeCounts[row.type] || 0) + 1;
  }
  const assetsByType = Object.entries(typeCounts).map(([type, count]) => ({ type, count }));

  return NextResponse.json({
    assetCount: assetRes.count || 0,
    sceneCount: sceneRes.count || 0,
    scriptCount: scriptRes.count || 0,
    lockedAssets: lockedRes.count || 0,
    renderedScenes: renderedRes.count || 0,
    assetsByType,
    recentAssets: recentAssetsRes.data || [],
    recentScenes: recentScenesRes.data || [],
  });
}
