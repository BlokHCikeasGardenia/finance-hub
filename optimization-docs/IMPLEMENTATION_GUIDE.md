# OPTIMASI SISTEM KEUANGAN RT MODERN
## Dokumentasi Implementasi Lengkap

**Tanggal:** 17 Desember 2025  
**Versi:** 1.0  
**Status:** Production Ready

---

## 📋 DAFTAR ISI

1. [Pendahuluan](#pendahuluan)
2. [Analisis Kinerja](#analisis-kinerja)
3. [Rencana Optimasi](#rencana-optimasi)
4. [Implementasi](#implementasi)
5. [Testing & Monitoring](#testing--monitoring)
6. [Maintenance](#maintenance)
7. [Rollback Plan](#rollback-plan)

---

## 🎯 PENDAHULUAN

### Latar Belakang
Sistem keuangan RT Modern telah beroperasi selama 9 bulan dengan ribuan transaksi pemasukan dan pengeluaran. Berdasarkan analisis mendalam, sistem mengalami bottleneck kinerja terutama pada:

- Laporan IPL: 10-30 detik
- Laporan Pemasukan/Pengeluaran: 5-15 detik
- Laporan Ringkasan: 8-20 detik

### Tujuan Optimasi
- Meningkatkan kecepatan loading laporan **90-95%**
- Mengurangi beban browser **60-70%**
- Meningkatkan pengalaman pengguna
- Meningkatkan skalabilitas sistem

---

## 🔍 ANALISIS KINERJA

### Masalah Kinerja

#### 1. Query Database Tidak Efisien
- **Query serial** yang lambat (satu per satu)
- **JOIN kompleks** tanpa optimasi
- **Tidak ada caching** untuk data master

#### 2. Pemrosesan Frontend Berat
- **Semua data** (ribuan transaksi) dimuat ke browser
- **Perhitungan kompleks** dilakukan client-side
- **Tidak ada pagination** di backend

#### 3. Struktur Query Tidak Optimal
- Query pembayaran IPL: **3 query terpisah + loop frontend**
- Query laporan air: **6 query paralel + kompleksitas O(n²)**
- Query rekap IPL: **per periode di-loop dengan query terpisah**

### Dampak
- Loading laporan sangat lambat
- Browser menjadi berat
- Potensi timeout untuk data besar
- Pengalaman pengguna terganggu

---

## 📊 RENCANA OPTIMASI

### Strategi Optimasi
**Pendekatan Non-Invasive**: Tidak mengubah schema database, aman dan reversible.

### Fase Implementasi

#### **FASE 1: Database Optimization** ⏱️ 4-5 jam
- ✅ Composite Index Strategis
- ✅ Stored Procedures
- ✅ Materialized Views

#### **FASE 2: Frontend Optimization** ⏱️ 9 jam
- ✅ Server-side Pagination
- ✅ Caching Layer
- ✅ Virtualization

#### **FASE 3: Testing & Monitoring** ⏱️ 5 jam
- ✅ Performance Testing
- ✅ Functional Testing
- ✅ Monitoring Setup

---

## 🚀 IMPLEMENTASI

### **FASE 1: Database Optimization**

#### **Task 1.1: Composite Index Strategis** ⏱️ 30 menit

##### 1.1.1 Index untuk Laporan Pemasukan/Pengeluaran

```sql
-- Index untuk query laporan pemasukan
CREATE INDEX idx_pemasukan_kategori_tanggal_hunian 
ON pemasukan(kategori_id, tanggal, hunian_id);

CREATE INDEX idx_pemasukan_rekening_tanggal_kategori 
ON pemasukan(rekening_id, tanggal, kategori_id);

CREATE INDEX idx_pemasukan_hunian_tanggal_kategori 
ON pemasukan(hunian_id, tanggal, kategori_id);

-- Index untuk query laporan pengeluaran
CREATE INDEX idx_pengeluaran_kategori_tanggal_rekening 
ON pengeluaran(kategori_id, tanggal, rekening_id);

CREATE INDEX idx_pengeluaran_rekening_tanggal_kategori 
ON pengeluaran(rekening_id, tanggal, kategori_id);

-- Index untuk query search
CREATE INDEX idx_pemasukan_kategori_tanggal_search 
ON pemasukan(kategori_id, tanggal) 
INCLUDE (id_transaksi, nominal, keterangan);

CREATE INDEX idx_pengeluaran_kategori_tanggal_search 
ON pengeluaran(kategori_id, tanggal) 
INCLUDE (id_transaksi, nominal, keterangan, penerima);
```

##### 1.1.2 Index untuk Laporan IPL

```sql
-- Index utama untuk query tagihan IPL
CREATE INDEX idx_tagihan_ipl_periode_status_hunian 
ON tagihan_ipl(periode_id, status, hunian_id);

CREATE INDEX idx_tagihan_ipl_hunian_periode_status 
ON tagihan_ipl(hunian_id, periode_id, status);

-- Index untuk query pembayaran IPL
CREATE INDEX idx_tagihan_ipl_pembayaran_tagihan_pemasukan 
ON tagihan_ipl_pembayaran(tagihan_ipl_id, pemasukan_id);

CREATE INDEX idx_tagihan_ipl_pembayaran_pemasukan_tagihan 
ON tagihan_ipl_pembayaran(pemasukan_id, tagihan_ipl_id);

-- Index untuk query alokasi pembayaran
CREATE INDEX idx_tagihan_ipl_pembayaran_tagihan_tanggal 
ON tagihan_ipl_pembayaran(tagihan_ipl_id, tanggal_alokasi);

-- Index untuk query status pembayaran
CREATE INDEX idx_tagihan_ipl_status_periode_hunian 
ON tagihan_ipl(status, periode_id, hunian_id);
```

##### 1.1.3 Index untuk Laporan Air

```sql
-- Index utama untuk query meteran air
CREATE INDEX idx_meteran_air_billing_periode_status_hunian 
ON meteran_air_billing(periode_id, status, hunian_id);

CREATE INDEX idx_meteran_air_billing_hunian_periode_status 
ON meteran_air_billing(hunian_id, periode_id, status);

-- Index untuk query pembayaran air
CREATE INDEX idx_meteran_air_billing_pembayaran_billing_pemasukan 
ON meteran_air_billing_pembayaran(meteran_air_billing_id, pemasukan_id);

CREATE INDEX idx_meteran_air_billing_pembayaran_pemasukan_billing 
ON meteran_air_billing_pembayaran(pemasukan_id, meteran_air_billing_id);

-- Index untuk query history pembayaran
CREATE INDEX idx_meteran_air_billing_pembayaran_billing_tanggal 
ON meteran_air_billing_pembayaran(meteran_air_billing_id, tanggal_alokasi);

-- Index untuk query status pembayaran
CREATE INDEX idx_meteran_air_billing_status_periode_hunian 
ON meteran_air_billing(status, periode_id, hunian_id);
```

##### 1.1.4 Index untuk Dana Titipan

```sql
-- Index untuk query dana titipan
CREATE INDEX idx_dana_titipan_kategori_tanggal_hunian 
ON dana_titipan(kategori_id, tanggal, hunian_id);

CREATE INDEX idx_dana_titipan_hunian_tanggal_kategori 
ON dana_titipan(hunian_id, tanggal, kategori_id);

-- Index untuk query konversi ke pemasukan
CREATE INDEX idx_dana_titipan_converted_tanggal 
ON dana_titipan(converted_to_pemasukan, tanggal);

-- Index untuk query search
CREATE INDEX idx_dana_titipan_kategori_tanggal_search 
ON dana_titipan(kategori_id, tanggal) 
INCLUDE (id_transaksi, nominal, keterangan);
```

##### 1.1.5 Index untuk Ringkasan & Rekap

```sql
-- Index untuk query ringkasan bulanan
CREATE INDEX idx_pemasukan_kategori_periode_tanggal 
ON pemasukan(kategori_id, tanggal);

CREATE INDEX idx_pengeluaran_kategori_periode_tanggal 
ON pengeluaran(kategori_id, tanggal);

-- Index untuk query rekap per periode
CREATE INDEX idx_pemasukan_periode_kategori_tanggal 
ON pemasukan(periode_id, kategori_id, tanggal);

CREATE INDEX idx_pengeluaran_periode_kategori_tanggal 
ON pengeluaran(periode_id, kategori_id, tanggal);
```

#### **Task 1.2: Stored Procedures** ⏱️ 3 jam

##### 1.2.1 Stored Procedure: Get IPL Summary

```sql
-- Stored Procedure: Get IPL Summary with Pagination
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
```

##### 1.2.2 Stored Procedure: Get Pemasukan Paginated

```sql
-- Stored Procedure: Get Pemasukan with Server-side Pagination
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
```

##### 1.2.3 Stored Procedure: Get Pengeluaran Paginated

```sql
-- Stored Procedure: Get Pengeluaran with Server-side Pagination
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
```

##### 1.2.4 Stored Procedure: Get Air Summary

```sql
-- Stored Procedure: Get Air Summary with Pagination
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
```

#### **Task 1.3: Materialized Views** ⏱️ 1.5 jam

##### 1.3.1 Materialized View: Monthly Summary

```sql
-- Materialized View: Ringkasan Bulanan per Kategori
CREATE MATERIALIZED VIEW mv_monthly_summary AS
SELECT 
    pr.id as periode_id,
    pr.nama_periode,
    pr.tanggal_awal,
    pr.tanggal_akhir,
    k.id as kategori_id,
    k.nama_kategori,
    COALESCE(SUM(p.nominal), 0) as total_pemasukan,
    COALESCE(SUM(pg.nominal), 0) as total_pengeluaran,
    COALESCE(SUM(p.nominal), 0) - COALESCE(SUM(pg.nominal), 0) as selisih,
    COUNT(DISTINCT p.id) as jumlah_transaksi_pemasukan,
    COUNT(DISTINCT pg.id) as jumlah_transaksi_pengeluaran
FROM periode pr
CROSS JOIN kategori_saldo k
LEFT JOIN pemasukan p ON k.id = p.kategori_id 
    AND p.tanggal >= pr.tanggal_awal 
    AND p.tanggal <= pr.tanggal_akhir
LEFT JOIN pengeluaran pg ON k.id = pg.kategori_id 
    AND pg.tanggal >= pr.tanggal_awal 
    AND pg.tanggal <= pr.tanggal_akhir
GROUP BY pr.id, pr.nama_periode, pr.tanggal_awal, pr.tanggal_akhir, k.id, k.nama_kategori
ORDER BY pr.tanggal_awal DESC, k.nama_kategori;

-- Index pada materialized view
CREATE INDEX idx_mv_monthly_summary_periode_kategori 
ON mv_monthly_summary(periode_id, kategori_id);

CREATE INDEX idx_mv_monthly_summary_tanggal 
ON mv_monthly_summary(tanggal_awal, tanggal_akhir);

-- Function untuk refresh materialized view
CREATE OR REPLACE FUNCTION refresh_monthly_summary()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW mv_monthly_summary;
END;
$$ LANGUAGE plpgsql;
```

##### 1.3.2 Materialized View: IPL Outstanding Summary

```sql
-- Materialized View: Outstanding IPL per Periode
CREATE MATERIALIZED VIEW mv_ipl_outstanding_summary AS
SELECT 
    pr.id as periode_id,
    pr.nama_periode,
    pr.tanggal_awal,
    pr.tanggal_akhir,
    COUNT(CASE WHEN t.status = 'belum_bayar' THEN 1 END) as jumlah_belum_bayar,
    COUNT(CASE WHEN t.status = 'sebagian' THEN 1 END) as jumlah_sebagian,
    COUNT(CASE WHEN t.status = 'lunas' THEN 1 END) as jumlah_lunas,
    COUNT(*) as total_tagihan,
    COALESCE(SUM(CASE WHEN t.status IN ('belum_bayar', 'sebagian') THEN t.sisa_tagihan ELSE 0 END), 0) as total_outstanding,
    COALESCE(SUM(t.nominal_tagihan), 0) as total_tagihan_nominal,
    COALESCE(SUM(t.total_pembayaran), 0) as total_dibayar
FROM periode pr
LEFT JOIN tagihan_ipl t ON pr.id = t.periode_id
GROUP BY pr.id, pr.nama_periode, pr.tanggal_awal, pr.tanggal_akhir
ORDER BY pr.tanggal_awal DESC;

-- Index pada materialized view
CREATE INDEX idx_mv_ipl_outstanding_summary_periode 
ON mv_ipl_outstanding_summary(periode_id);

CREATE INDEX idx_mv_ipl_outstanding_summary_tanggal 
ON mv_ipl_outstanding_summary(tanggal_awal, tanggal_akhir);

-- Function untuk refresh materialized view
CREATE OR REPLACE FUNCTION refresh_ipl_outstanding_summary()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW mv_ipl_outstanding_summary;
END;
$$ LANGUAGE plpgsql;
```

##### 1.3.3 Materialized View: Air Outstanding Summary

```sql
-- Materialized View: Outstanding Air per Periode
CREATE MATERIALIZED VIEW mv_air_outstanding_summary AS
SELECT 
    pr.id as periode_id,
    pr.nama_periode,
    pr.tanggal_awal,
    pr.tanggal_akhir,
    COUNT(CASE WHEN mb.status = 'belum_bayar' THEN 1 END) as jumlah_belum_bayar,
    COUNT(CASE WHEN mb.status = 'sebagian' THEN 1 END) as jumlah_sebagian,
    COUNT(CASE WHEN mb.status = 'lunas' THEN 1 END) as jumlah_lunas,
    COUNT(*) as total_tagihan,
    COALESCE(SUM(CASE WHEN mb.status IN ('belum_bayar', 'sebagian') THEN mb.sisa_tagihan ELSE 0 END), 0) as total_outstanding,
    COALESCE(SUM(mb.nominal_tagihan), 0) as total_tagihan_nominal,
    COALESCE(SUM(mb.total_pembayaran), 0) as total_dibayar
FROM periode pr
LEFT JOIN meteran_air_billing mb ON pr.id = mb.periode_id
GROUP BY pr.id, pr.nama_periode, pr.tanggal_awal, pr.tanggal_akhir
ORDER BY pr.tanggal_awal DESC;

-- Index pada materialized view
CREATE INDEX idx_mv_air_outstanding_summary_periode 
ON mv_air_outstanding_summary(periode_id);

CREATE INDEX idx_mv_air_outstanding_summary_tanggal 
ON mv_air_outstanding_summary(tanggal_awal, tanggal_akhir);

-- Function untuk refresh materialized view
CREATE OR REPLACE FUNCTION refresh_air_outstanding_summary()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW mv_air_outstanding_summary;
END;
$$ LANGUAGE plpgsql;
```

### **FASE 2: Frontend Optimization**

#### **Task 2.1: Server-side Pagination** ⏱️ 4 jam

##### 2.1.1 Modifikasi loadViewPemasukan

```javascript
// File: js/modules/views/reports/pemasukan.js
// Update loadViewPemasukan function

async function loadViewPemasukan(selectedYear = null) {
    const contentDiv = document.getElementById('views-content');

    try {
        // Get all periods for year filtering
        const { data: allPeriods, error: periodsError } = await supabase
            .from('periode')
            .select('id, nama_periode, nomor_urut, tanggal_awal, tanggal_akhir')
            .order('nomor_urut');

        if (periodsError) throw periodsError;

        // Extract unique years from period names
        const availableYears = [...new Set(allPeriods.map(p => {
            const match = p.nama_periode.match(/(\d{4})$/);
            return match ? match[1] : null;
        }).filter(year => year !== null))].sort((a, b) => b - a);

        // Normalize selectedYear
        if (selectedYear == null) {
            const today = new Date();
            const activePeriod = allPeriods.find(p => {
                const startDate = new Date(p.tanggal_awal);
                const endDate = new Date(p.tanggal_akhir);
                return today >= startDate && today <= endDate;
            });
            selectedYear = activePeriod ? 
                activePeriod.nama_periode.match(/(\d{4})$/)?.[1] : 
                new Date().getFullYear().toString();
        }

        // Filter periods by selected year
        let periods = allPeriods;
        if (selectedYear !== 'all') {
            periods = allPeriods.filter(p => p.nama_periode.includes(selectedYear));
        }

        // Store data globally
        pemasukanViewDataGlobal = [];
        pemasukanCurrentPage = 1;

        // Create dynamic title and info text
        const isAllYearsMode = selectedYear === 'all';
        const displayYear = isAllYearsMode ? null : selectedYear;
        const dynamicTitle = isAllYearsMode ? 'View Data Pemasukan' : `View Data Pemasukan ${displayYear}`;
        const titleBadge = isAllYearsMode ? '<span class="badge bg-secondary ms-2">Semua Periode</span>' : `<span class="badge bg-primary ms-2">${displayYear}</span>`;
        const infoText = isAllYearsMode ? 'Data semua transaksi pemasukan dari semua kategori dan periode' : `Data transaksi pemasukan tahun ${displayYear} dari semua kategori`;

        const selectorClass = selectedYear === 'all' ? 'form-select form-select-sm' : 'form-select form-select-sm border-primary';

        const html = `
            <div class="row">
                <div class="col-12">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h4>${dynamicTitle}${titleBadge}</h4>
                        <div class="d-flex gap-2 align-items-center">
                            <div class="d-flex align-items-center gap-2">
                                <i class="bi bi-calendar3 text-primary"></i>
                                <label for="pemasukan-year-select" class="form-label mb-0 fw-bold">Filter Tahun:</label>
                                <select class="${selectorClass}" id="pemasukan-year-select" style="width: auto;">
                                    <option value="all">📊 Semua Periode</option>
                                    ${availableYears.map(year => `<option value="${year}" ${year === selectedYear ? 'selected' : ''}>📅 ${year}</option>`).join('')}
                                </select>
                            </div>
                            <button class="btn btn-secondary" onclick="loadViewsSection()">
                                <i class="bi bi-arrow-left"></i> Kembali ke Views
                            </button>
                        </div>
                    </div>

                    <!-- Info Banner -->
                    <div class="alert alert-info d-flex align-items-center mb-3">
                        <i class="bi bi-info-circle-fill me-2"></i>
                        <div>
                            <strong>Periode Data:</strong> ${infoText}
                        </div>
                    </div>

                    <p class="text-muted">Data semua transaksi pemasukan dari semua kategori</p>

                    <!-- Search and Filter Section -->
                    <div class="card mb-3">
                        <div class="card-body">
                            <div class="row g-3">
                                <div class="col-md-4">
                                    <label for="pemasukan-search" class="form-label">Cari Transaksi:</label>
                                    <input type="text" class="form-control" id="pemasukan-search" placeholder="Ketik ID, nominal, nama, kategori...">
                                </div>
                                <div class="col-md-2">
                                    <label for="pemasukan-items-per-page" class="form-label">Data per Halaman:</label>
                                    <select class="form-select" id="pemasukan-items-per-page">
                                        <option value="5">5</option>
                                        <option value="10" selected>10</option>
                                        <option value="25">25</option>
                                        <option value="50">50</option>
                                        <option value="100">100</option>
                                    </select>
                                </div>
                                <div class="col-md-3 d-flex align-items-end gap-2">
                                    <button class="btn btn-outline-secondary" onclick="resetPemasukanFilters()">Reset</button>
                                    <button class="btn btn-outline-primary" onclick="refreshViewPemasukan()">
                                        <i class="bi bi-arrow-clockwise"></i> Refresh
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Summary Cards -->
                    <div class="row g-3 mb-3">
                        <div class="col-md-4">
                            <div class="card text-center">
                                <div class="card-body">
                                    <h6 class="card-title">Total Transaksi</h6>
                                    <p class="card-text fs-5 fw-bold text-primary" id="pemasukan-total-count">0</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card text-center">
                                <div class="card-body">
                                    <h6 class="card-title">Total Pemasukan</h6>
                                    <p class="card-text fs-5 fw-bold text-success" id="pemasukan-total-nominal">Total: Rp 0</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card text-center">
                                <div class="card-body">
                                    <h6 class="card-title">Rata-rata per Transaksi</h6>
                                    <p class="card-text fs-5 fw-bold text-info">Rp 0</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div id="pemasukan-table-container"></div>
                </div>
            </div>
        `;

        contentDiv.innerHTML = html;

        // Render initial table with server-side pagination
        await renderPemasukanTableServerSide(1, selectedYear);

        // Initialize search and filter functionality
        setTimeout(() => {
            initializePemasukanSearchAndFilterServerSide(selectedYear);
            initializePemasukanYearSelector();
        }, 100);
    } catch (error) {
        console.error('Error loading pemasukan view:', error);
        contentDiv.innerHTML = '<p class="text-danger">Error loading pemasukan data</p>';
    }
}

// New function: Render Pemasukan Table with Server-side Pagination
async function renderPemasukanTableServerSide(page, selectedYear) {
    try {
        // Get periods for date range
        const { data: allPeriods, error: periodsError } = await supabase
            .from('periode')
            .select('id, tanggal_awal, tanggal_akhir')
            .order('tanggal_awal');

        if (periodsError) throw periodsError;

        let dateFrom = null;
        let dateTo = null;

        if (selectedYear !== 'all') {
            const periods = allPeriods.filter(p => p.nama_periode.includes(selectedYear));
            if (periods.length > 0) {
                dateFrom = periods[0].tanggal_awal;
                dateTo = periods[periods.length - 1].tanggal_akhir;
            }
        }

        // Get search and filter values
        const searchTerm = document.getElementById('pemasukan-search')?.value || '';
        const itemsPerPage = parseInt(document.getElementById('pemasukan-items-per-page')?.value || '10');

        // Call stored procedure
        const { data, error } = await supabase.rpc('get_pemasukan_paginated_v2', {
            page_num: page,
            page_size: itemsPerPage,
            search_term: searchTerm,
            date_from: dateFrom,
            date_to: dateTo
        });

        if (error) throw error;

        if (!data || data.length === 0) {
            document.getElementById('pemasukan-table-container').innerHTML = `
                <div class="alert alert-info">Tidak ada data pemasukan ditemukan.</div>
            `;
            return;
        }

        // Extract total count from first row
        const total_count = data[0].total_count || 0;
        const totalPages = Math.ceil(total_count / itemsPerPage);

        // Render table
        const tableHtml = `
            <div class="table-responsive">
                <table class="table table-striped table-hover">
                    <thead class="table-primary">
                        <tr>
                            <th style="width: 60px;">No.</th>
                            <th class="sortable" data-column="id_transaksi">ID Transaksi <i class="bi bi-chevron-expand sort-icon"></i></th>
                            <th class="sortable" data-column="tanggal">Tanggal <i class="bi bi-chevron-expand sort-icon"></i></th>
                            <th class="sortable text-end" data-column="nominal">Nominal <i class="bi bi-chevron-expand sort-icon"></i></th>
                            <th class="sortable" data-column="nama_kepala_keluarga">Diterima Dari <i class="bi bi-chevron-expand sort-icon"></i></th>
                            <th class="sortable" data-column="nama_kategori">Kategori <i class="bi bi-chevron-expand sort-icon"></i></th>
                            <th class="sortable" data-column="jenis_rekening">Dikredit Ke <i class="bi bi-chevron-expand sort-icon"></i></th>
                            <th>Keterangan</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map((item, index) => {
                            const startIndex = (page - 1) * itemsPerPage;
                            return `
                                <tr>
                                    <td>${startIndex + index + 1}</td>
                                    <td>${item.id_transaksi}</td>
                                    <td>${new Date(item.tanggal).toLocaleDateString('id-ID')}</td>
                                    <td class="text-end text-success fw-bold">${formatCurrency(item.nominal)}</td>
                                    <td>${item.nama_kepala_keluarga || 'Sumber External'}</td>
                                    <td><span class="badge bg-primary">${item.nama_kategori || '-'}</span></td>
                                    <td>${item.jenis_rekening || '-'}</td>
                                    <td>${item.keterangan || '-'}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>

            <!-- Pagination -->
            <div class="d-flex justify-content-between align-items-center mt-3">
                <div class="text-muted">
                    Menampilkan ${data.length > 0 ? (page - 1) * itemsPerPage + 1 : 0}-${(page - 1) * itemsPerPage + data.length} dari ${total_count} data
                </div>
                ${renderPagination('pemasukan', page, totalPages)}
            </div>
        `;

        document.getElementById('pemasukan-table-container').innerHTML = tableHtml;

        // Update summary cards
        const totalNominal = data.reduce((sum, item) => sum + (item.nominal || 0), 0);
        const totalCountElement = document.getElementById('pemasukan-total-count');
        const totalNominalElement = document.getElementById('pemasukan-total-nominal');

        if (totalCountElement) totalCountElement.textContent = `${total_count} transaksi`;
        if (totalNominalElement) totalNominalElement.textContent = `Total: ${formatCurrency(totalNominal)}`;

        // Attach sort event listeners
        attachPemasukanSortListenersServerSide(selectedYear);

    } catch (error) {
        console.error('Error rendering pemasukan table:', error);
        document.getElementById('pemasukan-table-container').innerHTML = `
            <div class="alert alert-danger">Error loading data: ${error.message}</div>
        `;
    }
}

// New function: Initialize Server-side Search and Filter
function initializePemasukanSearchAndFilterServerSide(selectedYear) {
    const searchInput = document.getElementById('pemasukan-search');
    const itemsPerPageSelect = document.getElementById('pemasukan-items-per-page');

    // Search functionality with debounce
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            renderPemasukanTableServerSide(1, selectedYear);
        }, 500));
    }

    // Items per page functionality
    if (itemsPerPageSelect) {
        itemsPerPageSelect.addEventListener('change', () => {
            renderPemasukanTableServerSide(1, selectedYear);
        });
    }
}

// New function: Attach Server-side Sort Listeners
function attachPemasukanSortListenersServerSide(selectedYear) {
    const sortableHeaders = document.querySelectorAll('#pemasukan-table-container .sortable');

    sortableHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const column = header.dataset.column;
            const currentSort = header.dataset.sort || 'none';

            // Reset all sort indicators
            sortableHeaders.forEach(h => {
                h.dataset.sort = 'none';
                const icon = h.querySelector('.sort-icon');
                if (icon) icon.className = 'bi bi-chevron-expand sort-icon';
            });

            // Determine new sort direction
            let newSort = 'asc';
            if (currentSort === 'asc') newSort = 'desc';
            else if (currentSort === 'desc') newSort = 'none';

            header.dataset.sort = newSort;

            // Update icon
            const icon = header.querySelector('.sort-icon');
            if (icon) {
                if (newSort === 'asc') icon.className = 'bi bi-chevron-up sort-icon';
                else if (newSort === 'desc') icon.className = 'bi bi-chevron-down sort-icon';
                else icon.className = 'bi bi-chevron-expand sort-icon';
            }

            // Apply sorting
            if (newSort !== 'none') {
                renderPemasukanTableServerSide(1, selectedYear);
            }
        });
    });
}

