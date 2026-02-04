"use server";

import { supabase } from "@/lib/supabase";
import type { InventoryWithDetails } from "@/types/database";

export async function getInventory(
  productId?: string,
  locationId?: string,
  status?: string
) {
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
  if (error) throw new Error(error.message);
  return data as InventoryWithDetails[];
}

export async function getInventoryForProduct(productId: string) {
  const { data, error } = await supabase
    .from("inventory")
    .select("*, locations(*)")
    .eq("product_id", productId)
    .order("quantity", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function getProductAvailableQuantity(productId: string) {
  const { data, error } = await supabase
    .from("inventory")
    .select("quantity, reserved_quantity")
    .eq("product_id", productId);

  if (error) throw new Error(error.message);

  return data.reduce(
    (sum, item) => sum + (item.quantity - item.reserved_quantity),
    0
  );
}

export async function getLowStockItems() {
  const { data, error } = await supabase
    .from("inventory")
    .select("*, products(*), locations(*)")
    .order("quantity", { ascending: true });

  if (error) throw new Error(error.message);

  // Filter items where total quantity < min_order_quantity
  const inventory = data as InventoryWithDetails[];
  const productTotals = new Map<string, { total: number; minOrder: number; product: InventoryWithDetails }>();

  for (const item of inventory) {
    const existing = productTotals.get(item.product_id);
    if (existing) {
      existing.total += item.quantity;
    } else {
      productTotals.set(item.product_id, {
        total: item.quantity,
        minOrder: item.products.min_order_quantity,
        product: item,
      });
    }
  }

  return Array.from(productTotals.values())
    .filter((entry) => entry.total < entry.minOrder)
    .map((entry) => ({
      ...entry.product,
      total_quantity: entry.total,
    }));
}

export async function getDashboardStats() {
  const [productsResult, inventoryResult, movementsResult, lowStockResult] =
    await Promise.all([
      supabase.from("products").select("id", { count: "exact", head: true }),
      supabase.from("inventory").select("quantity, products(cost_price, retail_price)"),
      supabase
        .from("movements")
        .select("*, products(name, sku)")
        .order("created_at", { ascending: false })
        .limit(10),
      getLowStockItems(),
    ]);

  const totalProducts = productsResult.count || 0;

  let totalValue = 0;
  let totalRetailValue = 0;
  let totalItems = 0;
  if (inventoryResult.data) {
    for (const item of inventoryResult.data) {
      const inv = item as unknown as { quantity: number; products: { cost_price: number; retail_price: number } };
      totalItems += inv.quantity;
      totalValue += inv.quantity * (inv.products?.cost_price || 0);
      totalRetailValue += inv.quantity * (inv.products?.retail_price || 0);
    }
  }

  return {
    totalProducts,
    totalItems,
    totalValue,
    totalRetailValue,
    lowStockCount: lowStockResult.length,
    recentMovements: movementsResult.data || [],
    lowStockItems: lowStockResult,
  };
}

export async function exportInventoryCSV() {
  const { data, error } = await supabase
    .from("inventory")
    .select("*, products(sku, name, category), locations(location_code)")
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}
