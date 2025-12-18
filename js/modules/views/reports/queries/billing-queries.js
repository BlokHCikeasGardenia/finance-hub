// Billing & Payment Report Queries Module
// Contains database queries for billing and payment reports

import { supabase } from '../../../config.js';

// ============================
// OUTSTANDING TAGIHAN IPL
// ============================

/**
 * Get outstanding IPL bills (belum lunas)
 * @param {string} periodeId - Periode ID (optional, null for all periods)
 * @returns {Promise<Object>} Outstanding IPL bills data
 */
export async function getOutstandingIPL(periodeId = null) {
    try {
        let query = supabase
            .from('tagihan_ipl')
            .select(`
                id,
                nominal_tagihan,
                sisa_tagihan,
                status,
                tanggal_tagihan,
                tanggal_jatuh_tempo,
                periode:periode_id (
                    nama_periode,
                    tanggal_awal,
                    tanggal_akhir
                ),
                hunian:hunian_id (
                    nomor_blok_rumah,
                    penghuni_saat_ini:penghuni_saat_ini_id (
                        nama_kepala_keluarga
                    )
                )
            `)
            .eq('status', 'belum_bayar')
            .gt('sisa_tagihan', 0);

        if (periodeId) {
            query = query.eq('periode_id', periodeId);
        }

        const { data, error } = await query.order('tanggal_jatuh_tempo', { ascending: true });

        if (error) throw error;

        // Calculate summary
        const totalOutstanding = (data || []).reduce((sum, item) => sum + (item.sisa_tagihan || 0), 0);
        const countBills = data?.length || 0;

        // Group by status
        const overdueCount = (data || []).filter(item =>
            item.tanggal_jatuh_tempo && new Date(item.tanggal_jatuh_tempo) < new Date()
        ).length;

        return {
            bills: data || [],
            summary: {
                total_outstanding: totalOutstanding,
                total_bills: countBills,
                overdue_count: overdueCount,
                on_time_count: countBills - overdueCount
            }
        };
    } catch (error) {
        console.error('Error getting outstanding IPL:', error);
        throw error;
    }
}

// ============================
// OUTSTANDING TAGIHAN AIR
// ============================

/**
 * Get outstanding water bills (belum lunas)
 * @param {string} periodeId - Periode ID (optional, null for all periods)
 * @returns {Promise<Object>} Outstanding water bills data
 */
export async function getOutstandingAir(periodeId = null) {
    try {
        let query = supabase
            .from('tagihan_air')
            .select(`
                id,
                pemakaian_m3,
                tarif_per_kubik,
                nominal_tagihan,
                sisa_tagihan,
                status,
                tanggal_tagihan,
                tanggal_jatuh_tempo,
                periode:periode_id (
                    nama_periode,
                    tanggal_awal,
                    tanggal_akhir
                ),
                hunian:hunian_id (
                    nomor_blok_rumah,
                    penghuni_saat_ini:penghuni_saat_ini_id (
                        nama_kepala_keluarga
                    )
                )
            `)
            .eq('status', 'belum_bayar')
            .gt('sisa_tagihan', 0);

        if (periodeId) {
            query = query.eq('periode_id', periodeId);
        }

        const { data, error } = await query.order('tanggal_jatuh_tempo', { ascending: true });

        if (error) throw error;

        // Calculate summary
        const totalOutstanding = (data || []).reduce((sum, item) => sum + (item.sisa_tagihan || 0), 0);
        const countBills = data?.length || 0;
        const totalUsage = (data || []).reduce((sum, item) => sum + (item.pemakaian_m3 || 0), 0);

        // Group by status
        const overdueCount = (data || []).filter(item =>
            item.tanggal_jatuh_tempo && new Date(item.tanggal_jatuh_tempo) < new Date()
        ).length;

        return {
            bills: data || [],
            summary: {
                total_outstanding: totalOutstanding,
                total_bills: countBills,
                total_usage_m3: totalUsage,
                overdue_count: overdueCount,
                on_time_count: countBills - overdueCount
            }
        };
    } catch (error) {
        console.error('Error getting outstanding air:', error);
        throw error;
    }
}

// ============================
// LAPORAN PEMBAYARAN TERLAMBAT
// ============================

/**
 * Get late payment report
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<Object>} Late payment analysis
 */
