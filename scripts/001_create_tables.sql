-- Agri-D-Ledger: Core Database Schema
-- This script creates all necessary tables for the platform

-- ============================================
-- USER ROLES AND PROFILES
-- ============================================

-- Create enum for user roles
CREATE TYPE user_role AS ENUM ('farmer', 'buyer', 'admin', 'system_admin');

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone_number TEXT,
  user_role user_role NOT NULL DEFAULT 'buyer',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Buyer profiles with business details
CREATE TABLE IF NOT EXISTS public.buyers (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  business_registration_number TEXT,
  contact_person TEXT,
  business_phone TEXT,
  address TEXT,
  city TEXT,
  region TEXT,
  country TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.buyers ENABLE ROW LEVEL SECURITY;

-- Farmer profiles
CREATE TABLE IF NOT EXISTS public.farmers (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  farmer_code TEXT UNIQUE,
  region TEXT NOT NULL,
  sub_county TEXT,
  village TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  phone_number_verified BOOLEAN DEFAULT FALSE,
  ussd_registered BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.farmers ENABLE ROW LEVEL SECURITY;

-- ============================================
-- REGIONS AND PRODUCE TYPES
-- ============================================

-- Regions table
CREATE TABLE IF NOT EXISTS public.regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_name TEXT NOT NULL UNIQUE,
  region_code TEXT UNIQUE,
  country TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;

-- Produce types (maize, potatoes, etc.)
CREATE TABLE IF NOT EXISTS public.produce_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produce_name TEXT NOT NULL UNIQUE,
  produce_code TEXT UNIQUE,
  description TEXT,
  unit_of_measurement TEXT NOT NULL DEFAULT 'kg', -- kg, units, etc.
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.produce_types ENABLE ROW LEVEL SECURITY;

-- ============================================
-- FARMER PRODUCTION DATA
-- ============================================

-- Farmer produce offerings (data from USSD)
CREATE TABLE IF NOT EXISTS public.farmer_produce_offerings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES public.farmers(id) ON DELETE CASCADE,
  produce_id UUID NOT NULL REFERENCES public.produce_types(id),
  region_id UUID NOT NULL REFERENCES public.regions(id),
  quantity_kg NUMERIC NOT NULL,
  asking_price_per_unit NUMERIC,
  quality_grade TEXT,
  harvest_date DATE,
  available_for_pickup BOOLEAN DEFAULT TRUE,
  pickup_location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.farmer_produce_offerings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- REGIONAL BIDS AND PRICING
-- ============================================

-- Regional produce analysis (aggregate data for regional bids)
CREATE TABLE IF NOT EXISTS public.regional_produce_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id UUID NOT NULL REFERENCES public.regions(id),
  produce_id UUID NOT NULL REFERENCES public.produce_types(id),
  analysis_date DATE NOT NULL,
  total_farmers_offering INT,
  total_quantity_available_kg NUMERIC,
  average_price_per_unit NUMERIC NOT NULL,
  min_price_per_unit NUMERIC,
  max_price_per_unit NUMERIC,
  price_standard_deviation NUMERIC,
  negotiation_threshold_percent NUMERIC DEFAULT 10,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(region_id, produce_id, analysis_date)
);

ALTER TABLE public.regional_produce_analysis ENABLE ROW LEVEL SECURITY;

-- Regional open bids
CREATE TABLE IF NOT EXISTS public.regional_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_analysis_id UUID NOT NULL REFERENCES public.regional_produce_analysis(id) ON DELETE CASCADE,
  region_id UUID NOT NULL REFERENCES public.regions(id),
  produce_id UUID NOT NULL REFERENCES public.produce_types(id),
  bid_date DATE NOT NULL,
  quantity_needed_kg NUMERIC NOT NULL,
  base_price_per_unit NUMERIC NOT NULL,
  negotiation_deviation_threshold NUMERIC,
  status TEXT NOT NULL DEFAULT 'open', -- open, negotiation, closed
  pickup_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.regional_bids ENABLE ROW LEVEL SECURITY;

-- Regional bid participants (farmers associated with each bid)
CREATE TABLE IF NOT EXISTS public.regional_bid_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  regional_bid_id UUID NOT NULL REFERENCES public.regional_bids(id) ON DELETE CASCADE,
  farmer_id UUID NOT NULL REFERENCES public.farmers(id) ON DELETE CASCADE,
  offering_id UUID NOT NULL REFERENCES public.farmer_produce_offerings(id) ON DELETE CASCADE,
  quantity_committed_kg NUMERIC,
  status TEXT DEFAULT 'invited', -- invited, accepted, rejected, confirmed
  accepted_at TIMESTAMP WITH TIME ZONE,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(regional_bid_id, farmer_id)
);

