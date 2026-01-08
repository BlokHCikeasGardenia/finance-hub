-- Migration: Change multiple periode concept
-- From: Multiple kategori dalam satu record (Air+IPL gabung)
-- To: Multiple periode dalam satu record, single kategori per record

-- Step 1: Add periode_list column to pemasukan table (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pemasukan' AND column_name = 'periode_list'
    ) THEN
        ALTER TABLE pemasukan ADD COLUMN periode_list UUID[] DEFAULT ARRAY[]::UUID[];
    END IF;
END $$;

-- Step 2: Migrate data - populate periode_list from periode_id for existing records
-- For single period records, move periode_id to periode_list
UPDATE pemasukan 
SET periode_list = CASE 
    WHEN periode_id IS NOT NULL THEN ARRAY[periode_id]::UUID[]
    ELSE periode_list
END
WHERE periode_id IS NOT NULL AND (periode_list IS NULL OR array_length(periode_list, 1) = 0);

-- Step 3: Create index on periode_list for faster queries (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        WHERE c.relname = 'idx_pemasukan_periode_list'
    ) THEN
        CREATE INDEX idx_pemasukan_periode_list ON pemasukan USING GIN (periode_list);
    END IF;
END $$;

-- Step 4: Keep periode_id for backward compatibility temporarily (if not exists)
-- It will be deprecated in future versions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pemasukan' AND column_name = 'periode_id_deprecated'
    ) THEN
        ALTER TABLE pemasukan ADD COLUMN periode_id_deprecated BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- For records with data, mark periode_id_deprecated as FALSE (still using old approach)
UPDATE pemasukan SET periode_id_deprecated = FALSE WHERE periode_id IS NOT NULL;

-- Step 5: Add constraint to ensure kategori is singular (not mixed)
-- This is enforced at application level, but documenting here:
-- - Each pemasukan record must have exactly ONE kategori_id
-- - periode_list can contain multiple periode IDs (for same kategori across multiple periods)

-- Step 6: Create helper view to understand data structure
CREATE OR REPLACE VIEW v_pemasukan_detail AS
SELECT 
    p.id,
    p.id_transaksi,
    p.tanggal,
    p.nominal,
    p.kategori_id,
    k.nama_kategori,
    p.periode_list,
    array_length(p.periode_list, 1) as jumlah_periode,
    p.hunian_id,
    h.nomor_blok_rumah,
    p.keterangan
FROM pemasukan p
LEFT JOIN kategori_saldo k ON p.kategori_id = k.id
LEFT JOIN hunian h ON p.hunian_id = h.id
ORDER BY p.tanggal DESC;

-- Step 7: Verify migration
-- Run this query to check if migration succeeded:
-- SELECT COUNT(*) as total_records, 
--        COUNT(CASE WHEN periode_list IS NOT NULL THEN 1 END) as records_with_periode_list,
--        COUNT(CASE WHEN array_length(periode_list, 1) > 1 THEN 1 END) as records_with_multiple_periode
-- FROM pemasukan;
