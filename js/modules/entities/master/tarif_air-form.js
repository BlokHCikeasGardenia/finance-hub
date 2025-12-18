// Tarif Air form module
// Handles form creation, validation, and submission for tarif_air

import { showModal, closeModal } from '../../ui.js';
import { showToast } from '../../utils.js';
import {
    addTarifAir,
    updateTarifAir,
    loadTarifAir
} from './tarif_air-data.js';

// Show add form for tarif air
function showAddTarifAirForm() {
    const formHtml = createTarifAirFormHtml();
    showModal('Tambah Tarif Air', formHtml);

    setTimeout(() => {
        attachTarifAirFormEventListeners(false);
    }, 100);
}

// Show edit form for tarif air
async function showEditTarifAirForm(id) {
    try {
        const { readRecords } = await import('../../crud.js');

        const { success, data } = await readRecords('tarif_air', {
            filters: { id }
        });

        if (!success || !data || data.length === 0) {
            showToast('Data tarif air tidak ditemukan', 'warning');
            return;
        }

        const tarifAir = data[0];
        const formHtml = createTarifAirFormHtml(tarifAir);
        showModal('Edit Tarif Air', formHtml);

        setTimeout(() => {
            populateTarifAirFormValues(tarifAir);
            attachTarifAirFormEventListeners(true, tarifAir.id);
        }, 100);

    } catch (error) {
        console.error('Error loading tarif air for edit:', error);
        showToast('Error loading data', 'danger');
    }
}

// Create HTML for tarif air form
function createTarifAirFormHtml(tarifAir = null) {
    const isEdit = !!tarifAir;

    return `
        <div id="tarif_air-form-error" class="alert alert-danger d-none" role="alert"></div>
        <form id="tarif_air-form">
            <div class="row">
                <div class="col-md-6 mb-3">
                    <label for="harga_per_kubik" class="form-label required-field">Harga per Kubik (Rp):</label>
                    <input type="number" class="form-control" id="harga_per_kubik" name="harga_per_kubik"
                           step="0.01" min="0" required>
                    <div class="form-text">Contoh: 4000 untuk Rp 4,000 per m³</div>
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
                    <div class="form-text">Jika dicentang, tarif ini akan menjadi tarif aktif dan tarif lain akan dinonaktifkan</div>
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
function populateTarifAirFormValues(tarifAir) {
    document.getElementById('harga_per_kubik').value = tarifAir.harga_per_kubik || '';
    document.getElementById('tanggal_mulai_berlaku').value = tarifAir.tanggal_mulai_berlaku || '';
    document.getElementById('aktif').checked = tarifAir.aktif || false;
}

// Attach form event listeners
function attachTarifAirFormEventListeners(isEdit, editId = null) {
    const form = document.getElementById('tarif_air-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleTarifAirFormSubmit(isEdit, editId);
    });
}

// Handle form submission
async function handleTarifAirFormSubmit(isEdit, editId) {
    try {
        const formData = collectTarifAirFormData();

        let result;
        if (isEdit && editId) {
            result = await updateTarifAir(editId, formData);
        } else {
            result = await addTarifAir(formData);
        }

        if (result.success) {
            closeModal();
            await loadTarifAir();
        } else {
            showTarifAirFormError(result.message);
        }

    } catch (error) {
        console.error('Form submission error:', error);
        showTarifAirFormError(error.message || 'Terjadi kesalahan saat menyimpan data');
    }
}

// Collect form data
function collectTarifAirFormData() {
    const hargaPerKubik = parseFloat(document.getElementById('harga_per_kubik').value);
    const tanggalMulaiBerlaku = document.getElementById('tanggal_mulai_berlaku').value;
    const aktif = document.getElementById('aktif').checked;

    return {
        harga_per_kubik: hargaPerKubik,
        tanggal_mulai_berlaku: tanggalMulaiBerlaku,
        aktif: aktif
    };
}

// Show form error
function showTarifAirFormError(message) {
    const errorDiv = document.getElementById('tarif_air-form-error');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.classList.remove('d-none');
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

export {
    showAddTarifAirForm,
    showEditTarifAirForm,
    createTarifAirFormHtml,
    populateTarifAirFormValues,
    attachTarifAirFormEventListeners,
    handleTarifAirFormSubmit,
    collectTarifAirFormData,
    showTarifAirFormError
};
