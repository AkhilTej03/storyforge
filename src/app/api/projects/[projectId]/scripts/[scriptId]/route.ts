import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ projectId: string; scriptId: string }> }) {
  const { projectId, scriptId } = await params;

  const { data: script } = await supabase
    .from("scripts")
    .select("*")
    .eq("id", scriptId)
    .eq("project_id", projectId)
    .single();
  if (!script) return NextResponse.json({ error: "Script not found" }, { status: 404 });

  const { data: scenes } = await supabase
    .from("scenes")
    .select("*")
    .eq("script_id", scriptId)
    .order("scene_number");

  return NextResponse.json({ ...script, scenes: scenes || [] });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ projectId: string; scriptId: string }> }) {
  const { projectId, scriptId } = await params;

  const { data: existing } = await supabase
    .from("scripts")
    .select("*")
    .eq("id", scriptId)
    .eq("project_id", projectId)
    .single();
  if (!existing) return NextResponse.json({ error: "Script not found" }, { status: 404 });

  const body = await req.json();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of ["title", "content"]) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  const { data, error } = await supabase
    .from("scripts")
    .update(updates)
    .eq("id", scriptId)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ projectId: string; scriptId: string }> }) {
  const { projectId, scriptId } = await params;
  await supabase.from("scripts").delete().eq("id", scriptId).eq("project_id", projectId);
  return NextResponse.json({ success: true });
}
