-- Migration: Consolidate meteran_air and tagihan_air into meteran_air_billing + Add pelanggan_air to hunian
-- Phase 1: Schema Creation
-- Run this in Supabase SQL Editor

-- ============================
-- PHASE 0: ADD PELANGGAN_AIR TO HUNIAN TABLE
-- ============================

-- Add pelanggan_air column to hunian table (moved from penghuni to hunian)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'hunian' AND column_name = 'pelanggan_air') THEN
        ALTER TABLE hunian ADD COLUMN pelanggan_air BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added pelanggan_air column to hunian table';

        -- Migrate existing pelanggan_air data from penghuni to hunian
        -- Set hunian.pelanggan_air = true if current penghuni is pelanggan_air
        UPDATE hunian
        SET pelanggan_air = true
        WHERE penghuni_saat_ini_id IN (
            SELECT id FROM penghuni WHERE pelanggan_air = true
        );

        RAISE NOTICE 'Migrated pelanggan_air data from penghuni to hunian table';
    ELSE
        RAISE NOTICE 'pelanggan_air column already exists in hunian table';
    END IF;
END $$;

-- ============================
-- PHASE 1: CREATE NEW CONSOLIDATED TABLES
-- ============================

-- Create consolidated meteran_air_billing table
CREATE TABLE meteran_air_billing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    periode_id UUID NOT NULL REFERENCES periode(id),
    hunian_id UUID NOT NULL REFERENCES hunian(id),
    penghuni_id UUID REFERENCES penghuni(id),

    -- Meter readings (normalized, not JSONB)
    meteran_periode_ini NUMERIC(10,2),
    meteran_periode_sebelumnya NUMERIC(10,2),
    pemakaian_m3 NUMERIC(10,2),

    -- Billing calculation
    tarif_per_kubik NUMERIC(10,2),
    nominal_tagihan NUMERIC(12,2),

    -- Payment tracking
    total_pembayaran NUMERIC(12,2) DEFAULT 0,
    sisa_tagihan NUMERIC(12,2),
    status VARCHAR(20) DEFAULT 'belum_bayar'
        CHECK (status IN ('belum_bayar', 'sebagian', 'lunas')),

    -- Metadata
    tanggal_tagihan DATE NOT NULL,
    tanggal_jatuh_tempo DATE,
    keterangan TEXT,
    billing_type VARCHAR(20) DEFAULT 'automatic'
        CHECK (billing_type IN ('automatic', 'manual', 'baseline', 'inisiasi')),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure one bill per household per period
    UNIQUE(periode_id, hunian_id)
);

-- Create payment allocation table for new structure
CREATE TABLE meteran_air_billing_pembayaran (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meteran_air_billing_id UUID NOT NULL REFERENCES meteran_air_billing(id),
    pemasukan_id UUID NOT NULL REFERENCES pemasukan(id),
    nominal_dialokasikan NUMERIC(12,2) NOT NULL,
    tanggal_alokasi DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(meteran_air_billing_id, pemasukan_id)
);

-- ============================
-- PHASE 1: CREATE INDEXES
-- ============================

-- Indexes for meteran_air_billing
CREATE INDEX idx_meteran_air_billing_periode ON meteran_air_billing(periode_id);
CREATE INDEX idx_meteran_air_billing_hunian ON meteran_air_billing(hunian_id);
CREATE INDEX idx_meteran_air_billing_penghuni ON meteran_air_billing(penghuni_id);
CREATE INDEX idx_meteran_air_billing_status ON meteran_air_billing(status);
CREATE INDEX idx_meteran_air_billing_tanggal_tagihan ON meteran_air_billing(tanggal_tagihan);
CREATE INDEX idx_meteran_air_billing_jatuh_tempo ON meteran_air_billing(tanggal_jatuh_tempo);

-- Indexes for payment allocations
CREATE INDEX idx_meteran_air_billing_pembayaran_billing ON meteran_air_billing_pembayaran(meteran_air_billing_id);
CREATE INDEX idx_meteran_air_billing_pembayaran_pemasukan ON meteran_air_billing_pembayaran(pemasukan_id);

-- ============================
-- PHASE 2: DATA MIGRATION
-- ============================

-- Check if tagihan_air table exists before migrating
DO $$
BEGIN
    -- Only migrate if tagihan_air table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tagihan_air') THEN
        -- Migrate existing tagihan_air data to new consolidated table
        INSERT INTO meteran_air_billing (
            periode_id, hunian_id, penghuni_id,
            meteran_periode_ini, meteran_periode_sebelumnya, pemakaian_m3,
            tarif_per_kubik, nominal_tagihan,
            total_pembayaran, sisa_tagihan, status,
            tanggal_tagihan, tanggal_jatuh_tempo, keterangan,
            billing_type, created_at, updated_at
        )
        SELECT
            periode_id, hunian_id, penghuni_id,
            meteran_periode_ini, meteran_periode_sebelumnya, pemakaian_m3,
            tarif_per_kubik, nominal_tagihan,
            total_pembayaran, sisa_tagihan, status,
            tanggal_tagihan, tanggal_jatuh_tempo, keterangan,
            'automatic'::VARCHAR(20), created_at, updated_at
        FROM tagihan_air;

        RAISE NOTICE 'Migrated data from tagihan_air table';
    ELSE
        RAISE NOTICE 'tagihan_air table does not exist - skipping data migration';
    END IF;

    -- Only migrate payments if both tables exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tagihan_air_pembayaran')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'meteran_air_billing') THEN
        -- Migrate payment allocations to new structure
        INSERT INTO meteran_air_billing_pembayaran (
            meteran_air_billing_id, pemasukan_id, nominal_dialokasikan,
            tanggal_alokasi, created_at
        )
        SELECT
            mab.id, tap.pemasukan_id, tap.nominal_dialokasikan,
            tap.tanggal_alokasi, tap.created_at
        FROM tagihan_air_pembayaran tap
        JOIN meteran_air_billing mab ON tap.tagihan_air_id = mab.id;

        RAISE NOTICE 'Migrated payment allocations from tagihan_air_pembayaran table';
    ELSE
        RAISE NOTICE 'Payment allocation tables not available for migration';
    END IF;
