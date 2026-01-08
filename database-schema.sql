-- Database Schema for Keuangan RT Modern
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================
-- MASTER DATA
-- ============================

CREATE TABLE lorong (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama_lorong VARCHAR(50) NOT NULL UNIQUE,
    ketua_lorong VARCHAR(100)
);

CREATE TABLE penghuni (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama_kepala_keluarga VARCHAR(100) NOT NULL,
    agama VARCHAR(50),
    status VARCHAR(20) CHECK (status IN ('pemilik', 'pengontrak', 'lainnya')),
    kondisi_khusus BOOLEAN DEFAULT FALSE
);

CREATE TABLE hunian (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nomor_urut INTEGER NOT NULL,
    nomor_blok_rumah VARCHAR(20) NOT NULL UNIQUE,
    status VARCHAR(20) CHECK (status IN ('berpenghuni', 'kosong')),
    pelanggan_air BOOLEAN DEFAULT FALSE,
    lorong_id UUID REFERENCES lorong(id),
    penghuni_saat_ini_id UUID REFERENCES penghuni(id),
    penghuni_sebelumnya_1_id UUID REFERENCES penghuni(id),
    penghuni_sebelumnya_2_id UUID REFERENCES penghuni(id)
);

CREATE TABLE kategori_saldo (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama_kategori VARCHAR(50) NOT NULL UNIQUE,
    saldo_awal NUMERIC(15,2) DEFAULT 0
);

CREATE TABLE subkategori (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kategori_id UUID NOT NULL REFERENCES kategori_saldo(id),
    nama_subkategori VARCHAR(100) NOT NULL
);

CREATE TABLE rekening (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    jenis_rekening VARCHAR(50) NOT NULL UNIQUE,
    saldo_awal NUMERIC(15,2) DEFAULT 0
);

CREATE TABLE periode (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nomor_urut INTEGER NOT NULL,
    nama_periode VARCHAR(20) NOT NULL UNIQUE,
    tanggal_awal DATE NOT NULL,
    tanggal_akhir DATE NOT NULL
);

-- ============================
-- TRANSAKSI
-- ============================

CREATE TABLE pemasukan (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_transaksi VARCHAR(20) NOT NULL UNIQUE,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    penghuni_id UUID REFERENCES penghuni(id),
    hunian_id UUID REFERENCES hunian(id),
    nominal NUMERIC(15,2) NOT NULL,
    kategori_id UUID NOT NULL REFERENCES kategori_saldo(id),
    periode_id UUID REFERENCES periode(id),
    periode_list UUID[] DEFAULT ARRAY[]::UUID[],
    rekening_id UUID NOT NULL REFERENCES rekening(id),
    keterangan TEXT
);

CREATE TABLE pengeluaran (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_transaksi VARCHAR(20) NOT NULL UNIQUE,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    nominal NUMERIC(15,2) NOT NULL,
    keterangan TEXT,
    kategori_id UUID NOT NULL REFERENCES kategori_saldo(id),
    subkategori_id UUID REFERENCES subkategori(id),
    penerima VARCHAR(100),
    rekening_id UUID NOT NULL REFERENCES rekening(id),
    link_url TEXT
);

CREATE TABLE pemindahbukuan (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_transaksi VARCHAR(20) NOT NULL UNIQUE,
    rekening_dari_id UUID NOT NULL REFERENCES rekening(id),
    rekening_ke_id UUID NOT NULL REFERENCES rekening(id),
    nominal NUMERIC(15,2) NOT NULL,
    catatan TEXT,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    CHECK (rekening_dari_id != rekening_ke_id)
);

CREATE TABLE dana_titipan (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_transaksi VARCHAR(20) NOT NULL UNIQUE,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    penghuni_id UUID REFERENCES penghuni(id),
    hunian_id UUID REFERENCES hunian(id),
    nominal NUMERIC(15,2) NOT NULL,
    kategori_id UUID NOT NULL REFERENCES kategori_saldo(id),
    periode_id UUID REFERENCES periode(id),
    rekening_id UUID NOT NULL REFERENCES rekening(id),
    keterangan TEXT
);

-- ============================
-- METERAN AIR
-- ============================

