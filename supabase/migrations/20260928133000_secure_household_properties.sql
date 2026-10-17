-- Personal property data must be owned by the signed-in customer.
ALTER TABLE household_properties
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

DROP POLICY IF EXISTS "public_read_properties" ON household_properties;
DROP POLICY IF EXISTS "auth_manage_properties" ON household_properties;

CREATE POLICY "property_owner_read" ON household_properties
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "property_owner_insert" ON household_properties
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "property_owner_update" ON household_properties
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "property_owner_delete" ON household_properties
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "public_read_reminders" ON maintenance_reminders;
DROP POLICY IF EXISTS "auth_manage_reminders" ON maintenance_reminders;

CREATE POLICY "property_owner_read_reminders" ON maintenance_reminders
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_properties
      WHERE household_properties.id = maintenance_reminders.property_id
        AND household_properties.owner_id = auth.uid()
    )
  );

CREATE POLICY "property_owner_manage_reminders" ON maintenance_reminders
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_properties
      WHERE household_properties.id = maintenance_reminders.property_id
        AND household_properties.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_properties
      WHERE household_properties.id = maintenance_reminders.property_id
        AND household_properties.owner_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_household_properties_owner ON household_properties(owner_id);