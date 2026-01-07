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

        if (!rekeningData || rekeningData.length === 0) {
            return {
                total: 0,
                consistency: { message: 'Tidak ada rekening' }
            };
        }

        const rekeningIds = rekeningData.map(r => r.id);

        // Fetch all data in parallel using batch queries (WHERE IN clause)
        const [
            { data: pemasukanData },
            { data: pengeluaranData },
            { data: transferMasukData },
            { data: transferKeluarData }
        ] = await Promise.all([
            supabase.from('pemasukan').select('rekening_id, nominal').in('rekening_id', rekeningIds),
            supabase.from('pengeluaran').select('rekening_id, nominal').in('rekening_id', rekeningIds),
            supabase.from('pemindahbukuan').select('rekening_ke_id, nominal').in('rekening_ke_id', rekeningIds),
            supabase.from('pemindahbukuan').select('rekening_dari_id, nominal').in('rekening_dari_id', rekeningIds)
        ]);

        // Group data by rekening_id for efficient lookup
        const pemasukanByRekening = {};
        const pengeluaranByRekening = {};
        const transferMasukByRekening = {};
        const transferKeluarByRekening = {};

        (pemasukanData || []).forEach(item => {
            if (!pemasukanByRekening[item.rekening_id]) pemasukanByRekening[item.rekening_id] = [];
            pemasukanByRekening[item.rekening_id].push(item.nominal || 0);
        });

        (pengeluaranData || []).forEach(item => {
            if (!pengeluaranByRekening[item.rekening_id]) pengeluaranByRekening[item.rekening_id] = [];
            pengeluaranByRekening[item.rekening_id].push(item.nominal || 0);
        });

        (transferMasukData || []).forEach(item => {
            if (!transferMasukByRekening[item.rekening_ke_id]) transferMasukByRekening[item.rekening_ke_id] = [];
            transferMasukByRekening[item.rekening_ke_id].push(item.nominal || 0);
        });

        (transferKeluarData || []).forEach(item => {
            if (!transferKeluarByRekening[item.rekening_dari_id]) transferKeluarByRekening[item.rekening_dari_id] = [];
            transferKeluarByRekening[item.rekening_dari_id].push(item.nominal || 0);
        });

        // Calculate total saldo
        let totalSaldoRekening = 0;
        for (const rekening of rekeningData) {
            const saldoAwal = rekening.saldo_awal || 0;
            const totalPemasukan = (pemasukanByRekening[rekening.id] || []).reduce((a, b) => a + b, 0);
            const totalPengeluaran = (pengeluaranByRekening[rekening.id] || []).reduce((a, b) => a + b, 0);
            const totalTransferMasuk = (transferMasukByRekening[rekening.id] || []).reduce((a, b) => a + b, 0);
            const totalTransferKeluar = (transferKeluarByRekening[rekening.id] || []).reduce((a, b) => a + b, 0);

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

        if (!kategoriData || kategoriData.length === 0) {
            return [];
        }

        const kategoriIds = kategoriData.map(k => k.id);

        // Fetch all data in parallel using batch queries (WHERE IN clause)
        const [
            { data: pemasukanData },
            { data: pengeluaranData }
        ] = await Promise.all([
            supabase.from('pemasukan').select('kategori_id, nominal').in('kategori_id', kategoriIds),
            supabase.from('pengeluaran').select('kategori_id, nominal').in('kategori_id', kategoriIds)
        ]);

        // Group data by kategori_id for efficient lookup
        const pemasukanByKategori = {};
        const pengeluaranByKategori = {};

        (pemasukanData || []).forEach(item => {
            if (!pemasukanByKategori[item.kategori_id]) pemasukanByKategori[item.kategori_id] = [];
            pemasukanByKategori[item.kategori_id].push(item.nominal || 0);
        });

        (pengeluaranData || []).forEach(item => {
            if (!pengeluaranByKategori[item.kategori_id]) pengeluaranByKategori[item.kategori_id] = [];
            pengeluaranByKategori[item.kategori_id].push(item.nominal || 0);
        });

        // Calculate saldo for each category
        const detailedResults = [];
        for (const kategori of kategoriData) {
            const saldoAwal = kategori.saldo_awal || 0;
            const totalPemasukan = (pemasukanByKategori[kategori.id] || []).reduce((a, b) => a + b, 0);
            const totalPengeluaran = (pengeluaranByKategori[kategori.id] || []).reduce((a, b) => a + b, 0);
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

        if (!rekeningData || rekeningData.length === 0) {
            return [];
        }

        const rekeningIds = rekeningData.map(r => r.id);

        // Fetch all data in parallel using batch queries (WHERE IN clause)
        const [
            { data: pemasukanData },
            { data: pengeluaranData },
            { data: transferMasukData },
            { data: transferKeluarData },
            { data: danaTitipanData }
        ] = await Promise.all([
            supabase.from('pemasukan').select('rekening_id, nominal').in('rekening_id', rekeningIds),
            supabase.from('pengeluaran').select('rekening_id, nominal').in('rekening_id', rekeningIds),
            supabase.from('pemindahbukuan').select('rekening_ke_id, nominal').in('rekening_ke_id', rekeningIds),
            supabase.from('pemindahbukuan').select('rekening_dari_id, nominal').in('rekening_dari_id', rekeningIds),
            supabase.from('dana_titipan').select('rekening_id, nominal').in('rekening_id', rekeningIds)
        ]);

        // Group data by rekening_id for efficient lookup
        const pemasukanByRekening = {};
        const pengeluaranByRekening = {};
        const transferMasukByRekening = {};
        const transferKeluarByRekening = {};
        const danaTitipanByRekening = {};

        (pemasukanData || []).forEach(item => {
            if (!pemasukanByRekening[item.rekening_id]) pemasukanByRekening[item.rekening_id] = [];
            pemasukanByRekening[item.rekening_id].push(item.nominal || 0);
        });

        (pengeluaranData || []).forEach(item => {
            if (!pengeluaranByRekening[item.rekening_id]) pengeluaranByRekening[item.rekening_id] = [];
            pengeluaranByRekening[item.rekening_id].push(item.nominal || 0);
        });

        (transferMasukData || []).forEach(item => {
            if (!transferMasukByRekening[item.rekening_ke_id]) transferMasukByRekening[item.rekening_ke_id] = [];
            transferMasukByRekening[item.rekening_ke_id].push(item.nominal || 0);
        });

        (transferKeluarData || []).forEach(item => {
            if (!transferKeluarByRekening[item.rekening_dari_id]) transferKeluarByRekening[item.rekening_dari_id] = [];
            transferKeluarByRekening[item.rekening_dari_id].push(item.nominal || 0);
        });

        (danaTitipanData || []).forEach(item => {
            if (!danaTitipanByRekening[item.rekening_id]) danaTitipanByRekening[item.rekening_id] = [];
            danaTitipanByRekening[item.rekening_id].push(item.nominal || 0);
        });

        // Calculate saldo for each rekening
        const detailedResults = [];
        for (const rekening of rekeningData) {
            const saldoAwal = rekening.saldo_awal || 0;
            const totalPemasukan = (pemasukanByRekening[rekening.id] || []).reduce((a, b) => a + b, 0);
            const totalPengeluaran = (pengeluaranByRekening[rekening.id] || []).reduce((a, b) => a + b, 0);
            const totalTransferMasuk = (transferMasukByRekening[rekening.id] || []).reduce((a, b) => a + b, 0);
            const totalTransferKeluar = (transferKeluarByRekening[rekening.id] || []).reduce((a, b) => a + b, 0);
            const totalDanaTitipan = (danaTitipanByRekening[rekening.id] || []).reduce((a, b) => a + b, 0);
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