export async function getLatePaymentReport(startDate, endDate) {
    try {
        // Get all bills with due dates in the period
        const { data: iplBills, error: iplError } = await supabase
            .from('tagihan_ipl')
            .select(`
                id,
                nominal_tagihan,
                sisa_tagihan,
                status,
                tanggal_tagihan,
                tanggal_jatuh_tempo,
                periode:periode_id (nama_periode),
                hunian:hunian_id (
                    nomor_blok_rumah,
                    penghuni_saat_ini:penghuni_saat_ini_id (
                        nama_kepala_keluarga
                    )
                )
            `)
            .gte('tanggal_jatuh_tempo', startDate)
            .lte('tanggal_jatuh_tempo', endDate);

        if (iplError) throw iplError;

        const { data: airBills, error: airError } = await supabase
            .from('tagihan_air')
            .select(`
                id,
                nominal_tagihan,
                sisa_tagihan,
                status,
                tanggal_tagihan,
                tanggal_jatuh_tempo,
                periode:periode_id (nama_periode),
                hunian:hunian_id (
                    nomor_blok_rumah,
                    penghuni_saat_ini:penghuni_saat_ini_id (
                        nama_kepala_keluarga
                    )
                )
            `)
            .gte('tanggal_jatuh_tempo', startDate)
            .lte('tanggal_jatuh_tempo', endDate);

        if (airError) throw airError;

        // Combine and analyze
        const allBills = [
            ...(iplBills || []).map(bill => ({ ...bill, type: 'IPL' })),
            ...(airBills || []).map(bill => ({ ...bill, type: 'Air' }))
        ];

        const today = new Date();

        // Categorize bills
        const onTimePaid = allBills.filter(bill =>
            bill.status === 'lunas' &&
            bill.tanggal_jatuh_tempo &&
            new Date(bill.tanggal_jatuh_tempo) >= today
        );

        const latePaid = allBills.filter(bill =>
            bill.status === 'lunas' &&
            bill.tanggal_jatuh_tempo &&
            new Date(bill.tanggal_jatuh_tempo) < today
        );

        const overdueUnpaid = allBills.filter(bill =>
            bill.status !== 'lunas' &&
            bill.tanggal_jatuh_tempo &&
            new Date(bill.tanggal_jatuh_tempo) < today
        );

        // Calculate metrics
        const totalBills = allBills.length;
        const paidOnTime = onTimePaid.length;
        const paidLate = latePaid.length;
        const unpaidOverdue = overdueUnpaid.length;

        const onTimeRate = totalBills > 0 ? (paidOnTime / totalBills * 100) : 0;
        const latePaymentRate = totalBills > 0 ? (paidLate / totalBills * 100) : 0;

        // Group by penghuni for recurring late payers
        const penghuniStats = {};
        [...latePaid, ...overdueUnpaid].forEach(bill => {
            const penghuniId = bill.hunian?.penghuni_saat_ini?.nama_kepala_keluarga || 'Unknown';
            if (!penghuniStats[penghuniId]) {
                penghuniStats[penghuniId] = {
                    name: penghuniId,
                    late_payments: 0,
                    overdue_unpaid: 0,
                    total_amount: 0
                };
            }
            if (bill.status === 'lunas') {
                penghuniStats[penghuniId].late_payments++;
            } else {
                penghuniStats[penghuniId].overdue_unpaid++;
            }
            penghuniStats[penghuniId].total_amount += bill.sisa_tagihan || 0;
        });

        return {
            period: { startDate, endDate },
            summary: {
                total_bills: totalBills,
                paid_on_time: paidOnTime,
                paid_late: paidLate,
                unpaid_overdue: unpaidOverdue,
                on_time_rate: onTimeRate,
                late_payment_rate: latePaymentRate
            },
            detailed: {
                on_time_paid: onTimePaid,
                late_paid: latePaid,
                overdue_unpaid: overdueUnpaid
            },
            penghuni_stats: Object.values(penghuniStats).sort((a, b) =>
                (b.late_payments + b.overdue_unpaid) - (a.late_payments + a.overdue_unpaid)
            )
        };
    } catch (error) {
        console.error('Error getting late payment report:', error);
        throw error;
    }
}

// ============================
// EFEKTIVITAS KOLEKSI
// ============================

/**
 * Get collection effectiveness report
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<Object>} Collection effectiveness analysis
 */
