// Financial Report Queries Module
// Contains all database queries for financial reports

import { supabase } from '../../../config.js';

// ============================
// SALDO REPORTS
// ============================

/**
 * Get rekap saldo per kategori dengan grafik IPL
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<Object>} Saldo data with IPL breakdown
 */
export async function getRekapSaldoData(startDate, endDate) {
    try {
        // Get all categories
        const { data: categories, error: catError } = await supabase
            .from('kategori_saldo')
            .select('id, nama_kategori, saldo_awal')
            .order('nama_kategori');

        if (catError) throw catError;

        const result = {
            categories: [],
            totalSaldoAwal: 0,
            totalPemasukan: 0,
            totalPengeluaran: 0,
            totalSaldoAkhir: 0,
            iplData: []
        };

        for (const category of categories || []) {
            // Calculate income for this category
            const { data: pemasukan, error: pemasukanError } = await supabase
                .from('pemasukan')
                .select('nominal')
                .eq('kategori_id', category.id)
                .gte('tanggal', startDate)
                .lte('tanggal', endDate);

            if (pemasukanError) throw pemasukanError;

            // Calculate expenses for this category
            const { data: pengeluaran, error: pengeluaranError } = await supabase
                .from('pengeluaran')
                .select('nominal')
                .eq('kategori_id', category.id)
                .gte('tanggal', startDate)
                .lte('tanggal', endDate);

            if (pengeluaranError) throw pengeluaranError;

            const totalPemasukan = (pemasukan || []).reduce((sum, item) => sum + (item.nominal || 0), 0);
            const totalPengeluaran = (pengeluaran || []).reduce((sum, item) => sum + (item.nominal || 0), 0);
            const saldoAkhir = category.saldo_awal + totalPemasukan - totalPengeluaran;

            result.categories.push({
                nama_kategori: category.nama_kategori,
                saldo_awal: category.saldo_awal,
                pemasukan: totalPemasukan,
                pengeluaran: totalPengeluaran,
                saldo_akhir: saldoAkhir
            });

            result.totalSaldoAwal += category.saldo_awal;
            result.totalPemasukan += totalPemasukan;
            result.totalPengeluaran += totalPengeluaran;
        }

        result.totalSaldoAkhir = result.totalSaldoAwal + result.totalPemasukan - result.totalPengeluaran;

        // Get IPL specific data for chart
        const { data: iplCategory, error: iplError } = await supabase
            .from('kategori_saldo')
            .select('id')
            .eq('nama_kategori', 'IPL')
            .single();

        if (!iplError && iplCategory) {
            const { data: iplPayments, error: iplPayError } = await supabase
                .from('pemasukan')
                .select(`
                    nominal,
                    tanggal,
                    hunian:hunian_id (nomor_blok_rumah),
                    penghuni:penghuni_id (nama_kepala_keluarga)
                `)
                .eq('kategori_id', iplCategory.id)
                .gte('tanggal', startDate)
                .lte('tanggal', endDate)
                .order('tanggal');

            if (!iplPayError) {
                result.iplData = iplPayments || [];
            }
        }

        return result;
    } catch (error) {
        console.error('Error getting rekap saldo data:', error);
        throw error;
    }
}

// ============================
// PEMASUKAN REPORTS
// ============================

/**
 * Get rincian pemasukan global
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<Array>} Pemasukan transactions
 */
