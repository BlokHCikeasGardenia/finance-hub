// Meteran Air Billing data operations module
// Consolidated module handling both meter readings and billing in a single table
// Replaces the separate meteran_air and tagihan_air modules

import { supabase } from '../../config.js';
import { showToast } from '../../utils.js';
import {
    createRecord,
    updateRecord,
    deleteRecord,
    readRecords
} from '../../crud.js';
import { getTarifAirForDate } from '../../entities/master/tarif_air-data.js';

// Global state for meteran_air_billing
let meteranAirBillingData = [];
let meteranAirBillingCurrentPage = 1;
let meteranAirBillingItemsPerPage = 10;

// Load meteran air billing data with filters
async function loadMeteranAirBilling(filters = {}) {
    try {
        let query = supabase
            .from('meteran_air_billing')
            .select(`
                *,
                periode:periode_id (nama_periode, tanggal_awal, tanggal_akhir, nomor_urut),
                hunian:hunian_id (nomor_blok_rumah),
                penghuni:penghuni_id (nama_kepala_keluarga)
            `)
            .order('tanggal_tagihan', { ascending: false });

        // Apply database filters
        if (filters.status) query = query.eq('status', filters.status);
        if (filters.hunian_id) query = query.eq('hunian_id', filters.hunian_id);
        if (filters.periode_id) query = query.eq('periode_id', filters.periode_id);
        if (filters.status_outstanding) {
            query = query.in('status', ['belum_bayar', 'sebagian']);
        }
        if (filters.billing_type) query = query.eq('billing_type', filters.billing_type);

        const { data, error } = await query;

        if (error) throw error;

        let filteredData = data || [];

        // Apply client-side text filters
        if (filters.hunian_search) {
            const searchTerm = filters.hunian_search.toLowerCase();
            filteredData = filteredData.filter(item =>
                item.hunian?.nomor_blok_rumah?.toLowerCase().includes(searchTerm)
            );
        }

        if (filters.periode_search) {
            const searchTerm = filters.periode_search.toLowerCase();
            filteredData = filteredData.filter(item =>
                item.periode?.nama_periode?.toLowerCase().includes(searchTerm)
            );
        }

        meteranAirBillingData = filteredData;
        return { success: true, data: meteranAirBillingData };
    } catch (error) {
        console.error('Error loading meteran air billing:', error);
        return { success: false, message: error.message };
    }
}

