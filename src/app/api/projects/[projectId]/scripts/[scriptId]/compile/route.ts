import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { v4 as uuid } from "uuid";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ projectId: string; scriptId: string }> }) {
  const { projectId, scriptId } = await params;

  const { data: script } = await supabase
    .from("scripts")
    .select("*")
    .eq("id", scriptId)
    .eq("project_id", projectId)
    .single();
  if (!script) return NextResponse.json({ error: "Script not found" }, { status: 404 });

  const content = script.content;
  if (!content?.trim()) return NextResponse.json({ error: "Script content is empty" }, { status: 400 });

  const sceneBlocks = parseScenes(content);
  if (sceneBlocks.length === 0) {
    return NextResponse.json({ error: "No scenes detected in script. Use scene markers like 'SCENE 1:', 'INT.', 'EXT.', or '---'" }, { status: 400 });
  }

  // Delete existing scenes for this script
  await supabase.from("scenes").delete().eq("script_id", scriptId).eq("project_id", projectId);

  const createdScenes = [];
  for (let i = 0; i < sceneBlocks.length; i++) {
    const block = sceneBlocks[i];
    const id = `SCN_${uuid().slice(0, 8).toUpperCase()}`;
    const { data } = await supabase
      .from("scenes")
      .insert({
        id,
        project_id: projectId,
        script_id: scriptId,
        scene_number: i + 1,
        title: block.title,
        description: block.description,
      })
      .select()
      .single();
    if (data) createdScenes.push(data);
  }

  await supabase
    .from("scripts")
    .update({ compiled: true, updated_at: new Date().toISOString() })
    .eq("id", scriptId);

  return NextResponse.json({ scenes: createdScenes, count: createdScenes.length });
}

function parseScenes(content: string): { title: string; description: string }[] {
  const scenes: { title: string; description: string }[] = [];

  const markerRegex = /(?:^|\n)\s*(?:SCENE\s+\d+\s*[:\-.]?\s*|Scene\s+\d+\s*[:\-.]?\s*|##\s+Scene\s+\d+\s*[:\-.]?\s*|INT\.\s*|EXT\.\s*|---\s*\n)/gi;
  const parts = content.split(markerRegex);
  const markers = content.match(markerRegex);

  if (markers && markers.length > 0) {
    for (let i = 0; i < markers.length; i++) {
      const title = markers[i].trim().replace(/^---\s*/, `Scene ${i + 1}`).replace(/[:.\-]\s*$/, "").trim() || `Scene ${i + 1}`;
      const description = (parts[i + 1] || "").trim();
      if (description) {
        scenes.push({ title, description });
      }
    }
  }

  if (scenes.length === 0) {
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim());
    for (let i = 0; i < paragraphs.length; i++) {
      scenes.push({
        title: `Scene ${i + 1}`,
        description: paragraphs[i].trim(),
      });
    }
  }

  return scenes;
}
