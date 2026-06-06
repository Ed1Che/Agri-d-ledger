-- Migration: 002_web_tables.sql
-- Creates all tables required by apps/web dashboard that were missing from the initial schema.
-- Run in Supabase SQL editor or via: supabase db push

-- produce_types: reference data for crop categories
CREATE TABLE IF NOT EXISTS public.produce_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  unit_of_measurement TEXT NOT NULL
);

-- farmers: extended profile linked to Supabase auth user
CREATE TABLE IF NOT EXISTS public.farmers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  farmer_name TEXT NOT NULL,
  phone_number TEXT UNIQUE NOT NULL,
  location_region TEXT NOT NULL,
  village_name TEXT,
  farm_size TEXT,
  farming_experience_years INT,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- buyers: extended profile for buyer organisations
CREATE TABLE IF NOT EXISTS public.buyers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  company_name TEXT NOT NULL,
  contact_person TEXT,
  phone_number TEXT,
  email TEXT,
  location_region TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- farmer_produce: produce listings created via web or USSD
CREATE TABLE IF NOT EXISTS public.farmer_produce (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES public.farmers(id),
  produce_type_id UUID REFERENCES public.produce_types(id),
  quantity_available NUMERIC NOT NULL,
  unit_of_measurement TEXT NOT NULL DEFAULT 'bags',
  asking_price_per_unit NUMERIC NOT NULL,
  suggested_price NUMERIC,
  harvest_date DATE,
  quality_grade TEXT CHECK (quality_grade IN ('excellent','good','fair')),
  location_region TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','sold')),
  iot_verified BOOLEAN DEFAULT FALSE,
  blockchain_recorded BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- regional_bids: aggregated produce by region for bulk buyer negotiation
CREATE TABLE IF NOT EXISTS public.regional_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region TEXT NOT NULL,
  produce_type_id UUID REFERENCES public.produce_types(id),
  average_price_per_unit NUMERIC NOT NULL,
  total_quantity_available NUMERIC NOT NULL,
  participating_farmers_count INT DEFAULT 0,
  negotiation_threshold_percentage NUMERIC DEFAULT 5,
  status TEXT DEFAULT 'open' CHECK (status IN ('open','closed','approved')),
  bid_close_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- bids: buyer bids on regional produce aggregations
CREATE TABLE IF NOT EXISTS public.bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  regional_bid_id UUID REFERENCES public.regional_bids(id),
  buyer_id UUID REFERENCES public.buyers(id),
  offered_price_per_unit NUMERIC NOT NULL,
  total_quantity_bid NUMERIC NOT NULL,
  bid_amount NUMERIC NOT NULL,
  negotiation_deviation_percentage NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- bid_confirmations: per-farmer confirmation of accepted bids
CREATE TABLE IF NOT EXISTS public.bid_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_id UUID REFERENCES public.bids(id),
  farmer_id UUID REFERENCES public.farmers(id),
  confirmation_status TEXT DEFAULT 'pending' CHECK (confirmation_status IN ('pending','confirmed','rejected','expired')),
  confirmation_timestamp TIMESTAMPTZ,
  notification_method TEXT DEFAULT 'in_app'
);

-- communications: in-app messaging between buyers and farmers
CREATE TABLE IF NOT EXISTS public.communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_user_id UUID REFERENCES auth.users(id),
  recipient_user_id UUID REFERENCES auth.users(id),
  message_type TEXT,
  subject TEXT,
  message_content TEXT,
  bid_id UUID REFERENCES public.bids(id),
  regional_bid_id UUID REFERENCES public.regional_bids(id),
  sent_timestamp TIMESTAMPTZ DEFAULT NOW(),
  read_status BOOLEAN DEFAULT FALSE
);

-- audit_events: security audit log required by SECURITY_POLICIES.md §4
CREATE TABLE IF NOT EXISTS public.audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT NOT NULL,
  ip INET,
  user_agent TEXT,
  path TEXT,
  status INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.farmers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farmer_produce ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regional_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bid_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produce_types ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- produce_types: readable by all authenticated users