END $$;

-- ============================
-- PHASE 3: VALIDATION QUERIES
-- ============================

-- Verify data migration counts (handle missing tables gracefully)
DO $$
DECLARE
    old_bills_count INTEGER := 0;
    new_bills_count INTEGER := 0;
    old_payments_count INTEGER := 0;
    new_payments_count INTEGER := 0;
BEGIN
    -- Check if old tables exist and get counts
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tagihan_air') THEN
        EXECUTE 'SELECT COUNT(*) FROM tagihan_air' INTO old_bills_count;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tagihan_air_pembayaran') THEN
        EXECUTE 'SELECT COUNT(*) FROM tagihan_air_pembayaran' INTO old_payments_count;
    END IF;

    -- Get new table counts
    SELECT COUNT(*) INTO new_bills_count FROM meteran_air_billing;
    SELECT COUNT(*) INTO new_payments_count FROM meteran_air_billing_pembayaran;

    -- Display results
    RAISE NOTICE 'Migration Summary:';
    RAISE NOTICE 'Old bills count: %', old_bills_count;
    RAISE NOTICE 'New bills count: %', new_bills_count;
    RAISE NOTICE 'Old payments count: %', old_payments_count;
    RAISE NOTICE 'New payments count: %', new_payments_count;
END $$;

-- Check for any data inconsistencies (only if new table has data)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM meteran_air_billing LIMIT 1) THEN
        -- Check for bills with missing periods
        PERFORM 1 FROM meteran_air_billing mab
        LEFT JOIN periode p ON mab.periode_id = p.id
        WHERE p.id IS NULL;

        IF FOUND THEN
            RAISE NOTICE 'WARNING: Found bills with missing periods';
        ELSE
            RAISE NOTICE 'All bills have valid periods';
        END IF;

        -- Check for bills with missing households
        PERFORM 1 FROM meteran_air_billing mab
        LEFT JOIN hunian h ON mab.hunian_id = h.id
        WHERE h.id IS NULL;

        IF FOUND THEN
            RAISE NOTICE 'WARNING: Found bills with missing households';
        ELSE
            RAISE NOTICE 'All bills have valid households';
        END IF;

        -- Check for payments with missing bills
        PERFORM 1 FROM meteran_air_billing_pembayaran mabp
        LEFT JOIN meteran_air_billing mab ON mabp.meteran_air_billing_id = mab.id
        WHERE mab.id IS NULL;

        IF FOUND THEN
            RAISE NOTICE 'WARNING: Found payments with missing bills';
        ELSE
            RAISE NOTICE 'All payments have valid bills';
        END IF;
    ELSE
        RAISE NOTICE 'No bills in new table to validate';
    END IF;
END $$;

-- ============================
-- PHASE 4: BACKUP OLD TABLES (Optional - for safety)
-- ============================

-- Rename old tables with _old suffix for backup (only if they exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tagihan_air') THEN
        ALTER TABLE tagihan_air RENAME TO tagihan_air_old;
        RAISE NOTICE 'Renamed tagihan_air to tagihan_air_old';
    ELSE
        RAISE NOTICE 'tagihan_air table does not exist - skipping rename';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tagihan_air_pembayaran') THEN
        ALTER TABLE tagihan_air_pembayaran RENAME TO tagihan_air_pembayaran_old;
        RAISE NOTICE 'Renamed tagihan_air_pembayaran to tagihan_air_pembayaran_old';
    ELSE
        RAISE NOTICE 'tagihan_air_pembayaran table does not exist - skipping rename';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'meteran_air') THEN
        ALTER TABLE meteran_air RENAME TO meteran_air_old;
        RAISE NOTICE 'Renamed meteran_air to meteran_air_old';
    ELSE
        RAISE NOTICE 'meteran_air table does not exist - skipping rename';
    END IF;
END $$;

-- ============================
-- PHASE 5: CLEANUP (Run after successful testing)
-- ============================

-- Drop old tables after verification (uncomment when ready)
DO $$
BEGIN
    -- Only drop tables if they exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tagihan_air_old') THEN
        -- DROP TABLE tagihan_air_old;
        RAISE NOTICE 'tagihan_air_old table ready for deletion (uncomment DROP statement when ready)';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tagihan_air_pembayaran_old') THEN
        -- DROP TABLE tagihan_air_pembayaran_old;
        RAISE NOTICE 'tagihan_air_pembayaran_old table ready for deletion (uncomment DROP statement when ready)';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'meteran_air_old') THEN
        -- DROP TABLE meteran_air_old;
        RAISE NOTICE 'meteran_air_old table ready for deletion (uncomment DROP statement when ready)';
    END IF;
END $$;

-- ============================
-- SUCCESS MESSAGE
-- ============================

-- This migration is complete. The new consolidated table structure is now active.
-- All existing Air billing data has been migrated to the new meteran_air_billing table.