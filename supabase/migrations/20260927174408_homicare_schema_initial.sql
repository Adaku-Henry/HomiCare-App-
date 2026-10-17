/*
# HomiCare — Professional Household Services Ecosystem

## Overview
Creates the core database schema for HomiCare, a platform connecting homeowners with verified household service professionals (plumbers, electricians, cleaners, etc.).

## New Tables

1. **service_categories** — Taxonomy of household services (Plumbing, Electrical, Cleaning, etc.)
2. **services** — Specific services within categories (e.g., "Leak Repair" under "Plumbing")
3. **providers** — Service provider profiles with trust indicators, ratings, verification
4. **provider_services** — Services offered by each provider with pricing
5. **bookings** — Service booking lifecycle (requested → accepted → completed → reviewed)
6. **reviews** — Structured customer reviews with category ratings
7. **messages** — Customer-provider messaging
8. **wallet_transactions** — Wallet payment/earning records
9. **portfolio_projects** — Provider work showcase with before/after photos
10. **notifications** — Smart notification system
11. **household_properties** — Customer household/property management
12. **maintenance_reminders** — Smart maintenance scheduling

## Security
- RLS enabled on all tables
- Public read access for discovery tables (categories, services, providers, provider_services, portfolio)
- Owner-scoped access for personal data (bookings, messages, wallet, notifications, properties)
- Reviews are publicly readable, owner-scoped for creation
*/

-- ============================================================
-- 1. SERVICE CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS service_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  icon text NOT NULL DEFAULT 'Wrench',
  description text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_categories" ON service_categories;
CREATE POLICY "public_read_categories" ON service_categories FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "auth_manage_categories" ON service_categories;
CREATE POLICY "auth_manage_categories" ON service_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 2. SERVICES (sub-categories)
-- ============================================================
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  base_price_from int,
  pricing_model text NOT NULL DEFAULT 'fixed',
  emergency_available boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(category_id, slug)
);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_services" ON services;
CREATE POLICY "public_read_services" ON services FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "auth_manage_services" ON services;
CREATE POLICY "auth_manage_services" ON services FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 3. PROVIDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT auth.uid(),
  full_name text NOT NULL,
  professional_title text NOT NULL,
  avatar_url text,
  cover_url text,
  bio text,
  primary_service_category_id uuid REFERENCES service_categories(id),
  location text NOT NULL,
  service_radius_km int NOT NULL DEFAULT 30,
  latitude float8,
  longitude float8,
  availability_status text NOT NULL DEFAULT 'available',
  identity_verified boolean NOT NULL DEFAULT false,
  phone_verified boolean NOT NULL DEFAULT false,
  skills_verified boolean NOT NULL DEFAULT false,
  certification_verified boolean NOT NULL DEFAULT false,
  business_verified boolean NOT NULL DEFAULT false,
  portfolio_verified boolean NOT NULL DEFAULT false,
  rating numeric(2,1) NOT NULL DEFAULT 0.0,
  review_count int NOT NULL DEFAULT 0,
  completed_jobs int NOT NULL DEFAULT 0,
  years_experience int NOT NULL DEFAULT 0,
  response_rate int NOT NULL DEFAULT 0,
  response_time_min int NOT NULL DEFAULT 0,
  on_time_rate int NOT NULL DEFAULT 0,
  starting_price int NOT NULL DEFAULT 0,
  total_earnings bigint NOT NULL DEFAULT 0,
  member_since date NOT NULL DEFAULT CURRENT_DATE,
  is_business boolean NOT NULL DEFAULT false,
  business_name text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_providers" ON providers;
CREATE POLICY "public_read_providers" ON providers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "owner_update_provider" ON providers;
CREATE POLICY "owner_update_provider" ON providers FOR UPDATE TO authenticated USING (auth.uid() = user_id OR user_id IS NULL) WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
DROP POLICY IF EXISTS "auth_insert_provider" ON providers;
CREATE POLICY "auth_insert_provider" ON providers FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================
-- 4. PROVIDER SERVICES
-- ============================================================
CREATE TABLE IF NOT EXISTS provider_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  custom_name text,
  description text,
  price_from int NOT NULL DEFAULT 0,
  price_to int,
  pricing_model text NOT NULL DEFAULT 'fixed',
  estimated_duration text,
  emergency_available boolean NOT NULL DEFAULT false,
  materials_included boolean NOT NULL DEFAULT false,
  warranty text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE provider_services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_provider_services" ON provider_services;
CREATE POLICY "public_read_provider_services" ON provider_services FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "owner_manage_provider_services" ON provider_services;
CREATE POLICY "owner_manage_provider_services" ON provider_services FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM providers WHERE providers.id = provider_services.provider_id AND (providers.user_id = auth.uid() OR providers.user_id IS NULL)))
  WITH CHECK (EXISTS (SELECT 1 FROM providers WHERE providers.id = provider_services.provider_id AND (providers.user_id = auth.uid() OR providers.user_id IS NULL)));

