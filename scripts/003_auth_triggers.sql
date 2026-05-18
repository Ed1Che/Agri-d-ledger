-- Agri-D-Ledger: Authentication Triggers
-- This script sets up automatic profile creation and updates

-- ============================================
-- TRIGGER: Auto-create profile on user signup
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    phone_number,
    user_role
  )
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'full_name', NULL),
    COALESCE(new.raw_user_meta_data ->> 'phone_number', NULL),
    COALESCE((new.raw_user_meta_data ->> 'user_role')::user_role, 'buyer')
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create new trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- TRIGGER: Update profile updated_at timestamp
-- ============================================

CREATE OR REPLACE FUNCTION public.update_profile_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  new.updated_at = CURRENT_TIMESTAMP;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_profile_updated_at();

-- ============================================
-- TRIGGER: Update other timestamp columns
-- ============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  new.updated_at = CURRENT_TIMESTAMP;
  RETURN new;
END;
$$;

-- Apply to all tables with updated_at
DROP TRIGGER IF EXISTS update_buyers_updated_at ON public.buyers;
CREATE TRIGGER update_buyers_updated_at BEFORE UPDATE ON public.buyers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_farmers_updated_at ON public.farmers;
CREATE TRIGGER update_farmers_updated_at BEFORE UPDATE ON public.farmers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_farmer_produce_offerings_updated_at ON public.farmer_produce_offerings;
CREATE TRIGGER update_farmer_produce_offerings_updated_at BEFORE UPDATE ON public.farmer_produce_offerings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_regional_produce_analysis_updated_at ON public.regional_produce_analysis;
CREATE TRIGGER update_regional_produce_analysis_updated_at BEFORE UPDATE ON public.regional_produce_analysis
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_regional_bids_updated_at ON public.regional_bids;
CREATE TRIGGER update_regional_bids_updated_at BEFORE UPDATE ON public.regional_bids
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_regional_bid_participants_updated_at ON public.regional_bid_participants;
CREATE TRIGGER update_regional_bid_participants_updated_at BEFORE UPDATE ON public.regional_bid_participants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_buyer_bids_updated_at ON public.buyer_bids;
CREATE TRIGGER update_buyer_bids_updated_at BEFORE UPDATE ON public.buyer_bids
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_smart_contracts_updated_at ON public.smart_contracts;
CREATE TRIGGER update_smart_contracts_updated_at BEFORE UPDATE ON public.smart_contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_regions_updated_at ON public.regions;
CREATE TRIGGER update_regions_updated_at BEFORE UPDATE ON public.regions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_produce_types_updated_at ON public.produce_types;
CREATE TRIGGER update_produce_types_updated_at BEFORE UPDATE ON public.produce_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_system_config_updated_at ON public.system_config;
CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON public.system_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- FUNCTION: Audit log on data changes
-- ============================================

CREATE OR REPLACE FUNCTION public.audit_table_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (user_id, action, table_name, record_id, changes)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, OLD.id, row_to_json(OLD));
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log (user_id, action, table_name, record_id, changes)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, NEW.id, jsonb_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW)));
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (user_id, action, table_name, record_id, changes)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, NEW.id, row_to_json(NEW));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Enable audit logging on critical tables
DROP TRIGGER IF EXISTS audit_buyer_bids ON public.buyer_bids;
CREATE TRIGGER audit_buyer_bids
  AFTER INSERT OR UPDATE OR DELETE ON public.buyer_bids
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_table_changes();

DROP TRIGGER IF EXISTS audit_smart_contracts ON public.smart_contracts;
CREATE TRIGGER audit_smart_contracts
  AFTER INSERT OR UPDATE OR DELETE ON public.smart_contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_table_changes();

DROP TRIGGER IF EXISTS audit_regional_bids ON public.regional_bids;
CREATE TRIGGER audit_regional_bids
  AFTER INSERT OR UPDATE OR DELETE ON public.regional_bids
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_table_changes();
