INSERT INTO public.service_categories (name, slug, icon, description, sort_order)
VALUES (
  'Moving & Logistics',
  'moving',
  'Truck',
  'Packing, household moves, furniture transport, and relocation services',
  9
)
ON CONFLICT (slug) DO NOTHING;