// Update changePemasukanPage function
async function changePemasukanPage(page, selectedYear = null) {
    // Get current year filter
    const yearSelect = document.getElementById('pemasukan-year-select');
    const currentYear = yearSelect ? yearSelect.value : (selectedYear || 'all');
    await renderPemasukanTableServerSide(page, currentYear);
}

// Update resetPemasukanFilters function
function resetPemasukanFilters() {
    document.getElementById('pemasukan-search').value = '';
    document.getElementById('pemasukan-items-per-page').value = '10';
    renderPemasukanTableServerSide(1, 'all');
}

// Update refreshViewPemasukan function
async function refreshViewPemasukan() {
    const yearSelect = document.getElementById('pemasukan-year-select');
    const selectedYear = yearSelect ? yearSelect.value : 'all';
    await loadViewPemasukan(selectedYear);
}
```

##### 2.1.2 Modifikasi loadViewPengeluaran

```javascript
// File: js/modules/views/reports/pengeluaran.js
// Update loadViewPengeluaran function

async function loadViewPengeluaran(selectedYear = null) {
    const contentDiv = document.getElementById('views-content');

    try {
        // Get all periods for year filtering
        const { data: allPeriods, error: periodsError } = await supabase
            .from('periode')
            .select('id, nama_periode, nomor_urut, tanggal_awal, tanggal_akhir')
            .order('nomor_urut');

        if (periodsError) throw periodsError;

        // Extract unique years from period names
        const availableYears = [...new Set(allPeriods.map(p => {
            const match = p.nama_periode.match(/(\d{4})$/);
            return match ? match[1] : null;
        }).filter(year => year !== null))].sort((a, b) => b - a);

        // Normalize selectedYear
        if (selectedYear == null) {
            const today = new Date();
            const activePeriod = allPeriods.find(p => {
                const startDate = new Date(p.tanggal_awal);
                const endDate = new Date(p.tanggal_akhir);
                return today >= startDate && today <= endDate;
            });
            selectedYear = activePeriod ? 
                activePeriod.nama_periode.match(/(\d{4})$/)?.[1] : 
                new Date().getFullYear().toString();
        }

        // Filter periods by selected year
        let periods = allPeriods;
        if (selectedYear !== 'all') {
            periods = allPeriods.filter(p => p.nama_periode.includes(selectedYear));
        }

        // Store data globally
        pengeluaranViewDataGlobal = [];
        pengeluaranCurrentPage = 1;

        // Create dynamic title and info text
        const isAllYearsMode = selectedYear === 'all';
        const displayYear = isAllYearsMode ? null : selectedYear;
        const dynamicTitle = isAllYearsMode ? 'View Data Pengeluaran' : `View Data Pengeluaran ${displayYear}`;
        const titleBadge = isAllYearsMode ? '<span class="badge bg-secondary ms-2">Semua Periode</span>' : `<span class="badge bg-primary ms-2">${displayYear}</span>`;
        const infoText = isAllYearsMode ? 'Data semua transaksi pengeluaran dari semua kategori dan periode' : `Data transaksi pengeluaran tahun ${displayYear} dari semua kategori`;

        const selectorClass = selectedYear === 'all' ? 'form-select form-select-sm' : 'form-select form-select-sm border-primary';

        const html = `
            <div class="row">
                <div class="col-12">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h4>${dynamicTitle}${titleBadge}</h4>
                        <div class="d-flex gap-2 align-items-center">
                            <div class="d-flex align-items-center gap-2">
                                <i class="bi bi-calendar3 text-primary"></i>
                                <label for="pengeluaran-year-select" class="form-label mb-0 fw-bold">Filter Tahun:</label>
                                <select class="${selectorClass}" id="pengeluaran-year-select" style="width: auto;">
                                    <option value="all">📊 Semua Periode</option>
                                    ${availableYears.map(year => `<option value="${year}" ${year === selectedYear ? 'selected' : ''}>📅 ${year}</option>`).join('')}
                                </select>
                            </div>
                            <button class="btn btn-secondary" onclick="loadViewsSection()">
                                <i class="bi bi-arrow-left"></i> Kembali ke Views
                            </button>
                        </div>
                    </div>

                    <!-- Info Banner -->
                    <div class="alert alert-info d-flex align-items-center mb-3">
                        <i class="bi bi-info-circle-fill me-2"></i>
                        <div>
                            <strong>Periode Data:</strong> ${infoText}
                        </div>
                    </div>

                    <p class="text-muted">Data semua transaksi pengeluaran dari semua kategori</p>

                    <!-- Search and Filter Section -->
                    <div class="card mb-3">
                        <div class="card-body">
                            <div class="row g-3">
                                <div class="col-md-4">
                                    <label for="pengeluaran-search" class="form-label">Cari Transaksi:</label>
                                    <input type="text" class="form-control" id="pengeluaran-search" placeholder="Ketik tanggal, nominal, keterangan, penerima...">
                                </div>
                                <div class="col-md-2">
                                    <label for="pengeluaran-items-per-page" class="form-label">Data per Halaman:</label>
                                    <select class="form-select" id="pengeluaran-items-per-page">
                                        <option value="5">5</option>
                                        <option value="10" selected>10</option>
                                        <option value="25">25</option>
                                        <option value="50">50</option>
                                        <option value="100">100</option>
                                    </select>
                                </div>
                                <div class="col-md-3 d-flex align-items-end gap-2">
                                    <button class="btn btn-outline-secondary" onclick="resetPengeluaranFilters()">Reset</button>
                                    <button class="btn btn-outline-primary" onclick="refreshViewPengeluaran()">
                                        <i class="bi bi-arrow-clockwise"></i> Refresh
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Summary Cards -->
                    <div class="row g-3 mb-3">
                        <div class="col-md-4">
                            <div class="card text-center">
                                <div class="card-body">
                                    <h6 class="card-title">Total Transaksi</h6>
                                    <p class="card-text fs-5 fw-bold text-primary" id="pengeluaran-total-count">0</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card text-center">
                                <div class="card-body">
                                    <h6 class="card-title">Total Pengeluaran</h6>
                                    <p class="card-text fs-5 fw-bold text-danger" id="pengeluaran-total-nominal">Total: Rp 0</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card text-center">
                                <div class="card-body">
                                    <h6 class="card-title">Rata-rata per Transaksi</h6>
                                    <p class="card-text fs-5 fw-bold text-warning">Rp 0</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div id="pengeluaran-table-container"></div>
                </div>
            </div>
        `;

        contentDiv.innerHTML = html;

        // Render initial table with server-side pagination
        await renderPengeluaranTableServerSide(1, selectedYear);

        // Initialize search and filter functionality
        setTimeout(() => {
            initializePengeluaranSearchAndFilterServerSide(selectedYear);
            initializePengeluaranYearSelector();
        }, 100);
    } catch (error) {
        console.error('Error loading pengeluaran view:', error);
        contentDiv.innerHTML = '<p class="text-danger">Error loading pengeluaran data</p>';
    }
}

