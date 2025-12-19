// Pemasukan form module
// Handles form creation, validation, and submission
// Enhanced to match app_old.js functionality with advanced features

import { showModal, closeModal, SearchableSelect } from '../../ui.js';
import { showToast, formatNumberInput, parseFormattedNumber } from '../../utils.js';
import {
    addPemasukan,
    updatePemasukan,
    loadPemasukan,
    generateTransactionId,
    getKategoriOptions,
    getRekeningOptions,
    getPenghuniOptions,
    getHunianOptions,
    getPeriodeOptions
} from './pemasukan-data.js';

// Show add form for pemasukan
function showAddPemasukanForm() {
    const formHtml = createPemasukanFormHtml();
    showModal('Tambah Pemasukan', formHtml);

    setTimeout(() => {
        initializePemasukanFormSelects();
        attachPemasukanFormEventListeners(false);
    }, 100);
}

// Show edit form for pemasukan
async function showEditPemasukanForm(id) {
    try {
        const { readRecords } = await import('../../crud.js');

        const { success, data } = await readRecords('pemasukan', {
            filters: { id },
            select: `*, penghuni:penghuni_id (nama_kepala_keluarga), rekening:rekening_id (jenis_rekening)`
        });

        if (!success || !data || data.length === 0) {
            showToast('Data pemasukan tidak ditemukan', 'warning');
            return;
        }

        const pemasukan = data[0];
        const formHtml = createPemasukanFormHtml(pemasukan);
        showModal('Edit Pemasukan', formHtml);

        setTimeout(() => {
            initializePemasukanFormSelects();
            populatePemasukanFormValues(pemasukan);
            attachPemasukanFormEventListeners(true, pemasukan.id);
        }, 100);

    } catch (error) {
        console.error('Error loading pemasukan for edit:', error);
        showToast('Error loading data', 'danger');
    }
}

// Create HTML for pemasukan form - Enhanced to match app_old.js
function createPemasukanFormHtml(pemasukan = null) {
    const isEdit = !!pemasukan;
    const today = new Date().toISOString().split('T')[0];

    return `
        <div id="pemasukan-form-error" class="alert alert-danger d-none" role="alert"></div>
        <form id="pemasukan-form">
            <!-- Transaction Info - Ultra Compact -->
            <div class="row g-2 mb-3">
                <div class="col-12">
                    <label for="id_transaksi" class="form-label">ID Transaksi:</label>
                    <input type="text" class="form-control" id="id_transaksi" readonly>
                </div>
                <div class="col-6">
                    <label for="tanggal" class="form-label">Tanggal:</label>
                    <input type="date" class="form-control" id="tanggal" name="tanggal"
                           value="${pemasukan?.tanggal || today}" required>
                </div>
                <div class="col-6">
                    <label for="nominal" class="form-label">Nominal:</label>
                    <input type="text" class="form-control" id="nominal" name="nominal" placeholder="0" required>
                </div>
            </div>

            <!-- People & Property - Compact -->
            <div class="mb-3">
                <div class="row g-2">
                    <div class="col-6">
                        <label for="penghuni_id" class="form-label">Penghuni:</label>
                        <select class="form-select" id="penghuni_id" name="penghuni_id">
                            <option value="">Pilih</option>
                        </select>
                    </div>
                    <div class="col-6">
                        <label for="hunian_id" class="form-label">Rumah:</label>
                        <select class="form-select" id="hunian_id" name="hunian_id">
                            <option value="">Pilih</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- Financial Details - Compact -->
            <div class="mb-3">
                <div class="row g-2">
                    <div class="col-6">
                        <label for="kategori_id" class="form-label">Kategori:</label>
                        <select class="form-select" id="kategori_id" name="kategori_id" required>
                            <option value="">Pilih</option>
                        </select>
                    </div>
                    <div class="col-6">
                        <label for="periode_id" class="form-label">Periode:</label>
                        <select class="form-select" id="periode_id" name="periode_id">
                            <option value="">Pilih</option>
                        </select>
                    </div>
                </div>
                <div class="mt-2">
                    <label for="rekening_id" class="form-label">Rekening:</label>
                    <select class="form-select" id="rekening_id" name="rekening_id" required>
                        <option value="">Pilih Rekening</option>
                    </select>
                </div>
            </div>

            <!-- Notes - Compact -->
            <div class="mb-3">
                <label for="keterangan" class="form-label">Keterangan:</label>
                <textarea class="form-control" id="keterangan" name="keterangan" rows="2"
                          placeholder="Opsional">${pemasukan?.keterangan || ''}</textarea>
            </div>

            <!-- Action Buttons - Ultra Compact -->
            <div class="d-flex gap-2 justify-content-end">
                <button type="button" class="btn btn-outline-secondary btn-sm" onclick="closeModal()">
                    Batal
                </button>
                <button type="reset" class="btn btn-outline-warning btn-sm">
                    Reset
                </button>
                <button type="submit" class="btn btn-primary btn-sm">
                    ${isEdit ? 'Update' : 'Simpan'}
                </button>
            </div>
        </form>
    `;
}