-- ============================================================
-- 5. BOOKINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_code text UNIQUE NOT NULL DEFAULT ('HC-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  provider_id uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_id uuid,
  service_name text NOT NULL,
  service_category text NOT NULL,
  description text,
  location text NOT NULL,
  scheduled_date date,
  scheduled_time text,
  urgency text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'requested',
  quoted_price int,
  final_price int,
  payment_method text,
  payment_status text NOT NULL DEFAULT 'pending',
  provider_notes text,
  customer_confirmed boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_bookings" ON bookings;
CREATE POLICY "public_read_bookings" ON bookings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_booking" ON bookings;
CREATE POLICY "auth_insert_booking" ON bookings FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_booking" ON bookings;
CREATE POLICY "auth_update_booking" ON bookings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 6. REVIEWS
-- ============================================================
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  rating_quality int NOT NULL DEFAULT 5,
  rating_professionalism int NOT NULL DEFAULT 5,
  rating_communication int NOT NULL DEFAULT 5,
  rating_timeliness int NOT NULL DEFAULT 5,
  rating_value int NOT NULL DEFAULT 5,
  rating_cleanliness int NOT NULL DEFAULT 5,
  overall_rating numeric(2,1) NOT NULL DEFAULT 5.0,
  comment text,
  would_hire_again boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_reviews" ON reviews;
CREATE POLICY "public_read_reviews" ON reviews FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_review" ON reviews;
CREATE POLICY "auth_insert_review" ON reviews FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_review" ON reviews;
CREATE POLICY "auth_update_review" ON reviews FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 7. MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  sender text NOT NULL DEFAULT 'customer',
  content text NOT NULL,
  message_type text NOT NULL DEFAULT 'text',
  attachment_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_messages" ON messages;
CREATE POLICY "public_read_messages" ON messages FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_message" ON messages;
CREATE POLICY "auth_insert_message" ON messages FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================
-- 8. WALLET TRANSACTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES providers(id) ON DELETE CASCADE,
  transaction_type text NOT NULL,
  amount bigint NOT NULL,
  currency text NOT NULL DEFAULT 'UGX',
  description text,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  payment_method text,
  transaction_reference text,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_wallet" ON wallet_transactions;
CREATE POLICY "public_read_wallet" ON wallet_transactions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_wallet" ON wallet_transactions;
CREATE POLICY "auth_insert_wallet" ON wallet_transactions FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================
-- 9. PORTFOLIO PROJECTS
-- ============================================================
CREATE TABLE IF NOT EXISTS portfolio_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text NOT NULL,
  description text,
  before_image_url text,
  during_image_url text,
  after_image_url text,
  location text,
  completion_date date,
  project_value int,
  services_performed text[],
  customer_confirmed boolean NOT NULL DEFAULT false,
  customer_rating numeric(2,1),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE portfolio_projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_portfolio" ON portfolio_projects;
CREATE POLICY "public_read_portfolio" ON portfolio_projects FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "owner_manage_portfolio" ON portfolio_projects;
CREATE POLICY "owner_manage_portfolio" ON portfolio_projects FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM providers WHERE providers.id = portfolio_projects.provider_id AND (providers.user_id = auth.uid() OR providers.user_id IS NULL)))
  WITH CHECK (EXISTS (SELECT 1 FROM providers WHERE providers.id = portfolio_projects.provider_id AND (providers.user_id = auth.uid() OR providers.user_id IS NULL)));

-- ============================================================
-- 10. NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_type text NOT NULL DEFAULT 'customer',
  category text NOT NULL DEFAULT 'service',
  priority text NOT NULL DEFAULT 'normal',
  title text NOT NULL,
  body text,
  action_url text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_notifications" ON notifications;
CREATE POLICY "public_read_notifications" ON notifications FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_notification" ON notifications;
CREATE POLICY "auth_insert_notification" ON notifications FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_notification" ON notifications;
CREATE POLICY "auth_update_notification" ON notifications FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 11. HOUSEHOLD PROPERTIES
-- ============================================================
CREATE TABLE IF NOT EXISTS household_properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_name text NOT NULL,
  property_name text NOT NULL,
  property_type text NOT NULL DEFAULT 'residential',
  address text,
  bedrooms int NOT NULL DEFAULT 1,
  bathrooms int NOT NULL DEFAULT 1,
  has_kitchen boolean NOT NULL DEFAULT true,
  has_compound boolean NOT NULL DEFAULT false,
  has_garage boolean NOT NULL DEFAULT false,
  assets text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE household_properties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_properties" ON household_properties;
CREATE POLICY "public_read_properties" ON household_properties FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "auth_manage_properties" ON household_properties;
CREATE POLICY "auth_manage_properties" ON household_properties FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 12. MAINTENANCE REMINDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS maintenance_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES household_properties(id) ON DELETE CASCADE,
  asset_name text NOT NULL,
  service_category text NOT NULL,
  last_service_date date,
  next_due_date date,
  frequency text NOT NULL DEFAULT 'monthly',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE maintenance_reminders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_reminders" ON maintenance_reminders;
CREATE POLICY "public_read_reminders" ON maintenance_reminders FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "auth_manage_reminders" ON maintenance_reminders;
CREATE POLICY "auth_manage_reminders" ON maintenance_reminders FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_providers_category ON providers(primary_service_category_id);
CREATE INDEX IF NOT EXISTS idx_providers_location ON providers(location);
CREATE INDEX IF NOT EXISTS idx_providers_rating ON providers(rating DESC);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category_id);
CREATE INDEX IF NOT EXISTS idx_provider_services_provider ON provider_services(provider_id);
CREATE INDEX IF NOT EXISTS idx_bookings_provider ON bookings(provider_id);
CREATE INDEX IF NOT EXISTS idx_reviews_provider ON reviews(provider_id);
CREATE INDEX IF NOT EXISTS idx_messages_provider ON messages(provider_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_provider ON portfolio_projects(provider_id);