// New function: Render Pengeluaran Table with Server-side Pagination
async function renderPengeluaranTableServerSide(page, selectedYear) {
    try {
        // Get periods for date range
        const { data: allPeriods, error: periodsError } = await supabase
            .from('periode')
            .select('id, tanggal_awal, tanggal_akhir')
            .order('tanggal_awal');

        if (periodsError) throw periodsError;

        let dateFrom = null;
        let dateTo = null;

        if (selectedYear !== 'all') {
            const periods = allPeriods.filter(p => p.nama_periode.includes(selectedYear));
            if (periods.length > 0) {
                dateFrom = periods[0].tanggal_awal;
                dateTo = periods[periods.length - 1].tanggal_akhir;
            }
        }

        // Get search and filter values
        const searchTerm = document.getElementById('pengeluaran-search')?.value || '';
        const itemsPerPage = parseInt(document.getElementById('pengeluaran-items-per-page')?.value || '10');

        // Call stored procedure
        const { data, error } = await supabase.rpc('get_pengeluaran_paginated_v2', {
            page_num: page,
            page_size: itemsPerPage,
            search_term: searchTerm,
            date_from: dateFrom,
            date_to: dateTo
        });

        if (error) throw error;

        if (!data || data.length === 0) {
            document.getElementById('pengeluaran-table-container').innerHTML = `
                <div class="alert alert-info">Tidak ada data pengeluaran ditemukan.</div>
            `;
            return;
        }

        // Extract total count from first row
        const total_count = data[0].total_count || 0;
        const totalPages = Math.ceil(total_count / itemsPerPage);

        // Render table
        const tableHtml = `
            <div class="table-responsive">
                <table class="table table-striped table-hover">
                    <thead class="table-danger">
                        <tr>
                            <th style="width: 60px;">No.</th>
                            <th class="sortable" data-column="tanggal">Tanggal <i class="bi bi-chevron-expand sort-icon"></i></th>
                            <th class="sortable text-end" data-column="nominal">Nominal <i class="bi bi-chevron-expand sort-icon"></i></th>
                            <th class="sortable" data-column="keterangan">Keterangan <i class="bi bi-chevron-expand sort-icon"></i></th>
                            <th class="sortable" data-column="nama_kategori">Kategori <i class="bi bi-chevron-expand sort-icon"></i></th>
                            <th class="sortable" data-column="nama_subkategori">Subkategori <i class="bi bi-chevron-expand sort-icon"></i></th>
                            <th class="sortable" data-column="penerima">Penerima <i class="bi bi-chevron-expand sort-icon"></i></th>
                            <th>Bukti Transaksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map((item, index) => {
                            const startIndex = (page - 1) * itemsPerPage;
                            return `
                                <tr>
                                    <td>${startIndex + index + 1}</td>
                                    <td>${new Date(item.tanggal).toLocaleDateString('id-ID')}</td>
                                    <td class="text-end text-danger fw-bold">${formatCurrency(item.nominal)}</td>
                                    <td>${item.keterangan || '-'}</td>
                                    <td><span class="badge bg-danger">${item.nama_kategori || '-'}</span></td>
                                    <td>${item.nama_subkategori || '-'}</td>
                                    <td>${item.penerima || '-'}</td>
                                    <td>
                                        ${item.link_url ? `<a href="${item.link_url}" target="_blank" class="btn btn-sm btn-outline-primary"><i class="bi bi-link-45deg"></i> Lihat</a>` : '-'}
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>

            <!-- Pagination -->
            <div class="d-flex justify-content-between align-items-center mt-3">
                <div class="text-muted">
                    Menampilkan ${data.length > 0 ? (page - 1) * itemsPerPage + 1 : 0}-${(page - 1) * itemsPerPage + data.length} dari ${total_count} data
                </div>
                ${renderPagination('pengeluaran', page, totalPages)}
            </div>
        `;

        document.getElementById('pengeluaran-table-container').innerHTML = tableHtml;

        // Update summary cards
        const totalNominal = data.reduce((sum, item) => sum + (item.nominal || 0), 0);
        const totalCountElement = document.getElementById('pengeluaran-total-count');
        const totalNominalElement = document.getElementById('pengeluaran-total-nominal');

        if (totalCountElement) totalCountElement.textContent = `${total_count} transaksi`;
        if (totalNominalElement) totalNominalElement.textContent = `Total: ${formatCurrency(totalNominal)}`;

        // Attach sort event listeners
        attachPengeluaranSortListenersServerSide(selectedYear);

    } catch (error) {
        console.error('Error rendering pengeluaran table:', error);
        document.getElementById('pengeluaran-table-container').innerHTML = `
            <div class="alert alert-danger">Error loading data: ${error.message}</div>
        `;
    }
}

// New function: Initialize Server-side Search and Filter
function initializePengeluaranSearchAndFilterServerSide(selectedYear) {
    const searchInput = document.getElementById('pengeluaran-search');
    const itemsPerPageSelect = document.getElementById('pengeluaran-items-per-page');

    // Search functionality with debounce
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            renderPengeluaranTableServerSide(1, selectedYear);
        }, 500));
    }

    // Items per page functionality
    if (itemsPerPageSelect) {
        itemsPerPageSelect.addEventListener('change', () => {
            renderPengeluaranTableServerSide(1, selectedYear);
        });
    }
}

// New function: Attach Server-side Sort Listeners
function attachPengeluaranSortListenersServerSide(selectedYear) {
    const sortableHeaders = document.querySelectorAll('#pengeluaran-table-container .sortable');

    sortableHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const column = header.dataset.column;
            const currentSort = header.dataset.sort || 'none';

            // Reset all sort indicators
            sortableHeaders.forEach(h => {
                h.dataset.sort = 'none';
                const icon = h.querySelector('.sort-icon');
                if (icon) icon.className = 'bi bi-chevron-expand sort-icon';
            });

            // Determine new sort direction
            let newSort = 'asc';
            if (currentSort === 'asc') newSort = 'desc';
            else if (currentSort === 'desc') newSort = 'none';

            header.dataset.sort = newSort;

            // Update icon
            const icon = header.querySelector('.sort-icon');
            if (icon) {
                if (newSort === 'asc') icon.className = 'bi bi-chevron-up sort-icon';
                else if (newSort === 'desc') icon.className = 'bi bi-chevron-down sort-icon';
                else icon.className = 'bi bi-chevron-expand sort-icon';
            }

            // Apply sorting
            if (newSort !== 'none') {
                renderPengeluaranTableServerSide(1, selectedYear);
            }
        });
    });
}

// Update changePengeluaranPage function
async function changePengeluaranPage(page, selectedYear = null) {
    // Get current year filter
    const yearSelect = document.getElementById('pengeluaran-year-select');
    const currentYear = yearSelect ? yearSelect.value : (selectedYear || 'all');
    await renderPengeluaranTableServerSide(page, currentYear);
}

// Update resetPengeluaranFilters function
function resetPengeluaranFilters() {
    document.getElementById('pengeluaran-search').value = '';
    document.getElementById('pengeluaran-items-per-page').value = '10';
    renderPengeluaranTableServerSide(1, 'all');
}

// Update refreshViewPengeluaran function
async function refreshViewPengeluaran() {
    const yearSelect = document.getElementById('pengeluaran-year-select');
    const selectedYear = yearSelect ? yearSelect.value : 'all';
    await loadViewPengeluaran(selectedYear);
}
```

##### 2.1.3 Modifikasi loadViewIPL

```javascript
// File: js/modules/views/reports/ipl.js
// Update loadViewIPL function

async function loadViewIPL() {
    const contentDiv = document.getElementById('views-content');

    try {
        // Get all periods for period selection
        const { data: allPeriods, error: periodsError } = await supabase
            .from('periode')
            .select('id, nama_periode, nomor_urut, tanggal_awal, tanggal_akhir')
            .order('nomor_urut');

        if (periodsError) throw periodsError;

        // Store data globally
        iplViewDataGlobal = [];
        iplCurrentPage = 1;

        const html = `
            <div class="row">
                <div class="col-12">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h4>View Data IPL</h4>
                        <button class="btn btn-secondary" onclick="loadViewsSection()">
                            <i class="bi bi-arrow-left"></i> Kembali ke Views
                        </button>
                    </div>
                    <p class="text-muted">Data pembayaran IPL per rumah beserta kewajiban pembayaran</p>

                    <!-- Period Selection -->
                    <div class="card mb-3">
                        <div class="card-body">
                            <div class="row g-3">
                                <div class="col-md-3">
                                    <label for="ipl-period-select" class="form-label">Pilih Periode:</label>
                                    <select class="form-select" id="ipl-period-select">
                                        <option value="">Pilih Periode...</option>
                                        ${allPeriods.map(period => `<option value="${period.id}">${period.nama_periode}</option>`).join('')}
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <label for="ipl-search" class="form-label">Cari Rumah/Penghuni:</label>
                                    <input type="text" class="form-control" id="ipl-search" placeholder="Ketik nomor rumah atau nama...">
                                </div>
                                <div class="col-md-2">
                                    <label for="ipl-items-per-page" class="form-label">Data per Halaman:</label>
                                    <select class="form-select" id="ipl-items-per-page">
                                        <option value="5">5</option>
                                        <option value="10" selected>10</option>
                                        <option value="25">25</option>
                                        <option value="50">50</option>
                                        <option value="100">100</option>
                                    </select>
                                </div>
                                <div class="col-md-3 d-flex align-items-end gap-2">
                                    <button class="btn btn-outline-secondary" onclick="resetIPLFilters()">Reset</button>
                                    <button class="btn btn-outline-primary" onclick="refreshViewIPL()">
                                        <i class="bi bi-arrow-clockwise"></i> Refresh
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div id="ipl-table-container"></div>
                </div>
            </div>
        `;

        contentDiv.innerHTML = html;

        // Initialize search and filter functionality
        setTimeout(() => {
            initializeIPLSearchAndFilterServerSide();
        }, 100);
    } catch (error) {
        console.error('Error loading IPL view:', error);
        contentDiv.innerHTML = '<p class="text-danger">Error loading IPL data</p>';
    }
}

// New function: Render IPL Table with Server-side Pagination
async function renderIPLTableServerSide(page) {
    try {
        const periodId = document.getElementById('ipl-period-select')?.value;
        if (!periodId) {
            document.getElementById('ipl-table-container').innerHTML = `
                <div class="alert alert-info">Silakan pilih periode terlebih dahulu.</div>
            `;
            return;
        }

        const searchTerm = document.getElementById('ipl-search')?.value || '';
        const itemsPerPage = parseInt(document.getElementById('ipl-items-per-page')?.value || '10');

        // Call stored procedure
        const { data, error } = await supabase.rpc('get_ipl_summary_for_period_v2', {
            periode_param: periodId,
            page_num: page,
            page_size: itemsPerPage,
            search_term: searchTerm
        });

        if (error) throw error;

        if (!data || data.length === 0) {
            document.getElementById('ipl-table-container').innerHTML = `
                <div class="alert alert-info">Tidak ada data IPL ditemukan untuk periode ini.</div>
            `;
            return;
        }

        // Extract total count from first row
        const total_count = data[0].total_count || 0;
        const totalPages = Math.ceil(total_count / itemsPerPage);

        // Render table
        const tableHtml = `
            <div class="table-responsive">
                <table class="table table-striped table-hover">
                    <thead class="table-success">
                        <tr>
                            <th style="width: 60px;">No.</th>
                            <th class="sortable" data-column="nomor_blok_rumah">No. Rumah <i class="bi bi-chevron-expand sort-icon"></i></th>
                            <th class="sortable" data-column="nama_kepala_keluarga">Penghuni/Pemilik <i class="bi bi-chevron-expand sort-icon"></i></th>
                            <th class="sortable" data-column="total_tagihan">Total Tagihan <i class="bi bi-chevron-expand sort-icon"></i></th>
                            <th class="sortable" data-column="total_bayar">Total Bayar <i class="bi bi-chevron-expand sort-icon"></i></th>
                            <th class="sortable" data-column="sisa_tagihan">Sisa Tagihan <i class="bi bi-chevron-expand sort-icon"></i></th>
                            <th class="sortable" data-column="status">Status <i class="bi bi-chevron-expand sort-icon"></i></th>
                            <th>Detail</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map((item, index) => {
                            const startIndex = (page - 1) * itemsPerPage;
                            return `
                                <tr>
                                    <td>${startIndex + index + 1}</td>
                                    <td>${item.nomor_blok_rumah}</td>
                                    <td>${item.nama_kepala_keluarga || '-'}</td>
                                    <td class="text-end fw-bold">${formatCurrency(item.total_tagihan)}</td>
                                    <td class="text-end text-success fw-bold">${formatCurrency(item.total_bayar)}</td>
                                    <td class="text-end ${item.sisa_tagihan > 0 ? 'text-danger' : 'text-success'} fw-bold">${formatCurrency(item.sisa_tagihan)}</td>
                                    <td><span class="badge ${item.status === 'LUNAS' ? 'bg-success' : 'bg-warning'}">${item.status}</span></td>
                                    <td>
                                        <details>
                                            <summary class="text-primary" style="cursor: pointer;">Detail Tagihan</summary>
                                            <div class="mt-2">
                                                <div class="p-2 border rounded">
                                                    <strong>Periode:</strong> ${item.detail.periode}<br>
                                                    <strong>Tanggal Tagihan:</strong> ${item.detail.tanggal_tagihan ? new Date(item.detail.tanggal_tagihan).toLocaleDateString('id-ID') : '-'}<br>
                                                    <strong>Tanggal Jatuh Tempo:</strong> ${item.detail.tanggal_jatuh_tempo ? new Date(item.detail.tanggal_jatuh_tempo).toLocaleDateString('id-ID') : '-'}<br>
                                                    <strong>Jumlah Tagihan:</strong> ${item.detail.jumlah_tagihan}
                                                </div>
                                            </div>
                                        </details>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>

            <!-- Pagination -->
            <div class="d-flex justify-content-between align-items-center mt-3">
                <div class="text-muted">
                    Menampilkan ${data.length > 0 ? (page - 1) * itemsPerPage + 1 : 0}-${(page - 1) * itemsPerPage + data.length} dari ${total_count} data
                </div>
                ${renderPagination('ipl', page, totalPages)}
            </div>
        `;

        document.getElementById('ipl-table-container').innerHTML = tableHtml;

        // Attach sort event listeners
        attachIPLSortListenersServerSide();

    } catch (error) {
        console.error('Error rendering IPL table:', error);
        document.getElementById('ipl-table-container').innerHTML = `
            <div class="alert alert-danger">Error loading data: ${error.message}</div>
        `;
    }
}

// New function: Initialize Server-side Search and Filter
function initializeIPLSearchAndFilterServerSide() {
    const periodSelect = document.getElementById('ipl-period-select');
    const searchInput = document.getElementById('ipl-search');
    const itemsPerPageSelect = document.getElementById('ipl-items-per-page');

    // Period selection
    if (periodSelect) {
        periodSelect.addEventListener('change', () => {
            iplCurrentPage = 1;
            renderIPLTableServerSide(1);
        });
    }

    // Search functionality with debounce
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            renderIPLTableServerSide(1);
        }, 500));
    }

    // Items per page functionality
    if (itemsPerPageSelect) {
        itemsPerPageSelect.addEventListener('change', () => {
            renderIPLTableServerSide(1);
        });
    }
}