// Helper function to update form categories after async load
function updateFormCategories(categories, selectedValue = '') {
    const categorySelect = document.getElementById('kategori_id');
    if (categorySelect) {
        const optionsHtml = '<option value="">Pilih Kategori</option>' +
            categories.map(cat =>
                `<option value="${cat.id}" ${cat.id === selectedValue ? 'selected' : ''}>${cat.name}</option>`
            ).join('');
        categorySelect.innerHTML = optionsHtml;
    }
}

// Initialize searchable selects in form with advanced features
let penghuniSearchable, hunianSearchable, kategoriSearchable, rekeningSearchable, periodeSearchable;

async function initializePemasukanFormSelects() {
    try {
        // Do not pre-generate transaction ID on form open to avoid
        // consuming counters. ID will be generated on form submit.

        // Initialize SearchableSelect for each dropdown
        const penghuniSelect = document.getElementById('penghuni_id');
        const hunianSelect = document.getElementById('hunian_id');
        const kategoriSelect = document.getElementById('kategori_id');
        const rekeningSelect = document.getElementById('rekening_id');
        const periodeSelect = document.getElementById('periode_id');

        // Load penghuni searchable dropdown
        if (penghuniSelect) {
            const penghuniOptions = await getPenghuniOptions();
            penghuniSearchable = new SearchableSelect(penghuniSelect, {
                placeholder: 'Pilih Penghuni',
                searchPlaceholder: 'Cari nama penghuni...'
            });
            await penghuniSearchable.loadData(async () => penghuniOptions.map(opt => ({
                value: opt.value,
                text: opt.text
            })));
        }

        // Load hunian searchable dropdown
        if (hunianSelect) {
            const hunianOptions = await getHunianOptions();
            hunianSearchable = new SearchableSelect(hunianSelect, {
                placeholder: 'Pilih Rumah',
                searchPlaceholder: 'Cari nomor rumah...'
            });
            await hunianSearchable.loadData(async () => hunianOptions.map(opt => ({
                value: opt.value,
                text: opt.text
            })));
        }

        // Load kategori searchable dropdown
        if (kategoriSelect) {
            const kategoriOptions = await getKategoriOptions();
            kategoriSearchable = new SearchableSelect(kategoriSelect, {
                placeholder: 'Pilih Kategori',
                searchPlaceholder: 'Cari kategori...'
            });
            await kategoriSearchable.loadData(async () => kategoriOptions.map(opt => ({
                value: opt.value,
                text: opt.text
            })));
        }

        // Load rekening searchable dropdown
        if (rekeningSelect) {
            const rekeningOptions = await getRekeningOptions();
            rekeningSearchable = new SearchableSelect(rekeningSelect, {
                placeholder: 'Pilih Rekening',
                searchPlaceholder: 'Cari nama rekening...'
            });
            await rekeningSearchable.loadData(async () => rekeningOptions.map(opt => ({
                value: opt.value,
                text: opt.text
            })));
        }

        // Load periode searchable dropdown
        if (periodeSelect) {
            const periodeOptions = await getPeriodeOptions();
            periodeSearchable = new SearchableSelect(periodeSelect, {
                placeholder: 'Pilih Periode',
                searchPlaceholder: 'Cari periode...'
            });
            await periodeSearchable.loadData(async () => periodeOptions.map(opt => ({
                value: opt.value,
                text: opt.text
            })));
        }

        // Initialize number formatting for nominal input
        initializeNumberFormatting();

        // Setup smart auto-fill functionality
        setupSmartAutoFill();

    } catch (error) {
        console.error('Error initializing form selects:', error);
        showToast('Error loading form data', 'danger');
    }
}

