// Balance calculation utilities
// Shared functions for calculating balances across categories and accounts

import { supabase } from '../config.js';

async function calculateTotalSaldo() {
    try {
        // Get total from accounts (rekening) - this is typically the main total
        const { data: rekeningData, error: rekeningError } = await supabase
            .from('rekening')
            .select('id, saldo_awal');

        if (rekeningError) throw rekeningError;

        let totalSaldoRekening = 0;
        for (const rekening of rekeningData || []) {
            const saldoAwal = rekening.saldo_awal || 0;

            // Calculate pemasukan to this account
            const { data: pemasukanData } = await supabase
                .from('pemasukan')
                .select('nominal')
                .eq('rekening_id', rekening.id);

            const totalPemasukan = (pemasukanData || []).reduce((sum, item) => sum + (item.nominal || 0), 0);

            // Calculate pengeluaran from this account
            const { data: pengeluaranData } = await supabase
                .from('pengeluaran')
                .select('nominal')
                .eq('rekening_id', rekening.id);

            const totalPengeluaran = (pengeluaranData || []).reduce((sum, item) => sum + (item.nominal || 0), 0);

            // Calculate transfers to/from this account
            const { data: transferMasuk } = await supabase
                .from('pemindahbukuan')
                .select('nominal')
                .eq('rekening_ke_id', rekening.id);

            const totalTransferMasuk = (transferMasuk || []).reduce((sum, item) => sum + (item.nominal || 0), 0);

            const { data: transferKeluar } = await supabase
                .from('pemindahbukuan')
                .select('nominal')
                .eq('rekening_dari_id', rekening.id);

            const totalTransferKeluar = (transferKeluar || []).reduce((sum, item) => sum + (item.nominal || 0), 0);

            const saldoAkhir = saldoAwal + totalPemasukan - totalPengeluaran + totalTransferMasuk - totalTransferKeluar;
            totalSaldoRekening += saldoAkhir;
        }

        return {
            total: totalSaldoRekening,
            consistency: {
                message: totalSaldoRekening !== 0 ? 'Saldo terdapat di rekening' : 'Tidak ada saldo'
            }
        };

    } catch (error) {
        console.error('Error calculating total saldo:', error);
        return {
            total: 0,
            consistency: { message: 'Error menghitung saldo' }
        };
    }
}

// Calculate detailed balance for each category
async function calculateDetailedKategoriSaldo() {
    try {
        const { data: kategoriData, error: kategoriError } = await supabase
            .from('kategori_saldo')
            .select('id, nama_kategori, saldo_awal, keterangan');

        if (kategoriError) throw kategoriError;

        const detailedResults = [];

        for (const kategori of kategoriData) {
            const saldoAwal = kategori.saldo_awal || 0;

            // Calculate total pemasukan for this category
            const { data: pemasukanData } = await supabase
                .from('pemasukan')
                .select('nominal')
                .eq('kategori_id', kategori.id);

            const totalPemasukan = pemasukanData.reduce((sum, item) => sum + (item.nominal || 0), 0);

            // Calculate total pengeluaran for this category
            const { data: pengeluaranData } = await supabase
                .from('pengeluaran')
                .select('nominal')
                .eq('kategori_id', kategori.id);

            const totalPengeluaran = pengeluaranData.reduce((sum, item) => sum + (item.nominal || 0), 0);

            // Calculate saldo akhir for this category
            const saldoAkhir = saldoAwal + totalPemasukan - totalPengeluaran;

            detailedResults.push({
                nama_kategori: kategori.nama_kategori,
                saldo_awal: saldoAwal,
                total_pemasukan: totalPemasukan,
                total_pengeluaran: totalPengeluaran,
                saldo_akhir: saldoAkhir,
                keterangan: kategori.keterangan || '-'
            });
        }

        return detailedResults;
    } catch (error) {
        console.error('Error calculating detailed kategori saldo:', error);
        return [];
    }
}

// Calculate detailed balance for each account
async function calculateDetailedRekeningSaldo() {
    try {
        const { data: rekeningData, error: rekeningError } = await supabase
            .from('rekening')
            .select('id, jenis_rekening, saldo_awal');

        if (rekeningError) throw rekeningError;

        const detailedResults = [];

        for (const rekening of rekeningData) {
            const saldoAwal = rekening.saldo_awal || 0;

            // Calculate total pemasukan to this account
            const { data: pemasukanData } = await supabase
                .from('pemasukan')
                .select('nominal')
                .eq('rekening_id', rekening.id);
            const totalPemasukan = pemasukanData.reduce((sum, item) => sum + (item.nominal || 0), 0);

            // Calculate total pengeluaran from this account
            const { data: pengeluaranData } = await supabase
                .from('pengeluaran')
                .select('nominal')
                .eq('rekening_id', rekening.id);
            const totalPengeluaran = pengeluaranData.reduce((sum, item) => sum + (item.nominal || 0), 0);

            // Calculate total transfers to/from this account
            const { data: transferMasukData } = await supabase
                .from('pemindahbukuan')
                .select('nominal')
                .eq('rekening_ke_id', rekening.id);
            const totalTransferMasuk = transferMasukData.reduce((sum, item) => sum + (item.nominal || 0), 0);

            const { data: transferKeluarData } = await supabase
                .from('pemindahbukuan')
                .select('nominal')
                .eq('rekening_dari_id', rekening.id);
            const totalTransferKeluar = transferKeluarData.reduce((sum, item) => sum + (item.nominal || 0), 0);

            // Calculate total dana titipan in this account
            const { data: danaTitipanData } = await supabase
                .from('dana_titipan')
                .select('nominal')
                .eq('rekening_id', rekening.id);
            const totalDanaTitipan = danaTitipanData.reduce((sum, item) => sum + (item.nominal || 0), 0);

            // Calculate saldo akhir for this account
            const saldoAkhir = saldoAwal + totalPemasukan - totalPengeluaran + totalTransferMasuk - totalTransferKeluar + totalDanaTitipan;

            detailedResults.push({
                jenis_rekening: rekening.jenis_rekening,
                saldo_awal: saldoAwal,
                total_pemasukan: totalPemasukan,
                total_pengeluaran: totalPengeluaran,
                total_transfer_masuk: totalTransferMasuk,
                total_transfer_keluar: totalTransferKeluar,
                total_dana_titipan: totalDanaTitipan,
                saldo_akhir: saldoAkhir
            });
        }

        return detailedResults;
    } catch (error) {
        console.error('Error calculating detailed rekening saldo:', error);
        return [];
    }
}

export {
    calculateTotalSaldo,
    calculateDetailedKategoriSaldo,
    calculateDetailedRekeningSaldo
};
