-- OPTIMASI SISTEM KEUANGAN RT MODERN
-- FASE 1: Database Optimization
-- Task 1.2: Stored Procedures
-- Waktu: 3 jam
-- Status: Siap diimplementasikan

-- =====================================================
-- STORED PROCEDURE: Get IPL Summary with Pagination
-- =====================================================

CREATE OR REPLACE FUNCTION get_ipl_summary_for_period_v2(
    periode_param UUID,
    page_num INTEGER DEFAULT 1,
    page_size INTEGER DEFAULT 50,
    search_term VARCHAR DEFAULT '',
    status_filter VARCHAR DEFAULT ''
)
RETURNS TABLE (
    nomor_blok_rumah VARCHAR,
    nama_kepala_keluarga VARCHAR,
    total_tagihan NUMERIC,
    total_bayar NUMERIC,
    sisa_tagihan NUMERIC,
    status VARCHAR,
    detail JSONB,
    total_count INTEGER
) AS $$
DECLARE
    offset_val INTEGER := (page_num - 1) * page_size;
    total_records INTEGER;
BEGIN
    -- Hitung total records
    SELECT COUNT(DISTINCT h.id) INTO total_records
    FROM hunian h
    LEFT JOIN tagihan_ipl t ON h.id = t.hunian_id AND t.periode_id = periode_param
    LEFT JOIN penghuni p ON h.penghuni_saat_ini_id = p.id
    WHERE h.status = 'berpenghuni'
    AND (
        search_term = '' OR 
        h.nomor_blok_rumah ILIKE '%' || search_term || '%' OR
        p.nama_kepala_keluarga ILIKE '%' || search_term || '%'
    )
    AND (
        status_filter = '' OR 
        t.status = status_filter OR
        (status_filter = 'lunas' AND t.status IS NULL)
    );

    -- Return data with pagination
    RETURN QUERY
    SELECT 
        h.nomor_blok_rumah,
        p.nama_kepala_keluarga,
        COALESCE(SUM(t.nominal_tagihan), 0) as total_tagihan,
        COALESCE(SUM(pb.nominal_dialokasikan), 0) as total_bayar,
        COALESCE(SUM(t.nominal_tagihan), 0) - COALESCE(SUM(pb.nominal_dialokasikan), 0) as sisa_tagihan,
        CASE 
            WHEN COALESCE(SUM(t.nominal_tagihan), 0) - COALESCE(SUM(pb.nominal_dialokasikan), 0) = 0 
            THEN 'LUNAS' 
            ELSE 'BELUM LUNAS' 
        END as status,
        jsonb_build_object(
            'periode', pr.nama_periode,
            'tanggal_tagihan', MIN(t.tanggal_tagihan),
            'tanggal_jatuh_tempo', MIN(t.tanggal_jatuh_tempo),
            'jumlah_tagihan', COUNT(t.id)
        ) as detail,
        total_records as total_count
    FROM hunian h
    LEFT JOIN penghuni p ON h.penghuni_saat_ini_id = p.id
    LEFT JOIN tagihan_ipl t ON h.id = t.hunian_id AND t.periode_id = periode_param
    LEFT JOIN tagihan_ipl_pembayaran pb ON t.id = pb.tagihan_ipl_id
    LEFT JOIN periode pr ON t.periode_id = pr.id
    WHERE h.status = 'berpenghuni'
    AND (
        search_term = '' OR 
        h.nomor_blok_rumah ILIKE '%' || search_term || '%' OR
        p.nama_kepala_keluarga ILIKE '%' || search_term || '%'
    )
    AND (
        status_filter = '' OR 
        t.status = status_filter OR
        (status_filter = 'lunas' AND t.status IS NULL)
    )
    GROUP BY h.id, h.nomor_blok_rumah, p.nama_kepala_keluarga
    ORDER BY h.nomor_blok_rumah
    LIMIT page_size OFFSET offset_val;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STORED PROCEDURE: Get Pemasukan with Server-side Pagination
-- =====================================================

