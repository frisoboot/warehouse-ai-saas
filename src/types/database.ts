export type Database = {
  public: {
    Tables: {
      products: {
        Row: Product;
        Insert: ProductInsert;
        Update: ProductUpdate;
      };
      locations: {
        Row: Location;
        Insert: LocationInsert;
        Update: LocationUpdate;
      };
      inventory: {
        Row: Inventory;
        Insert: InventoryInsert;
        Update: InventoryUpdate;
      };
      movements: {
        Row: Movement;
        Insert: MovementInsert;
        Update: MovementUpdate;
      };
      assemblies: {
        Row: Assembly;
        Insert: AssemblyInsert;
        Update: AssemblyUpdate;
      };
      assembly_orders: {
        Row: AssemblyOrder;
        Insert: AssemblyOrderInsert;
        Update: AssemblyOrderUpdate;
      };
    };
  };
};

// Products
export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: "food" | "tech" | "lifestyle" | "packaging";
  unit: "piece" | "box" | "kg";
  cost_price: number;
  retail_price: number;
  supplier_name: string;
  supplier_lead_time_days: number;
  min_order_quantity: number;
  is_component: boolean;
  is_finished_package: boolean;
  assembly_time_mins: number;
  sustainability_local: boolean;
  sustainability_organic: boolean;
  sustainability_fairtrade: boolean;
  sustainability_co2_score: number;
  sustainability_recyclable: boolean;
  created_at: string;
  updated_at: string;
}

export type ProductInsert = Omit<Product, "id" | "created_at" | "updated_at">;
export type ProductUpdate = Partial<ProductInsert>;

// Locations
export interface Location {
  id: string;
  warehouse_id: string;
  zone: string;
  aisle: string;
  shelf: string;
  bin: string;
  location_code: string;
  created_at: string;
}

export type LocationInsert = Omit<Location, "id" | "created_at">;
export type LocationUpdate = Partial<LocationInsert>;

// Inventory
export interface Inventory {
  id: string;
  product_id: string;
  location_id: string;
  quantity: number;
  reserved_quantity: number;
  reserved_for_client: string | null;
  status: "available" | "reserved" | "assembly_pending";
  last_counted_at: string | null;
  updated_at: string;
}

export type InventoryInsert = Omit<Inventory, "id" | "updated_at">;
export type InventoryUpdate = Partial<InventoryInsert>;

// Inventory with joined data
export interface InventoryWithDetails extends Inventory {
  products: Product;
  locations: Location;
}

// Movements
export interface Movement {
  id: string;
  movement_type: "inbound" | "outbound" | "transfer" | "adjustment" | "assembly";
  product_id: string;
  from_location_id: string | null;
  to_location_id: string | null;
  quantity: number;
  reference_number: string;
  notes: string;
  performed_by: string;
  created_at: string;
}

export type MovementInsert = Omit<Movement, "id" | "created_at">;
export type MovementUpdate = Partial<MovementInsert>;

export interface MovementWithDetails extends Movement {
  products: Product;
  from_location: Location | null;
  to_location: Location | null;
}

// Assemblies (Bill of Materials)
export interface Assembly {
  id: string;
  package_product_id: string;
  component_product_id: string;
  quantity_needed: number;
  created_at: string;
}

export type AssemblyInsert = Omit<Assembly, "id" | "created_at">;
export type AssemblyUpdate = Partial<AssemblyInsert>;

export interface AssemblyWithDetails extends Assembly {
  package_product: Product;
  component_product: Product;
}

// Assembly Orders
export interface AssemblyOrder {
  id: string;
  package_product_id: string;
  quantity_to_assemble: number;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  assigned_to: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export type AssemblyOrderInsert = Omit<AssemblyOrder, "id" | "created_at">;
export type AssemblyOrderUpdate = Partial<AssemblyOrderInsert>;

export interface AssemblyOrderWithDetails extends AssemblyOrder {
  products: Product;
}
