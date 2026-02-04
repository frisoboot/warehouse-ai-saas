"use server";

import { supabase } from "@/lib/supabase";
import { productSchema } from "@/lib/validations/product";
import type { Product, ProductInsert } from "@/types/database";

export async function getProducts(search?: string, category?: string) {
  let query = supabase.from("products").select("*").order("created_at", { ascending: false });

  if (search) {
    query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
  }
  if (category && category !== "all") {
    query = query.eq("category", category);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data as Product[];
}

export async function getProduct(id: string) {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw new Error(error.message);
  return data as Product;
}

export async function createProduct(formData: FormData) {
  const entries = Object.fromEntries(formData.entries());
  const raw: Record<string, unknown> = { ...entries };
  const boolFields = [
    "is_component",
    "is_finished_package",
    "sustainability_local",
    "sustainability_organic",
    "sustainability_fairtrade",
    "sustainability_recyclable",
  ];
  boolFields.forEach((field) => {
    raw[field] = entries[field] === "on" || entries[field] === "true";
  });

  const parsed = productSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { data, error } = await supabase
    .from("products")
    .insert(parsed.data as unknown as ProductInsert)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: { sku: ["SKU already exists"] } };
    }
    return { error: { _form: [error.message] } };
  }

  return { data: data as Product };
}

export async function updateProduct(id: string, formData: FormData) {
  const entries = Object.fromEntries(formData.entries());
  const raw: Record<string, unknown> = { ...entries };
  const boolFields = [
    "is_component",
    "is_finished_package",
    "sustainability_local",
    "sustainability_organic",
    "sustainability_fairtrade",
    "sustainability_recyclable",
  ];
  boolFields.forEach((field) => {
    raw[field] = entries[field] === "on" || entries[field] === "true";
  });

  const parsed = productSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { data, error } = await supabase
    .from("products")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return { error: { _form: [error.message] } };
  }

  return { data: data as Product };
}

export async function deleteProduct(id: string) {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function getComponentProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_component", true)
    .order("name");

  if (error) throw new Error(error.message);
  return data as Product[];
}

export async function getPackageProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_finished_package", true)
    .order("name");

  if (error) throw new Error(error.message);
  return data as Product[];
}