// Generate consolidated billing records from meter readings
async function generateMeteranAirBilling(hunianData, periodeId, options = {}) {
    try {
        console.log('generateMeteranAirBilling called with:', { hunianData, periodeId, options });

        const results = [];
        const periode = await getPeriodeById(periodeId);

        if (!periode) throw new Error('Periode tidak ditemukan');
        console.log('Periode found:', periode);

        // Test table access first
        try {
            const { error: testError } = await supabase
                .from('meteran_air_billing')
                .select('id')
                .limit(1);

            if (testError) {
                if (testError.code === '42P01') { // Table doesn't exist
                    throw new Error('Tabel meteran_air_billing belum dibuat. Jalankan migration script terlebih dahulu.');
                }
                throw testError;
            }
        } catch (tableError) {
            if (tableError.message.includes('migration script')) {
                throw tableError;
            }
            console.warn('Table access test failed:', tableError);
        }

        // Check if this is an inisiasi period (new meter/baseline)

        // Check if this is an inisiasi period (new meter/baseline)
        const isInisiasi = options.isInisiasi || false;

        for (const hunian of hunianData) {
            // Check if bill already exists for this household and period
            const existingBill = await checkExistingMeteranAirBilling(hunian.id, periodeId);
            if (existingBill) {
                results.push({
                    type: 'skipped',
                    message: `Tagihan sudah ada untuk ${hunian.nomor_blok_rumah} periode ${periode.nama_periode}`,
                    hunian: hunian.nomor_blok_rumah
                });
                continue;
            }

            // For bulk input, get current reading from hunian data
            const currentReadingForEdgeCase = options.useInputData && hunian.currentReading ?
                hunian.currentReading : (options.currentReading || 0);

            // Handle billing edge cases
            const edgeCaseOptions = { ...options, currentReading: currentReadingForEdgeCase };
            const edgeCaseResult = await handleBillingEdgeCases(hunian.id, periodeId, periode, edgeCaseOptions);

            // For inisiasi/baseline, we still create a record but with zero billing
            const isBaseline = !edgeCaseResult.shouldBill;
            if (isBaseline && !options.isInisiasi) {
                results.push({
                    type: 'baseline',
                    message: edgeCaseResult.message,
                    hunian: hunian.nomor_blok_rumah
                });
                continue;
            }

            // Get applicable tariff
            const { success: tariffSuccess, data: tariff } = await getTarifAirForDate(periode.tanggal_awal);

            if (!tariffSuccess || !tariff) {
                results.push({
                    type: 'skipped',
                    message: `No tariff found for periode ${periode.nama_periode}`,
                    hunian: hunian.nomor_blok_rumah
                });
                continue;
            }

            // Use currentReading from input data if available (for bulk input)
            const currentReading = options.useInputData && hunian.currentReading ?
                hunian.currentReading :
                (edgeCaseResult.usage ? edgeCaseResult.usage.currentReading : options.currentReading);

            const previousReading = edgeCaseResult.usage ? edgeCaseResult.usage.previousReading : 0;
            const totalUsage = options.useInputData && hunian.currentReading ?
                Math.max(0, currentReading - previousReading) :
                (edgeCaseResult.usage ? edgeCaseResult.usage.totalUsage : 0);

            // Calculate bill amount (zero for baseline/inisiasi)
            const billAmount = isBaseline ? 0 : totalUsage * tariff.harga_per_kubik;

            const billingData = {
                periode_id: periodeId,
                hunian_id: hunian.id,
                penghuni_id: hunian.penghuni_saat_ini?.id,

                // Meter data
                meteran_periode_ini: currentReading,
                meteran_periode_sebelumnya: previousReading,
                pemakaian_m3: totalUsage,

                // Bill calculation
                tarif_per_kubik: isBaseline ? 0 : tariff.harga_per_kubik,
                nominal_tagihan: billAmount,
                sisa_tagihan: billAmount,

                // Dates
                tanggal_tagihan: new Date().toISOString().split('T')[0],
                tanggal_jatuh_tempo: isBaseline ? null : calculateDueDate(new Date()),

                // Edge case information
                keterangan: formatBillNotes(edgeCaseResult),

                // Status and type
                status: isBaseline ? 'lunas' : 'belum_bayar',
                billing_type: isInisiasi ? 'inisiasi' : (isBaseline ? 'baseline' : 'automatic')
            };

            // Determine penghuni_id: use current assignment, or fallback to most recent from billing history
            let penghuniId = hunian.penghuni_saat_ini?.id;
            if (!penghuniId) {
                // Try to get penghuni from previous billing records
                penghuniId = await getMostRecentPenghuniFromBilling(hunian.id);
            }

            // Update billing data with determined penghuni_id
            billingData.penghuni_id = penghuniId;

            // Create the billing record
            const result = await createRecord('meteran_air_billing', billingData, 'Meteran Air Billing');

            if (result.success) {
                const recordType = isBaseline ? 'baseline' : 'bill';
                const message = isBaseline
                    ? `Baseline recorded: ${billingData.meteran_periode_ini}m³ - billing starts next month`
                    : `Bill created: ${edgeCaseResult.usage.totalUsage}m³ = Rp ${formatCurrency(billAmount)}`;

                results.push({
                    type: recordType,
                    data: result.data,
                    message: message
                });
            } else {
                results.push({
                    type: 'error',
                    message: `Record creation failed: ${result.message}`,
                    data: billingData
                });
            }
        }

        const billCount = results.filter(r => r.type === 'bill').length;
        const baselineCount = results.filter(r => r.type === 'baseline').length;
        const totalRecords = billCount + baselineCount;

        return {
            success: true,
            data: results,
            count: billCount,
            baselineCount,
            totalRecords
        };
    } catch (error) {
        console.error('Error generating meteran air billing:', error);
        return { success: false, message: error.message };
    }
}

