-- Agri-D-Ledger: Row Level Security Policies
-- This script defines all RLS policies for data protection

-- ============================================
-- PROFILES TABLE POLICIES
-- ============================================

CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (
    (SELECT user_role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'system_admin')
  );

CREATE POLICY "System admins can manage all profiles"
  ON public.profiles
  FOR ALL
  USING (
    (SELECT user_role FROM public.profiles WHERE id = auth.uid()) = 'system_admin'
  );

-- ============================================
-- BUYERS TABLE POLICIES
-- ============================================

CREATE POLICY "Buyers can view their own profile"
  ON public.buyers
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Buyers can update their own profile"
  ON public.buyers
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all buyer profiles"
  ON public.buyers
  FOR SELECT
  USING (
    (SELECT user_role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'system_admin')
  );

CREATE POLICY "Buyers can insert their own profile"
  ON public.buyers
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- FARMERS TABLE POLICIES
-- ============================================

CREATE POLICY "Farmers can view their own profile"
  ON public.farmers
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Farmers can update their own profile"
  ON public.farmers
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all farmer profiles"
  ON public.farmers
  FOR SELECT
  USING (
    (SELECT user_role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'system_admin')
  );

CREATE POLICY "Farmers can insert their own profile"
  ON public.farmers
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- REGIONS TABLE POLICIES
-- ============================================

-- Everyone can view regions (for filtering)
CREATE POLICY "Everyone can view regions"
  ON public.regions
  FOR SELECT
  USING (true);

CREATE POLICY "System admins can manage regions"
  ON public.regions
  FOR ALL
  USING (
    (SELECT user_role FROM public.profiles WHERE id = auth.uid()) = 'system_admin'
  );

-- ============================================
-- PRODUCE TYPES TABLE POLICIES
-- ============================================

-- Everyone can view produce types
CREATE POLICY "Everyone can view produce types"
  ON public.produce_types
  FOR SELECT
  USING (true);

CREATE POLICY "System admins can manage produce types"
  ON public.produce_types
  FOR ALL
  USING (
    (SELECT user_role FROM public.profiles WHERE id = auth.uid()) = 'system_admin'
  );

-- ============================================
-- FARMER PRODUCE OFFERINGS POLICIES
-- ============================================

CREATE POLICY "Farmers can view their own offerings"
  ON public.farmer_produce_offerings
  FOR SELECT
  USING (auth.uid() = farmer_id);

CREATE POLICY "Farmers can insert their own offerings"
  ON public.farmer_produce_offerings
  FOR INSERT
  WITH CHECK (auth.uid() = farmer_id);

CREATE POLICY "Farmers can update their own offerings"
  ON public.farmer_produce_offerings
  FOR UPDATE
  USING (auth.uid() = farmer_id)
  WITH CHECK (auth.uid() = farmer_id);

CREATE POLICY "Admins can view farmer offerings in their region"
  ON public.farmer_produce_offerings
  FOR SELECT
  USING (
    (SELECT user_role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'system_admin')
  );

-- ============================================
-- REGIONAL PRODUCE ANALYSIS POLICIES
-- ============================================

CREATE POLICY "Everyone can view regional analysis data"
  ON public.regional_produce_analysis
  FOR SELECT
  USING (true);

CREATE POLICY "System admins can manage analysis data"
  ON public.regional_produce_analysis
  FOR ALL
  USING (
    (SELECT user_role FROM public.profiles WHERE id = auth.uid()) = 'system_admin'
  );

-- ============================================
-- REGIONAL BIDS POLICIES
-- ============================================

CREATE POLICY "Everyone can view open regional bids"
  ON public.regional_bids
  FOR SELECT
  USING (true);

CREATE POLICY "Buyers can view regional bids"
  ON public.regional_bids
  FOR SELECT
  USING (
    (SELECT user_role FROM public.profiles WHERE id = auth.uid()) = 'buyer'
  );

CREATE POLICY "Admins can manage regional bids"
  ON public.regional_bids
  FOR ALL
  USING (
    (SELECT user_role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'system_admin')
  );

-- ============================================
-- REGIONAL BID PARTICIPANTS POLICIES
-- ============================================

CREATE POLICY "Farmers can view their bid participation"
  ON public.regional_bid_participants
  FOR SELECT
  USING (auth.uid() = farmer_id);

CREATE POLICY "Farmers can update their bid status"
  ON public.regional_bid_participants
  FOR UPDATE
  USING (auth.uid() = farmer_id)
  WITH CHECK (auth.uid() = farmer_id);

CREATE POLICY "Admins can view all bid participants"
  ON public.regional_bid_participants
  FOR SELECT
  USING (
    (SELECT user_role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'system_admin')
  );

CREATE POLICY "Admins can manage bid participants"
  ON public.regional_bid_participants
  FOR ALL
  USING (
    (SELECT user_role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'system_admin')
  );

-- ============================================
-- BUYER BIDS POLICIES
-- ============================================

CREATE POLICY "Buyers can view their own bids"
  ON public.buyer_bids
  FOR SELECT
  USING (auth.uid() = buyer_id);

CREATE POLICY "Buyers can insert bids"
  ON public.buyer_bids
  FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Buyers can update their own bids"
  ON public.buyer_bids
  FOR UPDATE
  USING (auth.uid() = buyer_id)
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Admins can view all buyer bids"
  ON public.buyer_bids
  FOR SELECT
  USING (
    (SELECT user_role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'system_admin')
  );

CREATE POLICY "Admins can manage buyer bids"
  ON public.buyer_bids
  FOR ALL
  USING (
    (SELECT user_role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'system_admin')
  );

-- ============================================
-- SMART CONTRACTS POLICIES
-- ============================================

CREATE POLICY "Users can view contracts related to their bids"
  ON public.smart_contracts
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT buyer_id FROM public.buyer_bids WHERE id = smart_contracts.buyer_bid_id
    )
    OR (SELECT user_role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'system_admin')
  );

CREATE POLICY "Admins can manage smart contracts"
  ON public.smart_contracts
  FOR ALL
  USING (
    (SELECT user_role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'system_admin')
  );

-- ============================================
-- NOTIFICATIONS POLICIES
-- ============================================

CREATE POLICY "Users can view their own notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = recipient_user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = recipient_user_id)
  WITH CHECK (auth.uid() = recipient_user_id);

CREATE POLICY "System can insert notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (true);

-- ============================================
-- COMMUNICATIONS POLICIES
-- ============================================

CREATE POLICY "System can manage communications"
  ON public.communications
  FOR ALL
  USING (true);

CREATE POLICY "Users can view their communications"
  ON public.communications
  FOR SELECT
  USING (
    auth.uid() = from_user_id
    OR auth.uid() = related_farmer_id
  );

-- ============================================
-- AUDIT LOG POLICIES
-- ============================================

CREATE POLICY "System admins can view audit logs"
  ON public.audit_log
  FOR SELECT
  USING (
    (SELECT user_role FROM public.profiles WHERE id = auth.uid()) = 'system_admin'
  );

CREATE POLICY "System can insert audit logs"
  ON public.audit_log
  FOR INSERT
  WITH CHECK (true);

-- ============================================
-- SYSTEM CONFIG POLICIES
-- ============================================

CREATE POLICY "Everyone can view config"
  ON public.system_config
  FOR SELECT
  USING (true);

CREATE POLICY "System admins can manage config"
  ON public.system_config
  FOR ALL
  USING (
    (SELECT user_role FROM public.profiles WHERE id = auth.uid()) = 'system_admin'
  );
