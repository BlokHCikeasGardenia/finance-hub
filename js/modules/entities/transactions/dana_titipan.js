
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
        const { generateTransactionId, getKategoriOptions } = await import('./pemasukan-data.js');
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
                     kategori_saldo:kategori_id (nama_kategori)`
        });

        if (!readSuccess || !data || data.length === 0) {
            showToast('Data dana titipan tidak ditemukan', 'danger');
            return;
        }

        const danaTitipan = data[0];

        if (!danaTitipan.hunian_id) {
            showToast('Dana titipan tidak terkait dengan rumah tertentu, tidak bisa digunakan untuk pembayaran', 'danger');
            return;
        }

        // Get outstanding bills for the household
        const { data: iplBills, error: iplError } = await supabase
            .from('tagihan_ipl')
            .select('id, sisa_tagihan, periode:periode_id (nama_periode)')
            .eq('hunian_id', danaTitipan.hunian_id)
            .gt('sisa_tagihan', 0)
            .order('tanggal_tagihan', { ascending: true });

        const { data: airBills, error: airError } = await supabase
            .from('meteran_air_billing')
            .select('id, sisa_tagihan, billing_type, periode:periode_id (nama_periode)')
            .eq('hunian_id', danaTitipan.hunian_id)
            .gt('sisa_tagihan', 0)
            .neq('billing_type', 'inisiasi')
            .neq('billing_type', 'baseline')
            .order('tanggal_tagihan', { ascending: true });

        if (iplError || airError) {
            showToast('Gagal memuat data tagihan', 'danger');
            return;
        }

        const outstandingBills = [
            ...(iplBills || []).map(bill => ({ ...bill, type: 'IPL' })),
            ...(airBills || []).map(bill => ({ ...bill, type: 'Air' }))
        ];

        if (outstandingBills.length === 0) {
            showToast('Tidak ada tagihan outstanding untuk rumah ini', 'warning');
            return;
        }

        // Calculate how much can be allocated to full payments
        let remainingDeposit = danaTitipan.nominal;
        const billsToPay = [];
        const kategoriOptions = await getKategoriOptions();

        for (const bill of outstandingBills) {
            if (remainingDeposit >= bill.sisa_tagihan) {
                billsToPay.push(bill);
                remainingDeposit -= bill.sisa_tagihan;
            } else {
                break; // Stop if we can't pay this bill fully
            }
        }

        if (billsToPay.length === 0) {
            showToast('Dana titipan tidak cukup untuk membayar tagihan penuh mana pun', 'warning');
            return;
        }

        const totalToPay = billsToPay.reduce((sum, bill) => sum + bill.sisa_tagihan, 0);

        // Determine category for payment
        const hasIPL = billsToPay.some(bill => bill.type === 'IPL');
        const hasAir = billsToPay.some(bill => bill.type === 'Air');
        let paymentCategoryId;

        if (hasIPL && hasAir) {
            const iplCategory = kategoriOptions.find(cat => cat.text.includes('IPL'));
            paymentCategoryId = iplCategory?.value;
        } else if (hasIPL) {
            const iplCategory = kategoriOptions.find(cat => cat.text.includes('IPL'));
            paymentCategoryId = iplCategory?.value;
        } else if (hasAir) {
            const airCategory = kategoriOptions.find(cat => cat.text.includes('Air'));
            paymentCategoryId = airCategory?.value;
        }

        if (!paymentCategoryId) {
            showToast('Tidak dapat menentukan kategori pembayaran', 'danger');
            return;
        }

        // Create pemasukan record for payment
        const pemasukanData = {
            tanggal: danaTitipan.tanggal,
            penghuni_id: danaTitipan.penghuni_id || null,
            hunian_id: danaTitipan.hunian_id,
            nominal: totalToPay,
            kategori_id: paymentCategoryId,
            rekening_id: danaTitipan.rekening_id,
            keterangan: `Pembayaran dari Dana Titipan: ${danaTitipan.keterangan || ''}`,
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

        // Allocate payment to bills
        for (const bill of billsToPay) {
            try {
                if (bill.type === 'IPL') {
                    const { allocatePaymentToTagihanIpl } = await import('./tagihan_ipl-data.js');
                    await allocatePaymentToTagihanIpl(pemasukanRecord.id, bill.sisa_tagihan);
                } else if (bill.type === 'Air') {
                    await allocatePaymentToTagihanAir(pemasukanRecord.id, bill.sisa_tagihan, bill.id);
                }
            } catch (error) {
                console.error(`Error allocating payment to ${bill.type} bill ${bill.id}:`, error);
            }
        }

        // Update or delete dana titipan
        const newNominal = danaTitipan.nominal - totalToPay;
        if (newNominal <= 0) {
            const deleteResult = await deleteDanaTitipan(danaTitipanId);
            if (!deleteResult.success) {
                showToast('Pembayaran berhasil, tapi gagal menghapus sisa dana titipan', 'warning');
            }
        } else {
            const updateResult = await updateRecord('dana_titipan', danaTitipanId, { nominal: newNominal });
            if (!updateResult.success) {
                showToast('Pembayaran berhasil, tapi gagal mengupdate sisa dana titipan', 'warning');
            }
        }

        showToast('Dana titipan berhasil digunakan untuk pembayaran tagihan', 'success');

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