CREATE TABLE meteran_air (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hunian_id UUID NOT NULL REFERENCES hunian(id),
    penghuni_id UUID REFERENCES penghuni(id),
    angka_meteran JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- ============================
-- TARIF AIR
-- ============================

CREATE TABLE tarif_air (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    harga_per_kubik NUMERIC(10,2) NOT NULL,
    tanggal_mulai_berlaku DATE NOT NULL,
    aktif BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================
-- TARIF IPL (KEBERSIHAN/LINGKUNGAN)
-- ============================

CREATE TABLE tarif_ipl (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type_tarif VARCHAR(50) NOT NULL UNIQUE, -- 'IPL', 'IPL_RUMAH_KOSONG', 'DAU'
    nama_tarif VARCHAR(100) NOT NULL,       -- Display name
    nominal NUMERIC(10,2) NOT NULL,         -- Amount for this type
    tanggal_mulai_berlaku DATE NOT NULL,
    aktif BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================
-- TAGIHAN IPL (IPL BILLS)
-- ============================

CREATE TABLE tagihan_ipl (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    periode_id UUID NOT NULL REFERENCES periode(id),
    hunian_id UUID NOT NULL REFERENCES hunian(id),
    penghuni_id UUID REFERENCES penghuni(id),

    -- Bill calculation
    tarif_per_bulan NUMERIC(10,2) NOT NULL,
    nominal_tagihan NUMERIC(12,2) NOT NULL,

    -- Payment tracking
    total_pembayaran NUMERIC(12,2) DEFAULT 0,
    sisa_tagihan NUMERIC(12,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'belum_bayar' CHECK (status IN ('belum_bayar', 'sebagian', 'lunas')),

    -- Dates
    tanggal_tagihan DATE NOT NULL,
    tanggal_jatuh_tempo DATE,

    -- Notes for manual calculations (occupant changes, etc.)
    keterangan TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for tagihan_ipl
CREATE INDEX idx_tagihan_ipl_periode ON tagihan_ipl(periode_id);
CREATE INDEX idx_tagihan_ipl_hunian ON tagihan_ipl(hunian_id);
CREATE INDEX idx_tagihan_ipl_penghuni ON tagihan_ipl(penghuni_id);
CREATE INDEX idx_tagihan_ipl_status ON tagihan_ipl(status);
CREATE INDEX idx_tagihan_ipl_tanggal_tagihan ON tagihan_ipl(tanggal_tagihan);
CREATE INDEX idx_tagihan_ipl_jatuh_tempo ON tagihan_ipl(tanggal_jatuh_tempo);

-- ============================
-- TAGIHAN IPL PEMBAYARAN (PAYMENT ALLOCATIONS)
-- ============================

CREATE TABLE tagihan_ipl_pembayaran (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tagihan_ipl_id UUID NOT NULL REFERENCES tagihan_ipl(id),
    pemasukan_id UUID NOT NULL REFERENCES pemasukan(id),
    nominal_dialokasikan NUMERIC(12,2) NOT NULL,
    kategori_ipl VARCHAR(50), -- Track IPL category: 'IPL', 'IPL_RUMAH_KOSONG', 'DAU'
    tanggal_alokasi DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(tagihan_ipl_id, pemasukan_id) -- One allocation per bill-payment combination
);

-- Index for payment allocations
CREATE INDEX idx_tagihan_ipl_pembayaran_tagihan ON tagihan_ipl_pembayaran(tagihan_ipl_id);
CREATE INDEX idx_tagihan_ipl_pembayaran_pemasukan ON tagihan_ipl_pembayaran(pemasukan_id);

-- ============================
-- TAGIHAN AIR (WATER BILLS)
-- ============================

CREATE TABLE tagihan_air (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    periode_id UUID NOT NULL REFERENCES periode(id),
    hunian_id UUID NOT NULL REFERENCES hunian(id),
    penghuni_id UUID REFERENCES penghuni(id),

    -- Meter reading data
    meteran_periode_ini NUMERIC,
    meteran_periode_sebelumnya NUMERIC,
    pemakaian_m3 NUMERIC NOT NULL,

    -- Bill calculation
    tarif_per_kubik NUMERIC(10,2) NOT NULL,
    nominal_tagihan NUMERIC(12,2) NOT NULL,

    -- Payment tracking
    total_pembayaran NUMERIC(12,2) DEFAULT 0,
    sisa_tagihan NUMERIC(12,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'belum_bayar' CHECK (status IN ('belum_bayar', 'sebagian', 'lunas')),

    -- Dates
    tanggal_tagihan DATE NOT NULL,
    tanggal_jatuh_tempo DATE,

    -- Notes for manual calculations (occupant changes, etc.)
    keterangan TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for tagihan_air
CREATE INDEX idx_tagihan_air_periode ON tagihan_air(periode_id);
CREATE INDEX idx_tagihan_air_hunian ON tagihan_air(hunian_id);
CREATE INDEX idx_tagihan_air_penghuni ON tagihan_air(penghuni_id);
CREATE INDEX idx_tagihan_air_status ON tagihan_air(status);
CREATE INDEX idx_tagihan_air_tanggal_tagihan ON tagihan_air(tanggal_tagihan);
CREATE INDEX idx_tagihan_air_jatuh_tempo ON tagihan_air(tanggal_jatuh_tempo);

-- ============================
-- TAGIHAN AIR PEMBAYARAN (PAYMENT ALLOCATIONS)
-- ============================

CREATE TABLE tagihan_air_pembayaran (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tagihan_air_id UUID NOT NULL REFERENCES tagihan_air(id),
    pemasukan_id UUID NOT NULL REFERENCES pemasukan(id),
    nominal_dialokasikan NUMERIC(12,2) NOT NULL,
    tanggal_alokasi DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(tagihan_air_id, pemasukan_id) -- One allocation per bill-payment combination
);

-- Index for payment allocations
CREATE INDEX idx_tagihan_pembayaran_tagihan ON tagihan_air_pembayaran(tagihan_air_id);
CREATE INDEX idx_tagihan_pembayaran_pemasukan ON tagihan_air_pembayaran(pemasukan_id);

-- ============================
-- COUNTER TABLE FOR TRANSACTION IDs
-- ============================

CREATE TABLE transaction_counters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    counter_type VARCHAR(20) NOT NULL UNIQUE, -- 'pemasukan', 'pengeluaran', 'pemindahbukuan'
    year INTEGER NOT NULL, -- 2024, 2025, etc.
    current_number INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial counters for 2025
INSERT INTO transaction_counters (counter_type, year, current_number) VALUES
('pemasukan', 2025, 0),
('pengeluaran', 2025, 0),
('pemindahbukuan', 2025, 0),
('dana_titipan', 2025, 0);

-- Function to get next transaction number
CREATE OR REPLACE FUNCTION get_next_transaction_number(counter_type_param VARCHAR(20))
RETURNS INTEGER AS $$
DECLARE
    current_year INTEGER := EXTRACT(YEAR FROM NOW());
    next_number INTEGER;
BEGIN
    -- Try to update existing counter for current year
    UPDATE transaction_counters
    SET current_number = current_number + 1,
        updated_at = NOW()
    WHERE counter_type = counter_type_param AND year = current_year;

    -- If no row was updated, insert new counter for current year
    IF NOT FOUND THEN
        INSERT INTO transaction_counters (counter_type, year, current_number)
        VALUES (counter_type_param, current_year, 1);
        next_number := 1;
    ELSE
        -- Get the updated number
        SELECT current_number INTO next_number
        FROM transaction_counters
        WHERE counter_type = counter_type_param AND year = current_year;
    END IF;

    RETURN next_number;
END;
$$ LANGUAGE plpgsql;

-- ============================
-- INDEXES
-- ============================

CREATE INDEX idx_hunian_lorong ON hunian(lorong_id);
CREATE INDEX idx_hunian_penghuni_saat_ini ON hunian(penghuni_saat_ini_id);
CREATE INDEX idx_pemasukan_tanggal ON pemasukan(tanggal);
CREATE INDEX idx_pemasukan_kategori ON pemasukan(kategori_id);
CREATE INDEX idx_pengeluaran_tanggal ON pengeluaran(tanggal);
CREATE INDEX idx_pengeluaran_kategori ON pengeluaran(kategori_id);
CREATE INDEX idx_pemindahbukuan_tanggal ON pemindahbukuan(tanggal);

-- ============================
-- VIEWS (will be created after data insertion)
-- ============================

-- Note: Views will be created in a separate script after tables are populated
-- Since they depend on complex aggregations and joins
