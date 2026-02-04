import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const packageProductId = searchParams.get("package_product_id") || "";

    let query = supabase
      .from("assemblies")
      .select(
        "*, package_product:products!assemblies_package_product_id_fkey(*), component_product:products!assemblies_component_product_id_fkey(*)"
      )
      .order("created_at", { ascending: false });

    if (packageProductId) {
      query = query.eq("package_product_id", packageProductId);
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
    const { package_product_id, component_product_id, quantity_needed } = body;

    if (!package_product_id || !component_product_id || !quantity_needed) {
      return NextResponse.json(
        { error: "package_product_id, component_product_id, and quantity_needed are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("assemblies")
      .insert({
        package_product_id,
        component_product_id,
        quantity_needed: parseInt(quantity_needed, 10),
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "This component is already in the bill of materials" },
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
      return NextResponse.json({ error: "Assembly ID is required" }, { status: 400 });
    }

    const { error } = await supabase.from("assemblies").delete().eq("id", id);
    if (error) {
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