// New function: Attach Server-side Sort Listeners
function attachIPLSortListenersServerSide() {
    const sortableHeaders = document.querySelectorAll('#ipl-table-container .sortable');

    sortableHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const column = header.dataset.column;
            const currentSort = header.dataset.sort || 'none';

            // Reset all sort indicators
            sortableHeaders.forEach(h => {
                h.dataset.sort = 'none';
                const icon = h.querySelector('.sort-icon');
                if (icon) icon.className = 'bi bi-chevron-expand sort-icon';
            });

            // Determine new sort direction
            let newSort = 'asc';
            if (currentSort === 'asc') newSort = 'desc';
            else if (currentSort === 'desc') newSort = 'none';

            header.dataset.sort = newSort;

            // Update icon
            const icon = header.querySelector('.sort-icon');
            if (icon) {
                if (newSort === 'asc') icon.className = 'bi bi-chevron-up sort-icon';
                else if (newSort === 'desc') icon.className = 'bi bi-chevron-down sort-icon';
                else icon.className = 'bi bi-chevron-expand sort-icon';
            }

            // Apply sorting
            if (newSort !== 'none') {
                renderIPLTableServerSide(1);
            }
        });
    });
}

// Update changeIPLPage function
async function changeIPLPage(page) {
    await renderIPLTableServerSide(page);
}

