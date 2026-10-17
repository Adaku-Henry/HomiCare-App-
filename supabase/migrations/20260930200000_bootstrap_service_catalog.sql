CREATE TABLE IF NOT EXISTS public.service_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  icon text NOT NULL DEFAULT 'Wrench',
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.service_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  base_price_from integer,
  pricing_model text NOT NULL DEFAULT 'fixed',
  emergency_available boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category_id, slug)
);

ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.service_categories, public.services TO anon, authenticated;

DROP POLICY IF EXISTS "public_read_categories" ON public.service_categories;
CREATE POLICY "public_read_categories" ON public.service_categories
  FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "public_read_services" ON public.services;
CREATE POLICY "public_read_services" ON public.services
  FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.service_categories (name, slug, icon, description, sort_order)
VALUES
  ('Cleaning', 'cleaning', 'Sparkles', 'Home and household cleaning services', 1),
  ('Plumbing', 'plumbing', 'Wrench', 'Repairs and installation for water systems', 2),
  ('Electrical', 'electrical', 'Zap', 'Safe electrical repairs and installation', 3),
  ('Carpentry', 'carpentry', 'Hammer', 'Furniture, woodwork, and carpentry services', 4),
  ('Painting', 'painting', 'Paintbrush', 'Interior and exterior painting services', 5),
  ('Laundry', 'laundry', 'Settings', 'Laundry and garment care services', 6),
  ('Cooking', 'cooking', 'Sun', 'In-home cooking and meal preparation', 7),
  ('Delivery', 'delivery', 'Truck', 'Household pickup and delivery services', 8),
  ('Moving & Logistics', 'moving', 'Truck', 'Packing, household moves, furniture transport, and relocation services', 9),
  ('Catering', 'catering', 'UtensilsCrossed', 'Meal preparation, catering, and event food services', 10),
  ('Childcare', 'childcare', 'HeartHandshake', 'In-home childcare and family support services', 11),
  ('Masonry', 'masonry', 'Hammer', 'Brickwork, concrete, and masonry repairs', 12),
  ('Roofing', 'roofing', 'Home', 'Roof inspections, repairs, and installations', 13),
  ('Welding', 'welding', 'Wrench', 'Metal fabrication, welding, and repairs', 14),
  ('Security', 'security', 'ShieldCheck', 'Home security installation and maintenance', 15),
  ('IT Support', 'it-support', 'Settings', 'Home technology, networking, and device support', 16),
  ('General Maintenance', 'general-maintenance', 'Wrench', 'General home maintenance and handyman services', 17),
  ('Appliance Repair', 'appliance-repair', 'Settings', 'Repair and maintenance for household appliances', 18),
  ('Construction', 'construction', 'Hammer', 'Construction and home improvement projects', 19),
  ('Gardening', 'gardening', 'Sprout', 'Garden care, landscaping, and outdoor maintenance', 20),
  ('Solar Energy', 'solar-energy', 'Sun', 'Solar panels, inverters, and home energy systems', 21),
  ('Household Support', 'household-support', 'HeartHandshake', 'General practical support for the home', 22)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order;

INSERT INTO public.services (category_id, name, slug, description, pricing_model, sort_order)
SELECT categories.id, services.name, services.slug, services.description, 'quote', services.sort_order
FROM (VALUES
  ('cleaning', 'Routine home cleaning', 'routine-home-cleaning', 'Regular cleaning for occupied homes', 1),
  ('cleaning', 'Deep cleaning', 'deep-cleaning', 'Detailed cleaning of kitchens, bathrooms, and living spaces', 2),
  ('cleaning', 'Move-in and move-out cleaning', 'move-cleaning', 'Cleaning before or after a household move', 3),
  ('plumbing', 'Leak repair', 'leak-repair', 'Find and repair leaking pipes and fittings', 1),
  ('plumbing', 'Drain unblocking', 'drain-unblocking', 'Clear blocked sinks, drains, and waste pipes', 2),
  ('plumbing', 'Fixture installation', 'fixture-installation', 'Install taps, sinks, toilets, and other fixtures', 3),
  ('electrical', 'Electrical fault diagnosis', 'fault-diagnosis', 'Identify faults in household electrical systems', 1),
  ('electrical', 'Wiring and installation', 'wiring-installation', 'Safe wiring and electrical fixture installation', 2),
  ('electrical', 'Solar installation', 'solar-installation', 'Install solar panels, batteries, and inverters', 3),
  ('moving', 'House moving', 'house-moving', 'Packing, loading, transport, and unloading', 1),
  ('moving', 'Furniture transportation', 'furniture-transport', 'Move furniture between homes or locations', 2),
  ('moving', 'Office relocation', 'office-relocation', 'Plan and carry out office and business moves', 3),
  ('carpentry', 'Furniture repair', 'furniture-repair', 'Repair and restore household furniture', 1),
  ('carpentry', 'Custom carpentry', 'custom-carpentry', 'Build or modify cabinets, shelves, and wood fixtures', 2),
  ('gardening', 'Garden maintenance', 'garden-maintenance', 'Lawn care, pruning, and regular garden maintenance', 1),
  ('gardening', 'Landscape installation', 'landscape-installation', 'Install garden beds, paths, and landscape features', 2),
  ('painting', 'Interior painting', 'interior-painting', 'Prepare and paint interior walls and ceilings', 1),
  ('painting', 'Exterior painting', 'exterior-painting', 'Prepare and paint exterior surfaces', 2),
  ('laundry', 'Washing and ironing', 'washing-ironing', 'Wash, dry, and iron household garments', 1),
  ('cooking', 'Home meal preparation', 'home-meal-preparation', 'Prepare meals in the customer home', 1),
  ('delivery', 'Home delivery and errands', 'home-delivery-errands', 'Local pickup, delivery, and household errands', 1),
  ('appliance-repair', 'Appliance diagnosis and repair', 'appliance-diagnosis-repair', 'Diagnose and repair common household appliances', 1),
  ('construction', 'Home repairs and construction', 'home-repairs-construction', 'Small construction and home improvement work', 1),
  ('solar-energy', 'Solar and inverter service', 'solar-inverter-service', 'Install and maintain home solar systems', 1),
  ('household-support', 'Household assistance', 'household-assistance', 'Practical help with routine household tasks', 1),
  ('catering', 'Event catering', 'event-catering', 'Prepare and serve food for home and family events', 1),
  ('childcare', 'In-home childcare', 'in-home-childcare', 'Childcare support in the family home', 1),
  ('masonry', 'Masonry repair', 'masonry-repair', 'Repair brickwork, plaster, and concrete surfaces', 1),
  ('roofing', 'Roof inspection and repair', 'roof-inspection-repair', 'Inspect and repair common roof damage', 1),
  ('welding', 'Metal fabrication and welding', 'metal-fabrication-welding', 'Fabricate and repair household metalwork', 1),
  ('security', 'Home security installation', 'home-security-installation', 'Install locks, alarms, and home security devices', 1),
  ('it-support', 'Home network and device support', 'home-network-device-support', 'Set up home Wi-Fi, computers, and smart devices', 1),
  ('general-maintenance', 'Handyman maintenance', 'handyman-maintenance', 'General household repair and maintenance tasks', 1)
) AS services(category_slug, name, slug, description, sort_order)
JOIN public.service_categories AS categories ON categories.slug = services.category_slug
ON CONFLICT (category_id, slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  pricing_model = EXCLUDED.pricing_model,
  sort_order = EXCLUDED.sort_order;
