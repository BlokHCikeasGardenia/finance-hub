// Hunian form module
// Handles form creation, validation, and submission

import { showModal, closeModal } from '../../ui.js';
import { SearchableSelect } from '../../ui.js';
import { showToast } from '../../utils.js';
import {
    addHunian,
    updateHunian,
    getLorongData,
    getPenghuniOptions,
    loadHunian
} from './hunian-data.js';

// Show add form for hunian
function showAddHunianForm() {
    showModal('Tambah Hunian', createHunianFormHtml());

    // Initialize searchable selects
    setTimeout(() => {
        initializeHunianFormSelects();
        attachFormEventListeners(false);
    }, 100);
}

// Show edit form for hunian
async function showEditHunianForm(id) {
    try {
        const { readRecords } = await import('../../crud.js');

        const { success, data } = await readRecords('hunian', {
            filters: { id },
            select: `
                *,
                lorong:lorong_id (nama_lorong),
                penghuni_saat_ini:penghuni_saat_ini_id (nama_kepala_keluarga)
            `
        });

        if (!success || !data || data.length === 0) {
            showToast('Data hunian tidak ditemukan', 'warning');
            return;
        }

        const hunian = data[0];
        showModal('Edit Hunian', createHunianFormHtml(hunian));

        // Initialize searchable selects and set values
        setTimeout(() => {
            initializeHunianFormSelects();
            populateFormValues(hunian);
            attachFormEventListeners(true, hunian.id);
        }, 100);

    } catch (error) {
        console.error('Error loading hunian for edit:', error);
        showToast('Error loading data', 'danger');
    }
}

// Create HTML for hunian form
function createHunianFormHtml(hunian = null) {
    const isEdit = !!hunian;
    const title = isEdit ? 'Edit Hunian' : 'Tambah Hunian Baru';

    return `
        <div id="hunian-form-error" class="alert alert-danger d-none" role="alert"></div>
        <form id="hunian-form">
            <div class="mb-3">
                <label for="nomor_urut" class="form-label required-field">No. Urut:</label>
                <input type="number" class="form-control" id="nomor_urut" name="nomor_urut"
                       value="${hunian?.nomor_urut || ''}" min="1" required>
            </div>

            <div class="mb-3">
                <label for="nomor_blok_rumah" class="form-label required-field">No. Rumah:</label>
                <input type="text" class="form-control" id="nomor_blok_rumah" name="nomor_blok_rumah"
                       value="${hunian?.nomor_blok_rumah || ''}" required>
            </div>

            <div class="mb-3">
                <label for="status" class="form-label required-field">Status:</label>
                <select class="form-select" id="status" name="status" required>
                    <option value="berpenghuni" ${hunian?.status === 'berpenghuni' ? 'selected' : ''}>Berpenghuni</option>
                    <option value="kosong" ${hunian?.status === 'kosong' ? 'selected' : ''}>Kosong</option>
                </select>
            </div>

            <div class="mb-3">
                <label for="lorong_id" class="form-label">Lorong:</label>
                <select class="form-select" id="lorong_id" name="lorong_id">
                    <option value="">Pilih Lorong</option>
                </select>
            </div>

            <div class="mb-3">
                <label for="penghuni_saat_ini_id" class="form-label">Penghuni Saat Ini:</label>
                <select class="form-select" id="penghuni_saat_ini_id" name="penghuni_saat_ini_id">
                    <option value="">Tidak ada penghuni</option>
                </select>
            </div>

            <div class="mb-3">
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="pelanggan_air" name="pelanggan_air">
                    <label class="form-check-label" for="pelanggan_air">
                        Pelanggan Air
                    </label>
                </div>
            </div>

            <div class="d-flex gap-2">
                <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Simpan'}</button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
            </div>
        </form>
    `;
}

// Initialize searchable selects in form
function initializeHunianFormSelects() {
    // Lorong select
    const lorongSelect = document.getElementById('lorong_id');
    if (lorongSelect) {
        const lorongSearchable = new SearchableSelect(lorongSelect, {
            placeholder: 'Pilih Lorong',
            searchPlaceholder: 'Cari lorong...'
        });
        lorongSearchable.loadData(getLorongData);
    }

    // Penghuni select
    const penghuniSelect = document.getElementById('penghuni_saat_ini_id');
    if (penghuniSelect) {
        const penghuniSearchable = new SearchableSelect(penghuniSelect, {
            placeholder: 'Pilih Penghuni',
            searchPlaceholder: 'Cari penghuni...'
        });
        penghuniSearchable.loadData(getPenghuniOptions);
    }
}

// Populate form values for editing
function populateFormValues(hunian) {
    // Set the values in the searchable selects if they exist
    const lorongSelect = document.getElementById('lorong_id');
    const penghuniSelect = document.getElementById('penghuni_saat_ini_id');

    if (lorongSelect && lorongSelect.searchableSelect) {
        lorongSelect.searchableSelect.setValue(hunian.lorong_id || '');
    }

    if (penghuniSelect && penghuniSelect.searchableSelect) {
        penghuniSelect.searchableSelect.setValue(hunian.penghuni_saat_ini_id || '');
    }

    // Set pelanggan_air checkbox
    const pelangganAirCheckbox = document.getElementById('pelanggan_air');
    if (pelangganAirCheckbox) {
        pelangganAirCheckbox.checked = hunian.pelanggan_air || false;
    }
}

// Attach form event listeners
function attachFormEventListeners(isEdit, editId = null) {
    const form = document.getElementById('hunian-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleFormSubmit(isEdit, editId);
    });
}

// Handle form submission
async function handleFormSubmit(isEdit, editId) {
    try {
        const formData = collectHunianFormData(isEdit);

        let result;
        if (isEdit && editId) {
            result = await updateHunian(editId, formData);
        } else {
            result = await addHunian(formData);
        }

        if (result.success) {
            closeModal();
            await loadHunian();
        } else {
            showFormError(result.message);
        }

    } catch (error) {
        console.error('Form submission error:', error);
        showFormError(error.message || 'Terjadi kesalahan saat menyimpan data');
    }
}

// Collect form data
function collectHunianFormData(isEdit) {
    const nomorUrut = parseInt(document.getElementById('nomor_urut').value);
    const nomorBlokRumah = document.getElementById('nomor_blok_rumah').value.trim();
    const status = document.getElementById('status').value;
    const lorongId = document.getElementById('lorong_id').value;
    const penghuniId = document.getElementById('penghuni_saat_ini_id').value;
    const pelangganAir = document.getElementById('pelanggan_air').checked;

    const formData = {
        nomor_urut: nomorUrut,
        nomor_blok_rumah: nomorBlokRumah,
        status: status,
        pelanggan_air: pelangganAir
    };

    // Optional fields
    if (lorongId) formData.lorong_id = lorongId;
    if (penghuniId) formData.penghuni_saat_ini_id = penghuniId;

    return formData;
}

// Show form error
function showFormError(message) {
    const errorDiv = document.getElementById('hunian-form-error');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.classList.remove('d-none');
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

export {
    showAddHunianForm,
    showEditHunianForm,
    createHunianFormHtml,
    initializeHunianFormSelects,
    populateFormValues,
    attachFormEventListeners,
    handleFormSubmit,
    collectHunianFormData,
    showFormError
};