// Populate form values for editing
function populatePemasukanFormValues(pemasukan) {
    // Set transaction ID
    const transactionIdField = document.getElementById('id_transaksi');
    if (transactionIdField) {
        transactionIdField.value = pemasukan.id_transaksi || '';
    }

    // Set basic form fields
    const tanggalField = document.getElementById('tanggal');
    if (tanggalField) tanggalField.value = pemasukan.tanggal || '';

    const nominalField = document.getElementById('nominal');
    if (nominalField) {
        const nominalValue = pemasukan.nominal ? pemasukan.nominal.toString() : '';
        nominalField.value = nominalValue;
        nominalField.dataset.rawValue = nominalValue;
    }

    const keteranganField = document.getElementById('keterangan');
    if (keteranganField) keteranganField.value = pemasukan.keterangan || '';

    // Set SearchableSelect values for dropdowns
    setTimeout(() => {
        if (penghuniSearchable && pemasukan.penghuni_id) {
            penghuniSearchable.setValue(pemasukan.penghuni_id.toString());
        }

        if (hunianSearchable && pemasukan.hunian_id) {
            hunianSearchable.setValue(pemasukan.hunian_id.toString());
        }

        if (kategoriSearchable && pemasukan.kategori_id) {
            kategoriSearchable.setValue(pemasukan.kategori_id.toString());
        }

        if (rekeningSearchable && pemasukan.rekening_id) {
            rekeningSearchable.setValue(pemasukan.rekening_id.toString());
        }

        if (periodeSearchable && pemasukan.periode_id) {
            periodeSearchable.setValue(pemasukan.periode_id.toString());
        }
    }, 500); // Small delay to ensure SearchableSelect are fully loaded
}

// Attach form event listeners
function attachPemasukanFormEventListeners(isEdit, editId = null) {
    const form = document.getElementById('pemasukan-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handlePemasukanFormSubmit(isEdit, editId);
    });
}

// Handle form submission
async function handlePemasukanFormSubmit(isEdit, editId) {
    try {
        const formData = await collectPemasukanFormData(isEdit);
        if (!formData) return; // Error in form data collection

        let result;
        if (isEdit && editId) {
            result = await updatePemasukan(editId, formData);
        } else {
            result = await addPemasukan(formData);
        }

        if (result.success) {
            // Check if this is an IPL payment that needs automatic allocation
            const isIplPayment = await checkAndAllocateIplPayment(result.data, formData);

            closeModal();
            await loadPemasukan();

            if (isIplPayment) {
                showToast(`Pemasukan IPL berhasil dibuat dan dialokasikan ke tagihan outstanding`, 'success');
            } else {
                showToast(`Pemasukan ${isEdit ? 'updated' : 'added'} successfully`, 'success');
            }
        } else {
            showPemasukanFormError('Error: ' + result.message);
        }

    } catch (error) {
        console.error('Form submission error:', error);
        showPemasukanFormError(error.message || 'Terjadi kesalahan saat menyimpan data');
    }
}