// Update resetIPLFilters function
function resetIPLFilters() {
    document.getElementById('ipl-period-select').value = '';
    document.getElementById('ipl-search').value = '';
    document.getElementById('ipl-items-per-page').value = '10';
    iplCurrentPage = 1;
    renderIPLTableServerSide(1);
}

// Update refreshViewIPL function
async function refreshViewIPL() {
    await loadViewIPL();
    const periodSelect = document.getElementById('ipl-period-select');
    if (periodSelect?.value) {
        await renderIPLTableServerSide(1);
    }
}
```

### **FASE 3: Testing & Monitoring**

#### **Task 3.1: Performance Testing** ⏱️ 2 jam

##### 3.1.1 Benchmark Script

```sql
-- Performance Benchmark Script
-- Run this script before and after optimization

-- Test 1: IPL Query Performance
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM get_ipl_summary_for_period_v2(
    (SELECT id FROM periode WHERE nama_periode = 'Des2025'),
    1, 50, '', ''
);

-- Test 2: Pemasukan Query Performance
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM get_pemasukan_paginated_v2(
    1, 10, '', NULL, NULL, NULL, '2025-01-01', '2025-12-31', 'tanggal', 'DESC'
);

-- Test 3: Pengeluaran Query Performance
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM get_pengeluaran_paginated_v2(
    1, 10, '', NULL, NULL, '2025-01-01', '2025-12-31', 'tanggal', 'DESC'
);

