import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "";
    const productId = searchParams.get("product_id") || "";
    const dateFrom = searchParams.get("date_from") || "";
    const dateTo = searchParams.get("date_to") || "";
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    let query = supabase
      .from("movements")
      .select(
        "*, products(name, sku), from_location:locations!movements_from_location_id_fkey(location_code), to_location:locations!movements_to_location_id_fkey(location_code)"
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (type && type !== "all") {
      query = query.eq("movement_type", type);
    }
    if (productId && productId !== "all") {
      query = query.eq("product_id", productId);
    }
    if (dateFrom) {
      query = query.gte("created_at", dateFrom);
    }
    if (dateTo) {
      query = query.lte("created_at", `${dateTo}T23:59:59`);
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