CREATE POLICY "produce_types_read" ON public.produce_types FOR SELECT USING (auth.role() = 'authenticated');

-- farmers: users can only read/update their own record; service role bypasses
CREATE POLICY "farmers_own_read" ON public.farmers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "farmers_own_update" ON public.farmers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "farmers_insert" ON public.farmers FOR INSERT WITH CHECK (auth.uid() = user_id);

-- buyers: users can read/update their own record
CREATE POLICY "buyers_own_read" ON public.buyers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "buyers_own_update" ON public.buyers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "buyers_insert" ON public.buyers FOR INSERT WITH CHECK (auth.uid() = user_id);

-- farmer_produce: farmers own their listings; buyers can read approved listings
CREATE POLICY "farmer_produce_owner_all" ON public.farmer_produce FOR ALL USING (
  farmer_id IN (SELECT id FROM public.farmers WHERE user_id = auth.uid())
);
CREATE POLICY "farmer_produce_buyers_read" ON public.farmer_produce FOR SELECT USING (status = 'approved');

-- regional_bids: readable by authenticated; writeable by service role only
CREATE POLICY "regional_bids_read" ON public.regional_bids FOR SELECT USING (auth.role() = 'authenticated');

-- bids: buyers see their own bids; farmers see bids on their regions
CREATE POLICY "bids_buyer_all" ON public.bids FOR ALL USING (
  buyer_id IN (SELECT id FROM public.buyers WHERE user_id = auth.uid())
);
CREATE POLICY "bids_farmer_read" ON public.bids FOR SELECT USING (
  regional_bid_id IN (
    SELECT rb.id FROM public.regional_bids rb
    JOIN public.farmer_produce fp ON fp.produce_type_id = rb.produce_type_id AND fp.location_region = rb.region
    JOIN public.farmers f ON f.id = fp.farmer_id
    WHERE f.user_id = auth.uid()
  )
);

-- bid_confirmations: farmers see their own confirmations
CREATE POLICY "bid_confirmations_farmer" ON public.bid_confirmations FOR ALL USING (
  farmer_id IN (SELECT id FROM public.farmers WHERE user_id = auth.uid())
);

-- communications: users see messages they sent or received
CREATE POLICY "communications_own" ON public.communications FOR SELECT USING (
  sender_user_id = auth.uid() OR recipient_user_id = auth.uid()
);
CREATE POLICY "communications_send" ON public.communications FOR INSERT WITH CHECK (sender_user_id = auth.uid());
CREATE POLICY "communications_mark_read" ON public.communications FOR UPDATE USING (recipient_user_id = auth.uid());

-- audit_events: only service role can write; no user reads
CREATE POLICY "audit_events_service_only" ON public.audit_events FOR ALL USING (FALSE);

-- Seed produce_types with common Kenyan crops
INSERT INTO public.produce_types (name, category, unit_of_measurement) VALUES
  ('Maize', 'Cereals', 'bags'),
  ('Potatoes', 'Tubers', 'bags'),
  ('Beans', 'Legumes', 'bags'),
  ('Coffee', 'Cash Crops', 'kg'),
  ('Tea', 'Cash Crops', 'kg'),
  ('Wheat', 'Cereals', 'bags'),
  ('Sorghum', 'Cereals', 'bags'),
  ('Tomatoes', 'Vegetables', 'crates'),
  ('Onions', 'Vegetables', 'bags'),
  ('Avocado', 'Fruits', 'kg'),
  ('Banana', 'Fruits', 'bunches'),
  ('Sugarcane', 'Cash Crops', 'tonnes'),
  ('Sunflower', 'Oilseeds', 'bags'),
  ('Soya Beans', 'Legumes', 'bags'),
  ('Millet', 'Cereals', 'bags')
ON CONFLICT DO NOTHING;
