-- Check records yang punya periode_id (data lama)
SELECT 
    id,
    tanggal,
    kategori_id,
    periode_id,
    periode_list,
    array_length(periode_list, 1) as jumlah_periode
FROM pemasukan
WHERE periode_id IS NOT NULL
ORDER BY tanggal DESC
LIMIT 20;

-- Check summary statistik
SELECT 
    COUNT(*) as total_records,
    COUNT(CASE WHEN periode_id IS NOT NULL THEN 1 END) as with_periode_id,
    COUNT(CASE WHEN periode_list IS NOT NULL AND array_length(periode_list, 1) > 0 THEN 1 END) as with_periode_list,
    COUNT(CASE WHEN periode_id IS NULL AND (periode_list IS NULL OR array_length(periode_list, 1) = 0) THEN 1 END) as no_periode_assigned
FROM pemasukan;
