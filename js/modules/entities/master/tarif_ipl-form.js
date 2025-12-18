// Tarif IPL form module
// Handles form creation, validation, and submission for tarif_ipl

import { showModal, closeModal } from '../../ui.js';
import { showToast } from '../../utils.js';
import {
    addTarifIpl,
    updateTarifIpl,
    loadTarifIpl
} from './tarif_ipl-data.js';

// Show add form for tarif IPL
function showAddTarifIplForm() {
    const formHtml = createTarifIplFormHtml();
    showModal('Tambah Tarif IPL', formHtml);

    setTimeout(() => {
        attachTarifIplFormEventListeners(false);
    }, 100);
}

// Show edit form for tarif IPL
async function showEditTarifIplForm(id) {
    try {
        const { readRecords } = await import('../../crud.js');

        const { success, data } = await readRecords('tarif_ipl', {
            filters: { id }
        });

        if (!success || !data || data.length === 0) {
            showToast('Data tarif IPL tidak ditemukan', 'warning');
            return;
        }

        const tarifIpl = data[0];
        const formHtml = createTarifIplFormHtml(tarifIpl);
        showModal('Edit Tarif IPL', formHtml);

        setTimeout(() => {
            populateTarifIplFormValues(tarifIpl);
            attachTarifIplFormEventListeners(true, tarifIpl.id);
        }, 100);

    } catch (error) {
        console.error('Error loading tarif IPL for edit:', error);
        showToast('Error loading data', 'danger');
    }
}

// Create HTML for tarif IPL form
function createTarifIplFormHtml(tarifIpl = null) {
    const isEdit = !!tarifIpl;

    const typeOptions = [
        { value: 'IPL', label: 'IPL Normal' },
        { value: 'IPL_RUMAH_KOSONG', label: 'IPL Rumah Kosong' },
        { value: 'DAU', label: 'DAU' }
    ];

    return `
        <div id="tarif_ipl-form-error" class="alert alert-danger d-none" role="alert"></div>
        <form id="tarif_ipl-form">
            <div class="row">
                <div class="col-md-6 mb-3">
                    <label for="type_tarif" class="form-label required-field">Type Tarif:</label>
                    <select class="form-select" id="type_tarif" name="type_tarif" required ${isEdit ? 'disabled' : ''}>
                        <option value="">Pilih Type Tarif</option>
                        ${typeOptions.map(option => `
                            <option value="${option.value}">${option.label}</option>
                        `).join('')}
                    </select>
                    <div class="form-text">Type tarif IPL yang akan dibuat</div>
                </div>
                <div class="col-md-6 mb-3">
                    <label for="nama_tarif" class="form-label required-field">Nama Tarif:</label>
                    <input type="text" class="form-control" id="nama_tarif" name="nama_tarif"
                           placeholder="Contoh: IPL Normal 2025" required>
                    <div class="form-text">Nama deskripsi tarif</div>
                </div>
            </div>

            <div class="row">
                <div class="col-md-6 mb-3">
                    <label for="nominal" class="form-label required-field">Nominal (Rp):</label>
                    <input type="number" class="form-control" id="nominal" name="nominal"
                           step="0.01" min="0" required>
                    <div class="form-text">Jumlah nominal untuk type tarif ini</div>
                </div>
                <div class="col-md-6 mb-3">
                    <label for="tanggal_mulai_berlaku" class="form-label required-field">Tanggal Mulai Berlaku:</label>
                    <input type="date" class="form-control" id="tanggal_mulai_berlaku" name="tanggal_mulai_berlaku" required>
                    <div class="form-text">Tarif akan berlaku mulai tanggal ini</div>
                </div>
            </div>

            <div class="mb-3">
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="aktif" name="aktif">
                    <label class="form-check-label" for="aktif">
                        <strong>Aktifkan Tarif Ini</strong>
                    </label>
                    <div class="form-text">Jika dicentang, tarif type ini akan aktif</div>
                </div>
            </div>

            <div class="d-flex gap-2">
                <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Simpan'}</button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
            </div>
        </form>
    `;
}

// Populate form values for editing
function populateTarifIplFormValues(tarifIpl) {
    document.getElementById('type_tarif').value = tarifIpl.type_tarif || '';
    document.getElementById('nama_tarif').value = tarifIpl.nama_tarif || '';
    document.getElementById('nominal').value = tarifIpl.nominal || '';
    document.getElementById('tanggal_mulai_berlaku').value = tarifIpl.tanggal_mulai_berlaku || '';
    document.getElementById('aktif').checked = tarifIpl.aktif || false;
}

// Attach form event listeners
function attachTarifIplFormEventListeners(isEdit, editId = null) {
    const form = document.getElementById('tarif_ipl-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleTarifIplFormSubmit(isEdit, editId);
    });
}

// Handle form submission
async function handleTarifIplFormSubmit(isEdit, editId) {
    try {
        const formData = collectTarifIplFormData();

        let result;
        if (isEdit && editId) {
            result = await updateTarifIpl(editId, formData);
        } else {
            result = await addTarifIpl(formData);
        }

        if (result.success) {
            closeModal();
            await loadTarifIpl();
        } else {
            showTarifIplFormError(result.message);
        }

    } catch (error) {
        console.error('Form submission error:', error);
        showTarifIplFormError(error.message || 'Terjadi kesalahan saat menyimpan data');
    }
}

// Collect form data
function collectTarifIplFormData() {
    const typeTarif = document.getElementById('type_tarif').value;
    const namaTarif = document.getElementById('nama_tarif').value.trim();
    const nominal = parseFloat(document.getElementById('nominal').value);
    const tanggalMulaiBerlaku = document.getElementById('tanggal_mulai_berlaku').value;
    const aktif = document.getElementById('aktif').checked;

    return {
        type_tarif: typeTarif,
        nama_tarif: namaTarif,
        nominal: nominal,
        tanggal_mulai_berlaku: tanggalMulaiBerlaku,
        aktif: aktif
    };
}

// Show form error
function showTarifIplFormError(message) {
    const errorDiv = document.getElementById('tarif_ipl-form-error');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.classList.remove('d-none');
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

export {
    showAddTarifIplForm,
    showEditTarifIplForm,
    createTarifIplFormHtml,
    populateTarifIplFormValues,
    attachTarifIplFormEventListeners,
    handleTarifIplFormSubmit,
    collectTarifIplFormData,
    showTarifIplFormError
};