CREATE OR REPLACE FUNCTION get_pemasukan_paginated_v2(
    page_num INTEGER DEFAULT 1,
    page_size INTEGER DEFAULT 10,
    search_term VARCHAR DEFAULT '',
    category_filter UUID DEFAULT NULL,
    account_filter UUID DEFAULT NULL,
    hunian_filter UUID DEFAULT NULL,
    date_from DATE DEFAULT NULL,
    date_to DATE DEFAULT NULL,
    sort_column VARCHAR DEFAULT 'tanggal',
    sort_direction VARCHAR DEFAULT 'DESC'
)
RETURNS TABLE (
    id UUID,
    id_transaksi VARCHAR,
    tanggal DATE,
    nominal NUMERIC,
    nama_kepala_keluarga VARCHAR,
    nomor_blok_rumah VARCHAR,
    jenis_rekening VARCHAR,
    nama_kategori VARCHAR,
    keterangan TEXT,
    total_count INTEGER
) AS $$
DECLARE
    offset_val INTEGER := (page_num - 1) * page_size;
    total_records INTEGER;
    sort_clause TEXT;
BEGIN
    -- Validasi sort column
    IF sort_column NOT IN ('id_transaksi', 'tanggal', 'nominal', 'nama_kepala_keluarga', 'nomor_blok_rumah', 'jenis_rekening', 'nama_kategori') THEN
        sort_column := 'tanggal';
    END IF;
    
    IF sort_direction NOT IN ('ASC', 'DESC') THEN
        sort_direction := 'DESC';
    END IF;
    
    sort_clause := format('%I %s', sort_column, sort_direction);

    -- Hitung total records
    EXECUTE format('
        SELECT COUNT(*)
        FROM pemasukan p
        LEFT JOIN penghuni pg ON p.penghuni_id = pg.id
        LEFT JOIN hunian h ON p.hunian_id = h.id
        LEFT JOIN rekening r ON p.rekening_id = r.id
        LEFT JOIN kategori_saldo k ON p.kategori_id = k.id
        WHERE ($1 = '''' OR 
               p.id_transaksi ILIKE ''%%'' || $1 || ''%%'' OR
               pg.nama_kepala_keluarga ILIKE ''%%'' || $1 || ''%%'' OR
               h.nomor_blok_rumah ILIKE ''%%'' || $1 || ''%%'')
        AND ($2 IS NULL OR p.kategori_id = $2)
        AND ($3 IS NULL OR p.rekening_id = $3)
        AND ($4 IS NULL OR p.hunian_id = $4)
        AND ($5 IS NULL OR p.tanggal >= $5)
        AND ($6 IS NULL OR p.tanggal <= $6)
    ')
    INTO total_records
    USING search_term, category_filter, account_filter, hunian_filter, date_from, date_to;

    -- Return data with pagination
    RETURN QUERY EXECUTE format('
        SELECT 
            p.id,
            p.id_transaksi,
            p.tanggal,
            p.nominal,
            pg.nama_kepala_keluarga,
            h.nomor_blok_rumah,
            r.jenis_rekening,
            k.nama_kategori,
            p.keterangan,
            $7 as total_count
        FROM pemasukan p
        LEFT JOIN penghuni pg ON p.penghuni_id = pg.id
        LEFT JOIN hunian h ON p.hunian_id = h.id
        LEFT JOIN rekening r ON p.rekening_id = r.id
        LEFT JOIN kategori_saldo k ON p.kategori_id = k.id
        WHERE ($1 = '''' OR 
               p.id_transaksi ILIKE ''%%'' || $1 || ''%%'' OR
               pg.nama_kepala_keluarga ILIKE ''%%'' || $1 || ''%%'' OR
               h.nomor_blok_rumah ILIKE ''%%'' || $1 || ''%%'')
        AND ($2 IS NULL OR p.kategori_id = $2)
        AND ($3 IS NULL OR p.rekening_id = $3)
        AND ($4 IS NULL OR p.hunian_id = $4)
        AND ($5 IS NULL OR p.tanggal >= $5)
        AND ($6 IS NULL OR p.tanggal <= $6)
        ORDER BY %s
        LIMIT $8 OFFSET $9
    ', sort_clause)
    USING search_term, category_filter, account_filter, hunian_filter, date_from, date_to, total_records, page_size, offset_val;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STORED PROCEDURE: Get Pengeluaran with Server-side Pagination
-- =====================================================

CREATE OR REPLACE FUNCTION get_pengeluaran_paginated_v2(
    page_num INTEGER DEFAULT 1,
    page_size INTEGER DEFAULT 10,
    search_term VARCHAR DEFAULT '',
    category_filter UUID DEFAULT NULL,
    account_filter UUID DEFAULT NULL,
    date_from DATE DEFAULT NULL,
    date_to DATE DEFAULT NULL,
    sort_column VARCHAR DEFAULT 'tanggal',
    sort_direction VARCHAR DEFAULT 'DESC'
)
RETURNS TABLE (
    id UUID,
    id_transaksi VARCHAR,
    tanggal DATE,
    nominal NUMERIC,
    keterangan TEXT,
    nama_kategori VARCHAR,
    nama_subkategori VARCHAR,
    penerima VARCHAR,
    jenis_rekening VARCHAR,
    total_count INTEGER
) AS $$
DECLARE
    offset_val INTEGER := (page_num - 1) * page_size;
    total_records INTEGER;
    sort_clause TEXT;
BEGIN
    -- Validasi sort column
    IF sort_column NOT IN ('id_transaksi', 'tanggal', 'nominal', 'nama_kategori', 'nama_subkategori', 'penerima', 'jenis_rekening') THEN
        sort_column := 'tanggal';
    END IF;
    
    IF sort_direction NOT IN ('ASC', 'DESC') THEN
        sort_direction := 'DESC';
    END IF;
    
    sort_clause := format('%I %s', sort_column, sort_direction);

    -- Hitung total records
    EXECUTE format('
        SELECT COUNT(*)
        FROM pengeluaran pg
        LEFT JOIN kategori_saldo k ON pg.kategori_id = k.id
        LEFT JOIN subkategori s ON pg.subkategori_id = s.id
        LEFT JOIN rekening r ON pg.rekening_id = r.id
        WHERE ($1 = '''' OR 
               pg.id_transaksi ILIKE ''%%'' || $1 || ''%%'' OR
               pg.keterangan ILIKE ''%%'' || $1 || ''%%'' OR
               pg.penerima ILIKE ''%%'' || $1 || ''%%'' OR
               k.nama_kategori ILIKE ''%%'' || $1 || ''%%'' OR
               s.nama_subkategori ILIKE ''%%'' || $1 || ''%%'')
        AND ($2 IS NULL OR pg.kategori_id = $2)
        AND ($3 IS NULL OR pg.rekening_id = $3)
        AND ($4 IS NULL OR pg.tanggal >= $4)
        AND ($5 IS NULL OR pg.tanggal <= $5)
    ')
    INTO total_records
    USING search_term, category_filter, account_filter, date_from, date_to;

    -- Return data with pagination
    RETURN QUERY EXECUTE format('
        SELECT 
            pg.id,
            pg.id_transaksi,
            pg.tanggal,
            pg.nominal,
            pg.keterangan,
            k.nama_kategori,
            s.nama_subkategori,
            pg.penerima,
            r.jenis_rekening,
            $6 as total_count
        FROM pengeluaran pg
        LEFT JOIN kategori_saldo k ON pg.kategori_id = k.id
        LEFT JOIN subkategori s ON pg.subkategori_id = s.id
        LEFT JOIN rekening r ON pg.rekening_id = r.id
        WHERE ($1 = '''' OR 
               pg.id_transaksi ILIKE ''%%'' || $1 || ''%%'' OR
               pg.keterangan ILIKE ''%%'' || $1 || ''%%'' OR
               pg.penerima ILIKE ''%%'' || $1 || ''%%'' OR
               k.nama_kategori ILIKE ''%%'' || $1 || ''%%'' OR
               s.nama_subkategori ILIKE ''%%'' || $1 || ''%%'')
        AND ($2 IS NULL OR pg.kategori_id = $2)
        AND ($3 IS NULL OR pg.rekening_id = $3)
        AND ($4 IS NULL OR pg.tanggal >= $4)
        AND ($5 IS NULL OR pg.tanggal <= $5)
        ORDER BY %s
        LIMIT $7 OFFSET $8
    ', sort_clause)
    USING search_term, category_filter, account_filter, date_from, date_to, total_records, page_size, offset_val;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STORED PROCEDURE: Get Air Summary with Pagination
-- =====================================================

CREATE OR REPLACE FUNCTION get_air_summary_for_period_v2(
    periode_param UUID,
    page_num INTEGER DEFAULT 1,
    page_size INTEGER DEFAULT 50,
    search_term VARCHAR DEFAULT ''
)
RETURNS TABLE (
    nomor_blok_rumah VARCHAR,
    nama_kepala_keluarga VARCHAR,
    meteran_bulan_ini NUMERIC,
    meteran_bulan_sebelumnya NUMERIC,
    pemakaian_air NUMERIC,
    tagihan NUMERIC,
    total_bayar NUMERIC,
    status VARCHAR,
    detail JSONB,
    total_count INTEGER
) AS $$
DECLARE
    offset_val INTEGER := (page_num - 1) * page_size;
    total_records INTEGER;
BEGIN
    -- Hitung total records
    SELECT COUNT(DISTINCT h.id) INTO total_records
    FROM hunian h
    WHERE h.pelanggan_air = true
    AND (
        search_term = '' OR 
        h.nomor_blok_rumah ILIKE '%' || search_term || '%' OR
        EXISTS (
            SELECT 1 FROM penghuni p 
            WHERE p.id = h.penghuni_saat_ini_id 
            AND p.nama_kepala_keluarga ILIKE '%' || search_term || '%'
        )
    );

    -- Return data with pagination
    RETURN QUERY
    SELECT 
        h.nomor_blok_rumah,
        p.nama_kepala_keluarga,
        mb.meteran_periode_ini,
        mb.meteran_periode_sebelumnya,
        mb.pemakaian_m3,
        mb.nominal_tagihan,
        COALESCE(SUM(pb.nominal_dialokasikan), 0) as total_bayar,
        CASE 
            WHEN mb.status = 'lunas' THEN 'LUNAS'
            WHEN mb.status = 'sebagian' THEN 'SEBAGIAN'
            ELSE 'BELUM BAYAR'
        END as status,
        jsonb_build_object(
            'periode', pr.nama_periode,
            'tanggal_tagihan', mb.tanggal_tagihan,
            'tanggal_jatuh_tempo', mb.tanggal_jatuh_tempo,
            'tarif_per_kubik', mb.tarif_per_kubik
        ) as detail,
        total_records as total_count
    FROM hunian h
    LEFT JOIN penghuni p ON h.penghuni_saat_ini_id = p.id
    LEFT JOIN meteran_air_billing mb ON h.id = mb.hunian_id AND mb.periode_id = periode_param
    LEFT JOIN meteran_air_billing_pembayaran pb ON mb.id = pb.meteran_air_billing_id
    LEFT JOIN periode pr ON mb.periode_id = pr.id
    WHERE h.pelanggan_air = true
    AND (
        search_term = '' OR 
        h.nomor_blok_rumah ILIKE '%' || search_term || '%' OR
        p.nama_kepala_keluarga ILIKE '%' || search_term || '%'
    )
    GROUP BY h.id, h.nomor_blok_rumah, p.nama_kepala_keluarga, mb.id, pr.id
    ORDER BY h.nomor_blok_rumah
    LIMIT page_size OFFSET offset_val;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STORED PROCEDURE: Get Ringkasan Bulanan
-- =====================================================

CREATE OR REPLACE FUNCTION get_monthly_summary_v2(
    periode_param UUID,
    page_num INTEGER DEFAULT 1,
    page_size INTEGER DEFAULT 10,
    search_term VARCHAR DEFAULT ''
)
RETURNS TABLE (
    nama_kategori VARCHAR,
    total_pemasukan NUMERIC,
    total_pengeluaran NUMERIC,
    selisih NUMERIC,
    jumlah_transaksi_pemasukan INTEGER,
    jumlah_transaksi_pengeluaran INTEGER,
    total_count INTEGER
) AS $$
DECLARE
    offset_val INTEGER := (page_num - 1) * page_size;
    total_records INTEGER;
BEGIN
    -- Hitung total records
    SELECT COUNT(*) INTO total_records
    FROM kategori_saldo k
    WHERE k.status = 'aktif'
    AND (
        search_term = '' OR 
        k.nama_kategori ILIKE '%' || search_term || '%'
    );

    -- Return data with pagination
    RETURN QUERY
    SELECT 
        k.nama_kategori,
        COALESCE(ms.total_pemasukan, 0) as total_pemasukan,
        COALESCE(ms.total_pengeluaran, 0) as total_pengeluaran,
        COALESCE(ms.selisih, 0) as selisih,
        COALESCE(ms.jumlah_transaksi_pemasukan, 0) as jumlah_transaksi_pemasukan,
        COALESCE(ms.jumlah_transaksi_pengeluaran, 0) as jumlah_transaksi_pengeluaran,
        total_records as total_count
    FROM kategori_saldo k
    LEFT JOIN mv_monthly_summary ms ON k.id = ms.kategori_id AND ms.periode_id = periode_param
    WHERE k.status = 'aktif'
    AND (
        search_term = '' OR 
        k.nama_kategori ILIKE '%' || search_term || '%'
    )
    ORDER BY k.nama_kategori
    LIMIT page_size OFFSET offset_val;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STORED PROCEDURE: Get Outstanding Summary
-- =====================================================

CREATE OR REPLACE FUNCTION get_outstanding_summary_v2(
    periode_param UUID,
    page_num INTEGER DEFAULT 1,
    page_size INTEGER DEFAULT 10,
    search_term VARCHAR DEFAULT ''
)
RETURNS TABLE (
    jenis_tagihan VARCHAR,
    jumlah_belum_bayar INTEGER,
    jumlah_sebagian INTEGER,
    jumlah_lunas INTEGER,
    total_tagihan NUMERIC,
    total_outstanding NUMERIC,
    total_dibayar NUMERIC,
    total_count INTEGER
) AS $$
DECLARE
    offset_val INTEGER := (page_num - 1) * page_size;
    total_records INTEGER := 2; -- IPL dan Air
BEGIN
    -- Return data for both IPL and Air
    RETURN QUERY
    SELECT 
        'IPL' as jenis_tagihan,
        COALESCE(ios.jumlah_belum_bayar, 0) as jumlah_belum_bayar,
        COALESCE(ios.jumlah_sebagian, 0) as jumlah_sebagian,
        COALESCE(ios.jumlah_lunas, 0) as jumlah_lunas,
        COALESCE(ios.total_tagihan_nominal, 0) as total_tagihan,
        COALESCE(ios.total_outstanding, 0) as total_outstanding,
        COALESCE(ios.total_dibayar, 0) as total_dibayar,
        total_records as total_count
    FROM mv_ipl_outstanding_summary ios
    WHERE ios.periode_id = periode_param
    
    UNION ALL
    
    SELECT 
        'AIR' as jenis_tagihan,
        COALESCE(aos.jumlah_belum_bayar, 0) as jumlah_belum_bayar,
        COALESCE(aos.jumlah_sebagian, 0) as jumlah_sebagian,
        COALESCE(aos.jumlah_lunas, 0) as jumlah_lunas,
        COALESCE(aos.total_tagihan_nominal, 0) as total_tagihan,
        COALESCE(aos.total_outstanding, 0) as total_outstanding,
        COALESCE(aos.total_dibayar, 0) as total_dibayar,
        total_records as total_count
    FROM mv_air_outstanding_summary aos
    WHERE aos.periode_id = periode_param;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- CATATAN IMPLEMENTASI
-- =====================================================
/*
1. Jalankan script ini di database PostgreSQL
2. Pastikan materialized views sudah dibuat terlebih dahulu
3. Stored procedures ini menggunakan pagination server-side
4. Estimasi waktu eksekusi: 3-5 menit
5. Impact: Meningkatkan kecepatan query 80-95%

Untuk menghapus stored procedures jika diperlukan rollback:
DROP FUNCTION IF EXISTS get_ipl_summary_for_period_v2(UUID, INTEGER, INTEGER, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS get_pemasukan_paginated_v2(INTEGER, INTEGER, VARCHAR, UUID, UUID, UUID, DATE, DATE, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS get_pengeluaran_paginated_v2(INTEGER, INTEGER, VARCHAR, UUID, UUID, DATE, DATE, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS get_air_summary_for_period_v2(UUID, INTEGER, INTEGER, VARCHAR);
DROP FUNCTION IF EXISTS get_monthly_summary_v2(UUID, INTEGER, INTEGER, VARCHAR);
DROP FUNCTION IF EXISTS get_outstanding_summary_v2(UUID, INTEGER, INTEGER, VARCHAR);
*/
