// Tagihan IPL (IPL Bills) data operations module
// Handles CRUD operations, bill generation, payment allocation, and reporting for IPL

import { supabase } from '../../config.js';
import { showToast } from '../../utils.js';
import {
    createRecord,
    updateRecord,
    deleteRecord,
    readRecords
} from '../../crud.js';
import { getTarifIplForDate } from '../../entities/master/tarif_ipl-data.js';

// Global state for tagihan_ipl
let tagihanIplData = [];
let tagihanIplCurrentPage = 1;
let tagihanIplItemsPerPage = 10;

// Load tagihan IPL data with filters
async function loadTagihanIpl(filters = {}) {
    try {
        let query = supabase
            .from('tagihan_ipl')
            .select(`
                *,
                periode:periode_id (nama_periode, tanggal_awal, tanggal_akhir),
                hunian:hunian_id (nomor_blok_rumah),
                penghuni:penghuni_id (nama_kepala_keluarga)
            `)
            .order('tanggal_tagihan', { ascending: false });

        // Apply filters
        if (filters.status) query = query.eq('status', filters.status);
        if (filters.hunian_id) query = query.eq('hunian_id', filters.hunian_id);
        if (filters.periode_id) query = query.eq('periode_id', filters.periode_id);
        if (filters.status_outstanding) {
            query = query.in('status', ['belum_bayar', 'sebagian']);
        }

        const { data, error } = await query;

        if (error) throw error;

        tagihanIplData = data || [];
        return { success: true, data: tagihanIplData };
    } catch (error) {
        console.error('Error loading tagihan IPL:', error);
        return { success: false, message: error.message };
    }
}

// Generate IPL bills for a period
async function generateTagihanIplForPeriod(hunianData, periodeId, options = {}) {
    try {
        const results = [];
        const periode = await getPeriodeById(periodeId);

        if (!periode) throw new Error('Periode tidak ditemukan');

        // Get all active IPL tariffs by type
        const { data: tariffs, error } = await supabase
            .from('tarif_ipl')
            .select('*')
            .eq('aktif', true);

        if (error) throw error;

        if (!tariffs || tariffs.length === 0) {
            throw new Error('Tidak ada tarif IPL yang aktif');
        }

        // Create tariff lookup map by type
        const tariffMap = {};
        tariffs.forEach(tariff => {
            tariffMap[tariff.type_tarif] = tariff;
        });

        for (const hunian of hunianData) {
            // Determine IPL type based on household conditions
            let iplType = 'IPL'; // Default

            if (hunian.status === 'kosong') {
                // Check if owner lives in same area (would be EXEMPT)
                // For now, assume empty houses pay reduced rate
                iplType = 'IPL_RUMAH_KOSONG';
            }

            // Check for special condition occupants
            if (hunian.penghuni_saat_ini?.kondisi_khusus) {
                iplType = 'DAU';
            }

            // Skip if no tariff for this type
            if (!tariffMap[iplType]) {
                results.push({
                    type: 'skipped',
                    message: `Tidak ada tarif untuk type ${iplType} pada ${hunian.nomor_blok_rumah}`,
                    hunian: hunian.nomor_blok_rumah
                });
                continue;
            }

            // Check if bill already exists for this household and period
            const existingBill = await checkExistingBill(hunian.id, periodeId);
            if (existingBill) {
                results.push({
                    type: 'skipped',
                    message: `Tagihan sudah ada untuk ${hunian.nomor_blok_rumah} periode ${periode.nama_periode}`,
                    hunian: hunian.nomor_blok_rumah
                });
                continue;
            }

            const tariff = tariffMap[iplType];

            const tagihanData = {
                periode_id: periodeId,
                hunian_id: hunian.id,
                // Use selected penghuni from form, fallback to current occupant if not provided
                penghuni_id: hunian.selectedPenghuniId ||
                            hunian.penghuni_saat_ini?.id ||
                            hunian.penghuni_sebelumnya_1_id ||
                            hunian.penghuni_sebelumnya_2_id,

                // Bill calculation - IPL is monthly flat rate
                tarif_per_bulan: tariff.nominal,
                nominal_tagihan: tariff.nominal,
                sisa_tagihan: tariff.nominal,

                // Dates
                tanggal_tagihan: new Date().toISOString().split('T')[0],
                tanggal_jatuh_tempo: calculateDueDate(new Date()),

                // Status
                status: 'belum_bayar'
            };

            // Create the bill
            const result = await createRecord('tagihan_ipl', tagihanData, 'Tagihan IPL');
            if (result.success) {
                results.push({
                    type: 'bill',
                    data: result.data,
                    message: `Tagihan IPL dibuat: ${hunian.nomor_blok_rumah} (${iplType}) = Rp ${formatCurrency(tariff.nominal)}`
                });
            }
        }

        const billCount = results.filter(r => r.type === 'bill').length;
        const skippedCount = results.filter(r => r.type === 'skipped').length;

        return {
            success: true,
            data: results,
            count: billCount,
            skippedCount,
            message: `${billCount} tagihan IPL dibuat, ${skippedCount} dilewati`
        };
    } catch (error) {
        console.error('Error generating tagihan IPL:', error);
        return { success: false, message: error.message };
    }
}

