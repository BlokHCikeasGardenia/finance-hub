-- Database Migration Script for IPL Dibayar di Muka Enhancement
-- Adds type_tarif column to tagihan_ipl table and updates existing data

-- Step 1: Add type_tarif column to tagihan_ipl table
ALTER TABLE tagihan_ipl ADD COLUMN type_tarif VARCHAR(50);

-- Step 2: Update existing data based on nominal values
-- Update IPL Normal (60000)
UPDATE tagihan_ipl 
SET type_tarif = 'IPL' 
WHERE nominal_tagihan = 60000;

-- Update IPL Rumah Kosong (30000)
UPDATE tagihan_ipl 
SET type_tarif = 'IPL_RUMAH_KOSONG' 
WHERE nominal_tagihan = 30000;

-- Update DAU (5000)
UPDATE tagihan_ipl 
SET type_tarif = 'DAU' 
WHERE nominal_tagihan = 5000;

-- Step 3: Create index for type_tarif column
CREATE INDEX idx_tagihan_ipl_type_tarif ON tagihan_ipl(type_tarif);

-- Step 4: Verify the migration
SELECT 
    type_tarif,
    COUNT(*) as jumlah_tagihan,
    AVG(nominal_tagihan) as rata_rata_nominal
FROM tagihan_ipl 
WHERE type_tarif IS NOT NULL
GROUP BY type_tarif
ORDER BY type_tarif;

-- Step 5: Check for any records that might not have been updated
SELECT COUNT(*) as jumlah_tanpa_type_tarif
FROM tagihan_ipl 
WHERE type_tarif IS NULL;

-- Step 6: Add comment for documentation
COMMENT ON COLUMN tagihan_ipl.type_tarif IS 'Tipe tarif IPL: IPL (Normal), IPL_RUMAH_KOSONG, DAU';