// Collect form data
async function collectPemasukanFormData(isEdit) {
    try {
        const tanggalEl = document.getElementById('tanggal');
        const tanggal = tanggalEl ? tanggalEl.value : '';

        // Use raw value for database storage instead of formatted display value
        const nominalRaw = document.getElementById('nominal');
        const nominal = nominalRaw ? parseFloat(nominalRaw.dataset.rawValue || parseFormattedNumber(nominalRaw.value) || 0) : 0;

        const kategoriEl = document.getElementById('kategori_id');
        const kategoriId = kategoriEl ? kategoriEl.value : '';

        const rekeningEl = document.getElementById('rekening_id');
        const rekeningId = rekeningEl ? rekeningEl.value : '';

        const penghuniEl = document.getElementById('penghuni_id');
        const penghuniId = penghuniEl ? penghuniEl.value : '';

        const hunianEl = document.getElementById('hunian_id');
        const hunianId = hunianEl ? hunianEl.value : '';

        const periodeEl = document.getElementById('periode_id');
        const periodeId = periodeEl ? periodeEl.value : '';

        const namaPembayarEl = document.getElementById('nama_pembayar');
        const namaPembayar = namaPembayarEl ? namaPembayarEl.value.trim() : '';

        const keteranganEl = document.getElementById('keterangan');
        const keterangan = keteranganEl ? keteranganEl.value.trim() : '';

        // Validation
        if (!tanggal) {
            showPemasukanFormError('Tanggal harus diisi');
            return null;
        }

        if (isNaN(nominal) || nominal <= 0) {
            showPemasukanFormError('Nominal harus angka positif');
            return null;
        }

        if (!kategoriId) {
            showPemasukanFormError('Kategori harus dipilih');
            return null;
        }

        if (!rekeningId) {
            showPemasukanFormError('Rekening harus dipilih');
            return null;
        }

        // Required fields
        const formData = {
            tanggal,
            nominal,
            kategori_id: kategoriId,
            rekening_id: rekeningId,
            keterangan
        };

        // Generate transaction ID for new records
        if (!isEdit) {
            formData.id_transaksi = await generateTransactionId();
        }

        // Optional fields
        if (penghuniId) formData.penghuni_id = penghuniId;
        if (hunianId) formData.hunian_id = hunianId;
        if (periodeId) formData.periode_id = periodeId;
        if (namaPembayar) formData.nama_pembayar = namaPembayar;

        return formData;
    } catch (error) {
        console.error('Error collecting form data:', error);
        showPemasukanFormError('Gagal mengumpulkan data form');
        return null;
    }
}