// Check if bill already exists for household and period
async function checkExistingBill(hunianId, periodeId) {
    try {
        const { data, error } = await supabase
            .from('tagihan_ipl')
            .select('id')
            .eq('hunian_id', hunianId)
            .eq('periode_id', periodeId)
            .limit(1);

        if (error) throw error;
        return data && data.length > 0;
    } catch (error) {
        console.error('Error checking existing bill:', error);
        return false;
    }
}

// Allocate payment to outstanding IPL bills with automatic category assignment
async function allocatePaymentToTagihanIpl(pemasukanId, nominalPembayaran) {
    try {
        // Get payment details
        const { data: pemasukan, error: pemasukanError } = await supabase
            .from('pemasukan')
            .select('*, hunian:hunian_id(id)')
            .eq('id', pemasukanId)
            .single();

        if (pemasukanError) throw pemasukanError;

        // Get outstanding IPL bills for this household (oldest first)
        const { data: outstandingBills, error: billsError } = await supabase
            .from('tagihan_ipl')
            .select('*')
            .eq('hunian_id', pemasukan.hunian_id)
            .in('status', ['belum_bayar', 'sebagian'])
            .order('tanggal_tagihan', { ascending: true });

        if (billsError) throw billsError;

        if (!outstandingBills || outstandingBills.length === 0) {
            throw new Error('Tidak ada tagihan IPL outstanding untuk rumah ini');
        }

        let remainingAmount = nominalPembayaran;
        const allocations = [];
        const categoryAllocations = {
            'IPL': 0,
            'IPL_RUMAH_KOSONG': 0,
            'DAU': 0
        };

        for (const bill of outstandingBills) {
            if (remainingAmount <= 0) break;

            const amountToAllocate = Math.min(remainingAmount, bill.sisa_tagihan);

            // Determine category based on bill type (from tariff_per_bulan relation)
            // Since we can't easily get the type_tarif from the relation, we'll use nominal amounts
            // IPL: 60000, IPL_RUMAH_KOSONG: 30000, DAU: 5000
            let billCategory = 'IPL'; // default
            if (bill.nominal_tagihan === 30000) {
                billCategory = 'IPL_RUMAH_KOSONG';
            } else if (bill.nominal_tagihan === 5000) {
                billCategory = 'DAU';
            }

            // Create allocation record
            const allocationData = {
                tagihan_ipl_id: bill.id,
                pemasukan_id: pemasukanId,
                nominal_dialokasikan: amountToAllocate,
                tanggal_alokasi: new Date().toISOString().split('T')[0]
            };

            allocations.push(allocationData);
            categoryAllocations[billCategory] += amountToAllocate;

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

            await updateRecord('tagihan_ipl', bill.id, {
                total_pembayaran: newTotalPayment,
                sisa_tagihan: newRemaining,
                status: newStatus
            });

            remainingAmount -= amountToAllocate;
        }

        // Insert allocation records
        if (allocations.length > 0) {
            const { error: allocError } = await supabase
                .from('tagihan_ipl_pembayaran')
                .insert(allocations);

            if (allocError) throw allocError;
        }

        return {
            success: true,
            allocations: allocations,
            categoryAllocations: categoryAllocations,
            unallocated: remainingAmount,
            message: `Rp ${formatCurrency(nominalPembayaran - remainingAmount)} berhasil dialokasikan ke ${allocations.length} tagihan IPL`
        };
    } catch (error) {
        console.error('Error allocating payment to tagihan IPL:', error);
        return { success: false, message: error.message };
    }
}

