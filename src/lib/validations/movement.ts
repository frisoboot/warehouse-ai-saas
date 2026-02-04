import { z } from "zod";

export const inboundSchema = z.object({
  product_id: z.string().uuid("Select a product"),
  location_id: z.string().uuid("Select a location"),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
  reference_number: z.string().default(""),
  notes: z.string().default(""),
  performed_by: z.string().min(1, "Performed by is required"),
});

export const outboundSchema = z.object({
  product_id: z.string().uuid("Select a product"),
  location_id: z.string().uuid("Select a location"),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
  reference_number: z.string().default(""),
  notes: z.string().default(""),
  performed_by: z.string().min(1, "Performed by is required"),
});

export const assemblyOrderSchema = z.object({
  package_product_id: z.string().uuid("Select a package product"),
  quantity_to_assemble: z.coerce.number().int().min(1, "Must assemble at least 1"),
  assigned_to: z.string().min(1, "Assign to someone"),
});

export type InboundFormData = z.infer<typeof inboundSchema>;
export type OutboundFormData = z.infer<typeof outboundSchema>;
export type AssemblyOrderFormData = z.infer<typeof assemblyOrderSchema>;
