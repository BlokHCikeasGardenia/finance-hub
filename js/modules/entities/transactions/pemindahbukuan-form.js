// Pemindahbukuan form handling module
// Handles form creation, submission, and transfer validation

import { supabase } from '../../config.js';
import {
    showModal,
    closeModal
} from '../../ui.js';
import {
    addPemindahbukuan,
    updatePemindahbukuan,
    generateTransactionId,
    getRekeningOptions
} from './pemindahbukuan-data.js';
import { showConfirm, showToast, formatNumberInput, parseFormattedNumber } from '../../utils.js';

// Form functions
function showAddPemindahbukuanForm() {
    const today = new Date().toISOString().split('T')[0];

    const formHtml = `
        <div id="pemindahbukuan-form-error" class="alert alert-danger d-none" role="alert"></div>
        <form id="pemindahbukuan-form">
            <div class="row">
                <div class="col-md-6">
                    <div class="mb-3">
                        <label for="tanggal" class="form-label required-field">Tanggal:</label>
                        <input type="date" class="form-control" id="tanggal" name="tanggal" value="${today}" required>
                    </div>

                    <div class="mb-3">
                        <label for="nominal" class="form-label required-field">Nominal:</label>
                        <input type="text" class="form-control" id="nominal" name="nominal" placeholder="0" required>
                    </div>

                    <div class="mb-3">
                        <label for="rekening_dari_id" class="form-label required-field">Rekening Dari:</label>
                        <select class="form-select" id="rekening_dari_id" name="rekening_dari_id" required>
                            <option value="">Pilih Rekening Dari</option>
                        </select>
                    </div>

                    <div class="mb-3">
                        <label for="rekening_ke_id" class="form-label required-field">Rekening Ke:</label>
                        <select class="form-select" id="rekening_ke_id" name="rekening_ke_id" required>
                            <option value="">Pilih Rekening Ke</option>
                        </select>
                    </div>
                </div>

                <div class="col-md-6">
                    <div class="mb-3">
                        <label for="catatan" class="form-label">Catatan:</label>
                        <textarea class="form-control" id="catatan" name="catatan" rows="5" placeholder="Keterangan pemindahbukuan"></textarea>
                    </div>
                </div>
            </div>

            <div class="d-flex gap-2">
                <button type="submit" class="btn btn-primary">Simpan</button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
            </div>
        </form>
    `;

    showModal('Tambah Pemindahbukuan', formHtml);

    setTimeout(() => {
        initializePemindahbukuanFormSelects(false);
        initializeNumberFormatting();
        attachPemindahbukuanFormEventListeners(false);
    }, 100);
}

async function showEditPemindahbukuanForm(id) {
    try {
        const { data, error } = await supabase
            .from('pemindahbukuan')
            .select(`
                *,
                rekening_dari:rekening_dari_id (jenis_rekening),
                rekening_ke:rekening_ke_id (jenis_rekening)
            `)
            .eq('id', id)
            .single();

        if (error || !data) {
            showToast('Data pemindahbukuan tidak ditemukan', 'warning');
            return;
        }

        const pemindahbukuan = data;

        const formHtml = `
            <div id="pemindahbukuan-form-error" class="alert alert-danger d-none" role="alert"></div>
            <form id="pemindahbukuan-form">
                <div class="row">
                    <div class="col-md-6">
                        <div class="mb-3">
                            <label for="tanggal" class="form-label required-field">Tanggal:</label>
                            <input type="date" class="form-control" id="tanggal" name="tanggal" value="${pemindahbukuan.tanggal || ''}" required>
                        </div>

                        <div class="mb-3">
                            <label for="nominal" class="form-label required-field">Nominal:</label>
                            <input type="text" class="form-control" id="nominal" name="nominal" placeholder="0" value="${pemindahbukuan.nominal || ''}" required>
                        </div>

                        <div class="mb-3">
                            <label for="rekening_dari_id" class="form-label required-field">Rekening Dari:</label>
                            <select class="form-select" id="rekening_dari_id" name="rekening_dari_id" required>
                                <option value="">Pilih Rekening Dari</option>
                            </select>
                        </div>

                        <div class="mb-3">
                            <label for="rekening_ke_id" class="form-label required-field">Rekening Ke:</label>
                            <select class="form-select" id="rekening_ke_id" name="rekening_ke_id" required>
                                <option value="">Pilih Rekening Ke</option>
                            </select>
                        </div>
                    </div>

                    <div class="col-md-6">
                        <div class="mb-3">
                            <label for="catatan" class="form-label">Catatan:</label>
                            <textarea class="form-control" id="catatan" name="catatan" rows="5" placeholder="Keterangan pemindahbukuan">${pemindahbukuan.catatan || ''}</textarea>
                        </div>
                    </div>
                </div>

                <div class="d-flex gap-2">
                    <button type="submit" class="btn btn-primary">Update</button>
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
                </div>
            </form>
        `;

        showModal('Edit Pemindahbukuan', formHtml);

        setTimeout(() => {
            initializePemindahbukuanFormSelects(true, pemindahbukuan);
            initializeNumberFormatting();
            attachPemindahbukuanFormEventListeners(true, pemindahbukuan.id);
        }, 100);

    } catch (error) {
        console.error('Error loading pemindahbukuan for edit:', error);
        showToast('Error loading data', 'danger');
    }
}

