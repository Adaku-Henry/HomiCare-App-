INSERT INTO public.service_categories (name, slug, icon, description, sort_order)
VALUES
  ('Cleaning', 'cleaning', 'Sparkles', 'Home and household cleaning services', 1),
  ('Plumbing', 'plumbing', 'Wrench', 'Repairs and installation for water systems', 2),
  ('Electrical', 'electrical', 'Zap', 'Safe electrical repairs and installation', 3),
  ('Carpentry', 'carpentry', 'Hammer', 'Furniture, woodwork, and carpentry services', 4),
  ('Painting', 'painting', 'Paintbrush', 'Interior and exterior painting services', 5),
  ('Laundry', 'laundry', 'Settings', 'Laundry and garment care services', 6),
  ('Cooking', 'cooking', 'Sun', 'In-home cooking and meal preparation', 7),
  ('Delivery', 'delivery', 'Truck', 'Household pickup and delivery services', 8)
ON CONFLICT (slug) DO NOTHING;