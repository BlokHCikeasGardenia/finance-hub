// Operational Reports Queries Module
// Contains database queries for operational reports

import { supabase } from '../../../config.js';

// ============================
// DANA TITIPAN REPORT
// ============================

/**
 * Get dana titipan report
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<Object>} Dana titipan data
 */
export async function getDanaTitipanReport(startDate, endDate) {
    try {
        const { data, error } = await supabase
            .from('dana_titipan')
            .select(`
                id,
                id_transaksi,
                tanggal,
                nominal,
                keterangan,
                penghuni:penghuni_id (
                    nama_kepala_keluarga
                ),
                hunian:hunian_id (
                    nomor_blok_rumah
                ),
                kategori:kategori_id (
                    nama_kategori
                ),
                rekening:rekening_id (
                    jenis_rekening
                )
            `)
            .gte('tanggal', startDate)
            .lte('tanggal', endDate)
            .order('tanggal', { ascending: false });

        if (error) throw error;

        // Calculate summary
        const totalAmount = (data || []).reduce((sum, item) => sum + (item.nominal || 0), 0);
        const countTransactions = data?.length || 0;

        // Group by kategori
        const byKategori = {};
        (data || []).forEach(item => {
            const kategori = item.kategori?.nama_kategori || 'Tidak Berkategori';
            if (!byKategori[kategori]) {
                byKategori[kategori] = { count: 0, total: 0 };
            }
            byKategori[kategori].count++;
            byKategori[kategori].total += item.nominal || 0;
        });

        // Group by rekening
        const byRekening = {};
        (data || []).forEach(item => {
            const rekening = item.rekening?.jenis_rekening || 'Tidak Ditentukan';
            if (!byRekening[rekening]) {
                byRekening[rekening] = { count: 0, total: 0 };
            }
            byRekening[rekening].count++;
            byRekening[rekening].total += item.nominal || 0;
        });

        return {
            period: { startDate, endDate },
            transactions: data || [],
            summary: {
                total_amount: totalAmount,
                total_transactions: countTransactions,
                by_kategori: byKategori,
                by_rekening: byRekening
            }
        };
    } catch (error) {
        console.error('Error getting dana titipan report:', error);
        throw error;
    }
}

// ============================
// PEMINDAHBUKUAN REPORT
// ============================

/**
 * Get pemindahbukuan report
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<Object>} Pemindahbukuan data
 */
export async function getPemindahbukuanReport(startDate, endDate) {
    try {
        const { data, error } = await supabase
            .from('pemindahbukuan')
            .select(`
                id,
                id_transaksi,
                tanggal,
                nominal,
                catatan,
                rekening_dari:rekening_dari_id (
                    jenis_rekening
                ),
                rekening_ke:rekening_ke_id (
                    jenis_rekening
                )
            `)
            .gte('tanggal', startDate)
            .lte('tanggal', endDate)
            .order('tanggal', { ascending: false });

        if (error) throw error;

        // Calculate summary
        const totalAmount = (data || []).reduce((sum, item) => sum + (item.nominal || 0), 0);
        const countTransactions = data?.length || 0;

        // Group by rekening dari
        const byRekeningDari = {};
        (data || []).forEach(item => {
            const rekening = item.rekening_dari?.jenis_rekening || 'Tidak Ditentukan';
            if (!byRekeningDari[rekening]) {
                byRekeningDari[rekening] = { count: 0, total: 0 };
            }
            byRekeningDari[rekening].count++;
            byRekeningDari[rekening].total += item.nominal || 0;
        });

        // Group by rekening ke
        const byRekeningKe = {};
        (data || []).forEach(item => {
            const rekening = item.rekening_ke?.jenis_rekening || 'Tidak Ditentukan';
            if (!byRekeningKe[rekening]) {
                byRekeningKe[rekening] = { count: 0, total: 0 };
            }
            byRekeningKe[rekening].count++;
            byRekeningKe[rekening].total += item.nominal || 0;
        });

        // Most active rekening pairs
        const rekeningPairs = {};
        (data || []).forEach(item => {
            const pair = (item.rekening_dari?.jenis_rekening || 'Unknown') + ' → ' +
                        (item.rekening_ke?.jenis_rekening || 'Unknown');
            if (!rekeningPairs[pair]) {
                rekeningPairs[pair] = { count: 0, total: 0 };
            }
            rekeningPairs[pair].count++;
            rekeningPairs[pair].total += item.nominal || 0;
        });

        return {
            period: { startDate, endDate },
            transactions: data || [],
            summary: {
                total_amount: totalAmount,
                total_transactions: countTransactions,
                by_rekening_dari: byRekeningDari,
                by_rekening_ke: byRekeningKe,
                rekening_pairs: rekeningPairs
            }
        };
    } catch (error) {
        console.error('Error getting pemindahbukuan report:', error);
        throw error;
    }
}