function initializePemindahbukuanFormSelects(isEdit, pemindahbukuanData = null) {
    loadRekeningOptionsForPemindahbukuan(isEdit, pemindahbukuanData);
}

function populatePemindahbukuanFormValues(pemindahbukuan) {
    // Set values for searchable selects if available
    const rekeningDariSelect = document.getElementById('rekening_dari_id');
    const rekeningKeSelect = document.getElementById('rekening_ke_id');

    if (rekeningDariSelect && rekeningDariSelect.searchableSelect) {
        rekeningDariSelect.searchableSelect.setValue(pemindahbukuan.rekening_dari_id || '');
    } else if (rekeningDariSelect) {
        rekeningDariSelect.value = pemindahbukuan.rekening_dari_id || '';
    }

    if (rekeningKeSelect && rekeningKeSelect.searchableSelect) {
        rekeningKeSelect.searchableSelect.setValue(pemindahbukuan.rekening_ke_id || '');
    } else if (rekeningKeSelect) {
        rekeningKeSelect.value = pemindahbukuan.rekening_ke_id || '';
    }
}

function attachPemindahbukuanFormEventListeners(isEdit, editId = null) {
    const form = document.getElementById('pemindahbukuan-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handlePemindahbukuanFormSubmit(isEdit, editId);
    });
}

async function handlePemindahbukuanFormSubmit(isEdit, editId) {
    try {
        const formData = await collectPemindahbukuanFormData(isEdit);

        // Validate that rekening_dari and rekening_ke are different
        if (formData.rekening_dari_id === formData.rekening_ke_id) {
            showPemindahbukuanFormError('Rekening asal dan rekening tujuan harus berbeda');
            return;
        }

        let result;
        if (isEdit && editId) {
            result = await updatePemindahbukuan(editId, formData);
        } else {
            result = await addPemindahbukuan(formData);
        }

        if (result.success) {
            closeModal();
            // Trigger data reload - this will be imported from the data module
            if (typeof loadPemindahbukuan === 'function') {
                await loadPemindahbukuan();
            }
        } else {
            showPemindahbukuanFormError(result.message);
        }

    } catch (error) {
        console.error('Form submission error:', error);
        showPemindahbukuanFormError(error.message || 'Terjadi kesalahan saat menyimpan data');
    }
}

async function collectPemindahbukuanFormData(isEdit) {
    const tanggal = document.getElementById('tanggal').value;
    // Use raw value for database storage instead of formatted display value
    const nominalRaw = document.getElementById('nominal');
    const nominal = nominalRaw ? parseFloat(nominalRaw.dataset.rawValue || parseFormattedNumber(nominalRaw.value) || 0) : 0;
    const rekeningDariId = document.getElementById('rekening_dari_id').value;
    const rekeningKeId = document.getElementById('rekening_ke_id').value;
    const catatan = document.getElementById('catatan').value.trim();

    const formData = {
        tanggal,
        nominal,
        rekening_dari_id: rekeningDariId,
        rekening_ke_id: rekeningKeId,
        catatan
    };

    // Generate transaction ID for new records
    if (!isEdit) {
        formData.id_transaksi = await generateTransactionId();
    }

    return formData;
}

function showPemindahbukuanFormError(message) {
    const errorDiv = document.getElementById('pemindahbukuan-form-error');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.classList.remove('d-none');
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// Data loading functions for selects
async function loadRekeningOptionsForPemindahbukuan(isEdit = false, pemindahbukuanData = null) {
    try {
        const rekeningOptions = await getRekeningOptions();
        const rekeningDariSelect = document.getElementById('rekening_dari_id');
        const rekeningKeSelect = document.getElementById('rekening_ke_id');

        if (rekeningDariSelect) {
            const optionsHtml = '<option value="">Pilih Rekening Dari</option>' +
                rekeningOptions.map(item => `<option value="${item.value}" ${isEdit && pemindahbukuanData && pemindahbukuanData.rekening_dari_id === item.value ? 'selected' : ''}>${item.text}</option>`).join('');
            rekeningDariSelect.innerHTML = optionsHtml;
        }

        if (rekeningKeSelect) {
            const optionsHtml = '<option value="">Pilih Rekening Ke</option>' +
                rekeningOptions.map(item => `<option value="${item.value}" ${isEdit && pemindahbukuanData && pemindahbukuanData.rekening_ke_id === item.value ? 'selected' : ''}>${item.text}</option>`).join('');
            rekeningKeSelect.innerHTML = optionsHtml;
        }
    } catch (error) {
        console.error('Error loading rekening options:', error);
        showToast('Error loading rekening data', 'danger');
    }
}

async function confirmDeletePemindahbukuan(id) {
    const confirmed = await showConfirm('Apakah Anda yakin ingin menghapus transfer ini?');
    if (confirmed) {
        // This will be imported from the data module
        if (typeof deletePemindahbukuan === 'function') {
            const result = await deletePemindahbukuan(id);
            if (result.success) {
                if (typeof loadPemindahbukuan === 'function') {
                    await loadPemindahbukuan();
                }
            }
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
        e.target.value = rawValue > 0 ? formatNumberInput(rawValue.toString()) : '';
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

export {
    showAddPemindahbukuanForm,
    showEditPemindahbukuanForm,
    confirmDeletePemindahbukuan,
    loadRekeningOptionsForPemindahbukuan
};
