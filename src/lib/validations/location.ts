import { z } from "zod";

export const locationSchema = z.object({
  warehouse_id: z.string().min(1, "Warehouse ID is required"),
  zone: z.string().min(1, "Zone is required"),
  aisle: z.string().min(1, "Aisle is required"),
  shelf: z.string().min(1, "Shelf is required"),
  bin: z.string().min(1, "Bin is required"),
  location_code: z.string().min(1, "Location code is required"),
});

export type LocationFormData = z.infer<typeof locationSchema>;
