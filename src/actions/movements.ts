"use server";

import { supabase } from "@/lib/supabase";
import { inboundSchema, outboundSchema } from "@/lib/validations/movement";
import type { Movement, MovementWithDetails } from "@/types/database";

export async function getMovements(
  type?: string,
  productId?: string,
  dateFrom?: string,
  dateTo?: string
) {
  let query = supabase
    .from("movements")
    .select(
      "*, products(name, sku), from_location:locations!movements_from_location_id_fkey(location_code), to_location:locations!movements_to_location_id_fkey(location_code)"
    )
    .order("created_at", { ascending: false });

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
    query = query.lte("created_at", dateTo);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data as unknown as MovementWithDetails[];
}

export async function processInbound(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = inboundSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { product_id, location_id, quantity, reference_number, notes, performed_by } =
    parsed.data;

  // Check if inventory record exists for this product+location
  const { data: existing } = await supabase
    .from("inventory")
    .select("*")
    .eq("product_id", product_id)
    .eq("location_id", location_id)
    .single();

  if (existing) {
    // Update existing inventory
    const { error: updateError } = await supabase
      .from("inventory")
      .update({ quantity: existing.quantity + quantity })
      .eq("id", existing.id);
    if (updateError) return { error: { _form: [updateError.message] } };
  } else {
    // Create new inventory record
    const { error: insertError } = await supabase.from("inventory").insert({
      product_id,
      location_id,
      quantity,
      reserved_quantity: 0,
      status: "available" as const,
      last_counted_at: null,
      reserved_for_client: null,
    });
    if (insertError) return { error: { _form: [insertError.message] } };
  }

  // Create movement record
  const { data: movement, error: movementError } = await supabase
    .from("movements")
    .insert({
      movement_type: "inbound" as const,
      product_id,
      from_location_id: null,
      to_location_id: location_id,
      quantity,
      reference_number: reference_number || "",
      notes: notes || "",
      performed_by,
    })
    .select()
    .single();

  if (movementError) return { error: { _form: [movementError.message] } };

  return { data: movement as Movement };
}

export async function processOutbound(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = outboundSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { product_id, location_id, quantity, reference_number, notes, performed_by } =
    parsed.data;

  // Check available inventory at this location
  const { data: existing } = await supabase
    .from("inventory")
    .select("*")
    .eq("product_id", product_id)
    .eq("location_id", location_id)
    .single();

  if (!existing) {
    return { error: { _form: ["No inventory found at this location for the selected product"] } };
  }

  const availableQty = existing.quantity - existing.reserved_quantity;
  if (availableQty < quantity) {
    return {
      error: {
        quantity: [`Insufficient stock. Available: ${availableQty}, Requested: ${quantity}`],
      },
    };
  }

  // Update inventory
  const newQuantity = existing.quantity - quantity;
  if (newQuantity === 0) {
    const { error: deleteError } = await supabase
      .from("inventory")
      .delete()
      .eq("id", existing.id);
    if (deleteError) return { error: { _form: [deleteError.message] } };
  } else {
    const { error: updateError } = await supabase
      .from("inventory")
      .update({ quantity: newQuantity })
      .eq("id", existing.id);
    if (updateError) return { error: { _form: [updateError.message] } };
  }

  // Create movement record
  const { data: movement, error: movementError } = await supabase
    .from("movements")
    .insert({
      movement_type: "outbound" as const,
      product_id,
      from_location_id: location_id,
      to_location_id: null,
      quantity,
      reference_number: reference_number || "",
      notes: notes || "",
      performed_by,
    })
    .select()
    .single();

  if (movementError) return { error: { _form: [movementError.message] } };

  return { data: movement as Movement };
}