export async function getCollectionEffectiveness(startDate, endDate) {
    try {
        // Get IPL collection data
        const { data: iplBills, error: iplError } = await supabase
            .from('tagihan_ipl')
            .select(`
                id,
                nominal_tagihan,
                sisa_tagihan,
                status,
                tanggal_tagihan,
                tanggal_jatuh_tempo,
                periode:periode_id (nama_periode)
            `)
            .gte('tanggal_tagihan', startDate)
            .lte('tanggal_tagihan', endDate);

        if (iplError) throw iplError;

        // Get Air collection data
        const { data: airBills, error: airError } = await supabase
            .from('tagihan_air')
            .select(`
                id,
                nominal_tagihan,
                sisa_tagihan,
                status,
                tanggal_tagihan,
                tanggal_jatuh_tempo,
                periode:periode_id (nama_periode)
            `)
            .gte('tanggal_tagihan', startDate)
            .lte('tanggal_tagihan', endDate);

        if (airError) throw airError;

        // Calculate IPL effectiveness
        const iplTotalBilled = (iplBills || []).reduce((sum, bill) => sum + (bill.nominal_tagihan || 0), 0);
        const iplTotalCollected = (iplBills || []).reduce((sum, bill) =>
            sum + ((bill.nominal_tagihan || 0) - (bill.sisa_tagihan || 0)), 0);
        const iplFullyPaid = (iplBills || []).filter(bill => bill.status === 'lunas').length;
        const iplTotalBills = iplBills?.length || 0;

        // Calculate Air effectiveness
        const airTotalBilled = (airBills || []).reduce((sum, bill) => sum + (bill.nominal_tagihan || 0), 0);
        const airTotalCollected = (airBills || []).reduce((sum, bill) =>
            sum + ((bill.nominal_tagihan || 0) - (bill.sisa_tagihan || 0)), 0);
        const airFullyPaid = (airBills || []).filter(bill => bill.status === 'lunas').length;
        const airTotalBills = airBills?.length || 0;

        // Overall effectiveness
        const totalBilled = iplTotalBilled + airTotalBilled;
        const totalCollected = iplTotalCollected + airTotalCollected;
        const overallEffectiveness = totalBilled > 0 ? (totalCollected / totalBilled * 100) : 0;

        // Group by periode
        const periodeStats = {};
        [...(iplBills || []), ...(airBills || [])].forEach(bill => {
            const periodeName = bill.periode?.nama_periode || 'Unknown';
            if (!periodeStats[periodeName]) {
                periodeStats[periodeName] = {
                    periode: periodeName,
                    ipl_billed: 0,
                    ipl_collected: 0,
                    air_billed: 0,
                    air_collected: 0,
                    total_billed: 0,
                    total_collected: 0
                };
            }

            const billed = bill.nominal_tagihan || 0;
            const collected = billed - (bill.sisa_tagihan || 0);

            if (bill.periode?.nama_periode) {
                // IPL bill
                periodeStats[periodeName].ipl_billed += billed;
                periodeStats[periodeName].ipl_collected += collected;
            } else {
                // Air bill
                periodeStats[periodeName].air_billed += billed;
                periodeStats[periodeName].air_collected += collected;
            }

            periodeStats[periodeName].total_billed += billed;
            periodeStats[periodeName].total_collected += collected;
        });

        return {
            period: { startDate, endDate },
            overall: {
                total_billed: totalBilled,
                total_collected: totalCollected,
                effectiveness_rate: overallEffectiveness,
                total_bills: iplTotalBills + airTotalBills,
                fully_paid_bills: iplFullyPaid + airFullyPaid
            },
            by_service: {
                ipl: {
                    total_billed: iplTotalBilled,
                    total_collected: iplTotalCollected,
                    effectiveness_rate: iplTotalBilled > 0 ? (iplTotalCollected / iplTotalBilled * 100) : 0,
                    total_bills: iplTotalBills,
                    fully_paid: iplFullyPaid
                },
                air: {
                    total_billed: airTotalBilled,
                    total_collected: airTotalCollected,
                    effectiveness_rate: airTotalBilled > 0 ? (airTotalCollected / airTotalBilled * 100) : 0,
                    total_bills: airTotalBills,
                    fully_paid: airFullyPaid
                }
            },
            by_periode: Object.values(periodeStats).map(stat => ({
                ...stat,
                effectiveness_rate: stat.total_billed > 0 ? (stat.total_collected / stat.total_billed * 100) : 0
            })).sort((a, b) => a.periode.localeCompare(b.periode))
        };
    } catch (error) {
        console.error('Error getting collection effectiveness:', error);
        throw error;
    }
}