// Handle billing edge cases for consolidated table
async function handleBillingEdgeCases(hunianId, periodeId, periode, options = {}) {
    try {
        // Check if household has any billing history
        const { data: billingHistory, error } = await supabase
            .from('meteran_air_billing')
            .select('id')
            .eq('hunian_id', hunianId)
            .limit(1);

        const isFirstTimeBilling = !billingHistory || billingHistory.length === 0;

        if (isFirstTimeBilling) {
            // Check if there are any billing records at all for this household
                const { data: existingBillings, error } = await supabase
                    .from('meteran_air_billing')
                    .select('id')
                    .eq('hunian_id', hunianId)
                    .limit(1);
    
                if (error && error.code !== 'PGRST116') {
                    console.error('Error checking existing billings:', error);
                }
    
                const hasAnyBillings = existingBillings && existingBillings.length > 0;

            if (hasAnyBillings) {
                // Household has billing history, should bill
                const usageCalculation = await calculateUsageForBill(hunianId, periode, options.currentReading || 0);
                return {
                    shouldBill: true,
                    case: 'first_billing_no_previous',
                    message: 'First billing - estimated usage (billing history exists)',
                    usage: usageCalculation || {
                        totalUsage: options.currentReading || 0,
                        previousReading: 0,
                        currentReading: options.currentReading || 0,
                        source: 'first_billing_estimate'
                    }
                };
            } else {
                // Truly first billing ever
                return {
                    shouldBill: false,
                    case: 'first_baseline',
                    message: 'First meter reading recorded. Billing starts next month.',
                    usage: null
                };
            }
        }

        // Get previous period reading for normal calculation
        const usageCalculation = await calculateUsageForBill(hunianId, periode, options.currentReading || 0);

        if (usageCalculation === null) {
            return {
                shouldBill: false,
                case: 'no_previous_reading',
                message: 'No previous reading found - contact admin',
                usage: null
            };
        }

        // Check for meter replacement discontinuity
        const discontinuityCheck = await detectMeterReplacement(hunianId, periode, options.currentReading || 0, usageCalculation.previousReading);

        if (discontinuityCheck.isReplacement) {
            return {
                shouldBill: true,
                case: 'meter_replacement',
                message: 'Meter replacement detected and handled',
                usage: discontinuityCheck.adjustedUsage
            };
        }

        // NORMAL CASE: Regular billing
        return {
            shouldBill: true,
            case: 'normal',
            message: 'Standard billing calculation',
            usage: usageCalculation
        };

    } catch (error) {
        console.error('Error handling billing edge cases:', error);
        return {
            shouldBill: false,
            case: 'fallback',
            message: 'Fallback calculation used',
            usage: null
        };
    }
}

// Calculate usage for billing (enhanced version)
async function calculateUsageForBill(hunianId, periode, currentReading) {
    try {
        // Get previous period reading from consolidated table
        const previousPeriodReading = await getPreviousPeriodReading(hunianId, periode);

        if (previousPeriodReading !== null) {
            return {
                totalUsage: currentReading - previousPeriodReading,
                previousReading: previousPeriodReading,
                currentReading: currentReading,
                source: 'normal'
            };
        } else {
            return null; // No previous reading available
        }
    } catch (error) {
        console.error('Error calculating usage for bill:', error);
        return null;
    }
}

// Get previous period reading from consolidated table
async function getPreviousPeriodReading(hunianId, currentPeriode) {
    try {
        // Get all periods ordered by nomor_urut (sequence number) descending (Z-A)
        const { data: allPeriods, error } = await supabase
            .from('periode')
            .select('id, nama_periode, nomor_urut')
            .order('nomor_urut', { ascending: false });

        if (error) throw error;

        const currentPeriodIndex = allPeriods.findIndex(p => p.id === currentPeriode.id);
        if (currentPeriodIndex <= 0) return null; // No previous period

        // Look for previous periods with readings
        for (let i = currentPeriodIndex + 1; i < allPeriods.length; i++) {
            const { data: previousBilling, error: billingError } = await supabase
                .from('meteran_air_billing')
                .select('id, meteran_periode_ini')
                .eq('hunian_id', hunianId)
                .eq('periode_id', allPeriods[i].id)
                .limit(1);

            if (billingError) {
                console.warn('Error querying billing data:', billingError);
                continue;
            }

            if (previousBilling && previousBilling.length > 0) {
                const reading = previousBilling[0].meteran_periode_ini;
                if (reading !== undefined && reading !== null) {
                    return reading;
                }
            }
        }

        return null; // No previous reading found
    } catch (error) {
        console.error('Error getting previous period reading:', error);
        return null;
    }
}

