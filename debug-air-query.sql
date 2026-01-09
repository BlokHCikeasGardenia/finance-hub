-- Debug query untuk check struktur data pemasukan
-- 1. Check air category ID
SELECT id, nama_kategori FROM kategori_saldo WHERE nama_kategori = 'Air';

-- 2. Check pemasukan records untuk Air category
SELECT 
    id,
    kategori_id,
    periode_id,
    periode_list,
    tanggal,
    nominal,
    keterangan
FROM pemasukan
WHERE kategori_id IN (SELECT id FROM kategori_saldo WHERE nama_kategori = 'Air')
ORDER BY tanggal DESC
LIMIT 20;

-- 3. Check periode structure
SELECT id, nama_periode, nomor_urut, tanggal_awal, tanggal_akhir
FROM periode
ORDER BY nomor_urut DESC
LIMIT 5;

-- 4. Check jika ada periode_list yang populated
SELECT 
    id,
    kategori_id,
    periode_id,
    periode_list,
    array_length(periode_list, 1) as list_count
FROM pemasukan
WHERE periode_list IS NOT NULL AND array_length(periode_list, 1) > 0
LIMIT 10;

-- 5. Check what allocation tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%allocat%' OR table_name LIKE '%pembayaran%'
ORDER BY table_name;

-- 6. Check allocation records untuk air payments
SELECT 
    mabp.id,
    mabp.pemasukan_id,
    mabp.nominal_dialokasikan,
    p.kategori_id,
    p.nominal as pemasukan_nominal
FROM meteran_air_billing_pembayaran mabp
LEFT JOIN pemasukan p ON mabp.pemasukan_id = p.id
WHERE p.kategori_id IN (SELECT id FROM kategori_saldo WHERE nama_kategori = 'Air')
LIMIT 20;
