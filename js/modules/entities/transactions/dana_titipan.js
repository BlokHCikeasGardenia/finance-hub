
// Import all submodules
import {
    loadDanaTitipan,
    confirmDeleteDanaTitipan,
    deleteDanaTitipan
} from './dana_titipan-data.js';

import {
    showAddDanaTitipanForm,
    showEditDanaTitipanForm
} from './dana_titipan-form.js';

import {
    initializeDanaTitipanSearchAndFilter,
    resetDanaTitipanFilters,
    sortDanaTitipanData,
    filterAndDisplayDanaTitipan
} from './dana_titipan-filters.js';

import {
    changeDanaTitipanPage,
    attachDanaTitipanSortListeners
} from './dana_titipan-table.js';

// Export functions for global access
export {
    loadDanaTitipan,
    showAddDanaTitipanForm,
    showEditDanaTitipanForm,
    confirmDeleteDanaTitipan,
    initializeDanaTitipanSearchAndFilter,
    changeDanaTitipanPage,
    resetDanaTitipanFilters,
    filterAndDisplayDanaTitipan
};

// Convert dana titipan to pembayaran
async function convertDanaTitipanToPembayaran(danaTitipanId) {
    try {
        // Import required functions
        const { readRecords, updateRecord } = await import('../../crud.js');
        const { addPemasukan } = await import('./pemasukan-data.js');
        const { generateTransactionId } = await import('./pemasukan-data.js');
        const { showToast, showConfirm } = await import('../../utils.js');
        const { supabase } = await import('../../config.js');

        // Confirm conversion
        const confirmed = await showConfirm('Apakah Anda yakin ingin menggunakan dana titipan ini untuk membayar tagihan?');
        if (!confirmed) return;

        // Get dana titipan data
        const { success: readSuccess, data } = await readRecords('dana_titipan', {
            filters: { id: danaTitipanId },
            select: `*,
                     penghuni:penghuni_id (nama_kepala_keluarga),
                     hunian:hunian_id (nomor_blok_rumah),
                     rekening:rekening_id (jenis_rekening),
                     kategori_saldo:kategori_id (nama_kategori),
                     periode:periode_id (nama_periode)`
        });

        if (!readSuccess || !data || data.length === 0) {
            showToast('Data dana titipan tidak ditemukan', 'danger');
            return;
        }

        const danaTitipan = data[0];

        // Validate that dana titipan has required fields
        if (!danaTitipan.kategori_id || !danaTitipan.periode_id) {
            showToast('Dana titipan harus memiliki kategori dan periode yang valid', 'danger');
            return;
        }

        if (!danaTitipan.hunian_id) {
            showToast('Dana titipan tidak terkait dengan rumah tertentu, tidak bisa digunakan untuk pembayaran', 'danger');
            return;
        }

        // Find matching bills by category and period
        let matchingBills = [];
        let billType = '';
        let billTable = '';

        // Determine bill type based on category
        const categoryName = danaTitipan.kategori_saldo?.nama_kategori || '';
        if (categoryName.toLowerCase().includes('ipl')) {
            billType = 'IPL';
            billTable = 'tagihan_ipl';
        } else if (categoryName.toLowerCase().includes('air')) {
            billType = 'Air';
            billTable = 'meteran_air_billing';
        } else {
            showToast(`Kategori ${categoryName} tidak didukung untuk pembayaran otomatis`, 'danger');
            return;
        }

        // Query for matching bills
        let query = supabase
            .from(billTable)
            .select('id, sisa_tagihan, periode:periode_id (nama_periode)')
            .eq('hunian_id', danaTitipan.hunian_id)
            .eq('periode_id', danaTitipan.periode_id)
            .gt('sisa_tagihan', 0);

        if (billType === 'Air') {
            query = query
                .neq('billing_type', 'inisiasi')
                .neq('billing_type', 'baseline');
        }

        const { data: bills, error: billsError } = await query;

        if (billsError) {
            showToast('Gagal memuat data tagihan', 'danger');
            return;
        }

        if (!bills || bills.length === 0) {
            const periodName = danaTitipan.periode?.nama_periode || 'periode tersebut';
            showToast(`Tidak ada tagihan ${categoryName} ${periodName} yang outstanding untuk rumah ini`, 'warning');
            return;
        }

        // For IPL, there should be only one bill per period per household
        // For Air, there might be multiple but we take the first one
        const billToPay = bills[0];
        const amountToPay = Math.min(danaTitipan.nominal, billToPay.sisa_tagihan);

        // Create pemasukan record for payment
        const pemasukanData = {
            tanggal: danaTitipan.tanggal,
            penghuni_id: danaTitipan.penghuni_id || null,
            hunian_id: danaTitipan.hunian_id,
            nominal: amountToPay,
            kategori_id: danaTitipan.kategori_id,
            rekening_id: danaTitipan.rekening_id,
            keterangan: danaTitipan.keterangan || '',
            id_transaksi: await generateTransactionId()
        };

        const addResult = await addPemasukan(pemasukanData);
        if (!addResult.success) {
            showToast('Gagal membuat pembayaran: ' + addResult.message, 'danger');
            return;
        }

        const pemasukanRecord = Array.isArray(addResult.data) ? addResult.data[0] : addResult.data;

        if (!pemasukanRecord || !pemasukanRecord.id) {
            showToast('Gagal mendapatkan data pembayaran yang dibuat', 'danger');
            return;
        }

        // Allocate payment to the bill
        try {
            if (billType === 'IPL') {
                const { allocatePaymentToTagihanIpl } = await import('./tagihan_ipl-data.js');
                await allocatePaymentToTagihanIpl(pemasukanRecord.id, amountToPay);
            } else if (billType === 'Air') {
                await allocatePaymentToTagihanAir(pemasukanRecord.id, amountToPay, billToPay.id);
            }
        } catch (error) {
            console.error(`Error allocating payment to ${billType} bill ${billToPay.id}:`, error);
            showToast('Gagal mengalokasikan pembayaran ke tagihan', 'danger');
            return;
        }

        // Update or delete dana titipan
        const remainingDeposit = danaTitipan.nominal - amountToPay;
        if (remainingDeposit <= 0) {
            const deleteResult = await deleteDanaTitipan(danaTitipanId);
            if (!deleteResult.success) {
                showToast('Pembayaran berhasil, tapi gagal menghapus sisa dana titipan', 'warning');
            }
        } else {
            const updateResult = await updateRecord('dana_titipan', danaTitipanId, { nominal: remainingDeposit });
            if (!updateResult.success) {
                showToast('Pembayaran berhasil, tapi gagal mengupdate sisa dana titipan', 'warning');
            }
        }

        const paymentStatus = amountToPay >= billToPay.sisa_tagihan ? 'dilunasi penuh' : 'dibayar sebagian';
        showToast(`Dana titipan berhasil digunakan untuk pembayaran tagihan (${paymentStatus})`, 'success');

        // Refresh dana titipan table
        await loadDanaTitipan();

        // Also refresh pemasukan if the function exists
        if (typeof window.loadPemasukan === 'function') {
            window.loadPemasukan();
        }

    } catch (error) {
        console.error('Error converting dana titipan to pembayaran:', error);
        const { showToast } = await import('../../utils.js');
        showToast('Terjadi kesalahan saat konversi', 'danger');
    }
}

