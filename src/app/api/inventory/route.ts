import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("product_id") || "";
    const locationId = searchParams.get("location_id") || "";
    const status = searchParams.get("status") || "";

    let query = supabase
      .from("inventory")
      .select("*, products(*), locations(*)")
      .order("updated_at", { ascending: false });

    if (productId && productId !== "all") {
      query = query.eq("product_id", productId);
    }
    if (locationId && locationId !== "all") {
      query = query.eq("location_id", locationId);
    }
    if (status && status !== "all") {
      query = query.eq("status", status);
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
