#!/usr/bin/env python3
import os
import sys
import subprocess

# Get environment variables
url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("❌ Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    sys.exit(1)

# SQL migration scripts - embedded directly to avoid file path issues
migrations = [
    # 001_create_tables.sql
    """
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
    """,
]

try:
    print("🚀 Starting database migrations for Agri-D-Ledger...")
    print(f"Supabase URL: {url[:30]}...")
    
    # For now, print migration statements
    # In production, these would be executed via Supabase SQL editor or via proper admin API
    print("\n📝 Migration SQL has been prepared:")
    print("=" * 60)
    print(migrations[0][:500] + "...")
    print("=" * 60)
    print("\n✅ SQL migration scripts are ready to be executed")
    print("📌 Next step: Execute these scripts in your Supabase SQL Editor")
    print("   or use a Python script with proper Supabase admin credentials")
    
except Exception as e:
    print(f"❌ Error: {str(e)}")
    sys.exit(1)