// Allocate payment to Air bill
async function allocatePaymentToTagihanAir(pemasukanId, nominalPembayaran, meteranAirBillingId) {
    try {
        const { supabase } = await import('../../config.js');

        // Get payment date from pemasukan record
        const { data: pemasukan, error: pemasukanError } = await supabase
            .from('pemasukan')
            .select('tanggal')
            .eq('id', pemasukanId)
            .single();

        if (pemasukanError) throw pemasukanError;

        // Create allocation record for Air bill
        const allocationData = {
            meteran_air_billing_id: meteranAirBillingId,
            pemasukan_id: pemasukanId,
            nominal_dialokasikan: nominalPembayaran,
            tanggal_alokasi: pemasukan.tanggal
        };

        const { data, error } = await supabase
            .from('meteran_air_billing_pembayaran')
            .insert([allocationData]);

        if (error) throw error;

        // Update Air bill payment tracking
        const { data: bill, error: billError } = await supabase
            .from('meteran_air_billing')
            .select('total_pembayaran, sisa_tagihan')
            .eq('id', meteranAirBillingId)
            .single();

        if (billError) throw billError;

        const newTotalPayment = (bill.total_pembayaran || 0) + nominalPembayaran;
        const newRemaining = (bill.sisa_tagihan || 0) - nominalPembayaran;

        let newStatus = 'sebagian';
        if (newRemaining <= 0) {
            newStatus = 'lunas';
        } else if (newTotalPayment === 0) {
            newStatus = 'belum_bayar';
        }

        const { updateRecord } = await import('../../crud.js');
        await updateRecord('meteran_air_billing', meteranAirBillingId, {
            total_pembayaran: newTotalPayment,
            sisa_tagihan: newRemaining,
            status: newStatus
        });

        return { success: true, message: 'Pembayaran Air berhasil dialokasikan' };
    } catch (error) {
        console.error('Error allocating payment to Air bill:', error);
        return { success: false, message: error.message };
    }
}

// Backward compatibility for global functions
window.editDanaTitipan = showEditDanaTitipanForm;
window.confirmDeleteDanaTitipan = confirmDeleteDanaTitipan;
window.convertDanaTitipanToPembayaran = convertDanaTitipanToPembayaran;
// Expose add and reset functions for inline handlers in the UI
window.showAddDanaTitipanForm = showAddDanaTitipanForm;
window.resetDanaTitipanFilters = resetDanaTitipanFilters;