-- Test 4: Index Usage Analysis
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch,
    idx_scan
FROM pg_stat_user_indexes 
WHERE tablename IN ('pemasukan', 'pengeluaran', 'tagihan_ipl', 'meteran_air_billing')
ORDER BY idx_scan DESC;

-- Test 5: Table Size Analysis
SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size(tablename::regclass)) as total_size,
    pg_size_pretty(pg_relation_size(tablename::regclass)) as table_size,
    pg_size_pretty(pg_total_relation_size(tablename::regclass) - pg_relation_size(tablename::regclass)) as index_size
FROM pg_tables 
WHERE tablename IN ('pemasukan', 'pengeluaran', 'tagihan_ipl', 'meteran_air_billing')
ORDER BY pg_total_relation_size(tablename::regclass) DESC;
```

##### 3.1.2 Load Testing Script

```javascript
// Load Testing Script for Frontend
// Save as load-test.js and run with Node.js

const axios = require('axios');

async function loadTest() {
    const baseURL = 'http://localhost:3000'; // Adjust to your server URL
    
    const tests = [
        {
            name: 'Pemasukan Report',
            url: '/rpc/get_pemasukan_paginated_v2',
            params: {
                page_num: 1,
                page_size: 50,
                search_term: '',
                date_from: '2025-01-01',
                date_to: '2025-12-31'
            }
        },
        {
            name: 'Pengeluaran Report',
            url: '/rpc/get_pengeluaran_paginated_v2',
            params: {
                page_num: 1,
                page_size: 50,
                search_term: '',
                date_from: '2025-01-01',
                date_to: '2025-12-31'
            }
        },
        {
            name: 'IPL Report',
            url: '/rpc/get_ipl_summary_for_period_v2',
            params: {
                periode_param: 'uuid-periode-desember-2025',
                page_num: 1,
                page_size: 50,
                search_term: ''
            }
        }
    ];

    for (const test of tests) {
        console.log(`\n=== Testing ${test.name} ===`);
        
        const times = [];
        const concurrentUsers = 10;
        const requestsPerUser = 5;

        for (let i = 0; i < concurrentUsers; i++) {
            const promises = [];
            
            for (let j = 0; j < requestsPerUser; j++) {
                const start = Date.now();
                promises.push(
                    axios.post(`${baseURL}${test.url}`, test.params)
                        .then(() => Date.now() - start)
                );
            }
            
            const userTimes = await Promise.all(promises);
            times.push(...userTimes);
        }

        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);
        const p95Time = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)];

        console.log(`Average: ${avgTime.toFixed(2)}ms`);
        console.log(`Min: ${minTime.toFixed(2)}ms`);
        console.log(`Max: ${maxTime.toFixed(2)}ms`);
        console.log(`P95: ${p95Time.toFixed(2)}ms`);
        console.log(`Total Requests: ${times.length}`);
    }
}

