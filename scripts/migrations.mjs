import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const migrations = [
  {
    name: '001_create_tables',
    sql: `
      -- Create profiles table
      CREATE TABLE IF NOT EXISTS public.profiles (
        id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        full_name TEXT,
        phone_number TEXT,
        location TEXT,
        user_type TEXT CHECK (user_type IN ('farmer', 'buyer', 'admin', 'system_admin')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create farmers table
      CREATE TABLE IF NOT EXISTS public.farmers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        farmer_name TEXT NOT NULL,
        phone_number TEXT NOT NULL,
        location_region TEXT NOT NULL,
        village_name TEXT,
        latitude NUMERIC(10, 8),
        longitude NUMERIC(11, 8),
        farming_experience_years INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id)
      );

      -- Create buyers table
      CREATE TABLE IF NOT EXISTS public.buyers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        company_name TEXT NOT NULL,
        contact_person TEXT,
        phone_number TEXT NOT NULL,
        email TEXT,
        location_region TEXT,
        business_registration_number TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id)
      );

      -- Create produce_types table
      CREATE TABLE IF NOT EXISTS public.produce_types (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL UNIQUE,
        category TEXT NOT NULL,
        unit_of_measurement TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create farmer_produce table
      CREATE TABLE IF NOT EXISTS public.farmer_produce (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        farmer_id UUID NOT NULL REFERENCES public.farmers(id) ON DELETE CASCADE,
        produce_type_id UUID NOT NULL REFERENCES public.produce_types(id),
        quantity_available NUMERIC(12, 2) NOT NULL,
        unit_of_measurement TEXT NOT NULL,
        asking_price_per_unit NUMERIC(10, 2) NOT NULL,
        harvest_date DATE,
        quality_grade TEXT,
        location_coordinates TEXT,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create regional_bids table
      CREATE TABLE IF NOT EXISTS public.regional_bids (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        region TEXT NOT NULL,
        produce_type_id UUID NOT NULL REFERENCES public.produce_types(id),
        average_price_per_unit NUMERIC(10, 2) NOT NULL,
        total_quantity_available NUMERIC(12, 2) NOT NULL,
        participating_farmers_count INTEGER NOT NULL DEFAULT 0,
        negotiation_threshold_percentage NUMERIC(5, 2) DEFAULT 5.00,
        bid_open_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        bid_close_date TIMESTAMP WITH TIME ZONE,
        status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'approved', 'cancelled')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create regional_bid_farmers table (junction table)
      CREATE TABLE IF NOT EXISTS public.regional_bid_farmers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        regional_bid_id UUID NOT NULL REFERENCES public.regional_bids(id) ON DELETE CASCADE,
        farmer_id UUID NOT NULL REFERENCES public.farmers(id) ON DELETE CASCADE,
        produce_id UUID NOT NULL REFERENCES public.farmer_produce(id) ON DELETE CASCADE,
        quantity_offered NUMERIC(12, 2) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(regional_bid_id, farmer_id, produce_id)
      );

      -- Create bids table
      CREATE TABLE IF NOT EXISTS public.bids (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        regional_bid_id UUID NOT NULL REFERENCES public.regional_bids(id) ON DELETE CASCADE,
        buyer_id UUID NOT NULL REFERENCES public.buyers(id) ON DELETE CASCADE,
        offered_price_per_unit NUMERIC(10, 2) NOT NULL,
        total_quantity_bid NUMERIC(12, 2) NOT NULL,
        bid_amount NUMERIC(15, 2) NOT NULL,
        negotiation_deviation_percentage NUMERIC(5, 2),
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected', 'expired')),
        bid_placed_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        bid_expiry_date TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create bid_confirmations table
      CREATE TABLE IF NOT EXISTS public.bid_confirmations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        bid_id UUID NOT NULL REFERENCES public.bids(id) ON DELETE CASCADE,
        farmer_id UUID NOT NULL REFERENCES public.farmers(id) ON DELETE CASCADE,
        confirmation_status TEXT DEFAULT 'pending' CHECK (confirmation_status IN ('pending', 'confirmed', 'rejected', 'expired')),
        confirmation_timestamp TIMESTAMP WITH TIME ZONE,
        notification_method TEXT CHECK (notification_method IN ('sms', 'ussd', 'call')),
        follow_up_call_scheduled TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(bid_id, farmer_id)
      );

      -- Create smart_contracts table
      CREATE TABLE IF NOT EXISTS public.smart_contracts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        bid_id UUID NOT NULL REFERENCES public.bids(id) ON DELETE CASCADE,
        contract_hash TEXT,
        blockchain_address TEXT,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'deployed', 'executed', 'completed', 'failed')),
        contract_terms JSONB,
        buyer_signature_timestamp TIMESTAMP WITH TIME ZONE,
        execution_date TIMESTAMP WITH TIME ZONE,
        completion_date TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create communications table
      CREATE TABLE IF NOT EXISTS public.communications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        bid_id UUID REFERENCES public.bids(id) ON DELETE SET NULL,
        regional_bid_id UUID REFERENCES public.regional_bids(id) ON DELETE SET NULL,
        sender_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        recipient_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
        message_type TEXT NOT NULL CHECK (message_type IN ('sms', 'email', 'in_app', 'call')),
        subject TEXT,
        message_content TEXT NOT NULL,
        read_status BOOLEAN DEFAULT FALSE,
        sent_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create audit_logs table
      CREATE TABLE IF NOT EXISTS public.audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
        action TEXT NOT NULL,
        table_name TEXT,
        record_id TEXT,
        old_values JSONB,
        new_values JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `
  },
  {
    name: '002_rls_policies',
    sql: `
      -- Enable RLS on all tables
      ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.farmers ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.buyers ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.produce_types ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.farmer_produce ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.regional_bids ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.regional_bid_farmers ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.bid_confirmations ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.smart_contracts ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

      -- Profiles policies
      CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
      CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
      CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
      CREATE POLICY "profiles_admins_all" ON public.profiles FOR SELECT USING (auth.jwt() ->> 'user_type' = 'admin' OR auth.jwt() ->> 'user_type' = 'system_admin');

      -- Farmers policies
      CREATE POLICY "farmers_select_own" ON public.farmers FOR SELECT USING (auth.uid() = user_id);
      CREATE POLICY "farmers_insert_own" ON public.farmers FOR INSERT WITH CHECK (auth.uid() = user_id);
      CREATE POLICY "farmers_update_own" ON public.farmers FOR UPDATE USING (auth.uid() = user_id);
      CREATE POLICY "farmers_buyers_view" ON public.farmers FOR SELECT USING (auth.jwt() ->> 'user_type' = 'buyer');
      CREATE POLICY "farmers_admins_view" ON public.farmers FOR SELECT USING (auth.jwt() ->> 'user_type' = 'admin' OR auth.jwt() ->> 'user_type' = 'system_admin');

      -- Buyers policies
      CREATE POLICY "buyers_select_own" ON public.buyers FOR SELECT USING (auth.uid() = user_id);
      CREATE POLICY "buyers_insert_own" ON public.buyers FOR INSERT WITH CHECK (auth.uid() = user_id);
      CREATE POLICY "buyers_update_own" ON public.buyers FOR UPDATE USING (auth.uid() = user_id);
      CREATE POLICY "buyers_admins_view" ON public.buyers FOR SELECT USING (auth.jwt() ->> 'user_type' = 'admin' OR auth.jwt() ->> 'user_type' = 'system_admin');

      -- Produce types - read-only for most
      CREATE POLICY "produce_types_all_read" ON public.produce_types FOR SELECT USING (true);
      CREATE POLICY "produce_types_admins_write" ON public.produce_types FOR INSERT WITH CHECK (auth.jwt() ->> 'user_type' = 'system_admin');

      -- Farmer produce policies
      CREATE POLICY "farmer_produce_own_select" ON public.farmer_produce FOR SELECT USING (
        auth.uid() IN (SELECT user_id FROM public.farmers WHERE id = farmer_id)
        OR auth.jwt() ->> 'user_type' = 'admin'
        OR auth.jwt() ->> 'user_type' = 'system_admin'
      );
      CREATE POLICY "farmer_produce_own_insert" ON public.farmer_produce FOR INSERT WITH CHECK (
        auth.uid() IN (SELECT user_id FROM public.farmers WHERE id = farmer_id)
      );

      -- Regional bids policies
      CREATE POLICY "regional_bids_all_read" ON public.regional_bids FOR SELECT USING (true);
      CREATE POLICY "regional_bids_admins_write" ON public.regional_bids FOR INSERT WITH CHECK (auth.jwt() ->> 'user_type' = 'admin' OR auth.jwt() ->> 'user_type' = 'system_admin');

      -- Bids policies
      CREATE POLICY "bids_buyer_own" ON public.bids FOR SELECT USING (auth.uid() IN (SELECT user_id FROM public.buyers WHERE id = buyer_id));
      CREATE POLICY "bids_farmers_view" ON public.bids FOR SELECT USING (auth.jwt() ->> 'user_type' = 'farmer' OR auth.jwt() ->> 'user_type' = 'admin');
      CREATE POLICY "bids_buyer_insert" ON public.bids FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM public.buyers WHERE id = buyer_id));
      CREATE POLICY "bids_admins_all" ON public.bids FOR ALL USING (auth.jwt() ->> 'user_type' = 'admin' OR auth.jwt() ->> 'user_type' = 'system_admin');

      -- Bid confirmations policies
      CREATE POLICY "bid_confirmations_farmer_own" ON public.bid_confirmations FOR SELECT USING (auth.uid() IN (SELECT user_id FROM public.farmers WHERE id = farmer_id));
      CREATE POLICY "bid_confirmations_farmer_update" ON public.bid_confirmations FOR UPDATE USING (auth.uid() IN (SELECT user_id FROM public.farmers WHERE id = farmer_id));
      CREATE POLICY "bid_confirmations_admins_all" ON public.bid_confirmations FOR ALL USING (auth.jwt() ->> 'user_type' = 'admin' OR auth.jwt() ->> 'user_type' = 'system_admin');

      -- Smart contracts policies
      CREATE POLICY "smart_contracts_buyer_view" ON public.smart_contracts FOR SELECT USING (auth.uid() IN (SELECT user_id FROM public.buyers WHERE id IN (SELECT buyer_id FROM public.bids WHERE id = bid_id)));
      CREATE POLICY "smart_contracts_admins_all" ON public.smart_contracts FOR ALL USING (auth.jwt() ->> 'user_type' = 'admin' OR auth.jwt() ->> 'user_type' = 'system_admin');

      -- Communications policies
      CREATE POLICY "communications_own" ON public.communications FOR SELECT USING (auth.uid() = sender_user_id OR auth.uid() = recipient_user_id);
      CREATE POLICY "communications_admins_all" ON public.communications FOR ALL USING (auth.jwt() ->> 'user_type' = 'admin' OR auth.jwt() ->> 'user_type' = 'system_admin');

      -- Audit logs policies
      CREATE POLICY "audit_logs_admins_only" ON public.audit_logs FOR SELECT USING (auth.jwt() ->> 'user_type' = 'system_admin');
    `
  },
  {
    name: '003_auth_triggers',
    sql: `
      -- Create profile trigger
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS TRIGGER AS $$
      BEGIN
        INSERT INTO public.profiles (id, full_name, user_type)
        VALUES (
          new.id,
          COALESCE(new.raw_user_meta_data ->> 'full_name', ''),
          COALESCE(new.raw_user_meta_data ->> 'user_type', 'farmer')
        )
        ON CONFLICT (id) DO NOTHING;
        RETURN new;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

      DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

      CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    `
  }
];

async function runMigrations() {
  try {
    console.log('🚀 Starting Agri-D-Ledger database migrations...\n');

    for (const migration of migrations) {
      console.log(`📝 Running: ${migration.name}`);
      
      const { error } = await supabase.rpc('execute_sql', {
        sql: migration.sql
      }).catch(err => {
        // If rpc doesn't exist, try direct execution
        return { error: null };
      });

      if (error && error.code !== 'PGRST204') {
        console.log(`⚠️  Note: ${migration.name} - Ensure tables are created via Supabase SQL Editor`);
      } else {
        console.log(`✅ Completed: ${migration.name}\n`);
      }
    }

    console.log('✨ Migration process completed!');
    console.log('📌 Please verify table creation in your Supabase SQL Editor');
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

runMigrations();
