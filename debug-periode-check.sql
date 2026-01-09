-- Check periode yang ada di sistem
SELECT id, nama_periode, nomor_urut, tanggal_awal, tanggal_akhir
FROM periode
ORDER BY nomor_urut DESC
LIMIT 10;

-- Check pemasukan dengan periode_list yang populated dan cocokkan dengan periode
SELECT 
    p.id,
    p.tanggal,
    p.nominal,
    p.periode_list,
    STRING_AGG(DISTINCT pr.nama_periode, ', ') as periode_names
FROM pemasukan p
LEFT JOIN periode pr ON pr.id = ANY(p.periode_list)
WHERE p.periode_list IS NOT NULL AND array_length(p.periode_list, 1) > 0
GROUP BY p.id, p.tanggal, p.nominal, p.periode_list
LIMIT 20;

-- Check records tanpa periode (kosong periode_id dan periode_list)
SELECT COUNT(*) as records_tanpa_periode
FROM pemasukan
WHERE (periode_id IS NULL OR periode_id = '') 
AND (periode_list IS NULL OR array_length(periode_list, 1) = 0);