// Show form error
function showPemasukanFormError(message) {
    const errorDiv = document.getElementById('pemasukan-form-error');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.classList.remove('d-none');
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// Check if payment is IPL-related and allocate automatically
async function checkAndAllocateIplPayment(pemasukanData, formData) {
    try {
        // Check if this payment has IPL-related category and hunian
        if (!formData.hunian_id || !formData.kategori_id) {
            return false; // Not an IPL payment
        }

        // Check if category is IPL-related (IPL, IPL Rumah Kosong, DAU)
        const iplCategories = ['IPL', 'IPL_RUMAH_KOSONG', 'DAU'];
        const { readRecords } = await import('../../crud.js');
        const { success, data: kategoriData } = await readRecords('kategori_saldo', {
            filters: { id: formData.kategori_id },
            select: 'nama_kategori'
        });

        if (!success || !kategoriData || kategoriData.length === 0) {
            return false;
        }

        const kategoriName = kategoriData[0].nama_kategori;
        const isIplCategory = iplCategories.includes(kategoriName);

        if (!isIplCategory) {
            return false; // Not an IPL payment
        }

        // This is an IPL payment, allocate it to outstanding bills
        const { allocatePaymentToTagihanIpl } = await import('./tagihan_ipl-data.js');
        const pemasukanRecord = Array.isArray(pemasukanData) ? pemasukanData[0] : pemasukanData;
        const allocationResult = await allocatePaymentToTagihanIpl(pemasukanRecord.id, formData.nominal);

        if (allocationResult.success) {
            console.log('IPL payment allocated successfully:', allocationResult);
            return true;
        } else {
            console.error('Failed to allocate IPL payment:', allocationResult.message);
            showToast('Pembayaran IPL berhasil dibuat tetapi gagal dialokasikan ke tagihan', 'warning');
            return false;
        }

    } catch (error) {
        console.error('Error in IPL payment allocation:', error);
        showToast('Error allocating IPL payment', 'warning');
        return false;
    }
}

// Confirm cancel pemasukan (reverse allocation)
async function confirmCancelPemasukan(id) {
    let showConfirm;
    try {
        const utils = await import('../../utils.js');
        showConfirm = utils.showConfirm;
    } catch (error) {
        showConfirm = () => Promise.resolve(true);
    }

    const confirmed = await showConfirm(
        'PERINGATAN: Fitur ini akan membatalkan transaksi pembayaran dan mengembalikan status tagihan ke "Belum Bayar".\n\n' +
        'Apakah Anda yakin ingin membatalkan transaksi pemasukan ini?\n\n' +
        'Tindakan ini akan:\n' +
        '• Menghapus alokasi pembayaran dari tagihan\n' +
        '• Mengubah status tagihan kembali ke "Belum Bayar"\n' +
        '• Menghapus transaksi pemasukan dari sistem'
    );

    if (confirmed) {
        const result = await cancelPemasukanWithReverseAllocation(id);
        if (result.success) {
            await loadPemasukan();
            showToast('Transaksi pembayaran berhasil dibatalkan', 'success');
        } else {
            showToast('Error cancelling transaction: ' + result.message, 'danger');
        }
    }
}

// Cancel pemasukan with reverse allocation
async function cancelPemasukanWithReverseAllocation(pemasukanId) {
    try {
        // First, get the pemasukan details
        const { readRecords } = await import('../../crud.js');
        const { success: pemasukanSuccess, data: pemasukanData } = await readRecords('pemasukan', {
            filters: { id: pemasukanId },
            select: '*, kategori_saldo:kategori_id(nama_kategori)'
        });

        if (!pemasukanSuccess || !pemasukanData || pemasukanData.length === 0) {
            return { success: false, message: 'Transaksi pemasukan tidak ditemukan' };
        }

        const pemasukan = pemasukanData[0];
        const categoryName = pemasukan.kategori_saldo?.nama_kategori;

        // Check if this is an IPL or Air payment that needs reverse allocation
        const isIplPayment = categoryName && (categoryName.includes('IPL') || categoryName === 'DAU');
        const isAirPayment = categoryName && categoryName.includes('Air');

        if (isIplPayment) {
            // Reverse IPL payment allocation
            const reverseResult = await reverseIplPaymentAllocation(pemasukanId);
            if (!reverseResult.success) {
                return reverseResult;
            }
        } else if (isAirPayment) {
            // Reverse Air payment allocation
            const reverseResult = await reverseAirPaymentAllocation(pemasukanId);
            if (!reverseResult.success) {
                return reverseResult;
            }
        }

        // Finally, delete the pemasukan record
        const { deleteRecord } = await import('../../crud.js');
        const deleteResult = await deleteRecord('pemasukan', pemasukanId, 'Pemasukan');

        if (!deleteResult.success) {
            return { success: false, message: 'Gagal menghapus transaksi pemasukan: ' + deleteResult.message };
        }

        return { success: true, message: 'Transaksi berhasil dibatalkan' };

    } catch (error) {
        console.error('Error cancelling pemasukan:', error);
        return { success: false, message: error.message || 'Terjadi kesalahan saat membatalkan transaksi' };
    }
}

// Reverse IPL payment allocation
async function reverseIplPaymentAllocation(pemasukanId) {
    try {
        const supabase = (await import('../../config.js')).supabase;

        // Get all IPL payment allocations for this pemasukan
        const { data: allocations, error: allocError } = await supabase
            .from('tagihan_ipl_pembayaran')
            .select('tagihan_ipl_id, nominal_dialokasikan')
            .eq('pemasukan_id', pemasukanId);

        if (allocError) throw allocError;

        if (!allocations || allocations.length === 0) {
            // No allocations found, just proceed with deletion
            return { success: true, message: 'Tidak ada alokasi IPL yang perlu dibatalkan' };
        }

        // Update each IPL bill to reverse the payment
        for (const allocation of allocations) {
            const { data: bill, error: billError } = await supabase
                .from('tagihan_ipl')
                .select('id, status, sisa_tagihan, total_pembayaran, nominal_tagihan')
                .eq('id', allocation.tagihan_ipl_id)
                .single();

            if (billError) throw billError;

            // Reverse the payment allocation
            const newTotalPayment = Math.max(0, (bill.total_pembayaran || 0) - allocation.nominal_dialokasikan);
            const newRemaining = (bill.nominal_tagihan || 0) - newTotalPayment;

            // Determine new status
            let newStatus = 'belum_bayar';
            if (newTotalPayment > 0 && newTotalPayment < (bill.nominal_tagihan || 0)) {
                newStatus = 'sebagian';
            } else if (newTotalPayment >= (bill.nominal_tagihan || 0)) {
                newStatus = 'lunas';
            }

            // Update the bill
            const { error: updateError } = await supabase
                .from('tagihan_ipl')
                .update({
                    total_pembayaran: newTotalPayment,
                    sisa_tagihan: newRemaining,
                    status: newStatus
                })
                .eq('id', allocation.tagihan_ipl_id);

            if (updateError) throw updateError;
        }

        // Delete all IPL payment allocations
        const { error: deleteAllocError } = await supabase
            .from('tagihan_ipl_pembayaran')
            .delete()
            .eq('pemasukan_id', pemasukanId);

        if (deleteAllocError) throw deleteAllocError;

        return { success: true, message: `Berhasil membatalkan alokasi pembayaran IPL untuk ${allocations.length} tagihan` };

    } catch (error) {
        console.error('Error reversing IPL payment allocation:', error);
        return { success: false, message: 'Gagal membatalkan alokasi pembayaran IPL: ' + error.message };
    }
}

// Reverse Air payment allocation
async function reverseAirPaymentAllocation(pemasukanId) {
    try {
        const supabase = (await import('../../config.js')).supabase;

        // Get all Air payment allocations for this pemasukan
        const { data: allocations, error: allocError } = await supabase
            .from('meteran_air_billing_pembayaran')
            .select('meteran_air_billing_id, nominal_dialokasikan')
            .eq('pemasukan_id', pemasukanId);

        if (allocError) throw allocError;

        if (!allocations || allocations.length === 0) {
            // No allocations found, just proceed with deletion
            return { success: true, message: 'Tidak ada alokasi Air yang perlu dibatalkan' };
        }

        // Update each Air bill to reverse the payment
        for (const allocation of allocations) {
            const { data: bill, error: billError } = await supabase
                .from('meteran_air_billing')
                .select('id, status, sisa_tagihan, total_pembayaran, nominal_tagihan')
                .eq('id', allocation.meteran_air_billing_id)
                .single();

            if (billError) throw billError;

            // Reverse the payment allocation
            const newTotalPayment = Math.max(0, (bill.total_pembayaran || 0) - allocation.nominal_dialokasikan);
            const newRemaining = (bill.nominal_tagihan || 0) - newTotalPayment;

            // Determine new status
            let newStatus = 'belum_bayar';
            if (newTotalPayment > 0 && newTotalPayment < (bill.nominal_tagihan || 0)) {
                newStatus = 'sebagian';
            } else if (newTotalPayment >= (bill.nominal_tagihan || 0)) {
                newStatus = 'lunas';
            }

            // Update the bill
            const { error: updateError } = await supabase
                .from('meteran_air_billing')
                .update({
                    total_pembayaran: newTotalPayment,
                    sisa_tagihan: newRemaining,
                    status: newStatus
                })
                .eq('id', allocation.meteran_air_billing_id);

            if (updateError) throw updateError;
        }

        // Delete all Air payment allocations
        const { error: deleteAllocError } = await supabase
            .from('meteran_air_billing_pembayaran')
            .delete()
            .eq('pemasukan_id', pemasukanId);

        if (deleteAllocError) throw deleteAllocError;

        return { success: true, message: `Berhasil membatalkan alokasi pembayaran Air untuk ${allocations.length} tagihan` };

    } catch (error) {
        console.error('Error reversing Air payment allocation:', error);
        return { success: false, message: 'Gagal membatalkan alokasi pembayaran Air: ' + error.message };
    }
}

// Confirm delete pemasukan
async function confirmDeletePemasukan(id) {
    let showConfirm;
    try {
        const utils = await import('../../utils.js');
        showConfirm = utils.showConfirm;
    } catch (error) {
        showConfirm = () => Promise.resolve(true);
    }

    const confirmed = await showConfirm('Apakah Anda yakin ingin menghapus transaksi pemasukan ini?');
    if (confirmed) {
        const { deletePemasukan } = await import('./pemasukan-data.js');
        const result = await deletePemasukan(id);
        if (result.success) {
            await loadPemasukan();
            showToast('Pemasukan berhasil dihapus', 'success');
        } else {
            showToast('Error deleting: ' + result.error, 'danger');
        }
    }
}

// Initialize number formatting for nominal input field
function initializeNumberFormatting() {
    const nominalInput = document.getElementById('nominal');
    if (!nominalInput) return;

    // Format on input
    nominalInput.addEventListener('input', function(e) {
        let value = e.target.value;

        // Store raw value for database storage
        nominalInput.dataset.rawValue = parseFormattedNumber(value);

        // Format for display without storing formatted string in the value
        const formattedValue = formatNumberInput(value);
        if (formattedValue !== value) {
            const cursorPos = e.target.selectionStart;
            e.target.value = formattedValue;
            // Restore cursor position approximately
            setTimeout(() => {
                e.target.setSelectionRange(cursorPos, cursorPos);
            }, 0);
        }
    });

    // Handle focus/blur to clean up formatting
    nominalInput.addEventListener('blur', function(e) {
        const rawValue = parseFormattedNumber(e.target.value);
        e.target.dataset.rawValue = rawValue > 0 ? rawValue : '';
        e.target.value = rawValue > 0 ? rawValue : '';
    });

    nominalInput.addEventListener('focus', function(e) {
        const rawValue = e.target.dataset.rawValue || e.target.value;
        const formattedValue = formatNumberInput(rawValue);
        if (formattedValue) {
            e.target.value = formattedValue;
            e.target.setSelectionRange(formattedValue.length, formattedValue.length);
        }
    });
}

// Setup smart auto-fill functionality for penghuni ↔ hunian
function setupSmartAutoFill() {
    if (!penghuniSearchable || !hunianSearchable) return;

    // Helper function to get penghuni data from hunian
    async function getPenghuniByHunian(hunianId) {
        try {
            const { readRecords } = await import('../../crud.js');
            const { success, data } = await readRecords('hunian', {
                filters: { id: hunianId },
                select: `*, penghuni:penghuni_saat_ini_id (nama_kepala_keluarga, id)`
            });

            if (success && data.length > 0) {
                const hunian = data[0];
                if (hunian.penghuni) {
                    return {
                        id: hunian.penghuni.id,
                        nama: hunian.penghuni.nama_kepala_keluarga
                    };
                }
            }
            return null;
        } catch (error) {
            console.warn('Error getting penghuni by hunian:', error);
            return null;
        }
    }

    // Helper function to get hunian data from penghuni
    async function getHunianByPenghuni(penghuniId) {
        try {
            const { readRecords } = await import('../../crud.js');
            // Query hunian table where penghuni_saat_ini_id matches the penghuniId
            const { success, data } = await readRecords('hunian', {
                filters: { penghuni_saat_ini_id: penghuniId },
                select: `*,
                        lorong:lorong_id (nama_lorong)`
            });

            if (success && data.length > 0) {
                const hunian = data[0];
                if (hunian) {
                    return {
                        id: hunian.id,
                        lokasi: `${hunian.nomor_blok_rumah} (${hunian.lorong?.nama_lorong || 'N/A'})`
                    };
                }
            }
            return null;
        } catch (error) {
            console.warn('Error getting hunian by penghuni:', error);
            return null;
        }
    }

    // Auto-fill penghuni when hunian is selected
    hunianSearchable.selectElement.addEventListener('change', async function() {
        const hunianId = hunianSearchable.getValue();
        if (!hunianId) return;

        const penghuni = await getPenghuniByHunian(hunianId);
        if (penghuni) {
            // Find the option in penghuni dropdown and select it
            const options = penghuniSearchable.data;
            const optionToSelect = options.find(opt => opt.value === penghuni.id.toString());
            if (optionToSelect) {
                penghuniSearchable.setValue(optionToSelect.value);
            }
        }
    });

    // Auto-fill hunian when penghuni is selected
    penghuniSearchable.selectElement.addEventListener('change', async function() {
        const penghuniId = penghuniSearchable.getValue();
        if (!penghuniId) return;

        const hunian = await getHunianByPenghuni(penghuniId);
        if (hunian) {
            // Find the option in hunian dropdown and select it
            const options = hunianSearchable.data;
            const optionToSelect = options.find(opt => opt.value === hunian.id.toString());
            if (optionToSelect) {
                hunianSearchable.setValue(optionToSelect.value);
            }
        }
    });
}

export {
    showAddPemasukanForm,
    showEditPemasukanForm,
    createPemasukanFormHtml,
    initializePemasukanFormSelects,
    populatePemasukanFormValues,
    attachPemasukanFormEventListeners,
    handlePemasukanFormSubmit,
    collectPemasukanFormData,
    showPemasukanFormError,
    confirmCancelPemasukan,
    cancelPemasukanWithReverseAllocation,
    confirmDeletePemasukan
};