// ============================
// NERACA (BALANCE SHEET)
// ============================

/**
 * Get neraca (balance sheet) report
 * @param {string} asOfDate - Date for balance calculation (YYYY-MM-DD)
 * @returns {Promise<Object>} Balance sheet data
 */
export async function getNeracaReport(asOfDate) {
    try {
        // Get all rekening with their current balances
        const { data: rekeningData, error: rekeningError } = await supabase
            .from('rekening')
            .select('id, jenis_rekening, saldo_awal')
            .order('jenis_rekening');

        if (rekeningError) throw rekeningError;

        const balanceSheet = {
            assets: {},
            liabilities: {},
            equity: {},
            total_assets: 0,
            total_liabilities: 0,
            total_equity: 0
        };

        for (const rekening of rekeningData || []) {
            // Calculate balance as of date
            const balance = await calculateRekeningBalance(rekening.id, asOfDate);
            const totalBalance = rekening.saldo_awal + balance.net_balance;

            // Categorize rekening (simplified categorization)
            if (rekening.jenis_rekening.toLowerCase().includes('kas') ||
                rekening.jenis_rekening.toLowerCase().includes('bank')) {
                balanceSheet.assets[rekening.jenis_rekening] = totalBalance;
                balanceSheet.total_assets += totalBalance;
            } else if (rekening.jenis_rekening.toLowerCase().includes('utang') ||
                      rekening.jenis_rekening.toLowerCase().includes('pinjaman')) {
                balanceSheet.liabilities[rekening.jenis_rekening] = totalBalance;
                balanceSheet.total_liabilities += totalBalance;
            } else {
                // Default to equity for other accounts
                balanceSheet.equity[rekening.jenis_rekening] = totalBalance;
                balanceSheet.total_equity += totalBalance;
            }
        }

        return {
            as_of_date: asOfDate,
            balance_sheet: balanceSheet,
            net_worth: balanceSheet.total_assets - balanceSheet.total_liabilities
        };
    } catch (error) {
        console.error('Error getting neraca report:', error);
        throw error;
    }
}

// Helper function to calculate rekening balance
async function calculateRekeningBalance(rekeningId, asOfDate) {
    try {
        // Calculate pemasukan
        const { data: pemasukan, error: pemasukanError } = await supabase
            .from('pemasukan')
            .select('nominal')
            .eq('rekening_id', rekeningId)
            .lte('tanggal', asOfDate);

        if (pemasukanError) throw pemasukanError;

        // Calculate pengeluaran
        const { data: pengeluaran, error: pengeluaranError } = await supabase
            .from('pengeluaran')
            .select('nominal')
            .eq('rekening_id', rekeningId)
            .lte('tanggal', asOfDate);

        if (pengeluaranError) throw pengeluaranError;

        // Calculate pemindahbukuan dari rekening ini
        const { data: transferDari, error: transferDariError } = await supabase
            .from('pemindahbukuan')
            .select('nominal')
            .eq('rekening_dari_id', rekeningId)
            .lte('tanggal', asOfDate);

        if (transferDariError) throw transferDariError;

        // Calculate pemindahbukuan ke rekening ini
        const { data: transferKe, error: transferKeError } = await supabase
            .from('pemindahbukuan')
            .select('nominal')
            .eq('rekening_ke_id', rekeningId)
            .lte('tanggal', asOfDate);

        if (transferKeError) throw transferKeError;

        // Calculate dana titipan
        const { data: danaTitipan, error: danaTitipanError } = await supabase
            .from('dana_titipan')
            .select('nominal')
            .eq('rekening_id', rekeningId)
            .lte('tanggal', asOfDate);

        if (danaTitipanError) throw danaTitipanError;

        const totalPemasukan = (pemasukan || []).reduce((sum, item) => sum + (item.nominal || 0), 0);
        const totalPengeluaran = (pengeluaran || []).reduce((sum, item) => sum + (item.nominal || 0), 0);
        const totalTransferDari = (transferDari || []).reduce((sum, item) => sum + (item.nominal || 0), 0);
        const totalTransferKe = (transferKe || []).reduce((sum, item) => sum + (item.nominal || 0), 0);
        const totalDanaTitipan = (danaTitipan || []).reduce((sum, item) => sum + (item.nominal || 0), 0);

        const netBalance = totalPemasukan + totalDanaTitipan + totalTransferKe -
                          (totalPengeluaran + totalTransferDari);

        return {
            pemasukan: totalPemasukan,
            pengeluaran: totalPengeluaran,
            transfer_dari: totalTransferDari,
            transfer_ke: totalTransferKe,
            dana_titipan: totalDanaTitipan,
            net_balance: netBalance
        };
    } catch (error) {
        console.error('Error calculating rekening balance:', error);
        throw error;
    }
}

