"use server";

import { supabase } from "@/lib/supabase";
import { locationSchema } from "@/lib/validations/location";
import { generateLocationCode } from "@/lib/utils";
import type { Location, LocationInsert } from "@/types/database";

export async function getLocations(warehouseId?: string) {
  let query = supabase.from("locations").select("*").order("location_code");

  if (warehouseId && warehouseId !== "all") {
    query = query.eq("warehouse_id", warehouseId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data as Location[];
}

export async function getLocation(id: string) {
  const { data, error } = await supabase
    .from("locations")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw new Error(error.message);
  return data as Location;
}

export async function createLocation(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());

  const locationCode = generateLocationCode(
    raw.warehouse_id as string,
    raw.zone as string,
    raw.aisle as string,
    raw.shelf as string,
    raw.bin as string
  );
  raw.location_code = locationCode;

  const parsed = locationSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { data, error } = await supabase
    .from("locations")
    .insert(parsed.data as LocationInsert)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: { location_code: ["Location code already exists"] } };
    }
    return { error: { _form: [error.message] } };
  }

  return { data: data as Location };
}

export async function deleteLocation(id: string) {
  const { error } = await supabase.from("locations").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") {
      throw new Error("Cannot delete location that has inventory. Move or remove inventory first.");
    }
    throw new Error(error.message);
  }
  return { success: true };
}