export async function getRincianPemasukanGlobal(startDate, endDate) {
    try {
        const { data, error } = await supabase
            .from('pemasukan')
            .select(`
                id_transaksi,
                tanggal,
                nominal,
                keterangan,
                penghuni:penghuni_id (nama_kepala_keluarga),
                hunian:hunian_id (nomor_blok_rumah),
                kategori:kategori_id (nama_kategori),
                rekening:rekening_id (jenis_rekening)
            `)
            .gte('tanggal', startDate)
            .lte('tanggal', endDate)
            .order('tanggal', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error getting rincian pemasukan global:', error);
        throw error;
    }
}

/**
 * Get rincian pemasukan per kategori
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @param {string} kategoriId - Category ID (optional)
 * @returns {Promise<Object>} Pemasukan data grouped by category
 */
export async function getRincianPemasukanPerKategori(startDate, endDate, kategoriId = null) {
    try {
        let query = supabase
            .from('pemasukan')
            .select(`
                id_transaksi,
                tanggal,
                nominal,
                keterangan,
                penghuni:penghuni_id (nama_kepala_keluarga),
                hunian:hunian_id (nomor_blok_rumah),
                kategori:kategori_id (nama_kategori),
                rekening:rekening_id (jenis_rekening)
            `)
            .gte('tanggal', startDate)
            .lte('tanggal', endDate)
            .order('tanggal', { ascending: false });

        if (kategoriId) {
            query = query.eq('kategori_id', kategoriId);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Group by category
        const grouped = {};
        let totalNominal = 0;

        (data || []).forEach(item => {
            const catName = item.kategori?.nama_kategori || 'Tidak Berkategori';
            if (!grouped[catName]) {
                grouped[catName] = {
                    nama_kategori: catName,
                    transactions: [],
                    total_nominal: 0
                };
            }
            grouped[catName].transactions.push(item);
            grouped[catName].total_nominal += item.nominal || 0;
            totalNominal += item.nominal || 0;
        });

        return {
            grouped: Object.values(grouped),
            total_nominal: totalNominal,
            transaction_count: data?.length || 0
        };
    } catch (error) {
        console.error('Error getting rincian pemasukan per kategori:', error);
        throw error;
    }
}

// ============================
// PENGELUARAN REPORTS
// ============================

/**
 * Get rincian pengeluaran global
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<Array>} Pengeluaran transactions
 */
export async function getRincianPengeluaranGlobal(startDate, endDate) {
    try {
        const { data, error } = await supabase
            .from('pengeluaran')
            .select(`
                id_transaksi,
                tanggal,
                nominal,
                keterangan,
                penerima,
                kategori:kategori_id (nama_kategori),
                subkategori:subkategori_id (nama_subkategori),
                rekening:rekening_id (jenis_rekening)
            `)
            .gte('tanggal', startDate)
            .lte('tanggal', endDate)
            .order('tanggal', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error getting rincian pengeluaran global:', error);
        throw error;
    }
}

/**
 * Get rincian pengeluaran per kategori
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @param {string} kategoriId - Category ID (optional)
 * @returns {Promise<Object>} Pengeluaran data grouped by category
 */
export async function getRincianPengeluaranPerKategori(startDate, endDate, kategoriId = null) {
    try {
        let query = supabase
            .from('pengeluaran')
            .select(`
                id_transaksi,
                tanggal,
                nominal,
                keterangan,
                penerima,
                kategori:kategori_id (nama_kategori),
                subkategori:subkategori_id (nama_subkategori),
                rekening:rekening_id (jenis_rekening)
            `)
            .gte('tanggal', startDate)
            .lte('tanggal', endDate)
            .order('tanggal', { ascending: false });

        if (kategoriId) {
            query = query.eq('kategori_id', kategoriId);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Group by category
        const grouped = {};
        let totalNominal = 0;

        (data || []).forEach(item => {
            const catName = item.kategori?.nama_kategori || 'Tidak Berkategori';
            if (!grouped[catName]) {
                grouped[catName] = {
                    nama_kategori: catName,
                    transactions: [],
                    total_nominal: 0
                };
            }
            grouped[catName].transactions.push(item);
            grouped[catName].total_nominal += item.nominal || 0;
            totalNominal += item.nominal || 0;
        });

        return {
            grouped: Object.values(grouped),
            total_nominal: totalNominal,
            transaction_count: data?.length || 0
        };
    } catch (error) {
        console.error('Error getting rincian pengeluaran per kategori:', error);
        throw error;
    }
}

// ============================
// PROFIT & LOSS REPORT
// ============================

/**
 * Get laporan laba rugi (Income Statement)
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<Object>} Profit & Loss data
 */
export async function getLaporanLabaRugi(startDate, endDate) {
    try {
        // Get all income
        const { data: pemasukan, error: pemasukanError } = await supabase
            .from('pemasukan')
            .select('nominal, kategori:kategori_id (nama_kategori)')
            .gte('tanggal', startDate)
            .lte('tanggal', endDate);

        if (pemasukanError) throw pemasukanError;

        // Get all expenses
        const { data: pengeluaran, error: pengeluaranError } = await supabase
            .from('pengeluaran')
            .select('nominal, kategori:kategori_id (nama_kategori)')
            .gte('tanggal', startDate)
            .lte('tanggal', endDate);

        if (pengeluaranError) throw pengeluaranError;

        // Calculate totals
        const totalPemasukan = (pemasukan || []).reduce((sum, item) => sum + (item.nominal || 0), 0);
        const totalPengeluaran = (pengeluaran || []).reduce((sum, item) => sum + (item.nominal || 0), 0);
        const labaRugi = totalPemasukan - totalPengeluaran;

        // Group income by category
        const pemasukanByKategori = {};
        (pemasukan || []).forEach(item => {
            const cat = item.kategori?.nama_kategori || 'Lainnya';
            pemasukanByKategori[cat] = (pemasukanByKategori[cat] || 0) + (item.nominal || 0);
        });

        // Group expenses by category
        const pengeluaranByKategori = {};
        (pengeluaran || []).forEach(item => {
            const cat = item.kategori?.nama_kategori || 'Lainnya';
            pengeluaranByKategori[cat] = (pengeluaranByKategori[cat] || 0) + (item.nominal || 0);
        });

        return {
            periode: { startDate, endDate },
            pemasukan: {
                total: totalPemasukan,
                by_kategori: pemasukanByKategori
            },
            pengeluaran: {
                total: totalPengeluaran,
                by_kategori: pengeluaranByKategori
            },
            laba_rugi: labaRugi,
            status: labaRugi >= 0 ? 'Surplus' : 'Defisit'
        };
    } catch (error) {
        console.error('Error getting laporan laba rugi:', error);
        throw error;
    }
}
