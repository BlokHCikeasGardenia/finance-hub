
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

// Convert dana titipan to pemasukan
async function convertDanaTitipanToPemasukan(danaTitipanId) {
    try {
        // Import required functions
        const { readRecords } = await import('../../crud.js');
        const { addPemasukan } = await import('./pemasukan-data.js');
        const { generateTransactionId } = await import('./pemasukan-data.js');
        const { showToast, showConfirm } = await import('../../utils.js');

        // Confirm conversion
        const confirmed = await showConfirm('Apakah Anda yakin ingin mengkonversi dana titipan ini menjadi pemasukan? Data dana titipan akan dihapus setelah konversi.');
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

        // Prepare pemasukan data
        const pemasukanData = {
            tanggal: danaTitipan.tanggal,
            penghuni_id: danaTitipan.penghuni_id || null,
            hunian_id: danaTitipan.hunian_id || null,
            nominal: danaTitipan.nominal,
            kategori_id: danaTitipan.kategori_id,
            rekening_id: danaTitipan.rekening_id,
            keterangan: `Dari Dana Titipan: ${danaTitipan.keterangan || ''}`,
            id_transaksi: await generateTransactionId()
        };

        // Add to pemasukan
        const addResult = await addPemasukan(pemasukanData);
        if (!addResult.success) {
            showToast('Gagal mengkonversi dana titipan: ' + addResult.message, 'danger');
            return;
        }

        // Delete dana titipan
        const deleteResult = await deleteDanaTitipan(danaTitipanId);
        if (!deleteResult.success) {
            showToast('Dana titipan berhasil dikonversi ke pemasukan, tapi gagal menghapus data lama', 'warning');
            return;
        }

        showToast('Dana titipan berhasil dikonversi menjadi pemasukan', 'success');

        // Refresh dana titipan table
        await loadDanaTitipan();

        // Also refresh pemasukan if the function exists
        if (typeof window.loadPemasukan === 'function') {
            window.loadPemasukan();
        }

    } catch (error) {
        console.error('Error converting dana titipan to pemasukan:', error);
        const { showToast } = await import('../../utils.js');
        showToast('Terjadi kesalahan saat konversi', 'danger');
    }
}

// Backward compatibility for global functions
window.editDanaTitipan = showEditDanaTitipanForm;
window.confirmDeleteDanaTitipan = confirmDeleteDanaTitipan;
window.convertDanaTitipanToPemasukan = convertDanaTitipanToPemasukan;
// Expose add and reset functions for inline handlers in the UI
window.showAddDanaTitipanForm = showAddDanaTitipanForm;
window.resetDanaTitipanFilters = resetDanaTitipanFilters;
