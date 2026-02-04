import { z } from "zod";

export const productSchema = z.object({
  sku: z.string().min(1, "SKU is required").max(50),
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().default(""),
  category: z.enum(["food", "tech", "lifestyle", "packaging"]),
  unit: z.enum(["piece", "box", "kg"]),
  cost_price: z.coerce.number().min(0, "Must be positive"),
  retail_price: z.coerce.number().min(0, "Must be positive"),
  supplier_name: z.string().default(""),
  supplier_lead_time_days: z.coerce.number().int().min(0).default(0),
  min_order_quantity: z.coerce.number().int().min(1).default(1),
  is_component: z.boolean().default(false),
  is_finished_package: z.boolean().default(false),
  assembly_time_mins: z.coerce.number().int().min(0).default(0),
  sustainability_local: z.boolean().default(false),
  sustainability_organic: z.boolean().default(false),
  sustainability_fairtrade: z.boolean().default(false),
  sustainability_co2_score: z.coerce.number().int().min(1).max(100).default(50),
  sustainability_recyclable: z.boolean().default(false),
});

export type ProductFormData = z.infer<typeof productSchema>;
