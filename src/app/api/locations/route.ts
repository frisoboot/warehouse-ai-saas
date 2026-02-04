import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { locationSchema } from "@/lib/validations/location";
import { generateLocationCode } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get("warehouse_id") || "";

    let query = supabase.from("locations").select("*").order("location_code");

    if (warehouseId && warehouseId !== "all") {
      query = query.eq("warehouse_id", warehouseId);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const locationCode = generateLocationCode(
      body.warehouse_id,
      body.zone,
      body.aisle,
      body.shelf,
      body.bin
    );

    const parsed = locationSchema.safeParse({ ...body, location_code: locationCode });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("locations")
      .insert(parsed.data)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: { location_code: ["Location code already exists"] } },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Location ID is required" }, { status: 400 });
    }

    const { error } = await supabase.from("locations").delete().eq("id", id);
    if (error) {
      if (error.code === "23503") {
        return NextResponse.json(
          { error: "Cannot delete location that has inventory. Move or remove inventory first." },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