loadTest().catch(console.error);
```

#### **Task 3.2: Functional Testing** ⏱️ 2 jam

##### 3.2.1 Test Cases

```markdown
# Functional Testing Checklist

## Database Tests

### Composite Index Tests
- [ ] Index `idx_pemasukan_kategori_tanggal_hunian` exists and is used
- [ ] Index `idx_pengeluaran_kategori_tanggal_rekening` exists and is used
- [ ] Index `idx_tagihan_ipl_periode_status_hunian` exists and is used
- [ ] Index `idx_meteran_air_billing_periode_status_hunian` exists and is used

### Stored Procedure Tests
- [ ] `get_ipl_summary_for_period_v2` returns correct data
- [ ] `get_pemasukan_paginated_v2` returns correct data
- [ ] `get_pengeluaran_paginated_v2` returns correct data
- [ ] `get_air_summary_for_period_v2` returns correct data
- [ ] All stored procedures handle pagination correctly
- [ ] All stored procedures handle search correctly
- [ ] All stored procedures handle filters correctly

### Materialized View Tests
- [ ] `mv_monthly_summary` contains correct data
- [ ] `mv_ipl_outstanding_summary` contains correct data
- [ ] `mv_air_outstanding_summary` contains correct data
- [ ] Materialized views can be refreshed
- [ ] Materialized views have proper indexes

## Frontend Tests

### Pemasukan Report Tests
- [ ] Server-side pagination works
- [ ] Search functionality works
- [ ] Date filtering works
- [ ] Category filtering works
- [ ] Account filtering works
- [ ] Sorting works
- [ ] Total count is correct
- [ ] Performance is improved

### Pengeluaran Report Tests
- [ ] Server-side pagination works
- [ ] Search functionality works
- [ ] Date filtering works
- [ ] Category filtering works
- [ ] Account filtering works
- [ ] Sorting works
- [ ] Total count is correct
- [ ] Performance is improved

### IPL Report Tests
- [ ] Server-side pagination works
- [ ] Search functionality works
- [ ] Period filtering works
- [ ] Status filtering works
- [ ] Sorting works
- [ ] Total count is correct
- [ ] Performance is improved

### Air Report Tests
- [ ] Server-side pagination works
- [ ] Search functionality works
- [ ] Period filtering works
- [ ] Status filtering works
- [ ] Sorting works
- [ ] Total count is correct
- [ ] Performance is improved

## Integration Tests

### End-to-End Tests
- [ ] All reports load within 2-3 seconds
- [ ] No browser freezing or hanging
- [ ] Memory usage is stable
- [ ] All filters work together correctly
- [ ] Error handling is proper
- [ ] Loading indicators work correctly

### Regression Tests
- [ ] Existing functionality still works
- [ ] Data integrity is maintained
- [ ] No broken links or navigation
- [ ] All buttons and controls work
- [ ] Export functionality (if any) still works
```

#### **Task 3.3: Monitoring Setup** ⏱️ 1 jam

##### 3.3.1 Database Monitoring Queries

```sql
-- Database Performance Monitoring Queries

-- 1. Slow Query Log (Enable in postgresql.conf)
-- log_min_duration_statement = 1000  -- Log queries slower than 1 second

-- 2. Query Performance Monitoring
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    max_time,
    rows
FROM pg_stat_statements 
WHERE query LIKE '%get_ipl_summary_for_period_v2%'
   OR query LIKE '%get_pemasukan_paginated_v2%'
   OR query LIKE '%get_pengeluaran_paginated_v2%'
ORDER BY mean_time DESC;

-- 3. Index Usage Monitoring
SELECT 
    t.tablename,
    i.indexname,
    i.indexdef
FROM pg_tables t
LEFT JOIN pg_indexes i ON t.tablename = i.tablename
WHERE t.schemaname = 'public'
ORDER BY t.tablename, i.indexname;

-- 4. Table Size Monitoring
SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size(tablename::regclass)) as size,
    pg_size_pretty(pg_relation_size(tablename::regclass)) as table_size,
    pg_size_pretty(pg_total_relation_size(tablename::regclass) - pg_relation_size(tablename::regclass)) as index_size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(tablename::regclass) DESC;

-- 5. Connection Monitoring
SELECT 
    datname as database,
    usename as user,
    count(*) as connections,
    state
FROM pg_stat_activity 
WHERE datname IS NOT NULL
GROUP BY datname, usename, state
ORDER BY connections DESC;

-- 6. Lock Monitoring
SELECT 
    blocked_locks.pid AS blocked_pid,
    blocked_activity.usename AS blocked_user,
    blocking_locks.pid AS blocking_pid,
    blocking_activity.usename AS blocking_user,
    blocked_activity.query AS blocked_statement,
    blocking_activity.query AS current_statement_in_blocking_process
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks 
    ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.DATABASE IS NOT DISTINCT FROM blocked_locks.DATABASE
    AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
    AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
    AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
    AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
    AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
    AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
    AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
    AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
    AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.GRANTED;
```

##### 3.3.2 Application Monitoring

```javascript
// Frontend Performance Monitoring
// Add to your main JavaScript file

// Performance monitoring for report loading
function monitorReportPerformance(reportName, loadFunction) {
    return async function(...args) {
        const startTime = performance.now();
        
        try {
            const result = await loadFunction.apply(this, args);
            
            const endTime = performance.now();
            const loadTime = endTime - startTime;
            
            // Log performance metrics
            console.log(`${reportName} loaded in ${loadTime.toFixed(2)}ms`);
            
            // Send metrics to monitoring service (optional)
            if (window.gtag) {
                window.gtag('event', 'report_load', {
                    event_category: 'performance',
                    event_label: reportName,
                    value: Math.round(loadTime)
                });
            }
            
            // Alert if loading is too slow
            if (loadTime > 3000) {
                console.warn(`${reportName} is loading slowly: ${loadTime.toFixed(2)}ms`);
                showToast(`${reportName} loading lambat. Silakan refresh halaman.`, 'warning');
            }
            
            return result;
        } catch (error) {
            const endTime = performance.now();
            const loadTime = endTime - startTime;
            
            console.error(`${reportName} failed to load in ${loadTime.toFixed(2)}ms:`, error);
            
            // Send error metrics
            if (window.gtag) {
                window.gtag('event', 'report_error', {
                    event_category: 'error',
                    event_label: reportName,
                    value: Math.round(loadTime)
                });
            }
            
            throw error;
        }
    };
}

// Memory usage monitoring
function monitorMemoryUsage() {
    if (performance.memory) {
        const memory = performance.memory;
        const usedMB = memory.usedJSHeapSize / 1024 / 1024;
        const totalMB = memory.totalJSHeapSize / 1024 / 1024;
        const limitMB = memory.jsHeapSizeLimit / 1024 / 1024;
        
        console.log(`Memory Usage: ${usedMB.toFixed(2)}MB / ${totalMB.toFixed(2)}MB (Limit: ${limitMB.toFixed(2)}MB)`);
        
        // Alert if memory usage is high
        if (usedMB > 100) {
            console.warn('High memory usage detected:', usedMB.toFixed(2), 'MB');
            showToast('Memory usage tinggi terdeteksi. Pertimbangkan untuk refresh halaman.', 'warning');
        }
        
        return { usedMB, totalMB, limitMB };
    }
    
    return null;
}

// Network request monitoring
function monitorNetworkRequests() {
    const originalFetch = window.fetch;
    
    window.fetch = function(...args) {
        const startTime = performance.now();
        const url = args[0];
        
        return originalFetch.apply(this, args)
            .then(response => {
                const endTime = performance.now();
                const duration = endTime - startTime;
                
                // Log slow requests
                if (duration > 1000) {
                    console.warn(`Slow request to ${url}: ${duration.toFixed(2)}ms`);
                }
                
                return response;
            })
            .catch(error => {
                const endTime = performance.now();
                const duration = endTime - startTime;
                
                console.error(`Failed request to ${url} after ${duration.toFixed(2)}ms:`, error);
                throw error;
            });
    };
}

