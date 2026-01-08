-- Verification queries untuk check status migration periode_list

-- Query 1: Check struktur tabel
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'pemasukan' 
AND column_name IN ('periode_id', 'periode_list', 'periode_id_deprecated')
ORDER BY ordinal_position;

-- Query 2: Check jumlah records dengan periode_list yang populated
SELECT 
    COUNT(*) as total_records,
    COUNT(CASE WHEN periode_list IS NOT NULL AND array_length(periode_list, 1) > 0 THEN 1 END) as records_with_periode_list,
    COUNT(CASE WHEN array_length(periode_list, 1) > 1 THEN 1 END) as records_with_multiple_periode,
    COUNT(CASE WHEN periode_list IS NULL OR array_length(periode_list, 1) = 0 THEN 1 END) as records_empty_periode_list
FROM pemasukan;

-- Query 3: Check records yang masih hanya punya periode_id
SELECT 
    COUNT(*) as records_dengan_periode_id_only,
    COUNT(CASE WHEN periode_list IS NULL OR array_length(periode_list, 1) = 0 THEN 1 END) as belum_dimigrate
FROM pemasukan
WHERE periode_id IS NOT NULL;

-- Query 4: Sample data untuk verifikasi
SELECT 
    id,
    tanggal,
    kategori_id,
    periode_id,
    periode_list,
    array_length(periode_list, 1) as jumlah_periode
FROM pemasukan
ORDER BY tanggal DESC
LIMIT 10;
