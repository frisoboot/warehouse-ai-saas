-- Migration: 00002_auth_rls_policies.sql
-- Update RLS policies to require authenticated users only

-- Drop existing open policies
DROP POLICY IF EXISTS "Allow all on products" ON products;
DROP POLICY IF EXISTS "Allow all on locations" ON locations;
DROP POLICY IF EXISTS "Allow all on inventory" ON inventory;
DROP POLICY IF EXISTS "Allow all on movements" ON movements;
DROP POLICY IF EXISTS "Allow all on assemblies" ON assemblies;
DROP POLICY IF EXISTS "Allow all on assembly_orders" ON assembly_orders;

-- Products: authenticated users only
CREATE POLICY "Authenticated users can read products"
  ON products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update products"
  ON products FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete products"
  ON products FOR DELETE
  TO authenticated
  USING (true);

-- Locations: authenticated users only
CREATE POLICY "Authenticated users can read locations"
  ON locations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert locations"
  ON locations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update locations"
  ON locations FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete locations"
  ON locations FOR DELETE
  TO authenticated
  USING (true);

-- Inventory: authenticated users only
CREATE POLICY "Authenticated users can read inventory"
  ON inventory FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert inventory"
  ON inventory FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update inventory"
  ON inventory FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete inventory"
  ON inventory FOR DELETE
  TO authenticated
  USING (true);

-- Movements: authenticated users only
CREATE POLICY "Authenticated users can read movements"
  ON movements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert movements"
  ON movements FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Assemblies: authenticated users only
CREATE POLICY "Authenticated users can read assemblies"
  ON assemblies FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert assemblies"
  ON assemblies FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete assemblies"
  ON assemblies FOR DELETE
  TO authenticated
  USING (true);

-- Assembly Orders: authenticated users only
CREATE POLICY "Authenticated users can read assembly_orders"
  ON assembly_orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert assembly_orders"
  ON assembly_orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update assembly_orders"
  ON assembly_orders FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