// Detect meter replacement scenarios
async function detectMeterReplacement(hunianId, periode, currentReading, previousReading) {
    try {
        const decreaseThreshold = 0.3; // 30% decrease or more is suspicious
        const readingDecrease = (previousReading - currentReading) / previousReading;

        if (readingDecrease > decreaseThreshold && currentReading < 100) {
            console.warn(`Meter discontinuity detected for hunian ${hunianId}: ${previousReading} → ${currentReading}`);

            return {
                isReplacement: true,
                adjustedUsage: {
                    totalUsage: currentReading, // Assume reading started from 0 in new meter
                    previousReading: previousReading,
                    currentReading: currentReading,
                    source: 'meter_replacement'
                }
            };
        }

        return { isReplacement: false };
    } catch (error) {
        console.error('Error detecting meter replacement:', error);
        return { isReplacement: false };
    }
}

// Allocate payment to outstanding bills
async function allocatePaymentToMeteranAirBilling(pemasukanId, nominalPembayaran) {
    try {
        // Get payment details
        const { data: pemasukan, error: pemasukanError } = await supabase
            .from('pemasukan')
            .select('*, hunian:hunian_id(id)')
            .eq('id', pemasukanId)
            .single();

        if (pemasukanError) throw pemasukanError;

        // Get outstanding bills for this household (oldest first)
        const { data: outstandingBills, error: billsError } = await supabase
            .from('meteran_air_billing')
            .select('*')
            .eq('hunian_id', pemasukan.hunian_id)
            .in('status', ['belum_bayar', 'sebagian'])
            .order('tanggal_tagihan', { ascending: true });

        if (billsError) throw billsError;

        if (!outstandingBills || outstandingBills.length === 0) {
            throw new Error('Tidak ada tagihan outstanding untuk rumah ini');
        }

        let remainingAmount = nominalPembayaran;
        const allocations = [];

        for (const bill of outstandingBills) {
            if (remainingAmount <= 0) break;

            const amountToAllocate = Math.min(remainingAmount, bill.sisa_tagihan);

            // Create allocation record
            const allocationData = {
                meteran_air_billing_id: bill.id,
                pemasukan_id: pemasukanId,
                nominal_dialokasikan: amountToAllocate,
                tanggal_alokasi: new Date().toISOString().split('T')[0]
            };

            allocations.push(allocationData);

            // Update bill payment tracking
            const newTotalPayment = bill.total_pembayaran + amountToAllocate;
            const newRemaining = bill.sisa_tagihan - amountToAllocate;

            // Determine new status
            let newStatus = 'sebagian';
            if (newRemaining <= 0) {
                newStatus = 'lunas';
            } else if (newTotalPayment === 0) {
                newStatus = 'belum_bayar';
            }

            await updateRecord('meteran_air_billing', bill.id, {
                total_pembayaran: newTotalPayment,
                sisa_tagihan: newRemaining,
                status: newStatus
            });

            remainingAmount -= amountToAllocate;
        }

        // Insert or update allocation records using upsert
        if (allocations.length > 0) {
            const { error: allocError } = await supabase
                .from('meteran_air_billing_pembayaran')
                .upsert(allocations, { 
                    onConflict: 'meteran_air_billing_id,pemasukan_id'
                });

            if (allocError) throw allocError;
        }

        return {
            success: true,
            allocations: allocations,
            unallocated: remainingAmount,
            message: `${formatCurrency(nominalPembayaran - remainingAmount)} berhasil dialokasikan ke ${allocations.length} tagihan`
        };
    } catch (error) {
        console.error('Error allocating payment to meteran air billing:', error);
        return { success: false, message: error.message };
    }
}