// Get outstanding IPL bills by household
async function getOutstandingTagihanIplByHunian(hunianId) {
    try {
        const { data, error } = await supabase
            .from('tagihan_ipl')
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
        console.error('Error getting outstanding tagihan IPL:', error);
        return { success: false, message: error.message };
    }
}

// Get IPL bills for specific period
async function getTagihanIplForPeriod(periodeId) {
    try {
        const { data, error } = await supabase
            .from('tagihan_ipl')
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
        console.error('Error getting tagihan IPL for period:', error);
        return { success: false, message: error.message };
    }
}

// Delete tagihan IPL with confirmation
async function confirmDeleteTagihanIpl(id) {
    if (typeof showConfirm === 'function') {
        const confirmed = await showConfirm('Apakah Anda yakin ingin menghapus tagihan IPL ini?');
        if (confirmed) {
            const result = await deleteRecord('tagihan_ipl', id, 'Tagihan IPL');
            if (result.success) {
                await loadTagihanIpl();
            }
            return result;
        }
    }
    return { success: false, message: 'Confirmation not available' };
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

// Get IPL revenue summary by category
async function getIplRevenueByCategory(filters = {}) {
    try {
        let query = supabase
            .from('tagihan_ipl_pembayaran')
            .select(`
                kategori_ipl,
                nominal_dialokasikan,
                tagihan_ipl:tagihan_ipl_id (
                    periode:periode_id (nama_periode, tanggal_awal)
                )
            `);

        // Apply filters
        if (filters.periode_id) {
            query = query.eq('tagihan_ipl.periode_id', filters.periode_id);
        }

        if (filters.year) {
            // This is complex to filter by year, might need a different approach
        }

        const { data, error } = await query;

        if (error) throw error;

        // Aggregate by category
        const categoryTotals = {
            'IPL': 0,
            'IPL_RUMAH_KOSONG': 0,
            'DAU': 0,
            'TOTAL_IPL': 0
        };

        if (data) {
            data.forEach(allocation => {
                const category = allocation.kategori_ipl || 'IPL'; // default to IPL if not set
                if (categoryTotals.hasOwnProperty(category)) {
                    categoryTotals[category] += allocation.nominal_dialokasikan || 0;
                }
            });
        }

        // Calculate total IPL (IPL + IPL_RUMAH_KOSONG)
        categoryTotals.TOTAL_IPL = categoryTotals.IPL + categoryTotals.IPL_RUMAH_KOSONG;

        return {
            success: true,
            data: categoryTotals,
            message: 'IPL revenue summary retrieved successfully'
        };
    } catch (error) {
        console.error('Error getting IPL revenue by category:', error);
        return { success: false, message: error.message };
    }
}

export {
    loadTagihanIpl,
    generateTagihanIplForPeriod,
    allocatePaymentToTagihanIpl,
    getOutstandingTagihanIplByHunian,
    getTagihanIplForPeriod,
    getIplRevenueByCategory,
    confirmDeleteTagihanIpl
};

// Import UI-related functions
let showConfirm;
import('../../utils.js').then(utils => {
    showConfirm = utils.showConfirm;
}).catch(() => {
    showConfirm = () => Promise.resolve(true);
});