ALTER TABLE public.regional_bid_participants ENABLE ROW LEVEL SECURITY;

-- ============================================
-- BUYER BIDS AND TRANSACTIONS
-- ============================================

-- Buyer bids on regional offers
CREATE TABLE IF NOT EXISTS public.buyer_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES public.buyers(id) ON DELETE CASCADE,
  regional_bid_id UUID NOT NULL REFERENCES public.regional_bids(id) ON DELETE CASCADE,
  bid_price_per_unit NUMERIC NOT NULL,
  quantity_requested_kg NUMERIC NOT NULL,
  delivery_terms TEXT,
  payment_terms TEXT,
  bid_status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, rejected, confirmed, completed
  negotiation_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.buyer_bids ENABLE ROW LEVEL SECURITY;

-- Smart contract records (phase 2)
CREATE TABLE IF NOT EXISTS public.smart_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_bid_id UUID NOT NULL REFERENCES public.buyer_bids(id) ON DELETE CASCADE,
  contract_hash TEXT UNIQUE,
  blockchain_address TEXT,
  contract_terms JSONB,
  contract_status TEXT DEFAULT 'pending', -- pending, created, confirmed, completed, failed
  approval_percentage NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.smart_contracts ENABLE ROW LEVEL SECURITY;

-- ============================================
-- NOTIFICATIONS AND COMMUNICATIONS
-- ============================================

-- Notification log
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL, -- sms, email, in_app
  message TEXT NOT NULL,
  related_bid_id UUID REFERENCES public.buyer_bids(id) ON DELETE SET NULL,
  related_contract_id UUID REFERENCES public.smart_contracts(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Communication log (SMS, calls, etc.)
CREATE TABLE IF NOT EXISTS public.communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  to_phone_number TEXT,
  communication_type TEXT NOT NULL, -- sms, call, ussd
  message_content TEXT,
  status TEXT DEFAULT 'pending', -- pending, sent, delivered, failed
  related_bid_id UUID REFERENCES public.buyer_bids(id) ON DELETE SET NULL,
  related_farmer_id UUID REFERENCES public.farmers(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- AUDIT AND SYSTEM TABLES
-- ============================================

-- Audit log
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  changes JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- System configuration
CREATE TABLE IF NOT EXISTS public.system_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT NOT NULL UNIQUE,
  config_value TEXT,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_profiles_user_role ON public.profiles(user_role);
CREATE INDEX IF NOT EXISTS idx_farmers_region ON public.farmers(region);
CREATE INDEX IF NOT EXISTS idx_farmer_produce_region ON public.farmer_produce_offerings(region_id);
CREATE INDEX IF NOT EXISTS idx_farmer_produce_farmer ON public.farmer_produce_offerings(farmer_id);
CREATE INDEX IF NOT EXISTS idx_regional_bid_status ON public.regional_bids(status);
CREATE INDEX IF NOT EXISTS idx_regional_bid_date ON public.regional_bids(bid_date);
CREATE INDEX IF NOT EXISTS idx_buyer_bid_status ON public.buyer_bids(bid_status);
CREATE INDEX IF NOT EXISTS idx_buyer_bid_buyer ON public.buyer_bids(buyer_id);
CREATE INDEX IF NOT EXISTS idx_smart_contract_status ON public.smart_contracts(contract_status);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON public.audit_log(timestamp);

-- ============================================
-- GRANTS FOR PUBLIC ACCESS
-- ============================================

GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, anon;

-- All tables will have individual RLS policies defined in subsequent migrations
