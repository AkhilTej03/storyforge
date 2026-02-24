import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { v4 as uuid } from "uuid";

export async function GET() {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, visual_style, base_model, default_sampler } = body;
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const id = `PRJ_${uuid().slice(0, 8).toUpperCase()}`;
  const { data, error } = await supabase
    .from("projects")
    .insert({
      id,
      name,
      visual_style: visual_style || "anime cinematic realism",
      base_model: base_model || "SDXL",
      default_sampler: default_sampler || "DPM++",
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
