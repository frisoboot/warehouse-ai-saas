-- SocialGoodz Warehouse Management System - Initial Schema
-- Migration: 00001_initial_schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- PRODUCTS TABLE
-- =============================================================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT NOT NULL CHECK (category IN ('food', 'tech', 'lifestyle', 'packaging')),
  unit TEXT NOT NULL CHECK (unit IN ('piece', 'box', 'kg')),
  cost_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  retail_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  supplier_name TEXT DEFAULT '',
  supplier_lead_time_days INTEGER DEFAULT 0,
  min_order_quantity INTEGER DEFAULT 1,
  is_component BOOLEAN DEFAULT false,
  is_finished_package BOOLEAN DEFAULT false,
  assembly_time_mins INTEGER DEFAULT 0,
  sustainability_local BOOLEAN DEFAULT false,
  sustainability_organic BOOLEAN DEFAULT false,
  sustainability_fairtrade BOOLEAN DEFAULT false,
  sustainability_co2_score INTEGER DEFAULT 50 CHECK (sustainability_co2_score >= 1 AND sustainability_co2_score <= 100),
  sustainability_recyclable BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- LOCATIONS TABLE
-- =============================================================================
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  warehouse_id TEXT NOT NULL,
  zone TEXT NOT NULL,
  aisle TEXT NOT NULL,
  shelf TEXT NOT NULL,
  bin TEXT NOT NULL,
  location_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- INVENTORY TABLE
-- =============================================================================
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  reserved_quantity INTEGER NOT NULL DEFAULT 0,
  reserved_for_client TEXT,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'assembly_pending')),
  last_counted_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, location_id)
);

-- =============================================================================
-- MOVEMENTS TABLE
-- =============================================================================
CREATE TABLE movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  movement_type TEXT NOT NULL CHECK (movement_type IN ('inbound', 'outbound', 'transfer', 'adjustment', 'assembly')),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  from_location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  to_location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL,
  reference_number TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  performed_by TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- ASSEMBLIES TABLE (Bill of Materials)
-- =============================================================================
CREATE TABLE assemblies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  package_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  component_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity_needed INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(package_product_id, component_product_id)
);

-- =============================================================================
-- ASSEMBLY ORDERS TABLE
-- =============================================================================
CREATE TABLE assembly_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  package_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity_to_assemble INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  assigned_to TEXT DEFAULT '',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_is_component ON products(is_component);
CREATE INDEX idx_products_is_finished_package ON products(is_finished_package);

CREATE INDEX idx_locations_warehouse ON locations(warehouse_id);
CREATE INDEX idx_locations_code ON locations(location_code);

CREATE INDEX idx_inventory_product ON inventory(product_id);
CREATE INDEX idx_inventory_location ON inventory(location_id);
CREATE INDEX idx_inventory_status ON inventory(status);

CREATE INDEX idx_movements_type ON movements(movement_type);
CREATE INDEX idx_movements_product ON movements(product_id);
CREATE INDEX idx_movements_created ON movements(created_at DESC);

CREATE INDEX idx_assemblies_package ON assemblies(package_product_id);
CREATE INDEX idx_assembly_orders_status ON assembly_orders(status);
CREATE INDEX idx_assembly_orders_package ON assembly_orders(package_product_id);

-- =============================================================================
-- TRIGGERS: Auto-update updated_at
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_updated_at
  BEFORE UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE assemblies ENABLE ROW LEVEL SECURITY;
ALTER TABLE assembly_orders ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (anon key with service role)
-- In production, replace with more granular policies based on user roles
CREATE POLICY "Allow all operations on products" ON products
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on locations" ON locations
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on inventory" ON inventory
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on movements" ON movements
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on assemblies" ON assemblies
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on assembly_orders" ON assembly_orders
  FOR ALL USING (true) WITH CHECK (true);

-- =============================================================================
-- SEED DATA: Sample locations
-- =============================================================================
INSERT INTO locations (warehouse_id, zone, aisle, shelf, bin, location_code) VALUES
  ('WH1', 'A', '01', 'A', '1', 'WH1-A-01-A-1'),
  ('WH1', 'A', '01', 'A', '2', 'WH1-A-01-A-2'),
  ('WH1', 'A', '01', 'B', '1', 'WH1-A-01-B-1'),
  ('WH1', 'A', '02', 'A', '1', 'WH1-A-02-A-1'),
  ('WH1', 'B', '01', 'A', '1', 'WH1-B-01-A-1'),
  ('WH1', 'B', '01', 'B', '1', 'WH1-B-01-B-1'),
  ('WH1', 'C', '01', 'A', '1', 'WH1-C-01-A-1'),
  ('WH1', 'C', '01', 'A', '2', 'WH1-C-01-A-2');
