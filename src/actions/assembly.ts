"use server";

import { supabase } from "@/lib/supabase";
import { assemblyOrderSchema } from "@/lib/validations/movement";
import type { Assembly, AssemblyOrder, AssemblyOrderWithDetails, AssemblyWithDetails } from "@/types/database";

export async function getAssemblies(packageProductId?: string) {
  let query = supabase
    .from("assemblies")
    .select("*, package_product:products!assemblies_package_product_id_fkey(*), component_product:products!assemblies_component_product_id_fkey(*)")
    .order("created_at", { ascending: false });

  if (packageProductId) {
    query = query.eq("package_product_id", packageProductId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data as unknown as AssemblyWithDetails[];
}

export async function addAssemblyComponent(
  packageProductId: string,
  componentProductId: string,
  quantityNeeded: number
) {
  const { data, error } = await supabase
    .from("assemblies")
    .insert({
      package_product_id: packageProductId,
      component_product_id: componentProductId,
      quantity_needed: quantityNeeded,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: "This component is already in the bill of materials" };
    }
    return { error: error.message };
  }
  return { data: data as Assembly };
}

export async function removeAssemblyComponent(id: string) {
  const { error } = await supabase.from("assemblies").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function getAssemblyOrders(status?: string) {
  let query = supabase
    .from("assembly_orders")
    .select("*, products(*)")
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data as AssemblyOrderWithDetails[];
}

export async function createAssemblyOrder(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = assemblyOrderSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { package_product_id, quantity_to_assemble, assigned_to } = parsed.data;

  // Verify BOM exists
  const { data: bom } = await supabase
    .from("assemblies")
    .select("*, component_product:products!assemblies_component_product_id_fkey(name)")
    .eq("package_product_id", package_product_id);

  if (!bom || bom.length === 0) {
    return { error: { _form: ["No bill of materials found for this package. Add components first."] } };
  }

  // Check component availability
  for (const component of bom) {
    const totalNeeded = component.quantity_needed * quantity_to_assemble;
    const { data: inventory } = await supabase
      .from("inventory")
      .select("quantity, reserved_quantity")
      .eq("product_id", component.component_product_id);

    const available = (inventory || []).reduce(
      (sum, item) => sum + (item.quantity - item.reserved_quantity),
      0
    );

    if (available < totalNeeded) {
      const compName = (component.component_product as { name: string })?.name || "Unknown";
      return {
        error: {
          _form: [
            `Insufficient stock for component "${compName}". Need ${totalNeeded}, available: ${available}`,
          ],
        },
      };
    }
  }

  const { data, error } = await supabase
    .from("assembly_orders")
    .insert({
      package_product_id,
      quantity_to_assemble,
      assigned_to,
      status: "pending" as const,
      started_at: null,
      completed_at: null,
    })
    .select("*, products(*)")
    .single();

  if (error) return { error: { _form: [error.message] } };
  return { data: data as AssemblyOrderWithDetails };
}

export async function startAssemblyOrder(orderId: string) {
  const { data, error } = await supabase
    .from("assembly_orders")
    .update({ status: "in_progress", started_at: new Date().toISOString() })
    .eq("id", orderId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as AssemblyOrder;
}

export async function completeAssemblyOrder(orderId: string, targetLocationId: string) {
  // Get the order
  const { data: order, error: orderError } = await supabase
    .from("assembly_orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (orderError || !order) throw new Error("Assembly order not found");

  // Get BOM
  const { data: bom } = await supabase
    .from("assemblies")
    .select("*")
    .eq("package_product_id", order.package_product_id);

  if (!bom) throw new Error("Bill of materials not found");

  // Deduct components from inventory
  for (const component of bom) {
    const totalNeeded = component.quantity_needed * order.quantity_to_assemble;
    let remaining = totalNeeded;

    // Get inventory locations for this component, ordered by quantity
    const { data: inventoryItems } = await supabase
      .from("inventory")
      .select("*")
      .eq("product_id", component.component_product_id)
      .gt("quantity", 0)
      .order("quantity", { ascending: false });

    if (!inventoryItems) throw new Error("No inventory found for component");

    for (const inv of inventoryItems) {
      if (remaining <= 0) break;

      const available = inv.quantity - inv.reserved_quantity;
      const toDeduct = Math.min(available, remaining);

      if (toDeduct > 0) {
        const newQty = inv.quantity - toDeduct;
        if (newQty === 0) {
          await supabase.from("inventory").delete().eq("id", inv.id);
        } else {
          await supabase
            .from("inventory")
            .update({ quantity: newQty })
            .eq("id", inv.id);
        }

        // Record component movement
        await supabase.from("movements").insert({
          movement_type: "assembly" as const,
          product_id: component.component_product_id,
          from_location_id: inv.location_id,
          to_location_id: null,
          quantity: toDeduct,
          reference_number: `ASM-${orderId.slice(0, 8)}`,
          notes: `Component consumed for assembly order ${orderId.slice(0, 8)}`,
          performed_by: order.assigned_to || "",
        });

        remaining -= toDeduct;
      }
    }

    if (remaining > 0) {
      throw new Error(
        `Insufficient stock for component ${component.component_product_id}`
      );
    }
  }

  // Add finished package to inventory
  const { data: existingPackageInv } = await supabase
    .from("inventory")
    .select("*")
    .eq("product_id", order.package_product_id)
    .eq("location_id", targetLocationId)
    .single();

  if (existingPackageInv) {
    await supabase
      .from("inventory")
      .update({ quantity: existingPackageInv.quantity + order.quantity_to_assemble })
      .eq("id", existingPackageInv.id);
  } else {
    await supabase.from("inventory").insert({
      product_id: order.package_product_id,
      location_id: targetLocationId,
      quantity: order.quantity_to_assemble,
      reserved_quantity: 0,
      status: "available" as const,
      last_counted_at: null,
      reserved_for_client: null,
    });
  }

  // Record finished product movement
  await supabase.from("movements").insert({
    movement_type: "assembly" as const,
    product_id: order.package_product_id,
    from_location_id: null,
    to_location_id: targetLocationId,
    quantity: order.quantity_to_assemble,
    reference_number: `ASM-${orderId.slice(0, 8)}`,
    notes: `Assembly completed for order ${orderId.slice(0, 8)}`,
    performed_by: order.assigned_to || "",
  });

  // Update order status
  const { data, error } = await supabase
    .from("assembly_orders")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .select("*, products(*)")
    .single();

  if (error) throw new Error(error.message);
  return data as AssemblyOrderWithDetails;
}

export async function cancelAssemblyOrder(orderId: string) {
  const { data, error } = await supabase
    .from("assembly_orders")
    .update({ status: "cancelled" })
    .eq("id", orderId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as AssemblyOrder;
}
