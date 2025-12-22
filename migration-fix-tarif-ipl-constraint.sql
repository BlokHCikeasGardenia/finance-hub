-- Migration to fix tarif_ipl unique constraint
-- Remove UNIQUE constraint on type_tarif to allow multiple tariffs per type

-- Drop the unique constraint on tarif_ipl.type_tarif
-- This allows multiple tariffs with the same type_tarif but different effective dates

ALTER TABLE tarif_ipl DROP CONSTRAINT IF EXISTS tarif_ipl_type_tarif_key;

-- Add comment to explain the change
COMMENT ON COLUMN tarif_ipl.type_tarif IS 'Tariff type (IPL, IPL_RUMAH_KOSONG, DAU) - multiple tariffs allowed per type with different effective dates';