// Initialize monitoring
document.addEventListener('DOMContentLoaded', () => {
    // Monitor memory usage every 30 seconds
    setInterval(monitorMemoryUsage, 30000);
    
    // Monitor network requests
    monitorNetworkRequests();
    
    // Wrap report loading functions
    if (typeof loadViewPemasukan === 'function') {
        window.loadViewPemasukan = monitorReportPerformance('Pemasukan Report', loadViewPemasukan);
    }
    
    if (typeof loadViewPengeluaran === 'function') {
        window.loadViewPengeluaran = monitorReportPerformance('Pengeluaran Report', loadViewPengeluaran);
    }
    
    if (typeof loadViewIPL === 'function') {
        window.loadViewIPL = monitorReportPerformance('IPL Report', loadViewIPL);
    }
    
    if (typeof loadViewAir === 'function') {
        window.loadViewAir = monitorReportPerformance('Air Report', loadViewAir);
    }
});
```

---

## 🔄 MAINTENANCE

### **Daily Maintenance**

#### **1. Monitor Performance Metrics**
- Check query execution times
- Monitor memory usage
- Check for slow queries in logs

#### **2. Refresh Materialized Views**
```sql
-- Run daily at 2 AM
SELECT refresh_monthly_summary();
SELECT refresh_ipl_outstanding_summary();
SELECT refresh_air_outstanding_summary();
```

#### **3. Check Index Usage**
```sql
-- Check if indexes are being used
SELECT 
    indexrelname as index_name,
    idx_tup_read,
    idx_tup_fetch,
    idx_scan
FROM pg_stat_user_indexes 
WHERE idx_scan = 0 
AND indexrelname LIKE 'idx_%';
```

### **Weekly Maintenance**

#### **1. Update Table Statistics**
```sql
-- Update statistics for query planner
ANALYZE pemasukan;
ANALYZE pengeluaran;
ANALYZE tagihan_ipl;
ANALYZE meteran_air_billing;
ANALYZE tagihan_ipl_pembayaran;
ANALYZE meteran_air_billing_pembayaran;
```

#### **2. Check for Bloat**
```sql
-- Check table bloat (requires pgstattuple extension)
SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size(tablename::regclass)) as total_size,
    pg_size_pretty(pg_relation_size(tablename::regclass)) as table_size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(tablename::regclass) DESC;
```

#### **3. Review Slow Queries**
```sql
-- Check pg_stat_statements for slow queries
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    max_time
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

### **Monthly Maintenance**

#### **1. Reindex if Necessary**
```sql
-- Reindex large tables if needed
REINDEX INDEX idx_pemasukan_kategori_tanggal_hunian;
REINDEX INDEX idx_pengeluaran_kategori_tanggal_rekening;
REINDEX INDEX idx_tagihan_ipl_periode_status_hunian;
```

#### **2. Review and Optimize**
- Review performance metrics
- Identify new optimization opportunities
- Update stored procedures if needed
- Review index effectiveness

---

## 🚨 ROLLBACK PLAN

### **If Optimization Causes Issues**

#### **Rollback Database Changes**

##### **1. Drop Composite Indexes**
```sql
-- Drop all composite indexes created
DROP INDEX IF EXISTS idx_pemasukan_kategori_tanggal_hunian;
DROP INDEX IF EXISTS idx_pemasukan_rekening_tanggal_kategori;
DROP INDEX IF EXISTS idx_pemasukan_hunian_tanggal_kategori;
DROP INDEX IF EXISTS idx_pengeluaran_kategori_tanggal_rekening;
DROP INDEX IF EXISTS idx_pengeluaran_rekening_tanggal_kategori;
DROP INDEX IF EXISTS idx_tagihan_ipl_periode_status_hunian;
DROP INDEX IF EXISTS idx_tagihan_ipl_hunian_periode_status;
DROP INDEX IF EXISTS idx_tagihan_ipl_pembayaran_tagihan_pemasukan;
DROP INDEX IF EXISTS idx_tagihan_ipl_pembayaran_pemasukan_tagihan;
DROP INDEX IF EXISTS idx_meteran_air_billing_periode_status_hunian;
DROP INDEX IF EXISTS idx_meteran_air_billing_hunian_periode_status;
DROP INDEX IF EXISTS idx_meteran_air_billing_pembayaran_billing_pemasukan;
DROP INDEX IF EXISTS idx_meteran_air_billing_pembayaran_pemasukan_billing;
DROP INDEX IF EXISTS idx_dana_titipan_kategori_tanggal_hunian;
DROP INDEX IF EXISTS idx_dana_titipan_hunian_tanggal_kategori;
DROP INDEX IF EXISTS idx_dana_titipan_converted_tanggal;
```

##### **2. Drop Stored Procedures**
```sql
-- Drop all stored procedures created
DROP FUNCTION IF EXISTS get_ipl_summary_for_period_v2(UUID, INTEGER, INTEGER, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS get_pemasukan_paginated_v2(INTEGER, INTEGER, VARCHAR, UUID, UUID, UUID, DATE, DATE, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS get_pengeluaran_paginated_v2(INTEGER, INTEGER, VARCHAR, UUID, UUID, DATE, DATE, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS get_air_summary_for_period_v2(UUID, INTEGER, INTEGER, VARCHAR);
```

##### **3. Drop Materialized Views**
```sql
-- Drop all materialized views created
DROP MATERIALIZED VIEW IF EXISTS mv_monthly_summary;
DROP MATERIALIZED VIEW IF EXISTS mv_ipl_outstanding_summary;
DROP MATERIALIZED VIEW IF EXISTS mv_air_outstanding_summary;

-- Drop refresh functions
DROP FUNCTION IF EXISTS refresh_monthly_summary();
DROP FUNCTION IF EXISTS refresh_ipl_outstanding_summary();
DROP FUNCTION IF EXISTS refresh_air_outstanding_summary();
```

#### **Rollback Frontend Changes**

##### **1. Revert to Original Report Functions**
```javascript
// Replace optimized functions with original versions
// This requires having backup of original files

// For each report file:
// 1. Replace loadViewPemasukan with original
// 2. Replace loadViewPengeluaran with original
// 3. Replace loadViewIPL with original
// 4. Replace loadViewAir with original
```

##### **2. Remove Monitoring Code**
```javascript
// Remove performance monitoring code
// Remove server-side pagination logic
// Revert to client-side processing
```

### **Rollback Steps**

#### **Step 1: Stop Application**
```bash
# Stop the application server
# For Node.js: Ctrl+C or kill process
# For other servers: follow your deployment procedure
```

#### **Step 2: Rollback Database**
```sql
-- Connect to database and run rollback queries
-- Start with dropping new objects
-- Verify no errors occur
```

#### **Step 3: Rollback Application**
```bash
# Replace optimized files with backup versions
# Restart application server
# Verify application works correctly
```

#### **Step 4: Test Rollback**
```sql
-- Test that original queries work
-- Test that application loads correctly
-- Verify data integrity
```

### **Emergency Rollback Checklist**

- [ ] Stop application immediately
- [ ] Assess the issue severity
- [ ] Rollback database changes
- [ ] Rollback application changes
- [ ] Restart application
- [ ] Test core functionality
- [ ] Notify stakeholders
- [ ] Document the incident
- [ ] Plan for next attempt

---

## 📊 SUCCESS METRICS

### **Performance Targets**

#### **Before Optimization:**
- IPL Report: 10-30 detik
- Pemasukan Report: 5-15 detik
- Pengeluaran Report: 5-15 detik
- Air Report: 8-20 detik
- Memory Usage: Tinggi dan meningkat

#### **After Optimization:**
- IPL Report: **1-2 detik** (95% improvement)
- Pemasukan Report: **0.5-1 detik** (90% improvement)
- Pengeluaran Report: **0.5-1 detik** (90% improvement)
- Air Report: **1-2 detik** (90% improvement)
- Memory Usage: **60-70% reduction**

### **Monitoring Dashboard**

Create a simple dashboard to monitor:
- Average report loading time
- 95th percentile loading time
- Memory usage trends
- Database query performance
- Error rates

---

## 📞 SUPPORT

### **Contact Information**
- **Database Issues:** DBA Team
- **Application Issues:** Development Team
- **Performance Issues:** DevOps Team

### **Escalation Path**
1. **Level 1:** Application monitoring alerts
2. **Level 2:** Performance degradation > 50%
3. **Level 3:** Application downtime or data corruption

### **Documentation Links**
- [Database Schema Documentation](#)
- [API Documentation](#)
- [Performance Monitoring Guide](#)

---

**Catatan:** Dokumentasi ini harus disimpan dengan aman dan diperbarui setiap kali ada perubahan pada sistem optimasi.
