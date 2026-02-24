import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { v4 as uuid } from "uuid";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { data, error } = await supabase
    .from("exports")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const body = await req.json();
  const { type } = body;

  if (!type || !["pdf", "image_sequence", "metadata_bundle"].includes(type)) {
    return NextResponse.json({ error: "Valid type required: pdf, image_sequence, metadata_bundle" }, { status: 400 });
  }

  const { count } = await supabase
    .from("scenes")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("render_status", "completed");

  if ((count || 0) === 0) {
    return NextResponse.json({ error: "No rendered scenes to export" }, { status: 400 });
  }

  const id = `EXP_${uuid().slice(0, 8).toUpperCase()}`;
  const fileUrl = `/exports/${projectId}_${type}_${Date.now()}.${type === "pdf" ? "pdf" : "zip"}`;

  const { data, error } = await supabase
    .from("exports")
    .insert({ id, project_id: projectId, type, status: "completed", file_url: fileUrl })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