// Get outstanding bills by household
async function getOutstandingMeteranAirBillingByHunian(hunianId) {
    try {
        const { data, error } = await supabase
            .from('meteran_air_billing')
            .select(`
                *,
                periode:periode_id (nama_periode),
                penghuni:penghuni_id (nama_kepala_keluarga)
            `)
            .eq('hunian_id', hunianId)
            .in('status', ['belum_bayar', 'sebagian'])
            .order('tanggal_tagihan', { ascending: true });

        if (error) throw error;

        return { success: true, data: data || [] };
    } catch (error) {
        console.error('Error getting outstanding meteran air billing:', error);
        return { success: false, message: error.message };
    }
}

// Get bills for specific period
async function getMeteranAirBillingForPeriod(periodeId) {
    try {
        const { data, error } = await supabase
            .from('meteran_air_billing')
            .select(`
                *,
                hunian:hunian_id (nomor_blok_rumah),
                penghuni:penghuni_id (nama_kepala_keluarga),
                lorong:lorong_id (nama_lorong)
            `)
            .eq('periode_id', periodeId)
            .order('status', { ascending: true });

        if (error) throw error;

        return { success: true, data: data || [] };
    } catch (error) {
        console.error('Error getting meteran air billing for period:', error);
        return { success: false, message: error.message };
    }
}

// Helper functions
async function getPeriodeById(periodeId) {
    try {
        const { data, error } = await supabase
            .from('periode')
            .select('*')
            .eq('id', periodeId)
            .single();

        return error ? null : data;
    } catch (error) {
        return null;
    }
}

function calculateDueDate(tagihanDate) {
    // Default: 30 days from bill date
    const dueDate = new Date(tagihanDate);
    dueDate.setDate(dueDate.getDate() + 30);
    return dueDate.toISOString().split('T')[0];
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}

function formatBillNotes(edgeCaseResult) {
    const { case: caseType, usage } = edgeCaseResult;

    switch (caseType) {
        case 'meter_replacement':
            return `Meter replacement handled. Previous: ${usage.previousReading}, Current: ${usage.currentReading}`;
        case 'first_baseline':
            return `First meter reading - billing starts next month`;
        case 'first_billing':
            return `First billing for this household`;
        case 'first_billing_no_previous':
            return `First billing - estimated usage (no previous reading available)`;
        case 'fallback':
            return `Fallback calculation applied`;
        default:
            return null;
    }
}

// Check if billing record already exists for household and period
async function checkExistingMeteranAirBilling(hunianId, periodeId) {
    try {
        const { data, error } = await supabase
            .from('meteran_air_billing')
            .select('id')
            .eq('hunian_id', hunianId)
            .eq('periode_id', periodeId)
            .limit(1);

        if (error) throw error;
        return data && data.length > 0;
    } catch (error) {
        console.error('Error checking existing meteran air billing:', error);
        return false;
    }
}

// Get most recent penghuni from previous billing records for a household
async function getMostRecentPenghuniFromBilling(hunianId) {
    try {
        const { data, error } = await supabase
            .from('meteran_air_billing')
            .select('penghuni_id')
            .eq('hunian_id', hunianId)
            .not('penghuni_id', 'is', null)
            .order('tanggal_tagihan', { ascending: false })
            .limit(1);

        if (error) throw error;
        return data && data.length > 0 ? data[0].penghuni_id : null;
    } catch (error) {
        console.error('Error getting most recent penghuni from billing:', error);
        return null;
    }
}

// Delete billing record with confirmation
async function confirmDeleteMeteranAirBilling(id) {
    if (typeof showConfirm === 'function') {
        const confirmed = await showConfirm('Apakah Anda yakin ingin menghapus data meteran air billing ini?');
        if (confirmed) {
            const result = await deleteRecord('meteran_air_billing', id, 'Meteran Air Billing');
            // Note: Table refresh is handled by the table module's global override
            return result;
        }
    }
    return { success: false, message: 'Confirmation not available' };
}

export {
    loadMeteranAirBilling,
    generateMeteranAirBilling,
    allocatePaymentToMeteranAirBilling,
    getOutstandingMeteranAirBillingByHunian,
    getMeteranAirBillingForPeriod,
    confirmDeleteMeteranAirBilling,
    getMostRecentPenghuniFromBilling
};

// Import UI-related functions dynamically
let showConfirm;
import('../../utils.js').then(utils => {
    showConfirm = utils.showConfirm;
}).catch(() => {
    showConfirm = () => Promise.resolve(true);
});