// ============================
// ARUS KAS (CASH FLOW)
// ============================

/**
 * Get arus kas (cash flow) report
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<Object>} Cash flow data
 */
export async function getArusKasReport(startDate, endDate) {
    try {
        // Get all rekening kas/bank
        const { data: rekeningKas, error: rekeningError } = await supabase
            .from('rekening')
            .select('id, jenis_rekening')
            .or('jenis_rekening.ilike.%kas%,jenis_rekening.ilike.%bank%');

        if (rekeningError) throw rekeningError;

        const cashFlow = {
            operating_activities: {},
            investing_activities: {},
            financing_activities: {},
            net_cash_flow: 0,
            beginning_cash: 0,
            ending_cash: 0
        };

        // Calculate cash flows for each rekening
        for (const rekening of rekeningKas || []) {
            const beginningBalance = await calculateRekeningBalance(rekening.id, startDate);
            const endingBalance = await calculateRekeningBalance(rekening.id, endDate);

            // Calculate cash flows during period
            const periodFlows = await calculatePeriodCashFlows(rekening.id, startDate, endDate);

            cashFlow.operating_activities[rekening.jenis_rekening] = {
                inflows: periodFlows.inflows,
                outflows: periodFlows.outflows,
                net: periodFlows.net
            };

            cashFlow.net_cash_flow += periodFlows.net;
        }

        // Calculate beginning and ending cash positions
        const totalBeginningCash = rekeningKas.reduce(async (sum, rekening) => {
            const balance = await calculateRekeningBalance(rekening.id, startDate);
            return sum + rekening.saldo_awal + balance.net_balance;
        }, 0);

        const totalEndingCash = rekeningKas.reduce(async (sum, rekening) => {
            const balance = await calculateRekeningBalance(rekening.id, endDate);
            return sum + rekening.saldo_awal + balance.net_balance;
        }, 0);

        // For simplicity, we'll use a basic classification
        // In a real implementation, you'd have more sophisticated categorization
        cashFlow.beginning_cash = await totalBeginningCash;
        cashFlow.ending_cash = await totalEndingCash;

        return {
            period: { startDate, endDate },
            cash_flow_statement: cashFlow
        };
    } catch (error) {
        console.error('Error getting arus kas report:', error);
        throw error;
    }
}

// Helper function to calculate period cash flows
async function calculatePeriodCashFlows(rekeningId, startDate, endDate) {
    try {
        // Operating inflows (pemasukan + dana titipan)
        const { data: inflows, error: inflowsError } = await supabase
            .from('pemasukan')
            .select('nominal')
            .eq('rekening_id', rekeningId)
            .gte('tanggal', startDate)
            .lte('tanggal', endDate);

        if (inflowsError) throw inflowsError;

        const { data: danaTitipan, error: danaTitipanError } = await supabase
            .from('dana_titipan')
            .select('nominal')
            .eq('rekening_id', rekeningId)
            .gte('tanggal', startDate)
            .lte('tanggal', endDate);

        if (danaTitipanError) throw danaTitipanError;

        // Operating outflows (pengeluaran)
        const { data: outflows, error: outflowsError } = await supabase
            .from('pengeluaran')
            .select('nominal')
            .eq('rekening_id', rekeningId)
            .gte('tanggal', startDate)
            .lte('tanggal', endDate);

        if (outflowsError) throw outflowsError;

        // Transfer inflows (from other accounts)
        const { data: transferIn, error: transferInError } = await supabase
            .from('pemindahbukuan')
            .select('nominal')
            .eq('rekening_ke_id', rekeningId)
            .gte('tanggal', startDate)
            .lte('tanggal', endDate);

        if (transferInError) throw transferInError;

        // Transfer outflows (to other accounts)
        const { data: transferOut, error: transferOutError } = await supabase
            .from('pemindahbukuan')
            .select('nominal')
            .eq('rekening_dari_id', rekeningId)
            .gte('tanggal', startDate)
            .lte('tanggal', endDate);

        if (transferOutError) throw transferOutError;

        const totalInflows = (inflows || []).reduce((sum, item) => sum + (item.nominal || 0), 0) +
                           (danaTitipan || []).reduce((sum, item) => sum + (item.nominal || 0), 0) +
                           (transferIn || []).reduce((sum, item) => sum + (item.nominal || 0), 0);

        const totalOutflows = (outflows || []).reduce((sum, item) => sum + (item.nominal || 0), 0) +
                            (transferOut || []).reduce((sum, item) => sum + (item.nominal || 0), 0);

        return {
            inflows: totalInflows,
            outflows: totalOutflows,
            net: totalInflows - totalOutflows
        };
    } catch (error) {
        console.error('Error calculating period cash flows:', error);
        throw error;
    }
}
