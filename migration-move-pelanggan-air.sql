-- Migration script to move pelanggan_air field from penghuni to hunian table
-- Run this in Supabase SQL Editor

-- First, add the pelanggan_air column to hunian table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'hunian' AND column_name = 'pelanggan_air'
    ) THEN
        ALTER TABLE hunian ADD COLUMN pelanggan_air BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Migrate existing pelanggan_air data from penghuni to hunian
-- Update hunian records where penghuni_saat_ini has pelanggan_air = true
UPDATE hunian
SET pelanggan_air = true
WHERE penghuni_saat_ini_id IN (
    SELECT id FROM penghuni WHERE pelanggan_air = true
);

-- Update hunian records where penghuni_sebelumnya_1 has pelanggan_air = true
UPDATE hunian
SET pelanggan_air = true
WHERE penghuni_sebelumnya_1_id IN (
    SELECT id FROM penghuni WHERE pelanggan_air = true
);

-- Update hunian records where penghuni_sebelumnya_2 has pelanggan_air = true
UPDATE hunian
SET pelanggan_air = true
WHERE penghuni_sebelumnya_2_id IN (
    SELECT id FROM penghuni WHERE pelanggan_air = true
);

-- Now remove the pelanggan_air column from penghuni table
-- Note: This will fail if there are any constraints or indexes on this column
ALTER TABLE penghuni DROP COLUMN IF EXISTS pelanggan_air;

-- Verify the migration
SELECT
    h.id as hunian_id,
    h.nomor_blok_rumah,
    h.pelanggan_air as hunian_pelanggan_air,
    p.nama_kepala_keluarga,
    p.kondisi_khusus
FROM hunian h
LEFT JOIN penghuni p ON h.penghuni_saat_ini_id = p.id
ORDER BY h.nomor_urut
LIMIT 10;